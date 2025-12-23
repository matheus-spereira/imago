'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bot, Plus, Settings, Loader2, BookOpen 
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAgents(data);
      })
      .finally(() => setLoading(false));
  }, []);

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
        // Redireciona para as configurações do novo agente
        router.push(`/consultant/${newAgent.slug}/settings`);
      } else {
        alert("Erro ao criar agente");
      }
    } catch (error) { console.error(error); } 
    finally { setCreating(false); }
  };

  if (loading) return <div className="flex h-full items-center justify-center text-zinc-500 gap-2"><Loader2 className="animate-spin"/> Carregando agentes...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Meus Agentes</h2>
          <p className="text-zinc-400">Gerencie e crie novos assistentes virtuais.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-900/20"
        >
          <Plus size={20} /> Novo Agente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Criar Novo (Atalho) */}
        <div 
          onClick={() => setShowCreateModal(true)}
          className="border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[240px]"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-indigo-500/20 flex items-center justify-center mb-4 transition-colors">
            <Plus className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300 group-hover:text-white">Criar Novo</h3>
        </div>

        {/* Lista de Agentes */}
        {agents.map(agent => (
          <div key={agent.id} className="bg-[#18181b] border border-white/5 rounded-xl p-6 flex flex-col hover:border-white/10 transition-all group relative">
             <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Bot size={20} />
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${agent.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-white/5'}`}>
                   {agent.isActive ? 'ONLINE' : 'PAUSADO'}
                </div>
             </div>
             
             <h3 className="text-lg font-bold text-white truncate">{agent.name}</h3>
             <p className="text-xs text-zinc-500 font-mono mb-4">/{agent.slug}</p>
             <p className="text-sm text-zinc-400 line-clamp-2 mb-6 flex-1">{agent.description || "Sem descrição."}</p>

             <div className="grid grid-cols-2 gap-2 mt-auto">
                {/* Links corrigidos para a estrutura /consultant/[slug]/... */}
                <Link href={`/consultant/${agent.slug}/knowledge`} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2">
                  <BookOpen size={14}/> Base
                </Link>
                <Link href={`/consultant/${agent.slug}/settings`} className="bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2">
                  <Settings size={14}/> Config
                </Link>
             </div>
          </div>
        ))}
      </div>

      {/* Modal Criar */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold text-white mb-4">Nome do Agente</h2>
              <form onSubmit={handleCreateAgent}>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Mentor de Vendas" className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 mb-6"/>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                  <button type="submit" disabled={creating || !newName.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                    {creating && <Loader2 className="animate-spin w-4 h-4" />} {creating ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}