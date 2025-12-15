import { Mail, Lock, User } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, type = 'text', ...props }: InputProps) { // Adicionei type com default
  const icons = {
    email: <Mail className="h-5 w-5 text-gray-400" />,
    password: <Lock className="h-5 w-5 text-gray-400" />,
    text: <User className="h-5 w-5 text-gray-400" />,
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {icons[type as keyof typeof icons]}
      </div>
      <input
        type={type} // Adicionei type aqui
        className="w-full pl-10 pr-4 py-3 border border-[var(--surface-700)] rounded-lg bg-[var(--surface-800)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)] transition-all duration-200"
        {...props}
      />
    </div>
  );
}