import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db, withDbRetry } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/logowanie",
    error: "/logowanie",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Hasło", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;

        // Ochrona przed brute-force: 5 prób/min na konto + globalny bezpiecznik
        if (
          (await isRateLimited(`login:${email.toLowerCase().trim()}`, 5, 60_000)) ||
          (await isRateLimited("login:global", 30, 60_000))
        ) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Logowanie – zapisz id, rolę i bieżącą wersję tokenu
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        token.tokenVersion = user.tokenVersion ?? 0;
        return token;
      }

      // Middleware działa w runtime **Edge**, gdzie Prisma nie ma jak się
      // połączyć: zapytanie niżej padało przy każdym żądaniu, `withDbRetry`
      // odczekiwał 300 + 600 ms ponowień i dopiero wtedy przepuszczał (fail-open).
      // Każde wejście na /konto, /admin i /api/admin z sesją kosztowało przez to
      // ~0,9 s czystego czekania (zmierzone w manifeście builda 16.09.2026).
      // Na Edge sprawdzamy więc tylko podpis i ważność tokenu – rewokację
      // (`tokenVersion`, usunięte konto, rola) i tak wymusza `auth()` wołane
      // z layoutów, stron i tras w Node, które renderują chronioną treść.
      if (process.env.NEXT_RUNTIME === "edge") return token;

      // Kolejne żądania – zweryfikuj wersję tokenu względem DB.
      // Pozwala natychmiast unieważnić sesje po zmianie hasła (bump tokenVersion)
      // oraz wylogować z usuniętego konta. Odświeża też rolę.
      if (token.id) {
        try {
          // Ponowienia jak w `requireAdmin` – pooler Supabase potrafi chwilowo
          // odmówić połączenia (`EMAXCONNSESSION`), a to jedyne miejsce, które
          // unieważnia JWT. Bez nich pojedyncza nieudana próba przedłużała
          // życie sesji unieważnionej zmianą hasła aż do kolejnego żądania
          const dbUser = await withDbRetry(() =>
            db.user.findUnique({
              where: { id: token.id as string },
              select: { tokenVersion: true, role: true, password: true },
            })
          );
          if (!dbUser) return null; // konto usunięte → wyloguj
          if ((token.tokenVersion ?? 0) !== dbUser.tokenVersion) return null; // hasło zmienione → wyloguj
          token.role = dbUser.role;
          // Czy konto ma własne hasło (a nie tylko logowanie Google). Do tokena
          // trafia **sam fakt**, nigdy hasło. Zastępuje kruchą heurystykę
          // „ma avatar = konto Google" i decyduje, czy wolno zmienić e-mail
          token.hasPassword = dbUser.password !== null;
        } catch {
          // Baza milczy mimo ponowień – nie wylogowuj (fail-open na problem
          // infrastruktury). Świadomy kompromis: token przechodzi z rolą
          // zapisaną w sobie, ale panel admina zostaje fail-closed, bo
          // `requireAdmin` przy tym samym błędzie przepuszcza wyjątek dalej
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.hasPassword = token.hasPassword === true;
      }
      return session;
    },
  },
});
