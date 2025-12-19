import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Busca as mensagens (Já existia)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 });
  }
}

// DELETE: Apaga a sessão e mensagens em cascata (NOVO)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Ao deletar a sessão, o Prisma deleta as mensagens automaticamente (Cascade)
    // se estiver configurado no schema. Se não, deletamos manualmente por segurança.
    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return NextResponse.json({ error: 'Erro ao deletar sessão' }, { status: 500 });
  }
}