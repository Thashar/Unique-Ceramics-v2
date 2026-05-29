import Link from "next/link";
import Image from "next/image";
import FooterInstagramPanel from "./FooterInstagramPanel";
import FooterContactsClient from "./FooterContactsClient";
import FooterMap from "./FooterMap";

const NAV_LINKS = [
  ["Sklep", "/sklep"],
  ["Warsztaty", "/warsztaty"],
  ["O mnie", "/o-mnie"],
  ["Zamówienie indywidualne", "/zamowienie-indywidualne"],
  ["Kontakt", "/kontakt"],
  ["Regulamin", "/regulamin"],
  ["Polityka prywatności", "/polityka-prywatnosci"],
];

export default function FooterWithInstagram({ instagram }: { instagram: string }) {
  return (
    <footer className="bg-espresso text-sand/80">
      {/* Dekoracyjne elementy — clipped do sekcji */}
      <div className="relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-clay/8 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-72 w-3 h-3 bg-terracotta/20 rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-10">
          {/* Panel Instagram — lewa kolumna z separatorem */}
          <div className="relative lg:pr-10 lg:border-r lg:border-sand/12">
            <FooterInstagramPanel instagram={instagram} />
          </div>

          {/* Nawigacja */}
          <div>
            <p className="text-xs tracking-widest uppercase text-terracotta mb-5">Nawigacja</p>
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map(([label, href]) => (
                <Link key={href} href={href} className="text-sm hover:text-cream transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Kontakt */}
          <div>
            <p className="text-xs tracking-widest uppercase text-terracotta mb-5">Kontakt</p>
            <div className="flex flex-col gap-3">
              <FooterContactsClient />
            </div>
          </div>

          {/* Mapa */}
          <div>
            <p className="text-xs tracking-widest uppercase text-terracotta mb-5">Gdzie mnie znajdziesz</p>
            <div className="w-full aspect-square overflow-hidden rounded-sm">
              <FooterMap />
            </div>
          </div>
        </div>
      </div>

      {/* Belka praw autorskich z logo */}
      <div className="border-t border-sand/10 px-6 lg:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo.png"
              alt="Unique Ceramics"
              width={24}
              height={24}
              className="h-6 w-auto brightness-0 invert opacity-70"
            />
            <span className="font-serif text-xs text-cream/50 tracking-wide">Unique Ceramics</span>
          </div>
          <p className="text-xs text-sand/30">
            © {new Date().getFullYear()} Wszelkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </footer>
  );
}
