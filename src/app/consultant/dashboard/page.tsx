import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Bot, Users, MessageSquare, TrendingUp, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  // Buscar Consultor
  const consultant = await prisma.consultantProfile.findFirst({
    where: { user: { email: session?.user?.email } },
    include: { agents: true } // Inclui agentes para contagem rápida
  });

  if (!consultant) return <div>Carregando...</div>;

  // Dados Reais (Simples) + Mocks (Para o que ainda não temos no banco)
  const activeAgents = consultant.agents.filter(a => a.isActive).length;
  const totalAgents = consultant.agents.length;
  
  // Mocks (Futuramente faremos queries reais nessas tabelas)
  const totalStudents = 124; 
  const totalMessages = 8532; 
  
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white">Visão Geral</h2>
        <p className="text-zinc-400">Bem-vindo de volta, {consultant.name}.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={Bot} label="Agentes Ativos" value={`${activeAgents}/${totalAgents}`} color="indigo" />
        <KpiCard icon={Users} label="Total de Alunos" value={totalStudents} color="emerald" />
        <KpiCard icon={MessageSquare} label="Mensagens (Mês)" value={totalMessages.toLocaleString()} color="blue" />
        <KpiCard icon={TrendingUp} label="Receita (Est.)" value="R$ 4.250" color="amber" />
      </div>

      {/* Seção Principal: Gráficos e Atividade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico Principal (Simulado Visualmente) */}
        <div className="lg:col-span-2 bg-[#18181b] border border-white/5 rounded-xl p-6">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-white">Engajamento Diário</h3>
              <select className="bg-black/20 text-xs text-zinc-400 border border-white/10 rounded px-2 py-1">
                <option>Últimos 7 dias</option>
                <option>Últimos 30 dias</option>
              </select>
           </div>
           {/* Placeholder do Gráfico */}
           <div className="h-64 flex items-end gap-2 px-2">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/40 rounded-t-sm transition-all relative group" style={{ height: `${h}%` }}>
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{h * 10} msgs</div>
                </div>
              ))}
           </div>
           <div className="flex justify-between text-xs text-zinc-600 mt-2 px-2">
              <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
           </div>
        </div>

        {/* Feed de Atividades Recentes */}
        <div className="bg-[#18181b] border border-white/5 rounded-xl p-6">
           <h3 className="font-semibold text-white mb-4">Atividade Recente</h3>
           <div className="space-y-4">
              {[1,2,3,4,5].map((_, i) => (
                <div key={i} className="flex gap-3 items-start">
                   <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 shrink-0" />
                   <div>
                      <p className="text-sm text-zinc-300">Novo aluno <strong>João Silva</strong> entrou no agente <strong>Vendas</strong>.</p>
                      <p className="text-xs text-zinc-600">Há 2 horas</p>
                   </div>
                </div>
              ))}
           </div>
           <button className="w-full mt-6 py-2 text-xs text-zinc-400 hover:text-white border border-white/5 rounded hover:bg-white/5 transition-colors">
             Ver todo histórico
           </button>
        </div>

      </div>

      {/* Atalho para Agentes */}
      <div className="flex justify-end">
        <Link href="/consultant/agents" className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300">
           Gerenciar Agentes <ArrowUpRight size={16} />
        </Link>
      </div>

    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    indigo: "text-indigo-400 bg-indigo-400/10",
    emerald: "text-emerald-400 bg-emerald-400/10",
    blue: "text-blue-400 bg-blue-400/10",
    amber: "text-amber-400 bg-amber-400/10",
  };

  return (
    <div className="bg-[#18181b] border border-white/5 p-6 rounded-xl flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{label}</p>
      </div>
    </div>
  );
}