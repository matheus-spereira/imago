import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Bot, Lock, MessageCircle } from 'lucide-react';
import Link from "next/link";

// 1. Atualizamos a Tipagem: params agora é uma Promise
interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ConsultantStorefrontPage(props: PageProps) {
  // 2. O Await é obrigatório aqui antes de ler o slug
  const params = await props.params;
  const { slug } = params;

  const session = await getServerSession(authOptions);

  // 3. Auth Check: Se não logado, manda pro login
  if (!session) {
    redirect(`/login?callbackUrl=/consultant/${slug}`);
  }

  // 4. Busca o Consultor e seus Agentes Ativos
  const consultant = await prisma.consultantProfile.findUnique({
    where: { slug },
    include: {
      agents: {
        where: { isActive: true }, 
      }
    }
  });

  // Se o slug não existe
  if (!consultant) {
    notFound();
  }

  // 5. SEGURANÇA: Verifica acesso
  let hasAccess = false;

  // A) Dono do perfil
  if (session.user.role === 'CONSULTANT' && session.user.profileId === consultant.id) {
    hasAccess = true;
  }
  
  // B) Aluno com AccessGrant
  if (session.user.role === 'STUDENT') {
    const grant = await prisma.accessGrant.findUnique({
      where: {
        studentAccountId_consultantId: {
          studentAccountId: session.user.id,
          consultantId: consultant.id
        }
      }
    });
    if (grant && grant.isActive) hasAccess = true;
  }

  // --- TELA DE ACESSO NEGADO ---
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="bg-slate-900 border border-red-500/20 p-8 rounded-2xl max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-slate-400 mb-6">
                Você não tem permissão para acessar a área de <strong>{consultant.name}</strong>.
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

  // --- TELA DA VITRINE (Permitido) ---
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="bg-slate-900 border-b border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shadow-purple-900/20">
                    {consultant.name?.[0]}
                </div>
                <div>
                    <h1 className="text-3xl font-bold">{consultant.name}</h1>
                    <p className="text-slate-400">Área do Aluno & Agentes de IA</p>
                </div>
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2 mb-8">
            <Bot className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-semibold">Agentes Disponíveis</h2>
        </div>

        {consultant.agents.length === 0 ? (
             <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center text-slate-500">
                O consultor ainda não publicou nenhum agente.
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {consultant.agents.map((agent) => (
                    <div key={agent.id} className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 hover:border-indigo-500/50 hover:bg-slate-900 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-4">
                                <Bot className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">{agent.name}</h3>
                            <p className="text-sm text-slate-400 mb-6 h-10 line-clamp-2">
                                {agent.description || "Converse com este especialista virtual."}
                            </p>
                            <button className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors">
                                <MessageCircle className="w-4 h-4" />
                                Iniciar Conversa
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}