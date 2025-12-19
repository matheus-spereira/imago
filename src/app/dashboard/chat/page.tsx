'use client';

import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, User, Loader2, Sparkles, Plus, 
  MessageSquare, Menu, Trash2 
} from 'lucide-react';

// --- TIPOS ---
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  updatedAt?: string;
};

export default function InternalChatPage() {
  // --- ESTADOS ---
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // ID da sessão ativa ('new' = criando agora, UUID = carregada do banco)
  const [currentSessionId, setCurrentSessionId] = useState<string>('new');
  
  // Mensagens da tela atual
  const [messages, setMessages] = useState<Message[]>([]);

  // Lista da Sidebar
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- 1. CARREGAR LISTA DE CONVERSAS (Ao abrir) ---
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  // --- 2. CARREGAR MENSAGENS DE UMA SESSÃO ---
  const handleLoadSession = async (session: ChatSession) => {
    if (session.id === currentSessionId) return;

    setIsLoading(true);
    setCurrentSessionId(session.id);
    setMessages([]); // Limpa enquanto carrega
    
    try {
      const res = await fetch(`/api/chat/${session.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Erro ao carregar conversa:", error);
    } finally {
      setIsLoading(false);
      // Mobile: fecha sidebar
      if (window.innerWidth < 768) setSidebarOpen(false);
    }
  };

  // --- 3. NOVA CONVERSA ---
  const handleNewChat = () => {
    setCurrentSessionId('new');
    setMessages([]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // --- 4. EXCLUIR CONVERSA (NOVO) ---
  const handleDeleteSession = async (e: React.MouseEvent, idToRemove: string) => {
    e.stopPropagation(); // Impede que o clique abra a conversa ao mesmo tempo

    if (!confirm('Tem certeza que deseja excluir esta conversa?')) return;

    try {
        // Atualização Otimista (Remove da tela antes de confirmar no banco para ser rápido)
        const oldSessions = [...sessions];
        setSessions((prev) => prev.filter((s) => s.id !== idToRemove));

        const res = await fetch(`/api/chat/${idToRemove}`, {
            method: 'DELETE',
        });

        if (!res.ok) {
            // Se der erro, volta a lista como estava
            setSessions(oldSessions);
            alert("Erro ao excluir. Tente novamente.");
            return;
        }

        // Se a conversa deletada for a que está aberta agora, limpa a tela
        if (currentSessionId === idToRemove) {
            handleNewChat();
        }

    } catch (error) {
        console.error("Erro ao excluir:", error);
    }
  };

  // --- 5. ENVIAR MENSAGEM ---
  const handleSendManual = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    setIsLoading(true);

    const tempUserMsg: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        content: userText 
    };
    
    // Atualiza UI Imediatamente
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, tempUserMsg], // Histórico + Nova
          sessionId: currentSessionId, // Envia 'new' ou ID existente
          consultantId: 'teste-fixo-123'
        }),
      });

      if (!response.ok) throw new Error('Erro na API');

      // Pega o ID da sessão que o servidor criou ou usou
      const serverSessionId = response.headers.get('x-session-id');
      
      // Se era 'new' e virou uma sessão real, atualiza tudo
      if (currentSessionId === 'new' && serverSessionId) {
        setCurrentSessionId(serverSessionId);
        // Atualiza sidebar sem recarregar tudo
        setSessions(prev => [
            { id: serverSessionId, title: userText.slice(0, 30) + '...' }, 
            ...prev
        ]);
      }

      // Leitura do Stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let botFullContent = '';

      if (reader) {
        // Adiciona placeholder do bot
        setMessages(prev => [...prev, { id: 'bot-loading', role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          botFullContent += chunk;

          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg.role === 'assistant') {
                lastMsg.content = botFullContent;
                lastMsg.id = 'bot-' + Date.now(); // Garante ID único
            }
            return newMsgs;
          });
        }
      }

    } catch (e) {
      console.error("Erro no envio:", e);
      // Remove msg do usuário se falhou
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendManual();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-80px)] md:h-screen bg-[#0f0f12] text-zinc-100 overflow-hidden font-sans">
      
      {/* === SIDEBAR === */}
      <aside 
        className={`
          ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0'} 
          bg-[#18181b] border-r border-white/5 transition-all duration-300 ease-in-out flex flex-col fixed md:relative z-30 h-full
        `}
      >
        <div className="p-4 flex-none">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 bg-[#27272a] hover:bg-[#3f3f46] text-zinc-200 px-4 py-3 rounded-xl transition-colors border border-white/5 text-sm font-medium shadow-sm group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            Nova conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2 custom-scrollbar">
          <div className="px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 mt-2">
            Histórico
          </div>
          
          {sessions.length === 0 && (
             <p className="text-zinc-600 text-xs px-4 py-2">Nenhuma conversa salva.</p>
          )}

          {sessions.map((session) => (
            <div key={session.id} className="relative group/item">
              <button 
                onClick={() => handleLoadSession(session)}
                className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex items-center gap-3 relative z-10 pr-9
                  ${currentSessionId === session.id 
                    ? 'bg-zinc-800 text-white font-medium' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
              >
                <MessageSquare className="w-4 h-4 opacity-70 flex-shrink-0" />
                <span className="truncate">{session.title}</span>
              </button>
              
              {/* --- BOTÃO DE EXCLUIR --- */}
              <button
                onClick={(e) => handleDeleteSession(e, session.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md opacity-0 group-hover/item:opacity-100 transition-all focus:opacity-100"
                title="Excluir conversa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-white/5 flex items-center gap-3 mt-auto bg-[#131316]">
           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
             JM
           </div>
           <div className="flex-1 overflow-hidden">
             <p className="text-sm font-medium truncate text-zinc-200">João Maria</p>
             <p className="text-[10px] text-zinc-500">Free Plan</p>
           </div>
        </div>
      </aside>

      {/* === ÁREA PRINCIPAL === */}
      <main className="flex-1 flex flex-col relative bg-[#0f0f12]">
        
        {/* Header Mobile / Toggle */}
        <div className="h-14 flex items-center px-4 md:px-6 flex-none sticky top-0 bg-[#0f0f12]/80 backdrop-blur-md z-20 border-b border-white/5">
           <button 
             onClick={() => setSidebarOpen(!sidebarOpen)}
             className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors mr-2"
           >
             <Menu className="w-5 h-5" />
           </button>
           <span className="font-medium text-zinc-200 flex items-center gap-2">
             <Sparkles className="w-4 h-4 text-indigo-500" />
             Consultor IA
           </span>
        </div>

        {/* Lista de Mensagens */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center w-full scroll-smooth">
          <div className="w-full max-w-3xl px-4 py-8 space-y-8">
            
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center mt-20 text-center space-y-6 animate-in fade-in duration-700 slide-in-from-bottom-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#18181b] to-[#0f0f12] border border-white/5 flex items-center justify-center shadow-2xl shadow-indigo-900/10 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-500/10 blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
                  <Sparkles className="w-10 h-10 text-indigo-400 relative z-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Como posso ajudar?</h2>
                  <p className="text-zinc-500 max-w-md mx-auto">
                    Faça perguntas sobre seus documentos, peça resumos ou insights estratégicos.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className="group w-full text-zinc-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-4 md:gap-6">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                    m.role === 'user' 
                      ? 'bg-zinc-800 border border-white/5' 
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 space-y-1 overflow-hidden">
                    <div className="font-semibold text-xs text-zinc-400 mb-1">
                      {m.role === 'user' ? 'Você' : 'Consultor IA'}
                    </div>
                    <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#18181b] max-w-none text-[15px] text-zinc-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading */}
            {isLoading && (
              <div className="flex gap-4 md:gap-6 pl-1 animate-pulse opacity-60">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center mt-1">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="space-y-2 pt-3">
                   <div className="flex gap-1">
                     <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce delay-100"></span>
                     <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce delay-200"></span>
                   </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Área de Input */}
        <div className="w-full flex justify-center pb-6 pt-2 px-4 bg-gradient-to-t from-[#0f0f12] via-[#0f0f12] to-transparent z-20">
          <div className="w-full max-w-3xl relative bg-[#18181b] border border-white/10 rounded-[26px] shadow-2xl shadow-black/50 focus-within:border-indigo-500/40 transition-all group">
            <input
              ref={inputRef}
              className="w-full bg-transparent text-white placeholder:text-zinc-500 px-6 py-4 pr-14 outline-none text-base"
              placeholder="Envie uma mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              onClick={handleSendManual}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-700 hover:bg-indigo-600 text-white rounded-full disabled:opacity-0 transition-all duration-200"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        
        <div className="text-center pb-2 text-[10px] text-zinc-600">
           Verifique informações importantes.
        </div>

      </main>
    </div>
  );
}