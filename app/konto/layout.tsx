import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import AccountNav from "@/components/account/AccountNav";
import ClayRule from "@/components/ui/ClayRule";

export const metadata: Metadata = {
  title: "Moje konto",
  description: "Panel klienta Unique Ceramics – zamówienia, profil, adres dostawy.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://uniqueceramics.pl/konto" },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/logowanie?callbackUrl=/konto");

  const firstName = session.user?.name?.split(" ")[0];

  return (
    <>
      <Header />
      {/* Ta sama karta-kafelek co koszyk i zamówienie: pas szkliwa, tytuł
          z `ClayRule` w nagłówku karty, nawigacja po lewej, treść po prawej.
          `overflow-clip`, nie `hidden` – hidden psułby `sticky` w podstronach */}
      {/* Karta-kafelek tylko od `md` – na telefonie treść siedzi wprost na tle
          strony (decyzja właściciela 16.09.2026: owalna ramka na wąskim ekranie
          tylko zabierała miejsce). Te same klasy ma koszyk i zamówienie */}
      <main className="flex-1 bg-warm-white">
        <div className="relative md:overflow-clip px-6 lg:px-10 py-10 md:py-16">
          <div aria-hidden="true" className="hidden md:block pointer-events-none absolute -top-24 -left-20 w-[26rem] h-[26rem] rounded-full bg-terracotta/15 blur-3xl" />
          <div aria-hidden="true" className="hidden md:block pointer-events-none absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-clay/10 blur-3xl" />

          <div className="relative mx-auto max-w-6xl md:overflow-clip md:rounded-2xl md:border md:border-sand md:bg-warm-white md:shadow-[0_22px_48px_-18px_rgba(44,40,37,0.35),0_4px_14px_-6px_rgba(44,40,37,0.18)]">
            <div aria-hidden="true" className="hidden md:block h-1 bg-gradient-to-r from-terracotta via-clay to-sand" />

            {/* Mozaika po lewej, powitanie i e-mail w kolumnie po prawej */}
            <div className="md:px-10 md:pt-10 pb-6 border-b border-sand flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <ClayRule className="sm:flex-1 sm:mb-2" />
              <div className="sm:text-right shrink-0">
                <p className="text-xs tracking-[0.3em] uppercase text-clay mb-1">Panel klienta</p>
                <h1 className="font-serif text-3xl md:text-4xl text-espresso leading-tight">
                  {firstName ? `Witaj, ${firstName}` : "Moje konto"}
                </h1>
                {session.user?.email && (
                  <p className="text-xs text-charcoal/80 mt-1.5 truncate max-w-full">{session.user.email}</p>
                )}
              </div>
            </div>

            <div className="md:px-10 py-8 md:py-10 grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-10">
              <aside className="lg:col-span-1">
                <AccountNav />
              </aside>
              <div className="lg:col-span-3 min-w-0">{children}</div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
