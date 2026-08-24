import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      /** Czy konto ma własne hasło (false = logowanie wyłącznie przez Google). */
      hasPassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    tokenVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    tokenVersion?: number;
    hasPassword?: boolean;
  }
}
