"use client";

import { collectStrings, replaceStrings } from "@/lib/i18n-content";

/**
 * Wywołania tłumaczenia z panelu (`/api/admin/ai-translate`). Trasa zna tylko
 * płaską listę tekstów – JSON-y z panelu (oferty warsztatów, FAQ, karty)
 * rozkładamy tu na napisy i składamy z powrotem w tej samej strukturze.
 * Błąd leci wyjątkiem z komunikatem po polsku – pokazuje go przycisk.
 */
export async function translateTexts(texts: string[]): Promise<string[]> {
  const res = await fetch("/api/admin/ai-translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(data?.texts)) {
    throw new Error(data?.error ?? `Nie udało się przetłumaczyć (błąd ${res.status}).`);
  }
  return data.texts as string[];
}

/** Tłumaczy wszystkie napisy w JSON-ie z panelu, zachowując strukturę, id i ikony. */
export async function translateJson(json: string): Promise<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Polska treść nie jest poprawnym JSON-em – najpierw zapisz ją w zakładce PL.");
  }
  const strings = collectStrings(parsed as Parameters<typeof collectStrings>[0]);
  if (strings.length === 0) return json;
  const translated = await translateTexts(strings);
  return JSON.stringify(replaceStrings(parsed as Parameters<typeof replaceStrings>[0], translated));
}
