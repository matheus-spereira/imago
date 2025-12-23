import { NextAuthOptions, DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 1. Tipagem Estendida (Adicionamos slug e profileId)
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: 'CONSULTANT' | 'STUDENT';
      slug?: string;      // URL do consultor
      profileId?: string; // ID do perfil de negócios
    } & DefaultSession["user"];
  }
  interface User {
    role?: 'CONSULTANT' | 'STUDENT';
    slug?: string;
    profileId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: 'CONSULTANT' | 'STUDENT';
    slug?: string;
    profileId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  // O Adapter serve para o Google Login criar o User automaticamente
  adapter: PrismaAdapter(prisma),
  
  // Usamos JWT para não depender de sessão no banco (mais rápido e flexível para híbrido)
  session: { strategy: 'jwt' },

  providers: [
    // LOGIN POR EMAIL/SENHA (Híbrido: Aluno Global ou Consultor)
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        // Adicionamos um campo oculto para saber quem está tentando entrar
        loginType: { label: "Type", type: "text" } 
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { email, password, loginType } = credentials;

        // ===============================================
        // CENÁRIO A: LOGIN DE ALUNO (StudentAccount)
        // ===============================================
        if (loginType === 'student') {
            const student = await prisma.studentAccount.findUnique({
                where: { email }
            });

            if (student && student.passwordHash) {
                const isValid = await bcrypt.compare(password, student.passwordHash);
                if (isValid) {
                    return {
                        id: student.id,
                        email: student.email,
                        name: student.name,
                        role: 'STUDENT',
                    };
                }
            }
            // Se falhar aqui, não tenta ser consultor. Senha errada é senha errada.
            throw new Error("Credenciais de aluno inválidas.");
        }

        // ===============================================
        // CENÁRIO B: LOGIN DE CONSULTOR (User + Profile)
        // ===============================================
        // Se loginType for 'consultant' OU indefinido (fallback), tentamos User
        
        const user = await prisma.user.findUnique({ 
            where: { email },
            include: { consultantProfile: true } // [IMPORTANTE] Traz o slug e dados do negócio
        });

        if (user && user.password) {
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid) {
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: 'CONSULTANT',
                    // Passamos esses dados para usar no redirecionamento depois
                    slug: user.consultantProfile?.slug,
                    profileId: user.consultantProfile?.id
                };
            }
        }
        
        return null;
      },
    }),

    // LOGIN GOOGLE (Apenas Consultores)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // Forçamos que logins via Google sejam sempre CONSULTORES
      profile(profile) {
        return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            role: 'CONSULTANT' // Google é sempre Consultant no seu app
        }
      }
    }),
  ],

  pages: {
    signIn: '/login', // Sua página customizada com abas
    error: '/login',
  },

  callbacks: {
    // 1. JWT: Ocorre primeiro. Persistimos os dados do User no Token criptografado.
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || 'CONSULTANT';
        token.slug = user.slug;
        token.profileId = user.profileId;
      }
      
      // (Opcional) Se você atualizar o perfil do usuário via front-end, isso atualiza a sessão
      if (trigger === "update" && session) {
        return { ...token, ...session.user };
      }

      // Se for login Google, precisamos buscar o Profile/Slug no banco, 
      // pois o GoogleProvider não sabe o slug que está no banco.
      if (!token.slug && token.role === 'CONSULTANT' && token.email) {
         const dbUser = await prisma.user.findUnique({
             where: { email: token.email },
             include: { consultantProfile: true }
         });
         if (dbUser?.consultantProfile) {
             token.slug = dbUser.consultantProfile.slug;
             token.profileId = dbUser.consultantProfile.id;
         }
      }

      return token;
    },

    // 2. Session: Ocorre quando o front-end chama useSession(). 
    // Passamos os dados do Token para o objeto de sessão visível.
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'CONSULTANT' | 'STUDENT';
        session.user.slug = token.slug as string | undefined;
        session.user.profileId = token.profileId as string | undefined;
      }
      return session;
    }
  },

  secret: process.env.NEXTAUTH_SECRET,
};