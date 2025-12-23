'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, Search, Filter, MoreHorizontal, Mail, Shield, UserPlus, Loader2
} from 'lucide-react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  email: string;
  level: number;
  since: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/consultant/students')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStudents(data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filtro simples no front
  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex h-full items-center justify-center text-zinc-500 gap-2"><Loader2 className="animate-spin"/> Carregando alunos...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Meus Alunos</h2>
          <p className="text-zinc-400">Gerencie quem tem acesso aos seus agentes.</p>
        </div>
        <Link 
          href="/consultant/account" 
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-900/20"
        >
          <UserPlus size={20} /> Convidar Aluno
        </Link>
      </div>

      {/* Filtros e Busca */}
      <div className="flex gap-4">
        <div className="flex-1 bg-[#18181b] border border-white/5 rounded-lg flex items-center px-4 py-2.5">
          <Search className="text-zinc-500 w-5 h-5 mr-3" />
          <input 
            placeholder="Buscar por nome ou email..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600"
          />
        </div>
        <button className="bg-[#18181b] border border-white/5 text-zinc-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/5">
          <Filter size={18} /> Filtros
        </button>
      </div>

      {/* Tabela de Alunos */}
      <div className="bg-[#18181b] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-zinc-400 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Aluno</th>
              <th className="px-6 py-4">Nível de Acesso</th>
              <th className="px-6 py-4">Data de Entrada</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
               <tr>
                 <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                   {searchTerm ? 'Nenhum aluno encontrado na busca.' : 'Você ainda não tem alunos ativos.'}
                 </td>
               </tr>
            ) : filtered.map(student => (
              <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {student.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{student.name}</p>
                      <p className="text-sm text-zinc-500 flex items-center gap-1">
                        <Mail size={12}/> {student.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    student.level >= 10 
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    <Shield size={10} />
                    Nível {student.level}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {new Date(student.since).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}