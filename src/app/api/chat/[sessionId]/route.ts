import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Busca as mensagens (Mantido igual, está ótimo)
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

// DELETE: Ajustado para garantir a exclusão sem erros
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // 1. Transaction para garantir que tudo seja apagado ou nada seja
    await prisma.$transaction(async (tx) => {
      // Apaga todas as mensagens da sessão primeiro (Garante que não dê erro de chave estrangeira)
      await tx.chatMessage.deleteMany({
        where: { sessionId },
      });

      // Apaga a sessão
      await tx.chatSession.delete({
        where: { id: sessionId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return NextResponse.json({ error: 'Erro ao deletar sessão' }, { status: 500 });
  }
}