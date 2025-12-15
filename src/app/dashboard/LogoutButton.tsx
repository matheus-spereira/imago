'use client'

import React from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  return (
    <div>
      <button onClick={() => signOut({ callbackUrl: '/login' })}>Sair</button>
      <button onClick={() => router.push('/login')} style={{ marginLeft: 8 }}>
        Ir para Login
      </button>
    </div>
  );
}