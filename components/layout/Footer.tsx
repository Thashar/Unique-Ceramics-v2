import Link from "next/link";
import Image from "next/image";
import FooterContactsClient from "./FooterContactsClient";

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
            <FooterContactsClient />
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="border-t border-sand/10 px-6 lg:px-10 py-10">
        <p className="text-xs tracking-widest uppercase text-terracotta mb-5">Gdzie nas znajdziesz</p>
        <div className="w-full overflow-hidden rounded-sm" style={{ height: "300px" }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2545.9841035768472!2d18.518208176464153!3d50.348201871572854!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47113ca727ad0a73%3A0x3d10e6bfdf3c14cc!2sFamilijna%2023%2C%2044-164%20Kleszcz%C3%B3w!5e0!3m2!1spl!2spl!4v1779345180945!5m2!1spl!2spl"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
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
