'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Rocket } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Função para limpar o slug (sem espaços, minúsculo)
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/consultant/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, phone })
      });

      const data = await res.json();

      if (res.ok) {
        // Sucesso! Vai para o Dashboard
        router.push('/dashboard');
        router.refresh(); // Força recarregar a sessão para pegar o novo perfil
      } else {
        setError(data.error || 'Erro ao criar perfil');
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-4">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
            <Rocket className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Configure seu Espaço</h1>
          <p className="text-zinc-400">Vamos criar a identidade do seu negócio de IA.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#18181b] border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
          
          {/* Nome do Negócio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Nome do seu Negócio / Consultoria</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mentoria Alpha"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* URL Personalizada (Slug) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Sua URL personalizada</label>
            <div className="flex items-center">
              <span className="bg-zinc-800 border border-white/10 border-r-0 rounded-l-lg p-3 text-zinc-500 text-sm">
                imago.ai/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="sua-marca"
                className="w-full bg-zinc-900 border border-white/10 rounded-r-lg p-3 text-white focus:border-indigo-500 focus:outline-none transition-colors font-mono text-sm"
              />
            </div>
            <p className="text-xs text-zinc-500">Este será o link para seus alunos acessarem.</p>
          </div>

          {/* Telefone (Opcional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">WhatsApp para Contato (Opcional)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5"/> : <>Criar meu Espaço <ArrowRight className="w-4 h-4"/></>}
          </button>
        </form>
      </div>
    </div>
  );
}