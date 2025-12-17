import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Ajuste o caminho conforme seu setup
import { prisma } from '@/lib/prisma';    // Seu cliente prisma instanciado
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';

// Configuração do OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configuração Supabase (para Storage)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação e Segurança
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar o perfil do consultor ligado ao usuário
    const consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } },
    });

    if (!consultant) {
      // Se não tiver perfil, cria um básico agora (Onboarding automático)
      // Idealmente isso seria em outra etapa, mas para o MVP facilita.
      return NextResponse.json(
        { error: 'Consultant profile not found. Please complete onboarding.' },
        { status: 404 }
      );
    }

    // 2. Receber o Arquivo
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // 3. Upload para Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${consultant.id}/${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, fileBuffer, { contentType: 'application/pdf' });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // 4. Extração de Texto (Parsing)
    const pdfData = await pdfParse(fileBuffer);
    const cleanText = pdfData.text.replace(/\s+/g, ' ').trim(); // Remove quebras de linha excessivas

    // 5. Salvar Referência do Documento no Banco
    const document = await prisma.document.create({
      data: {
        consultantId: consultant.id,
        fileName: file.name,
        fileKey: fileName,
        charCount: cleanText.length,
        isIndexed: false, // Marcamos como false até terminar os chunks
      },
    });

    // 6. Chunking (Quebrar o texto em pedaços)
    // Estratégia simples: Blocos de 1000 caracteres com overlap de 200
    const CHUNK_SIZE = 1000;
    const OVERLAP = 200;
    const chunks: string[] = [];
    
    for (let i = 0; i < cleanText.length; i += (CHUNK_SIZE - OVERLAP)) {
      chunks.push(cleanText.slice(i, i + CHUNK_SIZE));
    }

    // 7. Gerar Embeddings e Salvar (Processamento em Lote)
    // Para MVP, fazemos sequencial ou Promise.all limitado.
    
    for (const chunkContent of chunks) {
      // Gerar vetor na OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunkContent,
      });
      const vector = embeddingResponse.data[0].embedding;

      // Salvar Chunk com SQL Bruto (necessário para o tipo vector)
      // Note o cast ::vector e o uso de JSON.stringify para passar o array
      const vectorString = `[${vector.join(',')}]`;
      
      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, "consultantId", "documentId", content, embedding, "createdAt")
        VALUES (
          gen_random_uuid(), 
          ${consultant.id}, 
          ${document.id}, 
          ${chunkContent}, 
          ${vectorString}::vector, 
          NOW()
        );
      `;
    }

    // 8. Finalizar
    await prisma.document.update({
      where: { id: document.id },
      data: { isIndexed: true },
    });

    return NextResponse.json({ success: true, chunksCount: chunks.length });

  } catch (error: any) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}