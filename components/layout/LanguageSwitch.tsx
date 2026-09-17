"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FlagGB, FlagPL } from "@/components/ui/Flags";
import { LOCALES, switchLocalePath, type Locale } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/use-locale";

const FLAG: Record<Locale, typeof FlagPL> = { pl: FlagPL, en: FlagGB };
const CLOSE_DELAY_MS = 180;

/**
 * Przełącznik języka w nagłówku: flaga bieżącego języka, a po **najechaniu**
 * pod nią pojawia się **sama flaga drugiego języka** – bez dymka, bez ramki
 * i bez napisu (decyzja właściciela 17.09.2026; wersja w konwencji dymków
 * koszyka i konta wycofana). Nazwa języka zostaje w `aria-label`/`title`.
 * **Język zmienia wyłącznie kliknięcie w drugą flagę** – kliknięcie w flagę
 * bieżącego języka tylko pokazuje lub chowa tę pod spodem (tak działa na
 * dotyku, gdzie najechania nie ma), nigdy nie przełącza.
 *
 * Link prowadzi na **tę samą stronę** w drugim języku (`switchLocalePath`);
 * strona bez odpowiednika – np. koszyk z wersji angielskiej – odsyła na
 * stronę główną danego języka.
 *
 * `variant="menu"` to wersja do menu mobilnego – obie flagi obok siebie,
 * bieżąca przygaszona.
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const names: Record<Locale, string> = { pl: dict.common.polish, en: dict.common.english };
  // Pokazujemy tylko drugi język – flaga, którą już widać w pasku, nie jest opcją
  const other = LOCALES.find((code) => code !== locale) ?? locale;

  // Krótka zwłoka przy zjeżdżaniu, żeby przejście kursorem z flagi na tę
  // pod spodem nie zamykało jej w połowie drogi
  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Otwarte kliknięciem (dotyk) zamyka klik poza przełącznikiem i Escape
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
  const Other = FLAG[other];

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {/* Flaga bieżącego języka to przycisk, nie link: kliknięcie w nią
          niczego nie przełącza – tylko pokazuje/chowa drugą flagę */}
      <button
        type="button"
        onClick={() => {
          if (timer.current) clearTimeout(timer.current);
          setOpen((v) => !v);
        }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${dict.common.language}: ${names[locale]}`}
        title={`${dict.common.language}: ${names[locale]}`}
        className={`block p-2 ${iconClass}`}
      >
        <Current />
      </button>

      {/* Druga flaga wysuwa się pod pierwszą, dokładnie w tej samej osi.
          `pt-1` zamiast odstępu marginesem – szczelina jest częścią elementu,
          więc kursor przechodzący przez nią nie wywołuje `mouseleave` */}
      <div
        className={`absolute left-0 top-full pt-1 z-50 transition-all duration-150 ${
          open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
      >
        <Link
          href={switchLocalePath(pathname, other)}
          hrefLang={other}
          onClick={onNavigate}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          aria-label={names[other]}
          title={names[other]}
          className="block p-2 opacity-90 hover:opacity-100 transition-opacity"
        >
          <Other />
        </Link>
      </div>
    </div>
  );
}
