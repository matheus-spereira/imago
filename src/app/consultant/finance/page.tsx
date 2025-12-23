'use client';

import React from 'react';
import { 
  Wallet, TrendingUp, ArrowUpRight, DollarSign, Calendar, Download
} from 'lucide-react';

export default function FinancePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Financeiro</h2>
          <p className="text-zinc-400">Acompanhe seus ganhos e comissões.</p>
        </div>
        <button className="bg-[#18181b] border border-white/5 hover:bg-white/5 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
           <Download size={16} /> Exportar Relatório
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Saldo Disponível */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-900/10 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={64} className="text-emerald-500"/></div>
           <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-1">Disponível para Saque</p>
           <h3 className="text-3xl font-bold text-white mb-4">R$ 1.250,00</h3>
           <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm w-full font-medium shadow-lg shadow-emerald-900/20 transition-all">
             Solicitar Saque
           </button>
        </div>

        {/* A Receber */}
        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6">
           <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Calendar size={20}/></div>
             <p className="text-zinc-400 text-sm font-medium">A Receber (Futuro)</p>
           </div>
           <h3 className="text-2xl font-bold text-white mb-1">R$ 450,00</h3>
           <p className="text-xs text-zinc-500">Previsão: 15/12/2024</p>
        </div>

        {/* Total Bruto */}
        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6">
           <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><TrendingUp size={20}/></div>
             <p className="text-zinc-400 text-sm font-medium">Total Acumulado</p>
           </div>
           <h3 className="text-2xl font-bold text-white mb-1">R$ 5.890,00</h3>
           <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 w-fit px-2 py-0.5 rounded">
             <ArrowUpRight size={12} /> +12% este mês
           </div>
        </div>

      </div>

      {/* Histórico de Transações */}
      <div className="bg-[#18181b] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-semibold text-white">Transações Recentes</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white/5 text-zinc-400 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {/* MOCK DATA - LINHAS DE EXEMPLO */}
            <tr className="hover:bg-white/[0.02]">
               <td className="px-6 py-4 text-sm text-zinc-400">23/11/2024</td>
               <td className="px-6 py-4 text-white">Assinatura Nível 10 - João Silva</td>
               <td className="px-6 py-4"><span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">Pago</span></td>
               <td className="px-6 py-4 text-right text-emerald-400 font-medium">+ R$ 97,00</td>
            </tr>
            <tr className="hover:bg-white/[0.02]">
               <td className="px-6 py-4 text-sm text-zinc-400">22/11/2024</td>
               <td className="px-6 py-4 text-white">Saque Enviado (PIX)</td>
               <td className="px-6 py-4"><span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">Processando</span></td>
               <td className="px-6 py-4 text-right text-zinc-400 font-medium">- R$ 500,00</td>
            </tr>
            <tr className="hover:bg-white/[0.02]">
               <td className="px-6 py-4 text-sm text-zinc-400">20/11/2024</td>
               <td className="px-6 py-4 text-white">Assinatura Nível 5 - Maria Souza</td>
               <td className="px-6 py-4"><span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">Pago</span></td>
               <td className="px-6 py-4 text-right text-emerald-400 font-medium">+ R$ 49,90</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}