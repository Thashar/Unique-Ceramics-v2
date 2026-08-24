// Zmiana adresu e-mail konta – czyste funkcje pomocnicze.
//
// E-mail jest w tym sklepie **loginem**, więc jego podmiana to zmiana
// tożsamości: wymaga aktualnego hasła i potwierdzenia z nowej skrzynki.
// Tutaj siedzi wyłącznie to, co da się przetestować bez bazy i bez poczty –
// walidacja adresu, generowanie i haszowanie tokenu oraz termin ważności.
//
// Moduł jest neutralny (bez bazy, bez Reacta): używa go trasa żądania,
// trasa potwierdzenia i testy.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Jak długo link potwierdzający jest ważny. */
export const EMAIL_CHANGE_TTL_MS = 60 * 60 * 1000; // 1 h

/** Adres sprowadzony do postaci porównywalnej: bez spacji, małymi literami. */
export function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

/**
 * Ta sama reguła co przy zamówieniu i rejestracji – celowo luźna, bo pełna
 * walidacja adresu regexem jest niemożliwa, a i tak potwierdzamy go mailem.
 * Górny limit chroni bazę przed wpisami absurdalnej długości.
 */
export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Surowy token do linku – 32 bajty losowe, zapisywane wyłącznie w mailu. */
export function createToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash tokenu do zapisu w bazie. Trzymamy **tylko hash**, żeby wyciek bazy nie
 * dawał gotowych linków do przejęcia kont (ta sama zasada co przy resetach haseł).
 * SHA-256 wystarcza: token jest losowy i długi, więc nie da się go zgadnąć –
 * nie chronimy tu słabego sekretu wybranego przez człowieka.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Porównanie hashy odporne na pomiar czasu. */
export function tokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex");
  let expected: Buffer;
  try {
    expected = Buffer.from(expectedHash, "hex");
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Czy żądanie straciło ważność. */
export function isExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  const ms = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  if (Number.isNaN(ms)) return true; // nieczytelna data = nie ufamy żądaniu
  return ms <= now.getTime();
}

/** Termin ważności nowego żądania. */
export function expiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + EMAIL_CHANGE_TTL_MS);
}

export type EmailChangeCheck =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * Walidacja adresu podanego w formularzu – wspólna dla trasy i testów.
 * `currentEmail` pozwala odrzucić „zmianę" na ten sam adres, zanim wyślemy maile.
 */
export function checkNewEmail(input: unknown, currentEmail: string): EmailChangeCheck {
  const email = normalizeEmail(input);
  if (!email) return { ok: false, error: "Podaj nowy adres e-mail." };
  if (!isValidEmail(email)) return { ok: false, error: "Nieprawidłowy adres e-mail." };
  if (email === normalizeEmail(currentEmail)) {
    return { ok: false, error: "To jest Twój obecny adres e-mail." };
  }
  return { ok: true, email };
}
