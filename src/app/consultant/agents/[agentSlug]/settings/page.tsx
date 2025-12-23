'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Save, Bot, AlertCircle, Loader2, Link as LinkIcon, Users, Copy, Trash2
} from 'lucide-react';

interface AgentData {
  id: string;
  name: string;
  slug: string;
  systemPrompt: string;
  description?: string;
  accessLevel: number; // O nível mínimo que esse agente exige
}

interface Invite {
  id: string;
  email: string;
  token: string;
  accessLevel: number;
}

export default function AgentSettingsPage() {
  const params = useParams();
  const agentSlug = params.agentSlug as string;

  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'users'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [agentUsers, setAgentUsers] = useState<Invite[]>([]); // Usuários com acesso a ESTE agente

  // Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [requiredLevel, setRequiredLevel] = useState(0);
  
  // Invite State
  const [inviteEmail, setInviteEmail] = useState('');

  // 1. Carregar Dados
  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        const res = await fetch(`/api/consultant/settings?agentSlug=${agentSlug}`);
        const data = await res.json();
        
        if (data.agent) {
          setAgent(data.agent);
          setName(data.agent.name);
          setDescription(data.agent.description || '');
          setPrompt(data.agent.systemPrompt);
          setRequiredLevel(data.agent.accessLevel || 0);

          // Filtra visualmente os convites que teriam acesso a este agente
          // (Aqueles cujo nível é >= ao nível do agente)
          if (data.invites) {
            const relevantInvites = data.invites.filter((inv: Invite) => 
               inv.accessLevel >= (data.agent.accessLevel || 0)
            );
            setAgentUsers(relevantInvites);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgentData();
  }, [agentSlug]);

  // 2. Salvar Agente
  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      await fetch('/api/agents/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: agent.id,
          name,
          description,
          systemPrompt: prompt,
          accessLevel: requiredLevel // Salvamos o nível exigido
        })
      });
      alert('Agente atualizado!');
    } catch (error) {
      alert('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  // 3. Convidar Aluno (Contextual)
  const handleInviteToThisAgent = async () => {
    if (!inviteEmail) return;
    
    // TRUQUE: Ao convidar por aqui, damos o nível exato que este agente exige.
    // Assim o aluno ganha acesso a este agente (e outros do mesmo nível).
    const res = await fetch('/api/consultant/invite', {
      method: 'POST',
      body: JSON.stringify({ 
        email: inviteEmail, 
        accessLevel: requiredLevel // <--- O Pulo do Gato
      })
    });

    if (res.ok) {
      setInviteEmail('');
      alert(`Convite enviado com acesso Nível ${requiredLevel}!`);
      // Recarregar lista (simplificado)
      window.location.reload();
    } else {
      alert('Erro ao convidar.');
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado!');
  };

  if (loading) return <div className="flex h-screen items-center justify-center gap-2 text-zinc-500"><Loader2 className="animate-spin"/> Carregando...</div>;
  if (!agent) return <div className="p-8 text-red-400">Agente não encontrado.</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* Sidebar Local */}
      <aside className="w-full md:w-64 bg-[#131316] border-r border-white/5 p-4 flex flex-col gap-2">
         <div className="mb-6 px-2">
            <h1 className="font-bold text-white truncate">{name}</h1>
            <p className="text-xs text-zinc-500">Configuração do Agente</p>
         </div>
         
         <button onClick={() => setActiveTab('general')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <Bot size={18}/> Identidade
         </button>
         <button onClick={() => setActiveTab('ai')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <AlertCircle size={18}/> Cérebro (IA)
         </button>
         <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <Users size={18}/> Alunos do Agente
         </button>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto bg-[#0f0f12] p-8">
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">

          {/* === GERAL === */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Identidade do Agente</h2>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm text-zinc-400">Nome</label>
                   <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-indigo-500"/>
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-sm text-zinc-400">Slug</label>
                   <div className="w-full bg-zinc-800 p-3 rounded-lg text-zinc-500 text-sm flex gap-2">
                     <LinkIcon size={14} className="mt-0.5"/> /{agent.slug}
                   </div>
                 </div>

                 {/* Controle de Acesso do Agente */}
                 <div className="space-y-2 pt-4 border-t border-white/5">
                   <label className="text-sm text-emerald-400 font-medium">Nível de Acesso Exigido</label>
                   <p className="text-xs text-zinc-500 mb-2">Apenas alunos com este nível (ou superior) verão este agente.</p>
                   <select 
                      value={requiredLevel} 
                      onChange={e => setRequiredLevel(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-emerald-500"
                   >
                      <option value={0}>Nível 0 (Público/Grátis)</option>
                      <option value={1}>Nível 1 (Básico)</option>
                      <option value={2}>Nível 2 (Intermediário)</option>
                      <option value={5}>Nível 5 (VIP)</option>
                      <option value={10}>Nível 10 (Mentorias)</option>
                   </select>
                 </div>
              </div>
              
              <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg flex gap-2">
                  {saving ? <Loader2 className="animate-spin"/> : <Save/>} Salvar
                </button>
              </div>
            </div>
          )}

          {/* === CÉREBRO === */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
               <h2 className="text-xl font-bold text-white">Cérebro da IA</h2>
               <textarea 
                  value={prompt} onChange={e => setPrompt(e.target.value)} rows={15} 
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-4 text-zinc-300 font-mono text-sm leading-relaxed outline-none focus:border-indigo-500"
               />
               <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg flex gap-2">
                  <Save/> Atualizar Prompt
                </button>
              </div>
            </div>
          )}

          {/* === ALUNOS DO AGENTE === */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Acesso ao Agente</h2>
                
                {/* Box Explicativo Visual */}
                <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex gap-3">
                  <div className="bg-indigo-500/20 p-2 rounded-full h-fit">
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-200">Como funciona o acesso?</h4>
                    <p className="text-xs text-indigo-200/70 mt-1 leading-relaxed">
                      Este agente exige <strong>Nível {requiredLevel}</strong>. 
                      Ao adicionar um aluno por aqui, ele receberá automaticamente o Nível {requiredLevel}, 
                      ganhando acesso a este agente e a todos os outros de mesmo nível.
                    </p>
                  </div>
                </div>
              </div>

               {/* Convite Rápido */}
               <div className="flex gap-2 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
                 <input 
                   value={inviteEmail} 
                   onChange={e => setInviteEmail(e.target.value)} 
                   placeholder="Email do aluno..." 
                   className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                 />
                 <button onClick={handleInviteToThisAgent} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
                   + Dar Acesso
                 </button>
               </div>

               {/* Lista Filtrada */}
               <div className="space-y-2">
                 {agentUsers.length === 0 && <p className="text-zinc-500 text-sm italic">Nenhum aluno com acesso Nível {requiredLevel} ou superior.</p>}
                 
                 {agentUsers.map(inv => (
                   <div key={inv.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-white/5">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-bold">
                           L{inv.accessLevel}
                         </div>
                         <span className="text-sm text-zinc-200">{inv.email}</span>
                      </div>
                      <button onClick={() => copyToClipboard(`${window.location.origin}/register?token=${inv.token}`)} className="text-xs text-zinc-500 hover:text-white flex gap-1">
                        <Copy size={12}/> Link
                      </button>
                   </div>
                 ))}
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
} 