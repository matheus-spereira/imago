// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Importe suas configs de auth
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { User, Settings } from 'lucide-react';
import LogoutButton from "@/components/LogoutButton"; // Importe o botão que criamos

export default async function DashboardPage() {
  // 1. Busca sessão no Servidor (Seguro e Rápido)
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // 2. Busca o consultor no Banco
  const consultant = await prisma.consultantProfile.findUnique({
    where: { userId: session.user.id } // Ajuste conforme seu schema
  });

  // 3. Validação de perfil
  if (!consultant) {
    // Se for aluno tentando acessar área de consultor, joga pro Hub
    if (session.user.role === 'STUDENT') {
        redirect('/hub');
    }
    // Se for consultor sem perfil, onboarding
    redirect('/onboarding');
  }

  // 4. Renderiza o HTML (Design Mantido)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Formas abstratas para profundidade */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-xl"></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-pink-500/10 rounded-full blur-xl"></div>

      <div className="p-8">
        <div className="max-w-6xl mx-auto bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
          
          {/* Cabeçalho */}
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Bem-vindo, {session.user?.name || consultant.name}!
              </h1>
              <p className="text-gray-300 text-lg">
                Identificador: <span className="text-purple-300">@{consultant.slug}</span>
              </p>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl hover:bg-white/20 transition-all duration-200 border border-white/20 cursor-pointer">
              <Settings className="h-10 w-10 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Configurações</h3>
              <p className="text-gray-300 text-base">Gerencie planos e agentes</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl hover:bg-white/20 transition-all duration-200 border border-white/20 cursor-pointer">
              <User className="h-10 w-10 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Perfil Público</h3>
              <p className="text-gray-300 text-base">Edite como seus alunos te veem</p>
            </div>
          </div>

          {/* Botão de Logout (Isolado no Componente) */}
          <div className="flex justify-end">
            <LogoutButton />
          </div>

        </div>
      </div>
    </div>
  );
}