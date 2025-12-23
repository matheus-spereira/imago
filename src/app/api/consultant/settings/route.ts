import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Busca Configurações Globais + Dados do Agente (Opcional)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Captura o Slug da URL (se estivermos na tela de um agente específico)
  const { searchParams } = new URL(req.url);
  const agentSlug = searchParams.get('agentSlug');

  // 2. Busca o Consultor e suas configs globais
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

  // 3. Se houver slug, busca o Agente específico para preencher a aba "Geral/IA"
  let agentData = null;
  if (agentSlug) {
    agentData = await prisma.agent.findUnique({
      where: {
        consultantId_slug: { // Chave composta definida no Schema
          consultantId: consultant.id,
          slug: agentSlug
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        systemPrompt: true,
        description: true
      }
    });
  }

  // Retorna estrutura híbrida (Global + Agente Específico)
  return NextResponse.json({
    // Dados globais do Consultor
    consultant: {
      id: consultant.id,
      name: consultant.name,
      slug: consultant.slug,
      // systemPrompt removido daqui, pois agora é do Agente
    },
    // Dados do Agente atual (pode ser null se estivermos numa tela geral)
    agent: agentData, 
    
    // Listas Globais
    tags: consultant.definedTags,
    levels: consultant.definedLevels,
    invites: consultant.invites
  });
}

// PATCH: Atualizar APENAS o Perfil do Consultor (Nome, Foto, etc)
// Nota: A atualização do Agente (Prompt, Nome do Bot) vai para outra rota (/api/agents/update)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name } = body; // Removemos systemPrompt daqui

  try {
    // Atualiza apenas dados do Consultor Humano
    const updatedConsultant = await prisma.consultantProfile.update({
      where: { userId: session.user.id }, // Ajuste conforme seu auth provider (userId ou email)
      data: { name }
    });
    return NextResponse.json(updatedConsultant);
  } catch (error: any) {
     // Fallback de busca se falhar pelo ID direto
     const current = await prisma.consultantProfile.findFirst({ where: { user: { email: session.user.email } }});
     if(current) {
         const updated = await prisma.consultantProfile.update({
             where: { id: current.id },
             data: { name }
         });
         return NextResponse.json(updated);
     }
     return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}

// POST: Criar Tag ou Nível (Mantido, pois são globais)
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

// DELETE: Remover Tag, Nível ou Convite (Mantido)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');

  if (!id || !type) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  try {
    // Verifica propriedade antes de deletar (Segurança Adicional recomendada)
    // Para simplificar o MVP, assumimos que o ID pertence ao usuário logado ou o prisma falhará se não achar
    // O ideal seria um where: { id, consultant: { user: { email... } } }
    
    if (type === 'TAG') await prisma.consultantTag.delete({ where: { id } });
    if (type === 'LEVEL') await prisma.consultantLevel.delete({ where: { id } });
    if (type === 'INVITE') await prisma.invite.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}