'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Briefcase, User, Mail, Lock, Phone, Globe, Target } from 'lucide-react';
import Link from 'next/link';

export default function RegisterConsultantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado do Formulário
  const [formData, setFormData] = useState({
    name: '', // Nome da Pessoa
    email: '',
    password: '',
    phone: '',
    companyName: '', // Nome do Projeto/Empresa
    slug: '',
    niche: '' // Ex: Finanças, Inglês, Fitness
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Tratamento especial para o Slug
    if (name === 'slug') {
      const cleanSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setFormData(prev => ({ ...prev, slug: cleanSlug }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register-consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        // Redireciona para login com mensagem de sucesso
        router.push('/login?type=consultant_created');
      } else {
        setError(data.error || 'Erro ao cadastrar.');
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4">
      <div className="max-w-2xl w-full bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Lado Esquerdo (Visual) */}
        <div className="hidden md:flex flex-col justify-center p-8 bg-indigo-900/20 w-1/3 border-r border-white/5">
          <Briefcase className="w-12 h-12 text-indigo-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Para Consultores</h2>
          <p className="text-sm text-zinc-400">
            Crie sua própria plataforma de IA, monetize seu conhecimento e escale sua mentoria.
          </p>
        </div>

        {/* Lado Direito (Formulário) */}
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-white mb-6">Criar Conta Profissional</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Dados Pessoais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 ml-1">Seu Nome</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-zinc-600" />
                  <input name="name" required onChange={handleChange} placeholder="João Silva" className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 p-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 ml-1">WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-zinc-600" />
                  <input name="phone" required onChange={handleChange} placeholder="(11) 99999-9999" className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 p-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Dados de Login */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 ml-1">Email Profissional</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-600" />
                <input type="email" name="email" required onChange={handleChange} placeholder="joao@empresa.com" className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 p-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 ml-1">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-600" />
                <input type="password" name="password" required onChange={handleChange} placeholder="Mínimo 8 caracteres" className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 p-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
              </div>
            </div>

            <div className="h-px bg-white/5 my-4"></div>

            {/* Dados do Negócio */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 ml-1">Nome do Projeto / Empresa</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-3 text-zinc-600" />
                <input name="companyName" required onChange={handleChange} placeholder="Ex: Academia de Vendas" className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 p-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 ml-1">Seu Nicho</label>
                <div className="relative">
                  <Target className="w-4 h-4 absolute left-3 top-3 text-zinc-600" />
                  <input name="niche" required onChange={handleChange} placeholder="Ex: Finanças" className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 p-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 ml-1">URL Personalizada</label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-3 text-zinc-600" />
                  <input name="slug" required value={formData.slug} onChange={handleChange} placeholder="minha-marca" className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 p-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs text-center">{error}</p>}

            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 mt-4">
              {loading ? <Loader2 className="animate-spin mx-auto w-5 h-5"/> : 'Criar Plataforma'}
            </button>
            
            <p className="text-center text-xs text-zinc-500 mt-4">
              Já tem conta? <Link href="/login" className="text-indigo-400 hover:underline">Fazer Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}