'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Button from '@/components/ui/Button';
import { User, Settings, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      console.log('No session, redirecting to login');
      router.push('/login');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[var(--bg-start)] to-[var(--bg-end)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-600)]"></div>
      </div>
    );
  }

  // Removido: if (!session) { router.push('/login'); return null; } — isso causava o erro

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-start)] to-[var(--bg-end)] p-12">
      <div className="max-w-6xl mx-auto bg-[var(--surface-800)]/90 backdrop-blur-lg rounded-xl shadow-2xl p-12 border border-[var(--surface-700)]/50">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 bg-[var(--primary-600)] rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-[var(--text-primary)]" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">Bem-vindo ao Imago ID, {session?.user?.name}!</h1>
            <p className="text-[var(--text-secondary)] text-lg">Email: {session?.user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-[var(--surface-700)]/50 p-6 rounded-lg hover:bg-[var(--surface-700)]/70 transition">
            <Settings className="h-10 w-10 text-[var(--accent-500)] mb-4" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Configurações</h3>
            <p className="text-[var(--text-muted)] text-base">Gerencie sua conta</p>
          </div>
          {/* Mais cards se necessário */}
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => signOut({ callbackUrl: '/login' })} icon={<LogOut className="h-5 w-5" />}>
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}