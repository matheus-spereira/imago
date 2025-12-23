import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

// Configuração: Define se usa Mock ou OpenAI baseado no .env
const IS_MOCK_MODE = process.env.USE_MOCK_AI === 'true';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

// Palavras irrelevantes para o Mock
const STOP_WORDS = ['qual', 'quem', 'onde', 'como', 'porque', 'para', 'com', 'que', 'uma', 'tem', 'sobre'];

export const maxDuration = 60; // Aumentei um pouco para dar tempo de gerar título/rephrase

export async function POST(req: NextRequest) {
  try {
    const { messages, consultantId, sessionId, filterOptions } = await req.json();

    // Filtros
    const userLevel = filterOptions?.accessLevel ?? 99; 
    const requiredTags = filterOptions?.tags ?? []; 

    // Validação
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagens ausentes' }, { status: 400 });
    }
    if (!consultantId) {
       return NextResponse.json({ error: 'Consultant ID é obrigatório.' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const rawUserQuery = lastMessage.content;
    let currentSessionId = sessionId;

    // ============================================================
    // 1. GESTÃO DE SESSÃO & TÍTULO INTELIGENTE
    // ============================================================

    if (!currentSessionId || currentSessionId === 'new') {
      let title = rawUserQuery.slice(0, 30) + '...';

      // MELHORIA 1: Título Inteligente (apenas no modo Real)
      if (!IS_MOCK_MODE) {
        try {
          const titleCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Gere um título de 3 a 5 palavras resumindo o tópico desta mensagem. Não use aspas.' },
              { role: 'user', content: rawUserQuery }
            ],
            max_tokens: 15,
          });
          title = titleCompletion.choices[0]?.message?.content?.trim() || title;
        } catch (e) {
          console.warn("Falha ao gerar título automático, usando padrão.");
        }
      }

      const newSession = await prisma.chatSession.create({
        data: {
          title: title,
          consultantId: consultantId, 
          isDemo: true, 
        }
      });
      currentSessionId = newSession.id;
    }

    // Salva msg do usuário
    await prisma.chatMessage.create({
      data: { sessionId: currentSessionId, role: 'user', content: rawUserQuery }
    });

    // ============================================================
    // 2. QUERY REPHRASING (CONTEXTUALIZAÇÃO)
    // ============================================================
    
    let searchGenericQuery = rawUserQuery;

    // MELHORIA 2: Se houver histórico, reescreva a pergunta para ter contexto
    if (!IS_MOCK_MODE && messages.length > 1) {
      try {
        console.log("[CHAT] Contextualizando pergunta baseada no histórico...");
        const rephraseCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Você é um otimizador de busca. Reescreva a última pergunta do usuário para que ela seja independente e completa, incorporando o contexto das mensagens anteriores se necessário. Retorne APENAS a pergunta reescrita.' },
            ...messages.map((m: any) => ({ role: m.role, content: m.content })) // Envia histórico
          ]
        });
        searchGenericQuery = rephraseCompletion.choices[0]?.message?.content || rawUserQuery;
        console.log(`[CHAT] Pergunta Original: "${rawUserQuery}" -> Reescrita: "${searchGenericQuery}"`);
      } catch (e) {
        console.warn("Falha ao reescrever pergunta, usando original.");
      }
    }

    // ============================================================
    // 3. RAG - RECUPERAÇÃO (USANDO A PERGUNTA OTIMIZADA)
    // ============================================================
    
    console.log(`[CHAT] Buscando contexto para: "${searchGenericQuery}"`);
    
    let contextText = "";
    let foundDocsCount = 0;

    if (IS_MOCK_MODE) {
      // LOGICA MOCK: Busca "burra" por palavras-chave
      const words = searchGenericQuery.toLowerCase().split(/[\s,.?!]+/);
      const keyword = words.find((w: string) => w.length > 3 && !STOP_WORDS.includes(w)) || words[0];
      
      const chunks = await prisma.documentChunk.findMany({
        where: {
          consultantId: consultantId,
          content: { contains: keyword, mode: 'insensitive' },
          document: {
            accessLevel: { lte: userLevel },
            AND: requiredTags.length > 0 ? { tags: { hasSome: requiredTags } } : {}
          }
        },
        take: 3,
        include: { document: true }
      });

      if (chunks.length > 0) {
        contextText = chunks.map(c => c.content).join("\n\n---\n\n");
        foundDocsCount = chunks.length;
      }

    } else {
      // LOGICA REAL: Busca Vetorial Inteligente
      try {
        const embeddingResponse = await openai.embeddings.create({
           model: 'text-embedding-3-small', 
           input: searchGenericQuery // <--- Usa a pergunta reescrita/contextualizada!
        });
        const vectorString = `[${embeddingResponse.data[0].embedding.join(',')}]`;

        let tagFilterSQL = "";
        if (requiredTags.length > 0) {
            const tagsString = requiredTags.map((t: string) => `'${t}'`).join(',');
            tagFilterSQL = `AND doc.tags && ARRAY[${tagsString}]`;
        }

        const chunks: any[] = await prisma.$queryRawUnsafe(`
          SELECT chunk.content
          FROM "DocumentChunk" chunk
          JOIN "Document" doc ON chunk."documentId" = doc.id
          WHERE chunk."consultantId" = '${consultantId}'
            AND doc."accessLevel" <= ${userLevel}
            ${tagFilterSQL}
            AND (1 - (chunk.embedding <=> '${vectorString}'::vector)) > 0.5
          ORDER BY (chunk.embedding <=> '${vectorString}'::vector) ASC
          LIMIT 5;
        `);

        if (chunks.length > 0) {
          contextText = chunks.map(c => c.content).join("\n\n---\n\n");
          foundDocsCount = chunks.length;
        }
      } catch (err) { console.error(err); }
    }

    // ============================================================
    // 4. GERAÇÃO DA RESPOSTA FINAL
    // ============================================================

    // Buscar System Prompt Personalizado do Consultor
    let customPrompt = "";
    try {
      const consultantProfile = await prisma.consultantProfile.findUnique({
        where: { id: consultantId },
        select: { systemPrompt: true, name: true }
      });
      if (consultantProfile?.systemPrompt) {
        customPrompt = `PERSONALIDADE / TOM DE VOZ:\n${consultantProfile.systemPrompt}\n\n`;
      } else {
        customPrompt = `Você é ${consultantProfile?.name || 'o assistente'}, especialista no assunto.\n`;
      }
    } catch (e) {}

    const systemPrompt = `${customPrompt}
    INSTRUÇÕES:
    1. Responda à pergunta do usuário usando o contexto abaixo.
    2. Se a resposta não estiver no contexto, diga que não consta na base de conhecimento.
    
    CONTEXTO RECUPERADO:
    ${contextText || "Nenhum documento relevante encontrado."}`;
    
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

// --- FUNÇÕES AUXILIARES ---

function createMockStream(sessionId: string, docsCount: number, context: string) {
  const hasContext = docsCount > 0;
  const mockText = hasContext
    ? `[RAG SIMULADO] Encontrei ${docsCount} trechos!\n\nBaseado neles:\n"${context.slice(0, 150)}..."\n\n(No modo real, a IA usaria isso para responder).`
    : `[RAG SIMULADO] Não encontrei nada relevante (respeitando filtros).`;

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