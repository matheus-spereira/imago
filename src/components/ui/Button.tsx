import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'google';
  loading?: boolean;
}

export default function Button({ variant = 'primary', loading, children, icon, ...props }: ButtonProps & { icon?: React.ReactNode }) {
  const baseClasses = 'py-1.5 px-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 flex items-center justify-center gap-2';
  const variants = {
    primary: 'bg-[var(--primary-600)] text-[var(--text-primary)] hover:bg-[var(--primary-500)] focus:ring-[var(--primary-500)] w-full',
    secondary: 'bg-[var(--surface-800)] text-[var(--text-secondary)] hover:bg-[var(--surface-700)] focus:ring-[var(--surface-500)] w-full',
    google: 'bg-[var(--surface-800)] border border-[var(--surface-700)] text-[var(--text-secondary)] hover:bg-[var(--surface-700)] focus:ring-[var(--primary-500)] flex items-center justify-center gap-3 w-full',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]}`}
      disabled={loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin h-4 w-4" />}
      {icon}
      {children}
    </button>
  );
}