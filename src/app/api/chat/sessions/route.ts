import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // --- ID FIXO PARA TESTE ---
    const userId = 'cmjhr82pa00052wxwak5bc4jt'; 
    // --------------------------

    // Busca apenas as sessões criadas por este usuário específico
    const sessions = await prisma.chatSession.findMany({
      where: { 
        userId: userId // <--- Busca pelo DONO da conversa (o estudante)
      },
      orderBy: { 
        updatedAt: 'desc' // As mais recentes primeiro
      },
      // Opcional: Se quiser trazer o nome do consultor para exibir na lista
      // include: {
      //   consultant: { select: { name: true } }
      // }
    });

    return NextResponse.json(sessions);

  } catch (error) {
    console.error("Erro ao buscar sessões:", error);
    return NextResponse.json({ error: 'Erro ao buscar sessões' }, { status: 500 });
  }
}