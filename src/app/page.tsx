export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="rounded-lg bg-white p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-gray-900">
          Imago ID ✅
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Next.js + TypeScript + Tailwind CSS v4
        </p>
        <div className="mt-6 flex gap-4">
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition">
            Começar
          </button>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
            Saiba mais
          </button>
        </div>
      </div>
    </div>
  );
}