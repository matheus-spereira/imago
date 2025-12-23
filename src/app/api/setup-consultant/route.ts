import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log("Iniciando criação de consultor...");

    // 1. Criar (ou buscar) um Usuário Base
    const user = await prisma.user.upsert({
      where: { email: 'admin@imago.com' },
      update: {},
      create: {
        email: 'admin@imago.com',
        name: 'Admin Imago',
        password: 'hash-temporario', // Apenas para dev
      },
    });

    console.log("Usuário criado/encontrado:", user.id);

    // 2. Criar (ou buscar) o Perfil do Consultor vinculado a esse usuário
    const consultant = await prisma.consultantProfile.upsert({
      where: { userId: user.id }, // O perfil é único por usuário
      update: {},
      create: {
        userId: user.id,
        name: 'Matheus Pereira',
        slug: 'matheus-imago', // Slug único
        plan: 'PRO',
      },
    });

    console.log("Consultor criado com Sucesso. ID:", consultant.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Consultor criado com sucesso!',
      IMPORTANT_CONSULTANT_ID: consultant.id  // <--- ESSE É O ID QUE VOCÊ PRECISA
    });

  } catch (error: any) {
    console.error("Erro ao criar consultor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}