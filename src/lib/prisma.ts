// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // para evitar múltiplas instâncias em dev HMR
  // @ts-ignore
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'], // ajustar se quiser mais logs
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
