import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, accessLevel, tags } = await req.json();

    // 1. Identificar Consultor
    const consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } }
    });

    if (!consultant) return NextResponse.json({ error: 'Consultant not found' }, { status: 404 });

    // 2. Verificar se aluno já existe (opcional, mas bom pra evitar duplicidade)
    const existingStudent = await prisma.student.findUnique({
      where: {
        consultantId_email: {
          consultantId: consultant.id,
          email: email
        }
      }
    });

    if (existingStudent) {
      return NextResponse.json({ error: 'Este email já é um aluno cadastrado.' }, { status: 409 });
    }

    // 3. Gerar Token Único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

    // 4. Criar Convite
    const invite = await prisma.invite.create({
      data: {
        email,
        token,
        consultantId: consultant.id,
        accessLevel: Number(accessLevel) || 0,
        tags: tags || [],
        expiresAt,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, token: invite.token });

  } catch (error: any) {
    // Se tentar convidar o mesmo email pendente de novo, o Prisma vai reclamar do @unique no token? 
    // Não, token é unique, email não no schema do Invite. Mas vamos tratar erros genéricos.
    console.error(error);
    return NextResponse.json({ error: error.message || 'Erro ao criar convite' }, { status: 500 });
  }
}