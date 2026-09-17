import FooterContent from "./FooterContent";
import type { Locale } from "@/lib/i18n";

/**
 * Stopka podstron – identyczna z tą na stronie głównej (`FooterContent`),
 * bez ramki pełnoekranowej sekcji. Musi być w pełni synchroniczna (ważne!):
 * async server component tutaj wywala hydratację na stronach statycznych.
 */
export default function Footer({ locale = "pl" }: { locale?: Locale } = {}) {
  return (
    <footer className="bg-espresso text-sand/80 flex flex-col">
      <FooterContent locale={locale} />
    </footer>
  );
}
