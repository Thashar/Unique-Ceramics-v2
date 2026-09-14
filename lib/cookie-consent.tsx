"use client";

import { useSyncExternalStore } from "react";

type ConsentLevel = "all" | "necessary" | null;

/** Klucz w localStorage. Eksportowany, bo czyta go też skrypt w `<head>`
 *  (`app/layout.tsx`), który ukrywa baner przed pierwszym malowaniem – obie
 *  strony muszą używać dokładnie tej samej nazwy. */
export const COOKIE_CONSENT_KEY = "uc-cookie-consent";
const KEY = COOKIE_CONSENT_KEY;

// Moduł działa jako zewnętrzny store (localStorage) – czytany przez
// useSyncExternalStore, dzięki czemu nie potrzebujemy setState w efektach
let cached: ConsentLevel | undefined;
const listeners = new Set<() => void>();

function readConsent(): ConsentLevel {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === "all" || stored === "necessary" ? stored : null;
  } catch {
    return null;
  }
}

function getSnapshot(): ConsentLevel {
  if (cached === undefined) cached = readConsent();
  return cached;
}

function getServerSnapshot(): ConsentLevel {
  return null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setConsent(level: "all" | "necessary") {
  try {
    localStorage.setItem(KEY, level);
  } catch {}
  cached = level;
  listeners.forEach((l) => l());
}

export function acceptAll() {
  setConsent("all");
}

export function acceptNecessary() {
  setConsent("necessary");
}

export function useCookieConsent() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // false podczas SSR/hydratacji, true po stronie klienta – bez setState w efekcie
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  return { consent, hydrated, acceptAll, acceptNecessary };
}
