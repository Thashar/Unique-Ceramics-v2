import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sklep | Unique Ceramics",
  description: "Ręcznie robiona ceramika użytkowa i dekoracyjna. Miski, kubki, talerze, wazony.",
};

const CATEGORIES = [
  { value: "wszystkie", label: "Wszystkie" },
  { value: "kubki", label: "Kubki" },
  { value: "miski", label: "Miski" },
  { value: "wazy", label: "Wazy" },
  { value: "talerze", label: "Talerze" },
  { value: "inne", label: "Inne" },
];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>;
}) {
  const { kategoria } = await searchParams;

  let products: Awaited<ReturnType<typeof db.product.findMany>> = [];
  let dbError: string | null = null;
  try {
    products = await db.product.findMany({
      where: {
        active: true,
        ...(kategoria && kategoria !== "wszystkie" ? { category: kategoria } : {}),
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
    console.error("DB error in /sklep:", e);
  }

  return (
    <>
      <Header />
      <div className="min-h-[100svh] bg-warm-white pt-20">
      <div className="bg-cream py-16 px-6 text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-clay mb-4">Kolekcja</p>
        <h1 className="font-serif text-5xl md:text-6xl text-espresso">Sklep</h1>
        <p className="mt-4 text-charcoal/60 max-w-md mx-auto">
          Każdy przedmiot jest unikalny — tworzony ręcznie z lokalnej gliny.
        </p>
      </div>

      <div className="border-b border-sand bg-warm-white sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex gap-2 overflow-x-auto py-4 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={cat.value === "wszystkie" ? "/sklep" : `/sklep?kategoria=${cat.value}`}
              className={`shrink-0 px-5 py-2 text-xs tracking-widest uppercase transition-colors ${
                (kategoria ?? "wszystkie") === cat.value
                  ? "bg-espresso text-warm-white"
                  : "bg-cream text-charcoal hover:bg-sand"
              }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        {dbError ? (
          <div className="text-center py-24">
            <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-sand mb-6" />
            <p className="font-serif text-2xl text-espresso mb-2">Błąd połączenia z bazą</p>
            <p className="text-charcoal/50 text-xs font-mono mt-2 max-w-lg mx-auto break-all">{dbError}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-sand mb-6" />
            <p className="font-serif text-2xl text-espresso mb-2">Brak produktów</p>
            <p className="text-charcoal/50 text-sm">
              {kategoria ? "Brak produktów w tej kategorii." : "Sklep jest w przygotowaniu."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {products.map((product) => (
              <Link key={product.id} href={`/sklep/${product.slug}`} className="group">
                <div className="aspect-square bg-cream overflow-hidden mb-4 relative">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={40} strokeWidth={1} className="text-sand" />
                    </div>
                  )}
                  {product.featured && (
                    <span className="absolute top-3 left-3 bg-terracotta text-warm-white text-[10px] tracking-widest uppercase px-2 py-1">
                      Wyróżniony
                    </span>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-warm-white/70 flex items-center justify-center">
                      <span className="text-xs tracking-widest uppercase text-charcoal/50">Niedostępny</span>
                    </div>
                  )}
                </div>
                <p className="text-xs tracking-widest uppercase text-clay mb-1">{product.category}</p>
                <h2 className="font-serif text-lg text-espresso group-hover:text-clay transition-colors mb-1">
                  {product.name}
                </h2>
                <p className="text-sm text-charcoal/70">
                  {product.price.toFixed(2).replace(".", ",")} zł
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
      <Footer />
    </>
  );
}
