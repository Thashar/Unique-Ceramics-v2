"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { FlagGB, FlagPL } from "@/components/ui/Flags";
import { LOCALES, switchLocalePath, type Locale } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/use-locale";

const FLAG: Record<Locale, typeof FlagPL> = { pl: FlagPL, en: FlagGB };

/**
 * Przełącznik języka w nagłówku: flaga bieżącego języka, a po kliknięciu
 * rozwija się **sama flaga drugiego języka, bez napisu** (decyzja właściciela
 * 17.09.2026) – nazwa języka zostaje tylko w `aria-label`/`title`. Link
 * prowadzi na **tę samą stronę** w drugim języku (`switchLocalePath`); strona
 * bez odpowiednika – np. koszyk z wersji angielskiej – odsyła na stronę
 * główną danego języka.
 *
 * `variant="menu"` to wersja do menu mobilnego – bez rozwijania, obie flagi
 * obok siebie (bieżąca przygaszona).
 */
export default function LanguageSwitch({
  iconClass = "",
  variant = "dropdown",
  onNavigate,
}: {
  iconClass?: string;
  variant?: "dropdown" | "menu";
  onNavigate?: () => void;
}) {
  const locale = useLocale();
  const pathname = usePathname() ?? "/";
  const dict = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const names: Record<Locale, string> = { pl: dict.common.polish, en: dict.common.english };

  // Klik poza przełącznikiem i Escape zamykają listę
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (variant === "menu") {
    return (
      <div className="flex items-center gap-5 py-3">
        {LOCALES.map((code) => {
          const Flag = FLAG[code];
          const active = code === locale;
          return (
            <Link
              key={code}
              href={switchLocalePath(pathname, code)}
              hrefLang={code}
              onClick={onNavigate}
              aria-current={active ? "true" : undefined}
              aria-label={names[code]}
              title={names[code]}
              className={`inline-flex transition-opacity ${active ? "opacity-50" : "hover:opacity-80"}`}
            >
              <Flag />
            </Link>
          );
        })}
      </div>
    );
  }

  const Current = FLAG[locale];
  // Rozwijamy tylko drugi język – flaga, którą już widać, nie jest opcją
  const others = LOCALES.filter((code) => code !== locale);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${dict.common.language}: ${names[locale]}`}
        title={dict.common.switchTo}
        className={`inline-flex items-center gap-1 p-2 ${iconClass}`}
      >
        <Current />
        <ChevronDown
          size={12}
          strokeWidth={1.75}
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 rounded-md bg-espresso border border-white/10 shadow-lg p-1.5 z-50"
        >
          {others.map((code) => {
            const Flag = FLAG[code];
            return (
              <Link
                key={code}
                role="menuitem"
                href={switchLocalePath(pathname, code)}
                hrefLang={code}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                aria-label={names[code]}
                title={names[code]}
                className="flex items-center justify-center p-1.5 rounded-sm transition-colors hover:bg-white/8"
              >
                <Flag />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
