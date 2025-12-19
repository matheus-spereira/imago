import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    // 1. Pega a sessão real do usuário logado
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Busca o perfil de consultor ligado a esse email
    const consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } },
      select: { 
        id: true,    // <--- IMPORTANTE: Agora retornamos o ID real
        name: true, 
        slug: true 
      } 
    });

    if (!consultant) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    return NextResponse.json(consultant);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar consultor' }, { status: 500 });
  }
}