"use client";

import { usePathname } from "next/navigation";
import { localeFromPath, localePath, type Locale } from "@/lib/i18n";
import { t, type Dictionary } from "@/lib/dictionary";

/**
 * Język bieżącej strony w komponencie klienckim – z adresu, bez providera.
 * `/en/...` to angielski, wszystko inne polski (patrz `lib/i18n.ts`).
 * Komponenty serwerowe dostają język propsem ze strony, na której stoją.
 */
export function useLocale(): Locale {
  return localeFromPath(usePathname());
}

/** Słownik dla języka bieżącej strony. */
export function useT(): Dictionary {
  return t(useLocale());
}

/** `href` w języku bieżącej strony – `/sklep` na `/en/...` staje się `/en/sklep`. */
export function useLocalePath(): (path: string) => string {
  const locale = useLocale();
  return (path: string) => localePath(locale, path);
}
