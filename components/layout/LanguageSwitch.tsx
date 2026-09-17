"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FLAG_SIZE, FlagGB, FlagPL } from "@/components/ui/Flags";
import { LOCALES, switchLocalePath, type Locale } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/use-locale";

const FLAG: Record<Locale, typeof FlagPL> = { pl: FlagPL, en: FlagGB };

/**
 * Przełącznik języka w nagłówku (desktop): **jedna flaga**, która po najechaniu
 * dzieli się po skosie na pół – lewy dół zostaje flagą bieżącego języka, prawa
 * góra odsłania flagę drugiego (animacja `clip-path` w `app/globals.css`,
 * klasy `uc-flag-split` / `uc-flag-other`). **Kliknięcie przełącza język**
 * (decyzja właściciela 17.09.2026; wcześniejsze wersje z rozwijaną drugą flagą
 * i z dymkiem wycofane). Nazwa języka zostaje w `aria-label`/`title`.
 *
 * Link prowadzi na **tę samą stronę** w drugim języku (`switchLocalePath`);
 * strona bez odpowiednika – np. koszyk z wersji angielskiej – odsyła na
 * stronę główną danego języka.
 *
 * `variant="menu"` to wersja do menu mobilnego – obie flagi obok siebie,
 * bieżąca przygaszona (na telefonie nie ma najechania).
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

  const names: Record<Locale, string> = { pl: dict.common.polish, en: dict.common.english };
  const other = LOCALES.find((code) => code !== locale) ?? locale;

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
    <Link
      href={switchLocalePath(pathname, other)}
      hrefLang={other}
      onClick={onNavigate}
      aria-label={`${dict.common.switchTo}: ${names[other]}`}
      title={`${dict.common.switchTo}: ${names[other]}`}
      className={`uc-flag-split block p-2 ${iconClass}`}
    >
      <span className={`relative block ${FLAG_SIZE}`}>
        <Current className="absolute inset-0 h-full w-full" />
        {/* Flaga drugiego języka – przycięta do zera, po najechaniu odsłania
            się po skosie do połowy (patrz globals.css) */}
        <Other className="uc-flag-other absolute inset-0 h-full w-full" />
      </span>
    </Link>
  );
}
