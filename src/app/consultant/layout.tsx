'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Bot, Users, Wallet, Settings, LogOut, Menu, Bell
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function ConsultantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Estado para o nome atualizado (corrige o delay da sessão)
  const [displayName, setDisplayName] = useState(session?.user?.name || 'Consultor');

  // Busca o nome mais recente no banco de dados para garantir consistência
  useEffect(() => {
    if (session?.user?.name) setDisplayName(session.user.name);
    
    // Faz um fetch silencioso para pegar o nome atualizado do perfil
    fetch('/api/consultant/settings')
      .then(res => res.json())
      .then(data => {
        if (data?.consultant?.name) {
          setDisplayName(data.consultant.name);
        }
      })
      .catch(err => console.error("Erro ao sincronizar nome:", err));
  }, [session]);

  const menuItems = [
    { href: '/consultant/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { href: '/consultant/agents', label: 'Meus Agentes', icon: Bot },
    { href: '/consultant/students', label: 'Alunos', icon: Users },
    { href: '/consultant/finance', label: 'Financeiro', icon: Wallet },
    { href: '/consultant/account', label: 'Minha Conta', icon: Settings },
  ];

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    // MUDANÇA UX: Alterado bg-[#0f0f12] para bg-[#121214] (Levemente mais claro que a sidebar)
    <div className="h-screen bg-[#121214] text-zinc-100 flex font-sans overflow-hidden">
      
      {/* === SIDEBAR (Navegação) === */}
      {/* Mantivemos escura (#131316) para criar o contraste de moldura */}
      <aside className="hidden md:flex flex-col w-64 bg-[#09090b] border-r border-white/5 shrink-0 transition-all z-20">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-white/5 bg-[#09090b]">
           <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm shadow-lg shadow-indigo-500/20">IM</div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">IMAGO</span>
           </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive(item.href) 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/10 shadow-sm' 
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
              }`}
            >
              <item.icon size={18} className={isActive(item.href) ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-white/5">
           <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5 mb-2">
              <div className="flex justify-between items-center mb-2">
                 <p className="text-xs text-zinc-500">Plano <span className="text-emerald-400 font-bold">PRO</span></p>
                 <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Ativo</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-indigo-500 h-full w-[70%]" />
              </div>
           </div>
        </div>
      </aside>

      {/* === ÁREA PRINCIPAL === */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#121214]">
        
        {/* === TOPBAR === */}
        {/* MUDANÇA: Removida a barra de busca e ajustada a cor para destacar do conteúdo */}
        <header className="h-16 bg-[#18181b] border-b border-white/5 flex items-center justify-between px-4 md:px-8 shadow-sm z-10">
           
           {/* Mobile Toggle */}
           <div className="flex items-center gap-4">
              <button className="md:hidden p-2 text-zinc-400 hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                 <Menu size={20} />
              </button>
              
              {/* Breadcrumb simples (Opcional, preenche o vazio da busca) */}
              <div className="hidden md:block text-sm text-zinc-500">
                 Painel do Consultor / <span className="text-zinc-200 capitalize">{pathname.split('/').pop()}</span>
              </div>
           </div>

           {/* User Actions */}
           <div className="flex items-center gap-4 md:gap-6">
              {/* Notificações */}
              <button className="relative text-zinc-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full">
                 <Bell size={20} />
                 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#18181b]" />
              </button>

              <div className="h-6 w-px bg-white/10" />

              {/* Menu do Usuário */}
              <div className="flex items-center gap-3 cursor-pointer group relative pl-2">
                 <div className="text-right hidden md:block">
                    {/* CORREÇÃO: Usa 'displayName' que é sincronizado com o banco */}
                    <p className="text-sm font-medium text-white leading-none">{displayName}</p>
                    <p className="text-xs text-zinc-500 mt-1">@{session?.user?.id?.substring(0,6) || 'imago'}</p> 
                 </div>
                 
                 <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-[#18181b] shadow-lg">
                    {displayName.charAt(0).toUpperCase()}
                 </div>
                 
                 {/* Dropdown Simples de Sair */}
                 <div className="absolute right-0 top-full mt-2 w-40 bg-[#18181b] border border-white/10 rounded-lg shadow-xl py-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all transform translate-y-2 group-hover:translate-y-0 z-50">
                    <div className="px-4 py-2 border-b border-white/5 md:hidden">
                       <p className="text-sm text-white">{displayName}</p>
                    </div>
                    <button 
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="flex items-center gap-2 px-4 py-3 text-xs text-red-400 hover:bg-red-500/10 w-full transition-colors"
                    >
                       <LogOut size={14} /> Sair do Sistema
                    </button>
                 </div>
              </div>
           </div>
        </header>

        {/* === CONTEÚDO SCROLLABLE === */}
        {/* O fundo aqui é #121214 (definido no container pai), criando o contraste com a Sidebar mais escura e a Topbar mais clara */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
           <div className="max-w-7xl mx-auto pb-10">
              {children}
           </div>
        </main>

      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 md:hidden backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-72 h-full bg-[#09090b] p-4 flex flex-col shadow-2xl border-r border-white/10" onClick={e => e.stopPropagation()}>
             <div className="flex items-center gap-2 font-bold text-xl text-white mb-8 px-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">IM</div>
                IMAGO
             </div>
             <nav className="flex-1 space-y-2">
               {menuItems.map((item) => (
                 <Link 
                    key={item.href} 
                    href={item.href} 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isActive(item.href) ? 'bg-indigo-600/10 text-indigo-400' : 'text-zinc-300 hover:bg-white/5'}`}
                  >
                   <item.icon size={20}/> {item.label}
                 </Link>
               ))}
             </nav>
          </div>
        </div>
      )}
    </div>
  );
}