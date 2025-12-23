import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Certifique-se que o caminho do seu prisma client está correto
import { hash } from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, inviteToken } = body;

    // 1. Validações Básicas
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    // 2. Verifica se o email já existe na tabela de ALUNOS
    const existingStudent = await prisma.studentAccount.findUnique({
      where: { email },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado como aluno.' },
        { status: 409 } // Conflict
      );
    }

    // 3. Criptografa a senha (Nunca salvar senha pura!)
    const passwordHash = await hash(password, 10);

    // ============================================================
    // CENÁRIO A: REGISTRO COM CONVITE (O Aluno veio de um link)
    // ============================================================
    if (inviteToken) {
      // Busca o convite
      const invite = await prisma.invite.findUnique({
        where: { token: inviteToken },
      });

      // Se convite inválido ou expirado
      if (!invite || invite.expiresAt < new Date() || invite.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Convite inválido ou expirado.' },
          { status: 400 }
        );
      }

      // CRIAÇÃO COM TRANSAÇÃO (Tudo ou nada)
      // Cria o aluno, Cria o Acesso (Grant) e Atualiza o Convite
      const newStudent = await prisma.$transaction(async (tx) => {
        // A. Cria Aluno (Com os créditos definidos no convite)
        const student = await tx.studentAccount.create({
          data: {
            name,
            email,
            passwordHash,
            creditBalance: invite.initialCredits, // Créditos do convite
          },
        });

        // B. Cria o AccessGrant (Vínculo com o Consultor)
        await tx.accessGrant.create({
          data: {
            studentAccountId: student.id,
            consultantId: invite.consultantId,
            accessLevel: invite.accessLevel,
            tags: invite.tags,
          },
        });

        // C. Marca convite como usado
        await tx.invite.update({
          where: { id: invite.id },
          data: { status: 'ACCEPTED' },
        });

        return student;
      });

      return NextResponse.json({
        message: 'Aluno registrado e vinculado ao consultor com sucesso!',
        studentId: newStudent.id,
      });
    }

    // ============================================================
    // CENÁRIO B: REGISTRO COMUM (Sem convite, orgânico)
    // ============================================================
    
    // Cria apenas o aluno com saldo padrão (definido no schema como 10)
    const newStudent = await prisma.studentAccount.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    return NextResponse.json({
      message: 'Aluno registrado com sucesso!',
      studentId: newStudent.id,
    });

  } catch (error) {
    console.error('[REGISTER_STUDENT_ERROR]', error);
    return NextResponse.json(
      { error: 'Erro interno ao registrar aluno.' },
      { status: 500 }
    );
  }
}