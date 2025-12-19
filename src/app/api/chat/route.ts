import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

// Configuração: Define se usa Mock ou OpenAI baseado no .env
const IS_MOCK_MODE = process.env.USE_MOCK_AI === 'true';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { messages, consultantId, sessionId } = await req.json();

    // 1. Validação Básica
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagens ausentes' }, { status: 400 });
    }

    if (!consultantId) {
       return NextResponse.json({ error: 'Consultant ID é obrigatório.' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;
    let currentSessionId = sessionId;

    // ============================================================
    // PARTE A: GESTÃO DA SESSÃO
    // ============================================================

    if (!currentSessionId || currentSessionId === 'new') {
      const title = userQuery.slice(0, 30) + '...';
      const newSession = await prisma.chatSession.create({
        data: {
          title: title,
          consultantId: consultantId, 
          isDemo: true, 
        }
      });
      currentSessionId = newSession.id;
    }

    await prisma.chatMessage.create({
      data: {
        sessionId: currentSessionId,
        role: 'user',
        content: userQuery,
      }
    });

    // ============================================================
    // PARTE B: RAG - RECUPERAÇÃO DE CONTEXTO
    // ============================================================
    
    console.log(`[CHAT] Buscando contexto... (Mock: ${IS_MOCK_MODE})`);
    
    let contextText = "";
    let foundDocsCount = 0;

    if (IS_MOCK_MODE) {
      // --- MODO MOCK MELHORADO (Busca por Múltiplas Palavras-Chave) ---
      
      // 1. Quebra a frase em palavras e filtra as pequenas (de, da, o, a...)
      const keywords = userQuery.split(/[\s,.?!]+/).filter((w: string) => w.length > 3);
      
      // Se não sobrou nada (ex: "o que é?"), usa a frase inteira
      const searchTerms = keywords.length > 0 ? keywords : [userQuery];

      console.log("[MOCK SEARCH] Termos buscados:", searchTerms);

      const chunks = await prisma.documentChunk.findMany({
        where: {
          consultantId: consultantId,
          // Busca qualquer chunk que contenha PELO MENOS UMA das palavras
          OR: searchTerms.map((term) => ({
            content: {
              contains: term,
              mode: 'insensitive'
            }
          }))
        },
        take: 4, // Pega até 4 trechos
      });

      if (chunks.length > 0) {
        contextText = chunks.map(c => c.content).join("\n\n---\n\n");
        foundDocsCount = chunks.length;
      }

    } else {
      // --- MODO REAL: Busca Vetorial ---
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: userQuery,
        });
        const queryVector = embeddingResponse.data[0].embedding;
        const vectorString = `[${queryVector.join(',')}]`;

        const chunks: any[] = await prisma.$queryRaw`
          SELECT content, 
                 1 - (embedding <=> ${vectorString}::vector) as similarity
          FROM "DocumentChunk"
          WHERE "consultantId" = ${consultantId} 
            AND (1 - (embedding <=> ${vectorString}::vector)) > 0.5 
          ORDER BY similarity DESC
          LIMIT 5;
        `;

        if (chunks.length > 0) {
          contextText = chunks.map(c => c.content).join("\n\n---\n\n");
          foundDocsCount = chunks.length;
        }

      } catch (err) {
        console.error("[RAG ERROR]", err);
      }
    }

    console.log(`[RAG] Encontrados ${foundDocsCount} trechos.`);

    // ============================================================
    // PARTE C: GERAÇÃO DA RESPOSTA
    // ============================================================

    const systemPrompt = `Você é um assistente especialista e representa o consultor.
    
    INSTRUÇÕES:
    1. Responda usando APENAS o contexto abaixo.
    2. Se não encontrar a resposta, diga que não consta na base de conhecimento.

    CONTEXTO:
    ${contextText || "Nenhum documento relevante encontrado."}
    `;
    
    let stream: ReadableStream;

    if (IS_MOCK_MODE) {
      stream = createMockStream(currentSessionId, foundDocsCount, contextText);
    } else {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
        stream: true,
      });
      stream = createOpenAIStream(completion, currentSessionId);
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-session-id': currentSessionId,
      },
    });

  } catch (error: any) {
    console.error("[ERRO NO CHAT]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ... (Mantenha as funções auxiliares createMockStream, createOpenAIStream e saveBotMessageToDb iguais)
// Se precisar que eu reenvie as funções auxiliares, me avise. Elas não mudaram.
function createMockStream(sessionId: string, docsCount: number, context: string) {
  const hasContext = docsCount > 0;
  
  const mockText = hasContext
    ? `[RAG SIMULADO] Encontrei ${docsCount} trechos!\n\nBaseado neles:\n"${context.slice(0, 150)}..."\n\n(No modo real, a IA usaria isso para responder).`
    : `[RAG SIMULADO] Não encontrei nada relevante para as palavras-chave usadas. Tente usar uma palavra que exista no texto.`;

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const chunks = mockText.split(/(?=[ ,.\n])/);

      let fullText = '';
      for (const chunk of chunks) {
        await new Promise(r => setTimeout(r, 20)); 
        fullText += chunk;
        controller.enqueue(encoder.encode(chunk));
      }
      await saveBotMessageToDb(sessionId, fullText);
      controller.close();
    }
  });
}

async function createOpenAIStream(completion: any, sessionId: string) {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullText = '';
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            controller.enqueue(encoder.encode(content));
          }
        }
        if (fullText) await saveBotMessageToDb(sessionId, fullText);
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });
}

async function saveBotMessageToDb(sessionId: string, content: string) {
    try {
        await prisma.chatMessage.create({
            data: { sessionId, role: 'assistant', content }
          });
    } catch (e) { console.error(e); }
}