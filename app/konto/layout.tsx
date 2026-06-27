import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import AccountNav from "@/components/account/AccountNav";

export const metadata: Metadata = {
  title: "Moje konto",
  description: "Panel klienta Unique Ceramics — zamówienia, profil, adres dostawy.",
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/logowanie?callbackUrl=/konto");

  return (
    <>
      <Header />
      <main className="flex-1 bg-warm-white">
        {/* Nagłówek konta */}
        <div className="bg-cream px-6 lg:px-10 py-12 border-b border-sand">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs tracking-[0.3em] uppercase text-clay mb-1">Panel klienta</p>
              <h1 className="font-serif text-3xl text-espresso">
                Witaj, {session.user?.name?.split(" ")[0] ?? "Kliencie"}
              </h1>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar nav */}
          <aside className="lg:col-span-1">
            <AccountNav />
          </aside>

          {/* Treść */}
          <div className="lg:col-span-3">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
