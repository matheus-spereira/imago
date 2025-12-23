import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

// SE VOCÊ USAR NEXT-AUTH ou CLERK, DESCOMENTE AS LINHAS DE AUTH ABAIXO
// import { getServerSession } from "next-auth"; 
// import { authOptions } from "@/lib/auth"; 

// Configuração: Define se usa Mock ou OpenAI baseado no .env
const IS_MOCK_MODE = process.env.USE_MOCK_AI === 'true';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, consultantId, sessionId, filterOptions } = await req.json();

    // 1. RECUPERAR USUÁRIO LOGADO (CRUCIAL PARA O HISTÓRICO)
    // Se você não tiver autenticação ainda, pode usar um ID fixo temporário para testar
    // const session = await getServerSession(authOptions);
    // const userId = session?.user?.id;
    
    // --- MODO PROVISÓRIO (Remova quando tiver Auth configurado) ---
    // Simula um usuário fixo para que o histórico funcione nos testes
    const userId = "cmjhr82pa00052wxwak5bc4jt"; 
    // -----------------------------------------------------------

    if (!userId) {
        return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

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
    // 2. GESTÃO DE SESSÃO (AGORA COM USER ID)
    // ============================================================

    if (!currentSessionId || currentSessionId === 'new') {
      let title = rawUserQuery.slice(0, 30) + '...';

      if (!IS_MOCK_MODE) {
        try {
          const titleCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Gere um título curto (max 4 palavras) para esta conversa.' },
              { role: 'user', content: rawUserQuery }
            ],
            max_tokens: 15,
          });
          title = titleCompletion.choices[0]?.message?.content?.trim() || title;
          title = title.replace(/^"|"$/g, ''); // Remove aspas extras
        } catch (e) {
          console.warn("Falha ao gerar título automático.");
        }
      }

      // CORREÇÃO PRINCIPAL: Adicionado userId
      const newSession = await prisma.chatSession.create({
        data: {
          title: title,
          consultantId: consultantId, 
          userId: userId, // <--- O ELO PERDIDO! Sem isso, a sessão não aparece na lista do usuário.
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
    // 3. QUERY REPHRASING E RAG
    // ============================================================
    
    let searchGenericQuery = rawUserQuery;

    if (!IS_MOCK_MODE && messages.length > 1) {
      // (Lógica de rephrase mantida igual...)
      try {
        const rephraseCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Reescreva a última pergunta para ser independente, usando o contexto anterior.' },
            ...messages.map((m: any) => ({ role: m.role, content: m.content }))
          ]
        });
        searchGenericQuery = rephraseCompletion.choices[0]?.message?.content || rawUserQuery;
      } catch (e) {}
    }

    // --- LÓGICA DE BUSCA RAG MANTIDA IGUAL AO SEU ARQUIVO ---
    let contextText = "";
    let foundDocsCount = 0;

    // ... (Seu código de busca Mock/Vector permanece aqui sem alterações) ...
    // Vou resumir para não estender demais a resposta, mas mantenha sua lógica de busca aqui.
    if (IS_MOCK_MODE) {
        // ... sua lógica mock ...
        contextText = "Contexto Mock Simulado..."; 
        foundDocsCount = 1;
    } else {
        // ... sua lógica real ...
        // Para simplificar o copy-paste, estou assumindo que você manterá o trecho do embedding igual.
        // Se precisar que eu reescreva o bloco de busca inteiro, me avise.
         try {
            const embeddingResponse = await openai.embeddings.create({
               model: 'text-embedding-3-small', 
               input: searchGenericQuery 
            });
            const vectorString = `[${embeddingResponse.data[0].embedding.join(',')}]`;
    
            const chunks: any[] = await prisma.$queryRawUnsafe(`
              SELECT chunk.content
              FROM "DocumentChunk" chunk
              JOIN "Document" doc ON chunk."documentId" = doc.id
              WHERE chunk."consultantId" = '${consultantId}'
                AND doc."accessLevel" <= ${userLevel}
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
    // 4. STREAM E RESPOSTA
    // ============================================================

    let customPrompt = "";
    try {
      const consultantProfile = await prisma.consultantProfile.findUnique({
        where: { id: consultantId },
        select: { systemPrompt: true, name: true }
      });
      customPrompt = consultantProfile?.systemPrompt 
        ? `PERSONALIDADE:\n${consultantProfile.systemPrompt}\n\n` 
        : `Você é ${consultantProfile?.name || 'o assistente'}.\n`;
    } catch (e) {}

    const systemPrompt = `${customPrompt}
    Use o contexto abaixo para responder. Se não souber, diga que não sabe.
    CONTEXTO:
    ${contextText || "Nenhum dado encontrado."}`;

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
        'x-session-id': currentSessionId, // Front-end precisa disso
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
    ? `[MOCK] Encontrei ${docsCount} trechos!\n\n${context.slice(0, 100)}...`
    : `[MOCK] Nada encontrado.`;

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(mockText));
      // Salva e ATUALIZA a sessão
      await saveBotMessageToDb(sessionId, mockText);
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
        if (fullText) {
             // Salva e ATUALIZA a sessão
             await saveBotMessageToDb(sessionId, fullText);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });
}

async function saveBotMessageToDb(sessionId: string, content: string) {
    try {
        // 1. Salva a mensagem do Bot
        await prisma.chatMessage.create({
            data: { sessionId, role: 'assistant', content }
        });

        // 2. CORREÇÃO DE ORDENAÇÃO: Atualiza a sessão para ela subir no histórico
        await prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() }
        });

    } catch (e) { console.error("Erro ao salvar msg no banco:", e); }
}