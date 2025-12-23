import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, name, systemPrompt, description } = body;

    if (!id) return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });

    // 1. Busca o Consultor logado
    const consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } },
      select: { id: true }
    });

    if (!consultant) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Garante que o Agente pertence a este Consultor antes de atualizar
    // Isso impede que um consultor edite o agente de outro.
    const agent = await prisma.agent.findFirst({
      where: { id: id, consultantId: consultant.id }
    });

    if (!agent) return NextResponse.json({ error: 'Agent not found or forbidden' }, { status: 403 });

    // 3. Atualiza os dados
    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: {
        name,
        systemPrompt,
        description
      }
    });

    return NextResponse.json(updatedAgent);

  } catch (error: any) {
    console.error("Erro ao atualizar agente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}