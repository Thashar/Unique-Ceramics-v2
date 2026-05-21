import Link from "next/link";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import InstagramIcon from "@/components/ui/InstagramIcon";

export default function Footer() {
  return (
    <footer className="bg-espresso text-sand/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Marka */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Image
              src="/images/logo.png"
              alt="Unique Ceramics"
              width={36}
              height={36}
              className="h-9 w-auto brightness-0 invert opacity-90"
            />
            <div className="flex flex-col leading-none pt-1">
              <p className="font-serif text-base font-semibold tracking-wide uppercase text-cream">Unique Ceramics</p>
              <p className="text-[6.5px] tracking-[0.18em] uppercase mt-0.5 text-cream/40">Ręcznie tworzone z sercem</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-sand/70 max-w-xs">
            Unikalna ceramika użytkowa — każdy egzemplarz jest niepowtarzalny.
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
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-sm hover:text-cream transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Kontakt */}
        <div>
          <p className="text-xs tracking-widest uppercase text-terracotta mb-5">Kontakt</p>
          <div className="flex flex-col gap-3">
            <a
              href="tel:+48668443706"
              className="flex items-center gap-3 text-sm hover:text-cream transition-colors"
            >
              <Phone size={15} strokeWidth={1.5} />
              +48 668 443 706
            </a>
            <a
              href="mailto:kontakt@uniqueceramics.pl"
              className="flex items-center gap-3 text-sm hover:text-cream transition-colors"
            >
              <Mail size={15} strokeWidth={1.5} />
              kontakt@uniqueceramics.pl
            </a>
            <a
              href="https://instagram.com/unique.ceramics"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm hover:text-cream transition-colors"
            >
              <InstagramIcon size={15} />
              @unique.ceramics
            </a>
          </div>

          <div className="mt-8 text-xs text-sand/50 leading-relaxed">
            <p>Wysyłka: 18 zł</p>
            <p>Darmowa od 300 zł</p>
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
