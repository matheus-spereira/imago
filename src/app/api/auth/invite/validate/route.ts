import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token ausente' }, { status: 400 });
  }

  try {
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        consultant: {
          select: { name: true, slug: true } // Pega só o necessário para exibir
        }
      }
    });

    if (!invite) {
      return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 404 });
    }

    if (invite.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Este convite expirou' }, { status: 410 });
    }

    // Retorna os dados para personalizar a tela
    return NextResponse.json({
      valid: true,
      email: invite.email, // Já preenchemos o email para o aluno não errar
      consultantName: invite.consultant.name || 'Um Consultor Imago'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao validar convite' }, { status: 500 });
  }
}