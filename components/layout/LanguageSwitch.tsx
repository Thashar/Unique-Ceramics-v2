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
 * rozwijana lista z obiema wersjami (bieżąca wyróżniona). Link prowadzi na
 * **tę samą stronę** w drugim języku (`switchLocalePath`); strona bez
 * odpowiednika – np. koszyk z wersji angielskiej – odsyła na stronę główną
 * danego języka.
 *
 * `variant="menu"` to wersja do menu mobilnego – bez rozwijania, oba języki
 * obok siebie.
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
      <div className="flex items-center gap-4 py-3">
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
              className={`inline-flex items-center gap-2 text-sm tracking-widest uppercase transition-colors ${
                active ? "text-terracotta" : "text-cream/75 hover:text-cream"
              }`}
            >
              <Flag />
              {names[code]}
            </Link>
          );
        })}
      </div>
    );
  }

  const Current = FLAG[locale];

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
          className="absolute right-0 top-full mt-1 min-w-[150px] rounded-md bg-espresso border border-white/10 shadow-lg py-1 z-50"
        >
          {LOCALES.map((code) => {
            const Flag = FLAG[code];
            const active = code === locale;
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
                aria-current={active ? "true" : undefined}
                className={`flex items-center gap-3 px-3 py-2 text-xs tracking-widest uppercase whitespace-nowrap transition-colors ${
                  active ? "text-terracotta" : "text-cream/80 hover:text-cream hover:bg-white/8"
                }`}
              >
                <Flag />
                {names[code]}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
