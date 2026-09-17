import HtmlLang from "@/components/layout/HtmlLang";

/**
 * Wersja angielska strony (`/en/...`). Strony pod tym katalogiem to cienkie
 * nakładki na te same komponenty co polskie, z `locale="en"`; komponenty
 * klienckie rozpoznają język z adresu (`lib/use-locale.ts`).
 *
 * Layout główny ma `<html lang="pl">` na sztywno – zagnieżdżony layout nie
 * może go zmienić, więc `HtmlLang` przestawia atrybut po stronie klienta.
 */
export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HtmlLang lang="en" />
      {children}
    </>
  );
}
