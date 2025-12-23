'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

// Componente interno para ler params (Next.js 13+ exige Suspense para useSearchParams)
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Estados de Dados
  const [inviteData, setInviteData] = useState<{ email: string; consultantName: string } | null>(null);
  
  // Estados de UI
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState('');
  
  // Estados do Formulário
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // 1. Ao carregar, valida o token e busca o nome do consultor
  useEffect(() => {
    if (!token) {
      setValidationError('Convite necessário. Peça o link ao seu consultor.');
      setIsValidating(false);
      return;
    }

    async function validateInvite() {
      try {
        const res = await fetch(`/api/auth/invite/validate?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setInviteData(data);
        } else {
          setValidationError(data.error || 'Convite inválido');
        }
      } catch (err) {
        setValidationError('Erro de conexão. Tente novamente.');
      } finally {
        setIsValidating(false);
      }
    }

    validateInvite();
  }, [token]);

  // 2. Registro do Aluno
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !inviteData) return;
    
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/auth/register-student', { // Nova rota específica para alunos
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          name, 
          password,
          email: inviteData.email // Garante que usa o email do convite
        }),
      });

      if (res.ok) {
        // Sucesso! Redirecionar para login ou dashboard
        router.push('/login?registered=true');
      } else {
        const err = await res.json();
        setSubmitError(err.error || 'Erro ao criar conta');
      }
    } catch (err) {
      setSubmitError('Erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- RENDERIZAÇÃO DE ESTADOS ---

  // Estado 1: Validando Token (Loading Elegante)
  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-zinc-500 text-sm animate-pulse">Verificando convite...</p>
      </div>
    );
  }

  // Estado 2: Erro (Sem token ou inválido)
  if (validationError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#09090b] p-4">
        <div className="max-w-md w-full bg-[#18181b] border border-red-900/50 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Acesso Restrito</h1>
          <p className="text-zinc-400 mb-6">{validationError}</p>
          <button 
            onClick={() => router.push('/login')}
            className="text-sm text-zinc-500 hover:text-white transition-colors underline"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  // Estado 3: Sucesso (Formulário Personalizado)
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden">
      {/* Background Sutil e Premium */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>
      <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

      <div className="relative w-full max-w-md p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Card Principal */}
        <div className="bg-[#18181b]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Header Personalizado */}
          <div className="p-8 pb-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-6">
               <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-xs font-medium text-emerald-500 uppercase tracking-widest">Convite Oficial</span>
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Bem-vindo ao Imago
            </h1>
            <p className="text-zinc-400 leading-relaxed">
              Você foi convidado por <strong className="text-white font-medium">{inviteData?.consultantName}</strong> para acessar esta base de conhecimento exclusiva.
            </p>
          </div>

          {/* Formulário */}
          <div className="p-8 pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Email (Read-only para segurança) */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 font-medium ml-1">Email Cadastrado</label>
                <div className="flex items-center px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-zinc-400 cursor-not-allowed">
                  <ShieldCheck className="w-4 h-4 mr-3 text-zinc-600" />
                  {inviteData?.email}
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium ml-1">Seu Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex: João Silva"
                  className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium ml-1">Defina sua Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              {submitError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_-5px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Criar meu Acesso <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
          
          {/* Footer */}
          <div className="px-8 py-4 bg-zinc-900/30 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-600">
              Imago AI • Tecnologia de Inteligência para Consultores
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper Principal (Obrigatório no Next 13+)
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b]"></div>}>
      <RegisterForm />
    </Suspense>
  );
}