import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase Admin para deletar arquivos do Storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// LISTAR DOCUMENTOS
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } },
      select: { id: true }
    });

    if (!consultant) return NextResponse.json({ documents: [] });

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
        fileKey: true, // <--- NECESSÁRIO PARA ABRIR O ARQUIVO
        summary: true, // <--- O NOVO RESUMO
      }
    });

    return NextResponse.json({ documents });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// EXCLUIR DOCUMENTO
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Pegar ID da URL (?id=...)
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // 1. Verificar se o documento pertence ao usuário
    const doc = await prisma.document.findFirst({
      where: { 
        id,
        consultant: { user: { email: session.user.email } } 
      }
    });

    if (!doc) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });

    // 2. Deletar do Storage (Supabase)
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .remove([doc.fileKey]);

    if (storageError) console.warn("Erro ao deletar do Storage (pode já não existir):", storageError);

    // 3. Deletar do Banco (Prisma deleta chunks em cascata se configurado, mas vamos garantir)
    await prisma.document.delete({ where: { id } });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}