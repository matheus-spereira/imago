import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. Validar Sessão
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    // CORREÇÃO AQUI: Extraindo tags e accessLevel do body
    const { fileKey, fileName, mediaType, tags, accessLevel } = body;

    // 2. Buscar ou CRIAR o Perfil do Consultor (Auto-Onboarding)
    let consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } }
    });

    if (!consultant) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      });

      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const baseSlug = (user.name || session.user.email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      
      consultant = await prisma.consultantProfile.create({
        data: {
          userId: user.id,
          name: user.name || 'Consultor Imago',
          slug: `${baseSlug}-${Date.now()}`,
          plan: 'STARTER'
        }
      });
    }

    // 3. Registrar o Documento no Banco
    const document = await prisma.document.create({
      data: {
        consultantId: consultant.id,
        fileName,
        fileKey,
        mediaType,
        status: 'PENDING',
        // Agora as variáveis existem no escopo
        tags: tags || [],          
        accessLevel: accessLevel || 0 
      }
    });

    // 4. Disparar Processamento (Simulação de Worker)
    const workerUrl = `${process.env.NEXTAUTH_URL || req.nextUrl.origin}/api/ingest/worker`;
    
    fetch(workerUrl, {
      method: 'POST',
      body: JSON.stringify({ documentId: document.id }),
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error("Erro ao disparar worker:", err));

    return NextResponse.json({ 
      success: true, 
      documentId: document.id, 
      status: 'PENDING' 
    });

  } catch (error: any) {
    console.error('Erro na rota register:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}