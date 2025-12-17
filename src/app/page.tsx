export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Formas abstratas para profundidade */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-xl"></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-pink-500/10 rounded-full blur-xl"></div>

      <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4 border border-white/20 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Imago
        </h1>
        <p className="text-lg text-gray-300 mb-8">
          Sistema de identificação inteligente
        </p>
        <div className="space-y-4">
          <a
            href="/login"
            className="block w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent"
          >
            Entrar
          </a>
          <a
            href="/register"
            className="block w-full py-4 bg-white/20 border border-white/30 hover:bg-white/30 text-white font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            Criar Conta
          </a>
        </div>
      </div>
    </div>
  );
}