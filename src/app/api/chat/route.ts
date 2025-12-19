import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

// Configuração: Define se usa Mock ou OpenAI baseado no .env
// Se não tiver nada no .env, assume que é FALSE (tenta usar OpenAI)
const IS_MOCK_MODE = process.env.USE_MOCK_AI === 'true';

// Inicializa OpenAI (só vai ser usado se não for mock)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key', // Evita erro de init se a chave estiver vazia no modo mock
});

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { messages, consultantId, sessionId } = await req.json();

    // 1. Validação Básica
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagens ausentes' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    let currentSessionId = sessionId;

    // ============================================================
    // PARTE A: BANCO DE DADOS (Igual para os dois modos)
    // ============================================================

    // 2. Cria ou Recupera a Sessão
    if (!currentSessionId || currentSessionId === 'new') {
      const title = lastMessage.content.slice(0, 30) + '...';
      const newSession = await prisma.chatSession.create({
        data: {
          title: title,
          consultantId: consultantId || 'teste-fixo-123',
          isDemo: true, // Útil para filtrar depois o que foi teste
        }
      });
      currentSessionId = newSession.id;
    }

    // 3. Salva a pergunta do Usuário
    await prisma.chatMessage.create({
      data: {
        sessionId: currentSessionId,
        role: 'user',
        content: lastMessage.content,
      }
    });

    console.log(`[CHAT] Iniciando resposta. Modo Mock: ${IS_MOCK_MODE}`);

    // ============================================================
    // PARTE B: GERAÇÃO DA RESPOSTA (DECISÃO INTELIGENTE)
    // ============================================================
    
    let stream: ReadableStream;

    if (IS_MOCK_MODE) {
      // --- MODO 1: MOCK (Simulação Grátis) ---
      stream = createMockStream(currentSessionId);
    } else {
      // --- MODO 2: OPENAI (Real) ---
      stream = await createOpenAIStream(messages, currentSessionId);
    }

    // Retorna o Stream (seja Mock ou Real) para o Frontend
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-session-id': currentSessionId, // Header crucial para a Sidebar
      },
    });

  } catch (error: any) {
    console.error("[ERRO NO CHAT]", error);
    // Se der erro de cota na OpenAI, avisa o usuário
    const msg = error?.status === 429 ? "Erro: Sem créditos na OpenAI." : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ============================================================
// FUNÇÕES AUXILIARES (SEPARADAS PARA ORGANIZAÇÃO)
// ============================================================

/**
 * Função que cria um Stream falso para testes sem custo
 */
function createMockStream(sessionId: string) {
  const mockText = `[MODO TESTE] Esta é uma resposta simulada.
  
  O sistema salvou sua mensagem no banco de dados (Sessão ID: ${sessionId}) e está funcionando perfeitamente.
  
  Para usar a IA real, mude USE_MOCK_AI=false no seu arquivo .env quando tiver créditos.`;

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const chunks = mockText.split(/(?=[ ,.\n])/); // Divide por palavras/espaços

      let fullText = '';

      for (const chunk of chunks) {
        // Simula o tempo de "pensar" e digitar
        await new Promise(r => setTimeout(r, 20)); 
        
        fullText += chunk;
        controller.enqueue(encoder.encode(chunk));
      }

      // Salva no banco ao terminar
      await saveBotMessageToDb(sessionId, fullText);
      controller.close();
    }
  });
}

/**
 * Função que conecta na OpenAI e cria o Stream real
 */
async function createOpenAIStream(messages: any[], sessionId: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages.map((m: any) => ({
      role: m.role,
      content: m.content
    })),
    stream: true,
  });

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
        // Salva no banco ao terminar
        if (fullText) {
            await saveBotMessageToDb(sessionId, fullText);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });
}

/**
 * Função reutilizável para salvar no banco (evita repetir código)
 */
async function saveBotMessageToDb(sessionId: string, content: string) {
    try {
        await prisma.chatMessage.create({
            data: {
              sessionId: sessionId,
              role: 'assistant',
              content: content
            }
          });
          console.log(`[DB] Resposta salva com sucesso na sessão ${sessionId}`);
    } catch (e) {
        console.error("[DB ERROR] Falha ao salvar resposta do bot:", e);
    }
}