import { Shield, Zap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-start)] to-[var(--bg-end)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[var(--surface-800)]/90 backdrop-blur-lg rounded-xl shadow-2xl p-8 border border-[var(--surface-700)]/50">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-[var(--primary-500)]">
            <Zap className="h-8 w-8" />
            <span className="text-2xl font-bold text-[var(--text-primary)]">Imago ID</span>
          </div>
          <p className="text-[var(--text-muted)] text-sm mt-2">Tecnologia avançada para identificação inteligente</p>
        </div>
        
        {children}
        
        {/* Elementos de confiança */}
        <div className="mt-6 flex justify-center gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-[var(--accent-500)]" />
            Seguro
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-[var(--accent-500)]" />
            Inovador
          </div>
        </div>
      </div>
    </div>
  );
}