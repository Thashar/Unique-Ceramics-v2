"use client";

import { useEffect } from "react";

/**
 * Ustawia `<html lang>` na czas życia strony – dla wersji angielskiej, której
 * zagnieżdżony layout nie ma dostępu do elementu `<html>` z layoutu głównego.
 * Po wyjściu z `/en` atrybut wraca do polskiego.
 */
export default function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = lang;
    return () => {
      root.lang = previous;
    };
  }, [lang]);
  return null;
}
