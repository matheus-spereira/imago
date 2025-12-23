// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Estende a interface User (retornada no authorize)
   */
  interface User {
    id: string
    role?: string
    profileId?: string
    slug?: string
  }

  /**
   * Estende a interface Session (retornada no useSession)
   */
  interface Session {
    user: {
      id: string
      role?: string
      profileId?: string
      slug?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  /**
   * Estende o Token JWT
   */
  interface JWT {
    role?: string
    profileId?: string
    slug?: string
  }
}