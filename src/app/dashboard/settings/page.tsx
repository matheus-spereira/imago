'use client';

import React, { useState, useEffect } from 'react';
import { 
  Save, User, Bot, Layers, Users, Plus, Trash2, Copy, Check 
} from 'lucide-react';

// Tipos para os dados
interface SettingsData {
  consultant: {
    id: string;
    name: string;
    systemPrompt: string;
    slug: string;
  };
  tags: { id: string; name: string }[];
  levels: { id: string; name: string; levelNumber: number }[];
  invites: { id: string; email: string; token: string; status: string; accessLevel: number }[];
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'structure' | 'users'>('general');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SettingsData | null>(null);
  
  // Estados de Edição
  const [prompt, setPrompt] = useState('');
  const [newName, setNewName] = useState('');
  
  // Estados para Tags/Níveis
  const [newTagName, setNewTagName] = useState('');
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelNum, setNewLevelNum] = useState(0);

  // Estados para Convites
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLevel, setInviteLevel] = useState(0);

  // Carregar dados
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/consultant/settings'); // Vamos atualizar essa API em breve
      const json = await res.json();
      setData(json);
      setPrompt(json.consultant?.systemPrompt || '');
      setNewName(json.consultant?.name || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  // --- ACTIONS ---

  const handleSaveProfile = async () => {
    // Salvar Nome e Prompt
    await fetch('/api/consultant/settings', {
      method: 'PATCH', // Vamos criar suporte a PATCH
      body: JSON.stringify({ name: newName, systemPrompt: prompt })
    });
    alert('Salvo com sucesso!');
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
    if(!confirm('Tem certeza?')) return;
    await fetch(`/api/consultant/settings?id=${id}&type=${type}`, { method: 'DELETE' });
    fetchSettings();
  };

  const handleCreateInvite = async () => {
    if(!inviteEmail) return;
    const res = await fetch('/api/consultant/invite', { // Nova rota que criaremos
      method: 'POST',
      body: JSON.stringify({ email: inviteEmail, accessLevel: inviteLevel })
    });
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

  if (loading) return <div className="p-10 text-white">Carregando configurações...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-2">Configurações</h1>
      <p className="text-zinc-400 mb-8">Gerencie sua IA, acessos e alunos.</p>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR DE NAVEGAÇÃO */}
        <aside className="w-full md:w-64 flex flex-col gap-2">
          <TabButton icon={<User size={18}/>} label="Geral" active={activeTab === 'general'} onClick={() => setActiveTab('general')} />
          <TabButton icon={<Bot size={18}/>} label="Personalidade da IA" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
          <TabButton icon={<Layers size={18}/>} label="Estrutura (Tags)" active={activeTab === 'structure'} onClick={() => setActiveTab('structure')} />
          <TabButton icon={<Users size={18}/>} label="Alunos e Convites" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 bg-[#18181b] border border-white/5 rounded-xl p-6">
          
          {/* --- ABA GERAL --- */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold border-b border-white/5 pb-2">Perfil do Consultor</h2>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Nome de Exibição</label>
                <input 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Slug (URL do seu chat)</label>
                <div className="w-full bg-zinc-800 border border-white/10 rounded-lg p-3 text-zinc-500 cursor-not-allowed">
                  imago.ai/{data?.consultant.slug}
                </div>
              </div>
              <button onClick={handleSaveProfile} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg flex items-center gap-2">
                <Save size={16} /> Salvar Alterações
              </button>
            </div>
          )}

          {/* --- ABA PERSONALIDADE IA --- */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold border-b border-white/5 pb-2">Cérebro da IA</h2>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">System Prompt (Instruções de Comportamento)</label>
                <p className="text-xs text-zinc-500">Defina como a IA deve se comportar. Ex: "Seja socrático", "Use emojis", "Seja formal".</p>
                <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)}
                  rows={8}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none font-mono text-sm"
                  placeholder="Você é um assistente especialista em..."
                />
              </div>
              <button onClick={handleSaveProfile} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg flex items-center gap-2">
                <Save size={16} /> Atualizar Cérebro
              </button>
            </div>
          )}

          {/* --- ABA ESTRUTURA --- */}
          {activeTab === 'structure' && (
            <div className="space-y-8">
              {/* Tags */}
              <div>
                <h3 className="text-md font-medium text-indigo-400 mb-4 flex items-center gap-2"><Layers size={16}/> Etiquetas (Tags)</h3>
                <div className="flex gap-2 mb-4">
                  <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Nova tag..." className="bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-white"/>
                  <button onClick={handleCreateTag}><Plus className="text-indigo-500 p-2 bg-indigo-500/10 rounded"/></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data?.tags.map(t => (
                    <span key={t.id} className="bg-zinc-800 text-xs px-2 py-1 rounded border border-white/5 flex items-center gap-2">
                      #{t.name} <Trash2 size={12} className="cursor-pointer hover:text-red-400" onClick={() => handleDelete(t.id, 'TAG')}/>
                    </span>
                  ))}
                </div>
              </div>

              {/* Níveis */}
              <div>
                <h3 className="text-md font-medium text-emerald-400 mb-4 flex items-center gap-2"><Layers size={16}/> Níveis de Acesso</h3>
                <div className="flex gap-2 mb-4">
                  <input type="number" value={newLevelNum} onChange={e => setNewLevelNum(Number(e.target.value))} className="w-16 bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-white"/>
                  <input value={newLevelName} onChange={e => setNewLevelName(e.target.value)} placeholder="Nome do Nível..." className="bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-white flex-1"/>
                  <button onClick={handleCreateLevel}><Plus className="text-emerald-500 p-2 bg-emerald-500/10 rounded"/></button>
                </div>
                <div className="space-y-2">
                  {data?.levels.map(l => (
                    <div key={l.id} className="flex justify-between bg-zinc-800 p-2 rounded border border-white/5 text-sm">
                      <span>Lvl {l.levelNumber} - {l.name}</span>
                      <Trash2 size={14} className="cursor-pointer hover:text-red-400" onClick={() => handleDelete(l.id, 'LEVEL')}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- ABA USUÁRIOS (NOVO) --- */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold border-b border-white/5 pb-2">Convidar Alunos</h2>
              
              {/* Form de Convite */}
              <div className="bg-zinc-900/50 p-4 rounded-lg border border-white/5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    value={inviteEmail} 
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="Email do aluno"
                    className="bg-zinc-950 border border-white/10 rounded px-3 py-2 text-sm text-white"
                  />
                  <select 
                    value={inviteLevel} 
                    onChange={e => setInviteLevel(Number(e.target.value))}
                    className="bg-zinc-950 border border-white/10 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value={0}>Nível 0 - Grátis</option>
                    {data?.levels.map(l => (
                      <option key={l.id} value={l.levelNumber}>Nível {l.levelNumber} - {l.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleCreateInvite} className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded text-sm font-medium">
                  Gerar Link de Convite
                </button>
              </div>

              {/* Lista de Convites */}
              <div className="space-y-2 mt-4">
                <h3 className="text-sm font-medium text-zinc-400">Convites Pendentes</h3>
                {data?.invites?.length === 0 && <p className="text-xs text-zinc-600">Nenhum convite pendente.</p>}
                
                {data?.invites.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-white/5">
                    <div>
                      <p className="text-sm text-white">{inv.email}</p>
                      <span className="text-xs text-indigo-400">Nível {inv.accessLevel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => copyToClipboard(`${window.location.origin}/register?token=${inv.token}`)}
                         className="text-xs bg-zinc-700 px-2 py-1 rounded hover:bg-zinc-600 flex items-center gap-1"
                       >
                         <Copy size={12}/> Copiar Link
                       </button>
                       <Trash2 size={14} className="text-zinc-500 hover:text-red-400 cursor-pointer" onClick={() => handleDelete(inv.id, 'INVITE')}/>
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

// Componente auxiliar de botão
function TabButton({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon} {label}
    </button>
  );
}