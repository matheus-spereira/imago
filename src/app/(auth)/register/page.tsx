'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/register', {  // Ajustei para /api/auth/register se for o path correto
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    if (res.ok) router.push('/login');
    else setError('Erro ao registrar');
  }

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Registrar no Imago ID</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
          required
        />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha (mín. 8 chars)"
          required
        />
        {error && <p className="text-red-400 text-sm animate-pulse">{error}</p>}
        <Button type="submit" loading={loading}>
          Registrar
        </Button>
      </form>
      <p className="mt-4 text-sm text-[var(--text-muted)]">
        Já tem conta?{' '}
        <a href="/login" className="text-[var(--primary-500)] hover:underline transition">
          Entrar
        </a>
      </p>
    </div>
  );
}