'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bot, Plus, Settings, Loader2, BookOpen, 
  Users, MessageSquare, TrendingUp, LogOut
} from 'lucide-react';
import LogoutButton from '@/components/LogoutButton'; // Certifique-se de ter movido ele para components

interface Agent {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ConsultantProfile {
  name: string;
  slug: string;
}

export default function ConsultantDashboard() {
  const router = useRouter();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [consultant, setConsultant] = useState<ConsultantProfile | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // Estados de Criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Carrega dados em paralelo
    const loadData = async () => {
      try {
        // 1. Busca Agentes
        const agentsRes = await fetch('/api/agents');
        
        // Se der 401 (Não autorizado), o próprio Next/Auth deve lidar, 
        // mas podemos forçar o redirect se a API retornar erro de auth.
        if (agentsRes.status === 401) {
             router.push('/login');
             return;
        }
        
        const agentsData = await agentsRes.json();
        if (Array.isArray(agentsData)) setAgents(agentsData);

        // 2. Busca Perfil (Reaproveitando a lógica de identificação)
        const settingsRes = await fetch('/api/consultant/settings');
        const settingsData = await settingsRes.json();
        
        if (settingsData.consultant) {
          setConsultant(settingsData.consultant);
        } else {
          // Se não tiver perfil, manda pro onboarding (lógica do seu arquivo antigo)
          router.push('/onboarding');
        }

      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setCreating(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      
      if (res.ok) {
        const newAgent = await res.json();
        router.push(`/consultant/${newAgent.slug}/settings`);
      } else {
        alert("Erro ao criar agente");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#0f0f12] text-zinc-500 gap-2">
      <Loader2 className="animate-spin" /> Carregando seu escritório...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f12] text-zinc-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* === CABEÇALHO === */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-white/5">
          <div>
             <h1 className="text-3xl font-bold text-white mb-2">
               Olá, {consultant?.name || 'Consultor'}
             </h1>
             <p className="text-zinc-400 flex items-center gap-2">
               <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-sm font-mono border border-indigo-500/20">
                 @{consultant?.slug}
               </span>
               <span className="text-sm">• Painel de Controle</span>
             </p>
          </div>
          
          <div className="flex items-center gap-3">
             <Link 
               href="/consultant/account"
               className="bg-[#18181b] hover:bg-[#27272a] text-zinc-300 px-4 py-2.5 rounded-lg text-sm font-medium border border-white/10 transition-colors flex items-center gap-2"
             >
               <Settings size={16} /> Minha Conta
             </Link>
             {/* Componente LogoutButton reutilizado aqui */}
             <div className="[&>div>button]:bg-red-500/10 [&>div>button]:text-red-400 [&>div>button]:border-red-500/20 [&>div>button]:hover:bg-red-500/20">
                <LogoutButton /> 
             </div>
          </div>
        </header>

        {/* === STATS RÁPIDOS (Opcional, mas dá um ar profissional) === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400"><Bot size={24}/></div>
              <div>
                 <p className="text-2xl font-bold text-white">{agents.length}</p>
                 <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Agentes Ativos</p>
              </div>
           </div>
           <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><Users size={24}/></div>
              <div>
                 <p className="text-2xl font-bold text-white">--</p>
                 <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Alunos Totais</p>
              </div>
           </div>
           <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400"><MessageSquare size={24}/></div>
              <div>
                 <p className="text-2xl font-bold text-white">--</p>
                 <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Interações (Mês)</p>
              </div>
           </div>
        </div>

        {/* === MEUS AGENTES === */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bot className="text-indigo-500"/> Meus Agentes
            </h2>
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
            >
              <Plus size={18} /> Novo Agente
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card: Criar Novo (Atalho) */}
            <div 
              onClick={() => setShowCreateModal(true)}
              className="border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-indigo-500/20 flex items-center justify-center mb-4 transition-colors">
                <Plus className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300 group-hover:text-white">Criar Novo Agente</h3>
              <p className="text-sm text-zinc-500 mt-2">Adicione um novo especialista à sua equipe.</p>
            </div>

            {/* Lista de Agentes */}
            {agents.map(agent => (
              <div key={agent.id} className="bg-[#18181b] border border-white/5 rounded-xl p-6 flex flex-col hover:border-white/10 transition-all group relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/consultant/${agent.slug}/settings`} className="p-2 text-zinc-500 hover:text-white block bg-zinc-800 rounded-lg">
                    <Settings size={16} />
                  </Link>
                </div>

                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 border border-white/5">
                  <Bot className="w-6 h-6 text-indigo-400" />
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-1 truncate pr-8">{agent.name}</h3>
                <p className="text-xs text-zinc-500 font-mono mb-4 truncate">/{agent.slug}</p>
                <p className="text-sm text-zinc-400 line-clamp-2 mb-6 flex-1 h-10">
                  {agent.description || "Sem descrição definida."}
                </p>

                <div className="flex gap-2 mt-auto pt-4 border-t border-white/5">
                  <Link 
                    href={`/consultant/${agent.slug}/knowledge`}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <BookOpen size={16} /> Base
                  </Link>
                  <Link 
                    href={`/consultant/${agent.slug}/settings`}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Settings size={16} /> Config
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold text-white mb-4">Nome do Agente</h2>
              <form onSubmit={handleCreateAgent}>
                <input 
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Mentor de Vendas"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 mb-6"
                />
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">Cancelar</button>
                  <button 
                    type="submit" 
                    disabled={creating || !newName.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                  >
                    {creating && <Loader2 className="animate-spin w-4 h-4" />}
                    {creating ? 'Criando...' : 'Criar Agente'}
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}