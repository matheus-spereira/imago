// src/app/hub/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; 
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton"; // Reusamos o botão!
import { Wallet, Users, MessageSquare } from 'lucide-react';

export default async function StudentHubPage() {
  // 1. Segurança: Verifica Sessão
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // 2. Segurança: Verifica se é ALUNO mesmo
  // Se um consultor tentar entrar aqui, mandamos ele pro dashboard dele
  if (session.user.role !== 'STUDENT') {
      redirect('/consultant/dashboard');
  }

  // 3. Busca dados do Aluno (Saldo e Acessos)
  const student = await prisma.studentAccount.findUnique({
    where: { id: session.user.id },
    include: {
        accessGrants: {
            include: {
                consultant: true // Traz os dados dos consultores que ele segue
            }
        }
    }
  });

  if (!student) return <div>Erro: Conta de aluno não encontrada.</div>;

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden text-white">
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-5xl mx-auto p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
            <div>
                <h1 className="text-3xl font-bold">Olá, {student.name}</h1>
                <p className="text-slate-400">Bem-vindo ao seu Hub de aprendizado.</p>
            </div>
            <LogoutButton />
        </header>

        {/* Card de Saldo (A "Carteira" do aluno) */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-slate-900 border border-emerald-500/20 p-8 rounded-3xl mb-12 flex items-center justify-between">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                    <Wallet className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Seu Saldo</h2>
                    <div className="text-4xl font-bold text-white">{student.creditBalance} <span className="text-lg text-slate-500 font-normal">créditos</span></div>
                </div>
            </div>
            <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors font-medium">
                Comprar +
            </button>
        </div>

        {/* Lista de Consultores (Meus Mentores) */}
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            Seus Mentores
        </h3>

        {student.accessGrants.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                <p className="text-slate-400">Você ainda não tem acesso a nenhum consultor.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {student.accessGrants.map((grant) => (
                    <div key={grant.id} className="bg-slate-900 border border-white/10 p-6 rounded-2xl hover:border-emerald-500/50 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-xl font-bold">
                                {grant.consultant.name?.[0]}
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-md font-medium">
                                Ativo
                            </span>
                        </div>
                        
                        <h4 className="text-lg font-bold mb-1">{grant.consultant.name}</h4>
                        <p className="text-sm text-slate-500 mb-6 line-clamp-2">
                           Acesse a área exclusiva para interagir com os agentes deste mentor.
                        </p>

                        <a 
                           href={`/consultant/${grant.consultant.slug}`} 
                           className="block w-full py-3 text-center bg-white text-slate-950 font-bold rounded-xl group-hover:bg-emerald-400 transition-colors"
                        >
                           Acessar Área
                        </a>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
}