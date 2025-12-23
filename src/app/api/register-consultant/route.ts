import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Confirme se o path do lib está aqui
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { 
      name, email, password, phone, 
      companyName, slug, niche 
    } = data;

    // 1. Validações
    if (!email || !password || !companyName || !slug) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 });
    }

    // Verifica se email já existe (Tabela User)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado.' }, { status: 409 });
    }

    // Verifica se Slug já existe (Tabela Profile)
    const existingSlug = await prisma.consultantProfile.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ error: 'Esta URL já está em uso.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 2. Transação: Cria User + Profile + Primeiro Agente
    await prisma.$transaction(async (tx) => {
      
      // A) Cria o Usuário de Login
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: passwordHash,
          // Removido 'role' pois não existe no schema User
        }
      });

      // B) Cria o Perfil de Negócios
      const newProfile = await tx.consultantProfile.create({
        data: {
          userId: newUser.id,
          name: companyName,
          slug,
          phone,
          plan: 'STARTER'
          // Removido 'systemPrompt' pois não existe no schema Profile
        }
      });

      // C) [MELHORIA] Cria o Primeiro Agente (IA) automaticamente com o nicho
      if (niche) {
        await tx.agent.create({
          data: {
            consultantId: newProfile.id,
            name: "Assistente Principal",
            slug: "assistente", // Slug padrão inicial
            model: "GPT_4o_MINI",
            systemPrompt: `Você é um especialista em ${niche}. Atue como um consultor sênior ajudando alunos e clientes desta área.`,
            isActive: true
          }
        });
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro cadastro consultor:', error);
    return NextResponse.json({ error: 'Erro interno ao criar conta.' }, { status: 500 });
  }
}