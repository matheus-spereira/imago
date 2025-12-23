import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Buscar TUDO (Perfil, Tags, Níveis, Convites)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const consultant = await prisma.consultantProfile.findFirst({
    where: { user: { email: session.user.email } },
    include: {
      definedTags: { orderBy: { name: 'asc' } },
      definedLevels: { orderBy: { levelNumber: 'asc' } },
      invites: { 
        where: { status: 'PENDING' }, // Só mostra convites pendentes
        orderBy: { createdAt: 'desc' } 
      }
    }
  });

  if (!consultant) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Retorna estrutura compatível com o Frontend
  return NextResponse.json({
    consultant: {
      id: consultant.id,
      name: consultant.name,
      slug: consultant.slug,
      systemPrompt: consultant.systemPrompt
    },
    tags: consultant.definedTags,
    levels: consultant.definedLevels,
    invites: consultant.invites
  });
}

// PATCH: Atualizar Perfil (Nome e Cérebro da IA)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, systemPrompt } = body;

  try {
    const consultant = await prisma.consultantProfile.update({
      where: { userId: session.user.id }, // Assume que userId é unico (relação 1:1)
      data: {
        name,
        systemPrompt
      }
    });
    return NextResponse.json(consultant);
  } catch (error: any) {
    // Fallback: se não achar por userId direto (dependendo de como o prisma gera), busca primeiro
    const current = await prisma.consultantProfile.findFirst({ where: { user: { email: session.user.email } }});
    if(current) {
        const updated = await prisma.consultantProfile.update({
            where: { id: current.id },
            data: { name, systemPrompt }
        });
        return NextResponse.json(updated);
    }
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

// POST: Criar Tag ou Nível
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { type, name, levelNumber } = body;

  const consultant = await prisma.consultantProfile.findFirst({
    where: { user: { email: session.user.email } }
  });

  if (!consultant) return NextResponse.json({ error: 'Consultant not found' }, { status: 404 });

  try {
    if (type === 'TAG') {
      const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '-');
      const newTag = await prisma.consultantTag.create({
        data: { name: normalizedName, consultantId: consultant.id }
      });
      return NextResponse.json(newTag);
    } 
    
    if (type === 'LEVEL') {
      const newLevel = await prisma.consultantLevel.create({
        data: { name: name.trim(), levelNumber: Number(levelNumber), consultantId: consultant.id }
      });
      return NextResponse.json(newLevel);
    }
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Item duplicado.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// DELETE: Remover Tag, Nível ou CONVITE
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type'); // 'TAG', 'LEVEL', 'INVITE'

  if (!id || !type) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  try {
    if (type === 'TAG') await prisma.consultantTag.delete({ where: { id } });
    if (type === 'LEVEL') await prisma.consultantLevel.delete({ where: { id } });
    if (type === 'INVITE') await prisma.invite.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}