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

// LISTAR DOCUMENTOS (FILTRADO POR AGENTE)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Pegar o Agent ID da URL (se existir)
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    // 2. Identificar o Consultor Logado
    const consultant = await prisma.consultantProfile.findFirst({
      where: { user: { email: session.user.email } },
      select: { id: true }
    });

    if (!consultant) return NextResponse.json({ documents: [] });

    // 3. Montar o filtro (Where Clause)
    // Começa filtrando pelo dono (Consultant) para segurança
    const whereClause: any = { 
      consultantId: consultant.id 
    };

    // Se um Agente específico foi solicitado, filtra pela relação Many-to-Many
    if (agentId) {
      whereClause.agents = {
        some: {
          id: agentId
        }
      };
    }

    // 4. Buscar Documentos
    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        mediaType: true,
        status: true,
        createdAt: true,
        errorMessage: true,
        fileKey: true,
        summary: true,
        tags: true,
        accessLevel: true
      }
    });

    return NextResponse.json({ documents });

  } catch (error: any) {
    console.error("Erro ao buscar documentos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// EXCLUIR DOCUMENTO (Mantido igual, pois quem deleta é o Consultor dono)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Verificar se o documento pertence ao usuário
    const doc = await prisma.document.findFirst({
      where: { 
        id,
        consultant: { user: { email: session.user.email } } 
      }
    });

    if (!doc) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });

    // Deletar do Storage (Supabase)
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .remove([doc.fileKey]);

    if (storageError) console.warn("Erro ao deletar do Storage:", storageError);

    // Deletar do Banco
    await prisma.document.delete({ where: { id } });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}