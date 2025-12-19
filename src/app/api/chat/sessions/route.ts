import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Usamos o mesmo ID fixo de teste definido no seed e no POST
    const consultantId = 'teste-fixo-123'; 

    const sessions = await prisma.chatSession.findMany({
      where: { consultantId },
      orderBy: { updatedAt: 'desc' }, // As mais recentes primeiro
    });

    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar sessões' }, { status: 500 });
  }
}