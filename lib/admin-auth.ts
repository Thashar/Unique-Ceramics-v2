import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Session } from "next-auth";

/**
 * Weryfikuje sesję oraz AKTUALNĄ rolę użytkownika w bazie danych.
 * Rola w tokenie JWT może być nieaktualna nawet 30 dni (czas życia sesji) —
 * sprawdzenie w DB sprawia, że odebranie uprawnień ADMIN działa natychmiast.
 * Zwraca sesję admina albo null.
 */
export async function requireAdmin(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return user?.role === "ADMIN" ? session : null;
}
