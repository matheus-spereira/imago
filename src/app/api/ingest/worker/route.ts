import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { createRequire } from 'module';
import { createClient as createDeepgramClient } from "@deepgram/sdk";

// ==============================================================================
// CONFIGURAÇÕES GLOBAIS
// ==============================================================================
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Inicializa Deepgram apenas se a chave existir
const deepgram = process.env.DEEPGRAM_API_KEY 
  ? createDeepgramClient(process.env.DEEPGRAM_API_KEY) 
  : null;

// ==============================================================================
// 1. ESTRATÉGIA RÁPIDA (PDF/TXT)
// ==============================================================================
async function extractTextFast(buffer: Buffer): Promise<string> {
  const require = createRequire(import.meta.url);
  const PDFParser = require("pdf2json");

  return new Promise((resolve) => {
    const pdfParser = new PDFParser(null, 1);

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.warn("[FAST EXTRACT] Erro no pdf2json:", errData.parserError);
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
// 2. ESTRATÉGIA INTELIGENTE (OCR/Markdown - LlamaParse)
// ==============================================================================
async function extractTextSmart(buffer: Buffer, fileName: string): Promise<string> {
  console.log('[WORKER] Ativando LlamaParse (Modo Dinâmico)...');
  
  const require = createRequire(import.meta.url);
  
  let LlamaParseReader;

  // Tenta importar de diferentes locais para compatibilidade
  const possiblePaths = [
    "llama-cloud-services",               
    "@llamaindex/cloud/reader",           
    "llamaindex/readers/LlamaParseReader", 
    "llamaindex"                          
  ];

  for (const path of possiblePaths) {
    try {
      const mod = require(path);
      if (mod.LlamaParseReader) {
        LlamaParseReader = mod.LlamaParseReader;
        break;
      } else if (mod.default?.LlamaParseReader) {
        LlamaParseReader = mod.default.LlamaParseReader;
        break;
      }
    } catch (e) { }
  }

  if (!LlamaParseReader) {
     throw new Error("LlamaParseReader não encontrado. Verifique a instalação do llama-cloud-services.");
  }

  try {
    const reader = new LlamaParseReader({ 
      resultType: "markdown", 
      apiKey: process.env.LLAMA_CLOUD_API_KEY,
      language: "pt", 
    });

    const content = new Uint8Array(buffer);
    const documents = await reader.loadDataAsContent(content, "application/pdf");
    
    return documents.map((page: any) => page.text).join("\n\n");

  } catch (error: any) {
    console.error("[SMART EXTRACT ERROR]", error);
    throw new Error(`Falha no LlamaParse: ${error.message}`);
  }
}

// ==============================================================================
// 3. ESTRATÉGIA DE ÁUDIO/VÍDEO (Deepgram)
// ==============================================================================
async function extractVideoAudio(fileKey: string): Promise<string> {
  if (!deepgram) throw new Error("DEEPGRAM_API_KEY não configurada no .env");
  
  console.log('[WORKER] Iniciando transcrição via Deepgram (URL)...');

  // 1. Gerar URL assinada (temporária) para a Deepgram baixar o arquivo do Supabase
  // 600 segundos (10 min) é suficiente para a Deepgram iniciar o download
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileKey, 600);

  if (error || !data) throw new Error("Erro ao gerar URL assinada do vídeo.");

  console.log('[WORKER] URL gerada. Enviando para Deepgram...');

  // 2. Enviar URL para transcrição
  // O modelo "nova-2" é o estado da arte em velocidade e custo
  const { result, error: dgError } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: data.signedUrl },
    {
      model: "nova-2",
      language: "pt-BR",
      smart_format: true, // Adiciona pontuação e parágrafos automaticamente
      punctuate: true,
    }
  );

  if (dgError) throw new Error(`Erro Deepgram: ${dgError.message}`);

  // 3. Extrair o texto da resposta JSON
  const transcript = result.results?.channels[0]?.alternatives[0]?.transcript;
  
  if (!transcript) {
    console.warn("[WORKER] Deepgram retornou vazio.");
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
    console.log(`[WORKER] Iniciando Pipeline: Doc ID ${documentId}`);

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return NextResponse.json({ error: 'Not found' });

    // Atualiza status para PROCESSING
    await prisma.document.update({ where: { id: documentId }, data: { status: 'PROCESSING' } });

    let fullText = "";
    let extractionSource = "FAST";

    // --- ROTEAMENTO POR TIPO DE MÍDIA ---
    
    if (doc.mediaType === 'VIDEO' || doc.mediaType === 'AUDIO') {
      // >>>> ROTA DE VÍDEO/ÁUDIO <<<<
      extractionSource = "TRANSCRIPTION_DEEPGRAM";
      try {
        fullText = await extractVideoAudio(doc.fileKey);
      } catch (e: any) {
        console.error("Erro na transcrição:", e);
        throw new Error(`Falha ao transcrever: ${e.message}`);
      }

    } else {
      // >>>> ROTA DE TEXTO (PDF/DOC/TXT) <<<<
      
      // Download do arquivo para memória (buffer)
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('documents')
        .download(doc.fileKey);

      if (downloadError || !fileBlob) throw new Error("Erro download Supabase");
      
      const arrayBuffer = await fileBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log('[WORKER] Tentando extração rápida (pdf2json)...');
      fullText = await extractTextFast(buffer);

      try { fullText = decodeURIComponent(fullText); } catch (e) { /* Ignora */ }
      
      // Validação e Fallback para LlamaParse
      if (fullText.trim().length < 50) {
        console.log(`[WORKER] Texto insuficiente. Indo para LlamaParse.`);
        try {
          fullText = await extractTextSmart(buffer, doc.fileName);
          extractionSource = "SMART_LLAMA";
        } catch (smartError: any) {
           console.error("[WORKER] Falha também no Smart Extract:", smartError.message);
           throw new Error("Não foi possível extrair texto do documento.");
        }
      }
    }

    // Validação Final do Texto
    if (!fullText || fullText.length < 10) {
      throw new Error("O arquivo parece vazio ou não foi possível ler o conteúdo.");
    }
    
    console.log(`[WORKER] Sucesso via ${extractionSource}. Tamanho final: ${fullText.length} chars.`);

    // --- CHUNKING ---
    const chunks: string[] = [];
    const CHUNK_SIZE = 1000;
    const OVERLAP = 200;
    
    for (let i = 0; i < fullText.length; i += (CHUNK_SIZE - OVERLAP)) {
      chunks.push(fullText.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[WORKER] Gerando ${chunks.length} chunks...`);

    // --- EMBEDDING (Vetorização) ---
    for (const chunkContent of chunks) {
      if (!chunkContent) continue;
      
      // MOCK ATIVADO (Para evitar erro 429 na OpenAI durante testes)
      /* const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunkContent,
      });
      const vector = embeddingResponse.data[0].embedding;
      */
      
      // Vetor Aleatório Fake
      const vector = Array(1536).fill(0).map(() => Math.random()); 

      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, "consultantId", "documentId", content, embedding, metadata, "createdAt")
        VALUES (
          gen_random_uuid(), 
          ${doc.consultantId}, 
          ${doc.id}, 
          ${chunkContent}, 
          ${JSON.stringify(vector)}::vector, 
          ${JSON.stringify({ source: extractionSource })}::jsonb,
          NOW()
        );
      `;
    }

    // --- FINALIZAÇÃO E RESUMO ---
    const summaryPreview = fullText
      .slice(0, 300)
      .replace(/[\n\r]+/g, ' ') 
      .trim() + (fullText.length > 300 ? '...' : '');

    await prisma.document.update({
      where: { id: documentId },
      data: { 
        status: 'COMPLETED', 
        isIndexed: true, 
        charCount: fullText.length,
        summary: summaryPreview 
      }
    });

    return NextResponse.json({ success: true, source: extractionSource });

  } catch (error: any) {
    console.error('[WORKER ERROR]', error);
    if (documentId) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', errorMessage: error.message }
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}