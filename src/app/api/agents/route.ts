import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Lista todos os agentes do consultor logado
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const consultant = await prisma.consultantProfile.findFirst({
    where: { user: { email: session.user.email } },
    select: { id: true }
  });

  if (!consultant) return NextResponse.json([]);

  const agents = await prisma.agent.findMany({
    where: { consultantId: consultant.id },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(agents);
}

// POST: Cria um NOVO agente
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name } = await req.json();

    const consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } },
      select: { id: true }
    });

    if (!consultant) return NextResponse.json({ error: 'Consultant not found' }, { status: 404 });

    // Gera um slug simples a partir do nome
    let baseSlug = name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]/g, '-'); // Troca espaços/símbolos por traço
    
    // Garante unicidade simples (adicionando timestamp se precisar, ou apenas checando)
    // Para MVP, vamos confiar que o usuário não vai criar dois nomes iguais seguidos, 
    // mas o ideal seria um loop de verificação.
    const checkSlug = await prisma.agent.findUnique({
        where: { consultantId_slug: { consultantId: consultant.id, slug: baseSlug } }
    });
    
    if (checkSlug) {
        baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const newAgent = await prisma.agent.create({
      data: {
        name,
        slug: baseSlug,
        consultantId: consultant.id,
        systemPrompt: "Você é um assistente útil.", // Prompt inicial padrão
        model: 'GPT_4o_MINI'
      }
    });

    return NextResponse.json(newAgent);

  } catch (error: any) {
    console.error("Erro ao criar agente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}