"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlagGB, FlagPL } from "@/components/ui/Flags";
import { HoverPopover, PopoverHeading } from "@/components/layout/HeaderPopovers";
import { LOCALES, switchLocalePath, type Locale } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/use-locale";

const FLAG: Record<Locale, typeof FlagPL> = { pl: FlagPL, en: FlagGB };

/**
 * Przełącznik języka w nagłówku – **ten sam dymek co koszyk i konto**
 * (`HoverPopover`): otwiera się po najechaniu, ma dziobek, pas szkliwa
 * i nagłówek z mozaiką. W środku stoi **sama flaga drugiego języka, bez
 * napisu** (decyzja właściciela 17.09.2026) – nazwa języka zostaje tylko
 * w `aria-label`/`title`. Kliknięcie w samą flagę w pasku (bez czekania na
 * dymek – także na dotyku) od razu przełącza język.
 *
 * Link prowadzi na **tę samą stronę** w drugim języku (`switchLocalePath`);
 * strona bez odpowiednika – np. koszyk z wersji angielskiej – odsyła na
 * stronę główną danego języka.
 *
 * `variant="menu"` to wersja do menu mobilnego – bez dymka, obie flagi
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

  const names: Record<Locale, string> = { pl: dict.common.polish, en: dict.common.english };
  // Pokazujemy tylko drugi język – flaga, którą już widać w pasku, nie jest opcją
  const others = LOCALES.filter((code) => code !== locale);
  const other = others[0];

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

  return (
    <HoverPopover
      label={dict.common.language}
      width="w-36"
      trigger={
        <Link
          href={switchLocalePath(pathname, other)}
          hrefLang={other}
          onClick={onNavigate}
          aria-label={`${dict.common.language}: ${names[locale]}`}
          title={dict.common.switchTo}
          className={`block p-2 ${iconClass}`}
        >
          <Current />
        </Link>
      }
    >
      <PopoverHeading title={dict.common.language} />
      <div className="flex items-center justify-center gap-4 px-4 py-4">
        {others.map((code) => {
          const Flag = FLAG[code];
          return (
            <Link
              key={code}
              href={switchLocalePath(pathname, code)}
              hrefLang={code}
              onClick={onNavigate}
              aria-label={names[code]}
              title={names[code]}
              className="inline-flex rounded-md p-1.5 transition-colors hover:bg-cream"
            >
              <Flag className="h-7 w-[42px]" />
            </Link>
          );
        })}
      </div>
    </HoverPopover>
  );
}
