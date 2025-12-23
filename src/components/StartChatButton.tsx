'use client';

import { useTransition } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { createChatSession } from '@/app/actions/chat'; 

interface Props {
  agentId: string;
  consultantId: string;
}

export default function StartChatButton({ agentId, consultantId }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      // Esta função chama o servidor, cria a sala no banco e redireciona você
      await createChatSession(agentId, consultantId);
    });
  };

  return (
    <button 
      onClick={handleClick}
      disabled={isPending}
      className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Criando sala...
        </>
      ) : (
        <>
            <MessageCircle className="w-4 h-4" />
            Iniciar Conversa
        </>
      )}
    </button>
  );
}