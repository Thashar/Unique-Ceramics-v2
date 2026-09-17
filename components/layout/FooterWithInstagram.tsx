import FooterContent from "./FooterContent";
import type { Locale } from "@/lib/i18n";

/**
 * Stopka strony głównej – ta sama treść co na podstronach (`FooterContent`),
 * osadzona w sekcji scroll-snap o pełnej wysokości (pt-20 kompensuje header).
 */
export default function FooterWithInstagram({ instagram, locale = "pl" }: { instagram: string; locale?: Locale }) {
  return (
    <footer className="flex-1 flex flex-col pt-20 bg-espresso text-sand/80">
      <FooterContent instagram={instagram} locale={locale} />
    </footer>
  );
}
