'use client'; // Este arquivo roda no navegador para permitir o clique

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="px-6 py-3 bg-red-600/80 hover:bg-red-600 text-white font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-transparent backdrop-blur-sm flex items-center"
    >
      <LogOut className="h-5 w-5 mr-2" />
      Sair
    </button>
  );
}