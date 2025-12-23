'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  
  // 1. Novo Estado para controlar o Tipo de Login
  const [loginType, setLoginType] = useState<'consultant' | 'student'>('consultant');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 2. Enviamos o 'loginType' junto com as credenciais
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
        loginType, // O segredo para o auth.ts saber qual tabela olhar
      });

      if (res?.ok) {
        // 3. Redirecionamento Inteligente
        if (loginType === 'consultant') {
           // CORREÇÃO: Redireciona para a raiz /consultant (onde está o Dashboard agora)
           router.push('/consultant'); 
        } else {
           router.push('/hub'); // Área do Aluno
        }
        router.refresh();
      } else {
        setError('Credenciais inválidas. Verifique se escolheu a aba correta.');
      }
    } catch (err) {
      setError('Erro ao conectar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden px-4 bg-slate-950">
      {/* Background Shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[var(--primary-600)]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[var(--accent-600)]/5 blur-[100px]" />
      </div>

      {/* Título Externo */}
      <div className="text-center mb-8 z-10">
        <h2 className="text-white text-lg font-semibold tracking-wider flex items-center justify-center gap-2">
          <svg className="w-6 h-6 text-[var(--primary-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          IMAGO ID
        </h2>
      </div>

      {/* Card Principal */}
      <div className="w-full max-w-[450px] z-10 relative">
        <div className="backdrop-blur-md bg-slate-900/50 border border-white/10 shadow-2xl rounded-2xl p-8 sm:p-10">
          
          <header className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white tracking-tight">Bem-vindo</h1>
            <p className="text-[var(--text-muted)] text-sm mt-2">
              Acesse sua conta para continuar
            </p>
          </header>

          {/* --- NOVO: Seletor de Tipo de Usuário (Abas) --- */}
          <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setLoginType('consultant')}
              className={`py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                loginType === 'consultant'
                  ? 'bg-[var(--primary-600)] text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Sou Consultor
            </button>
            <button
              type="button"
              onClick={() => setLoginType('student')}
              className={`py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                loginType === 'student'
                  ? 'bg-[var(--primary-600)] text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Sou Aluno
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center animate-pulse">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider ml-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-base text-white focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition-all outline-none placeholder:text-white/20"
                  placeholder={loginType === 'consultant' ? "seu@business.com" : "seu@email.com"}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between ml-1">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Senha
                  </label>
                  <a href="#" className="text-xs font-medium text-[var(--primary-500)] hover:text-[var(--primary-400)] hover:underline transition-colors">
                    Esqueceu a senha?
                  </a>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-base text-white focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition-all outline-none placeholder:text-white/20"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 rounded-xl bg-[var(--primary-600)] hover:bg-[var(--primary-500)] py-3.5 text-base font-semibold text-white transition-all transform active:scale-[0.98] shadow-lg shadow-[var(--primary-900)]/20 flex justify-center items-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Acessando...
                </span>
              ) : (
                `Entrar como ${loginType === 'consultant' ? 'Consultor' : 'Aluno'}`
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Ainda não tem acesso?{' '}
              <a 
                href={loginType === 'consultant' ? '/register-consultant' : '/register-student'}
                className="text-[var(--primary-500)] font-medium hover:text-[var(--primary-400)] hover:underline transition-colors"
              >
                Criar conta de {loginType === 'consultant' ? 'Consultor' : 'Aluno'}
              </a>
            </p>
          </div>
        </div>
        
        <p className="text-center text-xs text-white/20 mt-8">
          © {new Date().getFullYear()} Imago Inc. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}