import Link from "next/link";
import Image from "next/image";
import FooterContactsClient from "./FooterContactsClient";
import FooterMap from "./FooterMap";

export default function Footer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="bg-espresso text-sand/80 h-full flex flex-col pt-20">
        {/* Kompaktowa wersja: pt-20 czyści header, flex-1 wypełnia przestrzeń */}
        <div className="flex-1 flex flex-col justify-center px-6 lg:px-10 py-6">
          <div className="max-w-7xl mx-auto w-full">

            {/* Logo — pełna szerokość */}
            <div className="flex items-center gap-3 mb-6">
              <Image
                src="/images/logo.webp"
                alt="Unique Ceramics"
                width={32}
                height={32}
                className="h-8 w-auto brightness-0 invert opacity-90"
              />
              <div className="flex flex-col leading-none pt-1">
                <p className="font-serif text-sm font-semibold tracking-wide text-cream">
                  Unique Ceramics
                </p>
                <p className="text-[6px] tracking-[0.18em] uppercase mt-0.5 text-cream/40">
                  Ręcznie tworzone z sercem
                </p>
              </div>
            </div>

            {/* Dwie kolumny: Nawigacja | Kontakt */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-terracotta mb-3">Nawigacja</p>
                <nav className="flex flex-col gap-2">
                  {[
                    ["Sklep", "/sklep"],
                    ["O mnie", "/o-mnie"],
                    ["Warsztaty", "/warsztaty"],
                    ["Zam. indywidualne", "/zamowienie-indywidualne"],
                    ["Kontakt", "/kontakt"],
                    ["Regulamin", "/regulamin"],
                  ].map(([label, href]) => (
                    <Link key={href} href={href} className="text-xs hover:text-cream transition-colors">
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div>
                <p className="text-[10px] tracking-widest uppercase text-terracotta mb-3">Kontakt</p>
                <div className="flex flex-col gap-2">
                  <FooterContactsClient />
                </div>
              </div>

              {/* Mapa — tylko desktop */}
              <div className="hidden lg:block lg:col-span-2">
                <p className="text-[10px] tracking-widest uppercase text-terracotta mb-3">Gdzie mnie znajdziesz</p>
                <div className="w-full aspect-video overflow-hidden rounded-sm">
                  <FooterMap />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-sand/10 px-6 lg:px-10 py-4">
          <p className="text-center text-xs text-sand/30">
            © {new Date().getFullYear()} Unique Ceramics. Wszelkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-espresso text-sand/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Marka */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Image
              src="/images/logo.webp"
              alt="Unique Ceramics"
              width={36}
              height={36}
              className="h-9 w-auto brightness-0 invert opacity-90"
            />
            <div className="flex flex-col leading-none pt-1.5">
              <p className="font-serif text-base font-semibold tracking-wide text-cream">
                Unique Ceramics
              </p>
              <p className="text-[6.5px] tracking-[0.18em] uppercase mt-0.5 text-cream/40">
                Ręcznie tworzone z sercem
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-sand/70 max-w-xs">
            Unikalna ceramika użytkowa.<br />
            Każdy egzemplarz jest niepowtarzalny.<br />
            Tworzę z pasją i dbałością o każdy detal.
          </p>
        </div>

        {/* Nawigacja */}
        <div>
          <p className="text-xs tracking-widest uppercase text-terracotta mb-5">Nawigacja</p>
          <nav className="flex flex-col gap-3">
            {[
              ["Sklep", "/sklep"],
              ["Warsztaty", "/warsztaty"],
              ["O mnie", "/o-mnie"],
              ["Zamówienie indywidualne", "/zamowienie-indywidualne"],
              ["Kontakt", "/kontakt"],
              ["Regulamin", "/regulamin"],
              ["Polityka prywatności", "/polityka-prywatnosci"],
            ].map(([label, href]) => (
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

      <div className="border-t border-sand/10 px-6 lg:px-10 py-5">
        <p className="text-center text-xs text-sand/30">
          © {new Date().getFullYear()} Unique Ceramics. Wszelkie prawa zastrzeżone.
        </p>
      </div>
    </footer>
  );
}
