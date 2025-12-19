import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Em produção, pegaria da sessão. Aqui usamos o ID de teste.
    const consultantId = 'teste-fixo-123'; 

    const consultant = await prisma.consultantProfile.findUnique({
      where: { id: consultantId },
      select: { name: true, slug: true } // Adicione 'image' se tiver no schema
    });

    if (!consultant) return NextResponse.json({ name: 'Consultor' });

    return NextResponse.json(consultant);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar consultor' }, { status: 500 });
  }
}