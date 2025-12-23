import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Verifica se está logado
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Busca o Consultor logado
    const consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } }
    });

    if (!consultant) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 2. Busca os Alunos ativos (AccessGrant)
    const students = await prisma.accessGrant.findMany({
      where: { 
        consultantId: consultant.id,
        isActive: true 
      },
      include: {
        student: { // Relacionamento com StudentAccount
          select: { 
            name: true, 
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Formata os dados para o Frontend
    const formatted = students.map(grant => ({
      id: grant.id,
      name: grant.student.name || 'Aluno sem nome',
      email: grant.student.email,
      level: grant.accessLevel,
      since: grant.createdAt
    }));

    return NextResponse.json(formatted);

  } catch (error) {
    console.error("Erro ao buscar alunos:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}