import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { createRequire } from 'module';

// Configurações
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ==============================================================================
// 1. ESTRATÉGIA RÁPIDA (Custo Zero) - pdf2json
// ==============================================================================
async function extractTextFast(buffer: Buffer): Promise<string> {
  const require = createRequire(import.meta.url);
  const PDFParser = require("pdf2json");

  return new Promise((resolve) => {
    // null, 1 = Raw Text Mode
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
// 2. ESTRATÉGIA INTELIGENTE (OCR/Markdown) - LlamaParse
// ==============================================================================
async function extractTextSmart(buffer: Buffer, fileName: string): Promise<string> {
  console.log('[WORKER] Ativando LlamaParse (Modo Dinâmico)...');
  
  // === CORREÇÃO: Importação Dinâmica via Require ===
  // Isso evita que o Next.js tente validar a exportação no tempo de build
  // e força o uso da versão Node.js completa da biblioteca.
  const require = createRequire(import.meta.url);
  const { LlamaParseReader } = require("llamaindex");

  try {
    const reader = new LlamaParseReader({ 
      resultType: "markdown", 
      apiKey: process.env.LLAMA_CLOUD_API_KEY,
      language: "pt", 
    });

    // O LlamaParseReader espera um buffer e o nome do arquivo
    const documents = await reader.loadDataAsContent(buffer, fileName);
    
    return documents.map((page: any) => page.text).join("\n\n");

  } catch (error: any) {
    console.error("[SMART EXTRACT ERROR]", error);
    throw new Error(`Falha no LlamaParse: ${error.message}`);
  }
}

// ==============================================================================
// HANDLER PRINCIPAL
// ==============================================================================
export async function POST(req: Request) {
  let documentId = '';
  
  try {
    const body = await req.json();
    documentId = body.documentId;
    console.log(`[WORKER] Iniciando Pipeline Híbrido: Doc ID ${documentId}`);

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return NextResponse.json({ error: 'Not found' });

    await prisma.document.update({ where: { id: documentId }, data: { status: 'PROCESSING' } });

    // Download do Arquivo
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.fileKey);

    if (downloadError || !fileBlob) throw new Error("Erro download Supabase");
    
    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let fullText = "";
    let extractionSource = "FAST";

    if (doc.mediaType === 'TEXT') {
      // 1. Tentativa Rápida
      console.log('[WORKER] Tentando extração rápida...');
      fullText = await extractTextFast(buffer);

      try { fullText = decodeURIComponent(fullText); } catch (e) { /* Ignora */ }
      
      // 2. Validação e Fallback para LlamaParse
      // Se tiver menos de 100 caracteres ou parecer lixo, vai para o Smart
      if (fullText.trim().length < 100) {
        console.log(`[WORKER] Texto insuficiente. Indo para LlamaParse.`);
        fullText = await extractTextSmart(buffer, doc.fileName);
        extractionSource = "SMART";
      }
      
      console.log(`[WORKER] Sucesso via ${extractionSource}. Tamanho final: ${fullText.length} chars.`);
    } else {
      throw new Error("Vídeo ainda não suportado.");
    }

    // Chunking
    const chunks: string[] = [];
    const CHUNK_SIZE = 1000;
    const OVERLAP = 200;
    
    for (let i = 0; i < fullText.length; i += (CHUNK_SIZE - OVERLAP)) {
      chunks.push(fullText.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[WORKER] Gerando ${chunks.length} chunks...`);

    // Embedding
    for (const chunkContent of chunks) {
      if (!chunkContent) continue;
      
      // === ATENÇÃO: MODO MOCK (Troque quando tiver créditos) ===
      
      // MOCK (Usa isso agora)
      const vector = Array(1536).fill(0).map(() => Math.random()); 
      
      // REAL (Descomente depois)
      /*
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunkContent,
      });
      const vector = embeddingResponse.data[0].embedding;
      */

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

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'COMPLETED', isIndexed: true, charCount: fullText.length }
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