import { auth } from "@/auth";
import { db, withDbRetry } from "@/lib/db";
import type { Session } from "next-auth";

/**
 * Weryfikuje sesję oraz AKTUALNĄ rolę użytkownika w bazie danych.
 * Rola w tokenie JWT może być nieaktualna nawet 30 dni (czas życia sesji) –
 * sprawdzenie w DB sprawia, że odebranie uprawnień ADMIN działa natychmiast.
 * Zwraca sesję admina albo null.
 */
export async function requireAdmin(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;

  // Ponowienia, bo pooler Supabase potrafi chwilowo odmówić połączenia
  // (`EMAXCONNSESSION`) – bez nich cały panel oddaje 500 zamiast się otworzyć.
  // Gdy baza milczy mimo prób, błąd leci dalej: roli nie da się potwierdzić,
  // a cichy redirect wyglądałby na wylogowanie i mylił przy diagnozie.
  const user = await withDbRetry(() =>
    db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
  );

  return user?.role === "ADMIN" ? session : null;
}
