'use client';

import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, User, Loader2, Sparkles, Plus, 
  MessageSquare, Menu, Trash2, StopCircle, 
  ThumbsUp, ThumbsDown, BookOpen 
} from 'lucide-react';

// --- TIPOS ---
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rating?: number; // 1 = like, -1 = dislike
};

type ChatSession = {
  id: string;
  title: string;
};

type ConsultantInfo = {
  name: string;
  slug?: string;
};

export default function InternalChatPage() {
  // --- ESTADOS ---
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Dados Dinâmicos
  const [consultant, setConsultant] = useState<ConsultantInfo>({ name: 'Carregando...' });
  const [currentSessionId, setCurrentSessionId] = useState<string>('new');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // Para o botão Stop

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    fetchSessions();
    fetchConsultantInfo();
  }, []);

  const fetchConsultantInfo = async () => {
    try {
      const res = await fetch('/api/consultant/info');
      if (res.ok) setConsultant(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) setSessions(await res.json());
    } catch (e) { console.error(e); }
  };

  // --- GERENCIAMENTO DE SESSÃO ---
  const handleLoadSession = async (session: ChatSession) => {
    if (session.id === currentSessionId) return;
    setIsLoading(true);
    setCurrentSessionId(session.id);
    setMessages([]);
    
    try {
      const res = await fetch(`/api/chat/${session.id}`);
      if (res.ok) setMessages(await res.json());
    } catch (error) { console.error(error); } 
    finally { 
      setIsLoading(false);
      if (window.innerWidth < 768) setSidebarOpen(false);
    }
  };

  const handleNewChat = () => {
    // Se estava gerando, para tudo
    if (isLoading) handleStopGeneration();
    
    setCurrentSessionId('new');
    setMessages([]);
    setInput('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleDeleteSession = async (e: React.MouseEvent, idToRemove: string) => {
    e.stopPropagation();
    if (!confirm('Excluir esta conversa permanentemente?')) return;

    setSessions((prev) => prev.filter((s) => s.id !== idToRemove)); // Otimista
    
    try {
      await fetch(`/api/chat/${idToRemove}`, { method: 'DELETE' });
      if (currentSessionId === idToRemove) handleNewChat();
    } catch (error) { console.error(error); }
  };

  // --- FEEDBACK (JOINHA) ---
  const handleFeedback = async (messageId: string, rating: number) => {
    // Atualiza UI instantaneamente
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, rating: m.rating === rating ? 0 : rating } : m
    ));

    try {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, rating })
      });
    } catch (e) { console.error(e); }
  };

  // --- BOTÃO STOP ---
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsStopping(false);
    }
  };

  // --- ENVIO DE MENSAGEM ---
  const handleSendManual = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    
    // Reseta altura do textarea
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    setIsLoading(true);
    setIsStopping(false);

    // Cria novo AbortController para essa requisição
    abortControllerRef.current = new AbortController();

    const tempUserMsg: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        content: userText 
    };
    
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, tempUserMsg],
          sessionId: currentSessionId,
          consultantId: 'teste-fixo-123'
        }),
        signal: abortControllerRef.current.signal // Conecta o botão stop
      });

      if (!response.ok) throw new Error('Erro na API');

      const serverSessionId = response.headers.get('x-session-id');
      if (currentSessionId === 'new' && serverSessionId) {
        setCurrentSessionId(serverSessionId);
        setSessions(prev => [{ id: serverSessionId, title: userText.slice(0, 30) + '...' }, ...prev]);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let botFullContent = '';

      if (reader) {
        // Placeholder do bot
        const botId = 'bot-' + Date.now();
        setMessages(prev => [...prev, { id: botId, role: 'assistant', content: '' }]);

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
                lastMsg.id = botId; 
            }
            return newMsgs;
          });
        }
      }

    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log("Geração interrompida pelo usuário");
      } else {
        console.error("Erro no envio:", e);
        // Remove msg do usuário apenas se foi erro real, não stop
        if (e.name !== 'AbortError') setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // --- AUTO-RESIZE TEXTAREA ---
  const handleInputCheck = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; // Max 200px
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendManual();
    }
  };

  // --- AUTO SCROLL INTELIGENTE ---
  useEffect(() => {
    // Só rola se o usuário já estiver perto do fim ou se for mensagem nova do user
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex h-[calc(100vh-80px)] md:h-screen bg-[#0f0f12] text-zinc-100 overflow-hidden font-sans">
      
      {/* === SIDEBAR === */}
      <aside className={`${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full opacity-0'} bg-[#18181b] border-r border-white/5 transition-all duration-300 flex flex-col fixed md:relative z-30 h-full`}>
        <div className="p-4">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 bg-[#27272a] hover:bg-[#3f3f46] text-zinc-200 px-4 py-3 rounded-xl transition-colors border border-white/5 text-sm font-medium shadow-sm group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform text-indigo-400" />
            Nova conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
          <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Histórico</div>
          {sessions.map((session) => (
            <div key={session.id} className="relative group/item">
              <button 
                onClick={() => handleLoadSession(session)}
                className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex items-center gap-3 relative z-10 pr-9 ${currentSessionId === session.id ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:bg-white/5'}`}
              >
                <MessageSquare className="w-4 h-4 opacity-70 flex-shrink-0" />
                <span className="truncate">{session.title}</span>
              </button>
              <button onClick={(e) => handleDeleteSession(e, session.id)} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md opacity-0 group-hover/item:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 bg-[#131316]">
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/20">JM</div>
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-medium text-zinc-200 truncate">{consultant.name}</p>
               <p className="text-[10px] text-zinc-500">Imago Pro</p>
             </div>
           </div>
        </div>
      </aside>

      {/* === MAIN AREA === */}
      <main className="flex-1 flex flex-col relative bg-[#0f0f12]">
        
        {/* Header */}
        <div className="h-16 flex items-center px-4 md:px-6 sticky top-0 bg-[#0f0f12]/80 backdrop-blur-md z-20 border-b border-white/5 justify-between">
           <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 mr-1 md:hidden">
               <Menu className="w-5 h-5" />
             </button>
             <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
               <Sparkles className="w-4 h-4 text-indigo-400" />
             </div>
             <div>
                <h1 className="text-sm font-semibold text-zinc-100">{consultant.name} <span className="text-indigo-400 font-normal">(Imago)</span></h1>
                <p className="text-[10px] text-zinc-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online</p>
             </div>
           </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center w-full scroll-smooth">
          <div className="w-full max-w-3xl px-4 py-8 space-y-10">
            
            {messages.length === 0 && (
              <div className="mt-20 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 rounded-full bg-gradient-to-b from-indigo-500/20 to-transparent flex items-center justify-center mb-4 relative">
                    <div className="absolute inset-0 border border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                    <Sparkles className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Imago de {consultant.name}</h2>
                <p className="text-zinc-400 max-w-md">Estou pronto para responder como se fosse o próprio {consultant.name}. Pergunte sobre estratégias, documentos ou aulas.</p>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className="group w-full text-zinc-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-5 md:gap-6">
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-1 shadow-lg ${
                    m.role === 'user' ? 'bg-zinc-800' : 'bg-indigo-600'
                  }`}>
                    {m.role === 'user' ? <User className="w-5 h-5 text-zinc-400" /> : <Sparkles className="w-5 h-5 text-white" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-zinc-200">{m.role === 'user' ? 'Você' : `${consultant.name} (Imago)`}</span>
                    </div>
                    
                    <div className="prose prose-invert prose-p:leading-7 prose-pre:bg-[#18181b] prose-pre:border prose-pre:border-white/10 max-w-none text-[15px] text-zinc-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>

                    {/* Footer da Mensagem (Só IA) */}
                    {m.role === 'assistant' && !isLoading && (
                      <div className="flex items-center gap-4 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {/* Citação Simulada (Mock) - Futuramente virá do RAG */}
                        <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full cursor-pointer hover:bg-indigo-500/20 transition-colors">
                           <BookOpen className="w-3 h-3" />
                           <span>Baseado em 2 fontes</span>
                        </div>

                        {/* Feedback */}
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleFeedback(m.id, 1)} className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${m.rating === 1 ? 'text-green-400' : 'text-zinc-500'}`}>
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleFeedback(m.id, -1)} className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${m.rating === -1 ? 'text-red-400' : 'text-zinc-500'}`}>
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="pl-14">
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                   <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                   <span>Digitando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area "Sexy" */}
        <div className="w-full pb-6 pt-2 px-4 bg-gradient-to-t from-[#0f0f12] via-[#0f0f12] to-transparent z-20">
          <div className="max-w-3xl mx-auto relative bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl focus-within:border-indigo-500/40 transition-all flex items-end p-2 gap-2">
            
            <textarea
              ref={textareaRef}
              rows={1}
              className="w-full bg-transparent text-white placeholder:text-zinc-500 px-4 py-3 outline-none resize-none max-h-[200px] custom-scrollbar text-[15px] leading-relaxed"
              placeholder="Envie uma mensagem..."
              value={input}
              onChange={handleInputCheck}
              onKeyDown={handleKeyDown}
              disabled={isLoading && !isStopping}
            />
            
            <div className="pb-1 pr-1">
               {isLoading ? (
                 <button
                   onClick={handleStopGeneration}
                   className="p-2.5 bg-zinc-700 hover:bg-red-500/80 text-white rounded-xl transition-all shadow-lg active:scale-95 group"
                   title="Parar geração"
                 >
                   <StopCircle className="w-5 h-5 fill-current" />
                 </button>
               ) : (
                 <button
                   onClick={handleSendManual}
                   disabled={!input.trim()}
                   className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                 >
                   <Send className="w-5 h-5" />
                 </button>
               )}
            </div>
          </div>
          <div className="text-center pt-3 text-[10px] text-zinc-600 font-medium">
             Imago AI pode cometer erros. Verifique as informações.
          </div>
        </div>

      </main>
    </div>
  );
}