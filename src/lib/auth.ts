// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // allowDangerousEmailAccountLinking: true,  // Remova se não precisar
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[auth] authorize called with', credentials);
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        console.log('[auth] found user', !!user, user?.email);
        if (!user || !user.password) {
          console.log('[auth] user not found or no password');
          return null;
        }
        const isValid = await bcrypt.compare(credentials.password, user.password);
        console.log('[auth] password valid?', isValid);
        if (!isValid) return null;
        console.log('[auth] authorize success for user', user.id);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],

  session: { strategy: 'jwt' },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (existingUser) {
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            update: {
              userId: existingUser.id,
            },
            create: {
              userId: existingUser.id,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              type: account.type,
              access_token: account.access_token,
              expires_at: account.expires_at,
              id_token: account.id_token,
              scope: account.scope,
              token_type: account.token_type,
            },
          });
          return true;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      console.log('JWT callback:', token, user);
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      console.log('Session callback triggered:', session, token);
      if (token?.id) session.user.id = token.id;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};