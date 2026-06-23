import Link from "next/link";
import { ShoppingBag, PenLine } from "lucide-react";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/ui/ProductCard";
import { getShopProducts } from "@/lib/products";
import { getCategories } from "@/lib/categories";

export const metadata = {
  title: "Sklep",
  description:
    "Ręcznie robiona ceramika użytkowa i dekoracyjna. Miski, kubki, talerze, wazony — każdy przedmiot tworzony jest ręcznie z lokalnej gliny.",
  alternates: { canonical: "https://uniqueceramics.pl/sklep" },
  openGraph: {
    title: "Sklep — Unique Ceramics",
    description:
      "Ręcznie robiona ceramika użytkowa i dekoracyjna. Każdy przedmiot jest unikalny.",
    url: "https://uniqueceramics.pl/sklep",
    images: [
      {
        url: "/images/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Ceramika ręcznie robiona — sklep Unique Ceramics",
      },
    ],
  },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>;
}) {
  const { kategoria } = await searchParams;

  const dbCategories = await getCategories();

  const CATEGORIES = [
    { value: "wszystkie", label: "Wszystkie" },
    ...dbCategories.map((c) => ({ value: c.slug, label: c.label })),
  ];

  let products: Awaited<ReturnType<typeof getShopProducts>>["inStock"] = [];
  let dbError = false;
  try {
    const { inStock, soldOut } = await getShopProducts();

    const filtered = kategoria && kategoria !== "wszystkie"
      ? inStock.filter((p) => p.category === kategoria)
      : inStock;

    products = [...filtered, ...soldOut];
  } catch (e) {
    dbError = true;
    console.error("DB error in /sklep:", e);
  }

  const activeCategory = kategoria ?? "wszystkie";

  return (
    <>
      <Header />
      <div className="min-h-[100svh] bg-warm-white pt-[100px]">
        {/* Filtry kategorii */}
        <div className="border-b border-sand bg-cream sticky top-[100px] z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 flex gap-2 overflow-x-auto py-4 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={cat.value === "wszystkie" ? "/sklep" : `/sklep?kategoria=${cat.value}`}
                className={`shrink-0 px-5 py-2 text-xs tracking-widest uppercase transition-all duration-200 ${
                  activeCategory === cat.value
                    ? "bg-espresso text-warm-white"
                    : "bg-cream text-charcoal border border-terracotta/40 hover:border-terracotta/70"
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Siatka produktów */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-16 md:py-16">
          {dbError ? (
            <div className="text-center py-24">
              <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-sand mb-6" />
              <p className="font-serif text-2xl text-espresso mb-2">Sklep chwilowo niedostępny</p>
              <p className="text-charcoal/50 text-sm">Spróbuj ponownie za chwilę.</p>
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
            <>
              <p className="text-xs text-charcoal/40 tracking-widests uppercase mb-8">
                {products.length} {products.length === 1 ? "produkt" : products.length < 5 ? "produkty" : "produktów"}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {/* Pływający przycisk zamówień indywidualnych */}
      <Link
        href="/zamowienie-indywidualne"
        className="fixed bottom-6 right-5 z-40 flex items-center gap-2 bg-espresso hover:bg-clay text-cream text-[11px] tracking-widest uppercase px-4 py-3 shadow-md hover:shadow-lg transition-colors duration-200"
      >
        <PenLine size={13} strokeWidth={1.5} />
        <span>Zamów indywidualnie</span>
      </Link>

      <Footer />
    </>
  );
}
