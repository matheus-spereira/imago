'use client';

import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, User, Loader2, Sparkles, StopCircle, 
  ThumbsUp, ThumbsDown, BookOpen, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

// Tipos adaptados para sua estrutura
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rating?: number;
};

interface ChatInterfaceProps {
  sessionId: string;
  consultantId: string;
  consultantName: string;
  agentName: string;
  initialMessages: Message[]; // Histórico que vem do servidor
}

export default function ChatInterface({ 
  sessionId, 
  consultantId, 
  consultantName, 
  agentName,
  initialMessages 
}: ChatInterfaceProps) {
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll inicial para o fim
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  // Scroll suave quando chega mensagem nova
  useEffect(() => {
    if (isLoading) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // --- FUNÇÕES (Mantive sua lógica) ---

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsStopping(false);
    }
  };

  const handleSendManual = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setIsLoading(true);
    setIsStopping(false);
    abortControllerRef.current = new AbortController();

    // Adiciona msg do usuário na UI
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
          messages: [...messages, tempUserMsg], // Manda histórico + nova
          sessionId: sessionId,
          consultantId: consultantId,
          // Futuro: passar filterOptions baseado no Agente
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error('Erro na API');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let botFullContent = '';

      if (reader) {
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
      if (e.name !== 'AbortError') {
        console.error("Erro:", e);
        // Opcional: Mostrar erro na UI
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendManual();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f0f12] text-zinc-100 font-sans">
      
      {/* HEADER (Adaptado para mostrar o Agente/Consultor) */}
      <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-[#0f0f12]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-20">
         <div className="flex items-center gap-3">
           <Link href="/hub" className="p-2 hover:bg-white/10 rounded-full text-zinc-400">
             <ArrowLeft className="w-5 h-5" />
           </Link>
           <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
             <Sparkles className="w-4 h-4 text-indigo-400" />
           </div>
           <div>
              <h1 className="text-sm font-semibold text-zinc-100">{agentName}</h1>
              <p className="text-[10px] text-zinc-500">By {consultantName}</p>
           </div>
         </div>
      </header>

      {/* ÁREA DE CHAT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center w-full scroll-smooth">
        <div className="w-full max-w-3xl px-4 py-8 space-y-8">
          
          {/* MENSAGENS */}
          {messages.map((m) => (
            <div key={m.id} className="group w-full text-zinc-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex gap-4 md:gap-6">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-1 shadow-lg ${
                  m.role === 'user' ? 'bg-zinc-800' : 'bg-indigo-600'
                }`}>
                  {m.role === 'user' ? <User className="w-4 h-4 text-zinc-400" /> : <Sparkles className="w-4 h-4 text-white" />}
                </div>

                <div className="flex-1 space-y-2 min-w-0">
                  <div className="font-semibold text-sm text-zinc-200">
                    {m.role === 'user' ? 'Você' : agentName}
                  </div>
                  <div className="prose prose-invert max-w-none text-[15px] text-zinc-300 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                  
                  {/* Feedback UI (Simplificada) */}
                  {m.role === 'assistant' && !isLoading && (
                    <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button className="text-zinc-600 hover:text-green-400"><ThumbsUp className="w-3 h-3"/></button>
                       <button className="text-zinc-600 hover:text-red-400"><ThumbsDown className="w-3 h-3"/></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="pl-14 flex items-center gap-2 text-zinc-500 text-sm">
               <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
               <span>Pensando...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* INPUT AREA */}
      <div className="w-full pb-6 pt-2 px-4 bg-gradient-to-t from-[#0f0f12] via-[#0f0f12] to-transparent z-20">
        <div className="max-w-3xl mx-auto relative bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl focus-within:border-indigo-500/40 transition-all flex items-end p-2 gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            className="w-full bg-transparent text-white placeholder:text-zinc-500 px-4 py-3 outline-none resize-none max-h-[200px] custom-scrollbar text-[15px]"
            placeholder={`Pergunte algo para ${agentName}...`}
            value={input}
            onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading && !isStopping}
          />
          <div className="pb-1 pr-1">
             {isLoading ? (
               <button onClick={handleStopGeneration} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl transition-colors">
                 <StopCircle className="w-5 h-5" />
               </button>
             ) : (
               <button onClick={handleSendManual} disabled={!input.trim()} className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 transition-all">
                 <Send className="w-5 h-5" />
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}