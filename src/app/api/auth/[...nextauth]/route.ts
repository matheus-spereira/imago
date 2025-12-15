import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };


// // app/api/auth/[...nextauth]/route.ts
// import { authOptions } from '@/lib/auth';

// let cachedHandler: any = null;

// async function buildHandler() {
//   if (cachedHandler) return cachedHandler;

//   const mod = await import('next-auth').catch((err) => {
//     throw new Error('Falha ao importar next-auth: ' + String(err));
//   });

//   const NextAuthFactory = (mod as any).default ?? mod;
//   if (typeof NextAuthFactory !== 'function') {
//     // cache raw value
//     cachedHandler = { __notFunction: true, value: NextAuthFactory };
//     return cachedHandler;
//   }

//   const handler = NextAuthFactory(authOptions);
//   cachedHandler = handler;
//   return handler;
// }

// async function invoke(handler: any, request: Request) {
//   if (typeof handler === 'function') {
//     return await handler(request);
//   }

//   // tentar padrões comuns
//   const method = (request.method || 'GET').toUpperCase();

//   // handler.handlers.{METHOD}
//   if (handler?.handlers && typeof handler.handlers[method] === 'function') {
//     return await handler.handlers[method](request);
//   }

//   // handler[method]
//   if (typeof handler?.[method] === 'function') {
//     return await handler[method](request);
//   }

//   // handler.auth(request)
//   if (typeof handler?.auth === 'function') {
//     return await handler.auth(request);
//   }

//   // diagnóstico
//   return new Response(
//     JSON.stringify({
//       error: 'Não foi possível invocar handler do next-auth',
//       handlerKeys: handler && typeof handler === 'object' ? Object.keys(handler) : null,
//     }, null, 2),
//     { status: 500, headers: { 'Content-Type': 'application/json' } }
//   );
// }

// export async function GET(request: Request) {
//   try {
//     const handler = await buildHandler();
//     if ((handler as any).__notFunction) {
//       return new Response(JSON.stringify({ error: 'NextAuth factory não é função', details: String((handler as any).value) }, null, 2), { status: 500, headers: { 'Content-Type': 'application/json' } });
//     }
//     return await invoke(handler, request);
//   } catch (err: any) {
//     return new Response(JSON.stringify({ error: String(err), stack: err?.stack }, null, 2), { status: 500, headers: { 'Content-Type': 'application/json' } });
//   }
// }

// export async function POST(request: Request) {
//   return GET(request);
// }