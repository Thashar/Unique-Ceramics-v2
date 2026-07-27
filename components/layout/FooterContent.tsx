import Link from "next/link";
import Image from "next/image";
import FooterInstagramPanel from "./FooterInstagramPanel";
import FooterContactsClient from "./FooterContactsClient";
import FooterAddressClient from "./FooterAddressClient";
import FooterMap from "./FooterMap";
import ThasharWordmark from "./ThasharWordmark";

const NAV_LINKS = [
  ["Sklep", "/sklep"],
  ["Warsztaty", "/warsztaty"],
  ["O mnie", "/o-mnie"],
  ["Zamówienie indywidualne", "/zamowienie-indywidualne"],
  ["Kontakt", "/kontakt"],
  ["Regulamin", "/regulamin"],
  ["Polityka prywatności", "/polityka-prywatnosci"],
];

/**
 * Wspólna treść stopki: [panel Instagram | nawigacja | kontakt | mapa]
 * + belka praw autorskich. Jedno źródło prawdy dla `Footer` (podstrony)
 * i `FooterWithInstagram` (strona główna) – różnią się tylko ramką
 * (pełna wysokość sekcji na stronie głównej).
 *
 * Musi być w pełni synchroniczny – `Footer` jest używany na wszystkich
 * podstronach, także tych renderowanych statycznie.
 */
export default function FooterContent({ instagram }: { instagram?: string }) {
  return (
    <>
      {/* Dekoracyjne elementy – clipped do sekcji */}
      <div className="relative overflow-hidden flex-1 flex items-center">
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-clay/8 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-72 w-3 h-3 bg-terracotta/20 rounded-full pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-0">
          {/* Panel Instagram – lewa kolumna z separatorem, pr-16 = 4rem przed linią */}
          <div className="relative lg:pr-16 lg:border-r lg:border-sand/12 flex flex-col justify-center">
            <FooterInstagramPanel instagram={instagram} />
          </div>

          {/* Nawigacja – pl-16 = 4rem po linii (symetria z pr-16) */}
          <div className="lg:pl-16">
            <p className="text-xs tracking-widest uppercase text-terracotta mb-5">Nawigacja</p>
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map(([label, href]) => (
                <Link key={href} href={href} className="text-sm hover:text-cream transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Kontakt – telefon, e-mail, social, adres pracowni i godziny otwarcia */}
          <div className="lg:pl-8">
            <p className="text-xs tracking-widest uppercase text-terracotta mb-5">Kontakt</p>
            <div className="flex flex-col gap-3">
              <FooterContactsClient />
            </div>
          </div>

          {/* Adres pracowni + mapa */}
          <div className="lg:pl-8">
            <p className="text-xs tracking-widest uppercase text-terracotta mb-5">Gdzie mnie znajdziesz</p>
            <FooterAddressClient />
            <div className="w-full aspect-square overflow-hidden rounded-sm">
              <FooterMap />
            </div>
          </div>
        </div>
      </div>

      {/* Belka praw autorskich – wycentrowana; zawija się na wąskich ekranach */}
      <div className="border-t border-sand/10 px-6 lg:px-10 py-4">
        <div className="relative max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo.webp"
              alt="Unique Ceramics"
              width={24}
              height={24}
              className="h-5 sm:h-6 w-auto brightness-0 invert opacity-70"
            />
            <span className="font-serif text-[11px] sm:text-xs text-cream/70 tracking-wide whitespace-nowrap">Unique Ceramics</span>
          </div>
          <p className="text-[11px] sm:text-xs text-sand/70 text-center">
            © {new Date().getFullYear()} Wszelkie prawa zastrzeżone.
          </p>
          {/* Mobile: własny wiersz, wyśrodkowany. Desktop: przy prawej krawędzi –
              pozycjonowany absolutnie, żeby nie zbijać wyśrodkowania reszty belki. */}
          <div className="basis-full flex justify-center lg:basis-auto lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2">
            <ThasharWordmark width="clamp(56px, 16vw, 63px)" />
          </div>
        </div>
      </div>
    </>
  );
}
