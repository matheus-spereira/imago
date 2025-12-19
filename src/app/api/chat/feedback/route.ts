import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { messageId, rating } = await req.json(); // rating: 1 (like) ou -1 (dislike)

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { rating: rating }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar feedback' }, { status: 500 });
  }
}