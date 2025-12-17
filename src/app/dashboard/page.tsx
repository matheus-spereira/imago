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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Formas abstratas para profundidade */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-xl"></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-pink-500/10 rounded-full blur-xl"></div>

      <div className="p-8">
        <div className="max-w-6xl mx-auto bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Bem-vindo, {session?.user?.name}!</h1>
              <p className="text-gray-300 text-lg">Email: {session?.user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl hover:bg-white/20 transition-all duration-200 border border-white/20">
              <Settings className="h-10 w-10 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Configurações</h3>
              <p className="text-gray-300 text-base">Gerencie sua conta e preferências</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl hover:bg-white/20 transition-all duration-200 border border-white/20">
              <User className="h-10 w-10 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Perfil</h3>
              <p className="text-gray-300 text-base">Atualize suas informações pessoais</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-6 py-3 bg-red-600/80 hover:bg-red-600 text-white font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-transparent backdrop-blur-sm"
            >
              <LogOut className="h-5 w-5 inline mr-2" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}