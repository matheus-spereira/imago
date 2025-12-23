'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, User, Layers, Users, Plus, Trash2, Copy, Loader2, CreditCard
} from 'lucide-react';

interface GlobalData {
  consultant: { id: string; name: string; slug: string };
  tags: { id: string; name: string }[];
  levels: { id: string; name: string; levelNumber: number }[];
  invites: { id: string; email: string; token: string; status: string; accessLevel: number }[];
}

export default function ConsultantAccountPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'structure' | 'users'>('profile');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GlobalData | null>(null);

  // Estados Profile
  const [consultantName, setConsultantName] = useState('');

  // Estados Globais
  const [newTagName, setNewTagName] = useState('');
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelNum, setNewLevelNum] = useState(0);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLevel, setInviteLevel] = useState(0);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Busca dados globais (sem passar agentSlug)
      const res = await fetch('/api/consultant/settings');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.consultant) setConsultantName(json.consultant.name);
      }
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // --- ACTIONS ---

  const handleSaveProfile = async () => {
    await fetch('/api/consultant/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: consultantName })
    });
    alert('Perfil atualizado!');
  };

  const handleCreateTag = async () => {
    await fetch('/api/consultant/settings', {
      method: 'POST',
      body: JSON.stringify({ type: 'TAG', name: newTagName })
    });
    setNewTagName('');
    fetchSettings();
  };

  const handleCreateLevel = async () => {
    await fetch('/api/consultant/settings', {
      method: 'POST',
      body: JSON.stringify({ type: 'LEVEL', name: newLevelName, levelNumber: newLevelNum })
    });
    setNewLevelName('');
    setNewLevelNum(prev => prev + 1);
    fetchSettings();
  };

  const handleDelete = async (id: string, type: 'TAG' | 'LEVEL' | 'INVITE') => {
    if(!confirm('Tem certeza? Isso afeta todos os agentes.')) return;
    await fetch(`/api/consultant/settings?id=${id}&type=${type}`, { method: 'DELETE' });
    fetchSettings();
  };

  const handleCreateInvite = async () => {
    if(!inviteEmail) return;
    const res = await fetch('/api/consultant/invite', { // Verifique se esta rota existe, senão use a settings POST com type='INVITE'
      method: 'POST',
      body: JSON.stringify({ email: inviteEmail, accessLevel: inviteLevel })
    });
    // Se você não tiver a rota /invite separada, ajuste para usar a /settings POST se implementou lá
    
    if(res.ok) {
      setInviteEmail('');
      fetchSettings();
    } else {
      alert('Erro ao convidar');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado!');
  };

  if (loading && !data) return <div className="flex h-screen items-center justify-center text-zinc-500 gap-2"><Loader2 className="animate-spin"/> Carregando conta...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Minha Conta</h1>
        <p className="text-zinc-400">Gerencie seu perfil e configurações globais da organização.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR */}
        <aside className="w-full md:w-64 flex flex-col gap-2">
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <User size={18}/> Perfil & Plano
          </button>
          <div className="h-px bg-white/10 my-2" />
          <button onClick={() => setActiveTab('structure')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'structure' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <Layers size={18}/> Tags & Níveis
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <Users size={18}/> Alunos & Convites
          </button>
        </aside>

        {/* MAIN */}
        <main className="flex-1 bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-xl">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <h2 className="text-lg font-semibold border-b border-white/5 pb-4">Dados do Consultor</h2>
               <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Nome de Exibição</label>
                  <input value={consultantName} onChange={e => setConsultantName(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"/>
               </div>
               <button onClick={handleSaveProfile} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                 <Save size={16}/> Salvar Perfil
               </button>

               <div className="mt-8 pt-6 border-t border-white/5 opacity-75">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-white">Assinatura</h3>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-lg border border-white/5">
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Plano Atual</p>
                    <p className="text-xl font-bold text-white">PRO</p>
                  </div>
               </div>
            </div>
          )}

          {/* STRUCTURE TAB */}
          {activeTab === 'structure' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Tags */}
              <div>
                <h3 className="text-md font-medium text-indigo-400 mb-4 flex items-center gap-2"><Layers size={16}/> Etiquetas (Tags)</h3>
                <div className="flex gap-2 mb-4">
                  <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Nova tag..." className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"/>
                  <button onClick={handleCreateTag} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg"><Plus size={20}/></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data?.tags.map(t => (
                    <span key={t.id} className="bg-zinc-800 text-xs px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-2 group">
                      #{t.name} <Trash2 size={12} className="cursor-pointer text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(t.id, 'TAG')}/>
                    </span>
                  ))}
                </div>
              </div>
              {/* Níveis */}
              <div>
                <h3 className="text-md font-medium text-emerald-400 mb-4 flex items-center gap-2"><Layers size={16}/> Níveis de Acesso</h3>
                <div className="flex gap-2 mb-4">
                  <input type="number" value={newLevelNum} onChange={e => setNewLevelNum(Number(e.target.value))} className="w-16 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center outline-none focus:border-emerald-500"/>
                  <input value={newLevelName} onChange={e => setNewLevelName(e.target.value)} placeholder="Nome do Nível..." className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white flex-1 outline-none focus:border-emerald-500"/>
                  <button onClick={handleCreateLevel} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg"><Plus size={20}/></button>
                </div>
                <div className="space-y-2">
                  {data?.levels.map(l => (
                    <div key={l.id} className="flex justify-between items-center bg-zinc-800 p-3 rounded-lg border border-white/5 text-sm group">
                      <div className="flex items-center gap-3">
                         <span className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-400">{l.levelNumber}</span>
                         <span>{l.name}</span>
                      </div>
                      <Trash2 size={14} className="cursor-pointer text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(l.id, 'LEVEL')}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold border-b border-white/5 pb-4">Convidar Alunos</h2>
              <div className="bg-zinc-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email do aluno" className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"/>
                  <select value={inviteLevel} onChange={e => setInviteLevel(Number(e.target.value))} className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500">
                    <option value={0}>Nível 0 - Grátis</option>
                    {data?.levels.map(l => <option key={l.id} value={l.levelNumber}>Nível {l.levelNumber} - {l.name}</option>)}
                  </select>
                </div>
                <button onClick={handleCreateInvite} className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-indigo-900/20">Gerar Link de Convite</button>
              </div>

              <div className="space-y-3 mt-6">
                {data?.invites?.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-white/5">
                    <div>
                      <p className="text-sm text-white font-medium">{inv.email}</p>
                      <span className="text-xs text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">Nível {inv.accessLevel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => copyToClipboard(`${window.location.origin}/register?token=${inv.token}`)} className="text-xs bg-zinc-700 px-3 py-1.5 rounded-md text-white flex gap-1.5"><Copy size={12}/> Copiar</button>
                       <button onClick={() => handleDelete(inv.id, 'INVITE')} className="p-1.5 hover:bg-red-400/10 rounded-md group"><Trash2 size={14} className="text-zinc-500 group-hover:text-red-400"/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}