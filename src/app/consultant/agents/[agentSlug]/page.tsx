import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Bot, Lock, ShieldCheck } from 'lucide-react';
import Link from "next/link";
import StartChatButton from "@/components/StartChatButton";

interface PageProps {
  params: Promise<{ agentSlug: string }>;
}

export default async function AgentLandingPage(props: PageProps) {
  const params = await props.params;
  const { agentSlug } = params;

  if (!agentSlug) {
     return <div>Erro: Identificador não encontrado.</div>;
  }

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/login?callbackUrl=/consultant/${agentSlug}`);
  }

  // 1. Alterado: Busca o AGENTE pelo slug, incluindo dados do Consultor dono
  const agent = await prisma.agent.findFirst({
    where: { 
      slug: agentSlug,
      isActive: true
    },
    include: {
      consultant: true
    }
  });

  if (!agent) {
    notFound();
  }

  // 2. Lógica de Acesso atualizada para verificar Nível
  let hasAccess = false;

  // Se for o próprio consultor dono
  if (session.user.role === 'CONSULTANT' && session.user.profileId === agent.consultantId) {
    hasAccess = true;
  }
  
  // Se for aluno, verifica se tem grant e se o nível é suficiente
  if (session.user.role === 'STUDENT') {
    const grant = await prisma.accessGrant.findUnique({
      where: {
        studentAccountId_consultantId: {
          studentAccountId: session.user.id,
          consultantId: agent.consultantId
        }
      }
    });
    
    // Verifica se o grant existe, está ativo E se o nível do aluno >= nível do agente
    if (grant && grant.isActive && grant.accessLevel >= (agent.accessLevel || 0)) {
       hasAccess = true;
    }
  }

  // Tela de Bloqueio (Mantida estrutura, ajustado textos)
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="bg-slate-900 border border-red-500/20 p-8 rounded-2xl max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-slate-400 mb-6">
                Este agente requer <strong>Nível {agent.accessLevel}</strong> de acesso.<br/>
                Entre em contato com <strong>{agent.consultant.name}</strong> para liberar.
            </p>
            <Link 
              href="/hub"
              className="inline-block w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
            >
              Voltar para meu Hub
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
        
        {/* Lado Esquerdo: Informações do Agente */}
        <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20">
                <ShieldCheck className="w-3 h-3" />
                Agente Oficial de {agent.consultant.name}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                {agent.name}
            </h1>
            
            <p className="text-lg text-slate-400 leading-relaxed">
                {agent.description || "Sou um assistente virtual especializado pronto para tirar suas dúvidas e ajudar nos seus processos."}
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <StartChatButton 
                        agentId={agent.id} 
                        consultantId={agent.consultantId} 
                    />
                </div>
            </div>
        </div>

        {/* Lado Direito: Visual / Avatar */}
        <div className="relative hidden md:flex items-center justify-center">
            {/* Efeitos de Fundo */}
            <div className="absolute w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute w-48 h-48 bg-purple-500/10 rounded-full blur-2xl top-0 right-10" />
            
            {/* Card do Avatar */}
            <div className="relative bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-5xl font-bold shadow-lg shadow-indigo-900/20 mx-auto mb-6 text-white">
                    <Bot className="w-16 h-16" />
                </div>
                <div className="text-center">
                    <p className="text-slate-500 text-sm uppercase tracking-wider font-bold">Status</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-emerald-400 font-medium">Online e Pronto</span>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}