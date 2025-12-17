import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("GET /api/documents - Session:", session?.user?.email); // DEBUG
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Achar o Profile
    const consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } },
      select: { id: true }
    });
    
    console.log("Consultant Found?", consultant?.id); // DEBUG

    if (!consultant) {
      // Se não tem perfil, não tem documentos
      return NextResponse.json({ documents: [] });
    }

    // 2. Buscar documentos
    const documents = await prisma.document.findMany({
      where: { consultantId: consultant.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        mediaType: true,
        status: true,
        createdAt: true,
        errorMessage: true,
      }
    });
    
    console.log("Docs found:", documents.length); // DEBUG

    return NextResponse.json({ documents });

  } catch (error: any) {
    console.error('Error fetching docs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}