import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Identifica o usuário logado
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Busca o ID Real do Consultor
    const consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } },
      select: { id: true }
    });

    if (!consultant) {
      return NextResponse.json([]); // Se não tem perfil, não tem sessões
    }

    // 3. Busca apenas as sessões desse consultor
    const sessions = await prisma.chatSession.findMany({
      where: { consultantId: consultant.id }, // <--- AGORA USA O ID REAL
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(sessions);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar sessões' }, { status: 500 });
  }
}