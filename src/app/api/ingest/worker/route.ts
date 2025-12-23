import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { createRequire } from 'module';
import { createClient as createDeepgramClient } from "@deepgram/sdk";

// ==============================================================================
// CONFIGURAÇÕES
// ==============================================================================
// Garante que o worker aguente arquivos grandes sem timeout rápido (Vercel Pro/Hobby limits apply)
export const maxDuration = 60; 

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const deepgram = process.env.DEEPGRAM_API_KEY 
  ? createDeepgramClient(process.env.DEEPGRAM_API_KEY) 
  : null;

// ==============================================================================
// 1. EXTRAÇÃO RÁPIDA (PDF TEXT)
// ==============================================================================
async function extractTextFast(buffer: Buffer): Promise<string> {
  const require = createRequire(import.meta.url);
  // pdf2json precisa ser instalado: npm install pdf2json
  const PDFParser = require("pdf2json");

  return new Promise((resolve) => {
    const pdfParser = new PDFParser(null, 1);

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.warn("[FAST EXTRACT] Erro no pdf2json (tentaremos fallback):", errData.parserError);
      resolve(""); 
    });

    pdfParser.on("pdfParser_dataReady", () => {
      const raw = pdfParser.getRawTextContent();
      resolve(raw || "");
    });

    try {
      pdfParser.parseBuffer(buffer);
    } catch (e) {
      resolve("");
    }
  });
}

// ==============================================================================
// 2. EXTRAÇÃO INTELIGENTE (OCR/MARKDOWN - LLAMAPARSE)
// ==============================================================================
async function extractTextSmart(buffer: Buffer, fileName: string): Promise<string> {
  console.log('[WORKER] Ativando LlamaParse (Modo OCR/Markdown)...');
  
  const require = createRequire(import.meta.url);
  let LlamaParseReader;

  // Tenta importar dinamicamente para evitar erro de build se não estiver instalado
  try {
    const mod = require("llama-cloud-services"); 
    LlamaParseReader = mod.LlamaParseReader;
  } catch (e) {
    throw new Error("Biblioteca 'llama-cloud-services' não instalada. Rode: npm install llama-cloud-services");
  }

  try {
    const reader = new LlamaParseReader({ 
      resultType: "markdown", 
      apiKey: process.env.LLAMA_CLOUD_API_KEY,
      language: "pt", 
    });

    // O LlamaParse espera Uint8Array ou Blob
    const content = new Uint8Array(buffer);
    const documents = await reader.loadDataAsContent(content, fileName);
    
    return documents.map((page: any) => page.text).join("\n\n");

  } catch (error: any) {
    console.error("[SMART EXTRACT ERROR]", error);
    throw new Error(`Falha no LlamaParse: ${error.message}`);
  }
}

// ==============================================================================
// 3. TRANSCRIÇÃO DE ÁUDIO/VÍDEO (DEEPGRAM)
// ==============================================================================
async function extractVideoAudio(fileKey: string): Promise<string> {
  if (!deepgram) throw new Error("DEEPGRAM_API_KEY ausente no .env");
  
  console.log('[WORKER] Iniciando transcrição via Deepgram...');

  // 1. URL assinada temporária (10 min)
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileKey, 600);

  if (error || !data) throw new Error("Erro ao gerar URL assinada para Deepgram.");

  // 2. Envia para Deepgram (Modelo Nova-2 é o melhor custo-benefício)
  const { result, error: dgError } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: data.signedUrl },
    {
      model: "nova-2",
      language: "pt-BR",
      smart_format: true, 
      punctuate: true,
    }
  );

  if (dgError) throw new Error(`Deepgram API Erro: ${dgError.message}`);

  const transcript = result.results?.channels[0]?.alternatives[0]?.transcript;
  
  if (!transcript) {
    console.warn("[WORKER] Deepgram retornou texto vazio.");
    return "";
  }
  
  return transcript;
}

// ==============================================================================
// HANDLER PRINCIPAL
// ==============================================================================
export async function POST(req: Request) {
  let documentId = '';
  
  try {
    const body = await req.json();
    documentId = body.documentId;
    
    if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

    console.log(`[WORKER] Processando Doc ID: ${documentId}`);

    // Busca o documento e confirma que existe
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Atualiza status para PROCESSING
    await prisma.document.update({ 
        where: { id: documentId }, 
        data: { status: 'PROCESSING', errorMessage: null } 
    });

    let fullText = "";
    let extractionSource = "FAST";

    // --- A. EXTRAÇÃO DE TEXTO ---
    if (doc.mediaType === 'VIDEO' || doc.mediaType === 'AUDIO') {
      extractionSource = "TRANSCRIPTION_DEEPGRAM";
      try {
        fullText = await extractVideoAudio(doc.fileKey);
      } catch (e: any) {
        throw new Error(`Erro na transcrição: ${e.message}`);
      }
    } else {
      // É ARQUIVO DE TEXTO (PDF, TXT, MD)
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('documents')
        .download(doc.fileKey);

      if (downloadError || !fileBlob) throw new Error("Erro ao baixar do Supabase");
      
      const arrayBuffer = await fileBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 1. Tenta Fast Extract (pdf2json)
      fullText = await extractTextFast(buffer);
      try { fullText = decodeURIComponent(fullText); } catch (e) {}

      // 2. Se falhar ou for muito curto (OCR necessário), usa LlamaParse
      if (fullText.trim().length < 50) {
        if (process.env.LLAMA_CLOUD_API_KEY) {
            try {
                fullText = await extractTextSmart(buffer, doc.fileName);
                extractionSource = "SMART_LLAMA";
            } catch (smartError) {
                console.warn("Smart extract falhou, mantendo texto vazio/curto.");
            }
        } else {
            console.warn("LLAMA_CLOUD_API_KEY não configurada. Pulando OCR.");
        }
      }
    }

    if (!fullText || fullText.trim().length < 10) {
      throw new Error("Não foi possível extrair texto utilizável do arquivo.");
    }

    // --- B. CHUNKING (DIVISÃO) ---
    const chunks: string[] = [];
    const CHUNK_SIZE = 1000;
    const OVERLAP = 200;
    
    // Limpeza básica
    const cleanText = fullText.replace(/\s+/g, ' ').trim();

    for (let i = 0; i < cleanText.length; i += (CHUNK_SIZE - OVERLAP)) {
      chunks.push(cleanText.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[WORKER] Gerando Embeddings para ${chunks.length} chunks...`);

    // --- C. EMBEDDING (VETORIZAÇÃO) ---
    // Removemos os chunks antigos desse documento para evitar duplicidade em reprocessamento
    await prisma.documentChunk.deleteMany({ where: { documentId } });

    for (const chunkContent of chunks) {
      if (!chunkContent) continue;

      // 1. Gera Embedding Real na OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunkContent,
      });
      const vector = embeddingResponse.data[0].embedding;

      // 2. Prepara string do vetor para o PostgreSQL ([0.1, 0.2, ...])
      const vectorString = `[${vector.join(',')}]`;

      // 3. Insere no Banco (Raw Query é necessária para o tipo vector)
      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, "consultantId", "documentId", content, embedding, metadata, "createdAt")
        VALUES (
          gen_random_uuid(), 
          ${doc.consultantId}, 
          ${doc.id}, 
          ${chunkContent}, 
          ${vectorString}::vector, 
          ${JSON.stringify({ source: extractionSource })}::jsonb,
          NOW()
        );
      `;
    }

    // --- D. FINALIZAÇÃO ---
    // Gera um resumo curto (300 chars) para mostrar na lista
    const summaryPreview = cleanText.slice(0, 300) + (cleanText.length > 300 ? '...' : '');

    await prisma.document.update({
      where: { id: documentId },
      data: { 
        status: 'COMPLETED', 
        isIndexed: true, 
        charCount: cleanText.length,
        summary: summaryPreview 
      }
    });

    return NextResponse.json({ success: true, chunks: chunks.length, source: extractionSource });

  } catch (error: any) {
    console.error('[WORKER FATAL ERROR]', error);
    
    if (documentId) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', errorMessage: error.message }
      });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}