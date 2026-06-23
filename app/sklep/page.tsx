import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import Header from "@/components/layout/Header";
import VacationBanner from "@/components/layout/VacationBanner";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/ui/ProductCard";
import { getShopProducts } from "@/lib/products";
import { getCategories } from "@/lib/categories";
import { getSettings } from "@/lib/settings";
import { hexToRgba } from "@/lib/overlay";

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

  const [dbCategories, heroSettings] = await Promise.all([
    getCategories(),
    getSettings([
      "shop_hero_image", "shop_hero_position", "shop_hero_overlay_color", "shop_hero_overlay_opacity", "shop_hero_height",
      "shop_subtitle",
      "vacation_enabled", "vacation_end_date", "vacation_message",
    ]),
  ]);

  const shopHeroImage = heroSettings.shop_hero_image;
  const shopHeroPos = heroSettings.shop_hero_position || "50% 50%";
  const shopHeroHeight = parseInt(heroSettings.shop_hero_height) || 50;
  const shopOverlayColor = heroSettings.shop_hero_overlay_color || "#2C2825";
  const shopOverlayOpacity = heroSettings.shop_hero_overlay_opacity || "50";
  const overlayBg = hexToRgba(shopOverlayColor, shopOverlayOpacity);

  const shopSubtitle = heroSettings.shop_subtitle || "Każdy przedmiot jest unikalny — tworzony ręcznie z lokalnej gliny.";

  const vacationEnabled = heroSettings.vacation_enabled === "true";
  const vacationEndDate = heroSettings.vacation_end_date;
  const vacationMessage = vacationEnabled ? heroSettings.vacation_message : "";

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
      <VacationBanner message={vacationMessage} returnDate={vacationEnabled ? vacationEndDate : undefined} />
      <Header topOffset={vacationEnabled} />
      <div className={`min-h-[100svh] bg-warm-white ${vacationEnabled ? "pt-[120px]" : "pt-20"}`}>
        {/* Hero nagłówek */}
        {shopHeroImage ? (
          <div className="relative overflow-hidden" style={{ height: `${shopHeroHeight}vh` }}>
            <Image
              src={shopHeroImage}
              alt="Sklep"
              fill
              priority
              className="object-cover"
              style={{ objectPosition: shopHeroPos }}
              sizes="100vw"
            />
            <div className="absolute inset-0" style={{ backgroundColor: overlayBg }} />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-14 px-6 text-center">
              <p className="text-xs tracking-[0.3em] uppercase text-terracotta mb-3">Kolekcja</p>
              <h1 className="font-serif text-5xl md:text-6xl text-cream mb-6">Sklep</h1>
              <Link
                href="/zamowienie-indywidualne"
                className="inline-flex items-center gap-2 border border-cream/60 hover:border-cream text-cream text-sm tracking-widest uppercase px-8 py-3 transition-colors duration-200"
              >
                Zamów indywidualnie
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-cream py-20 px-6 text-center border-b border-sand">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-4">Kolekcja</p>
            <h1 className="font-serif text-5xl md:text-6xl text-espresso">Sklep</h1>
            {shopSubtitle && (
              <p className="mt-4 text-charcoal/55 max-w-md mx-auto text-sm">{shopSubtitle}</p>
            )}
            <div className="mt-8">
              <Link
                href="/zamowienie-indywidualne"
                className="inline-flex items-center gap-2 border border-espresso hover:bg-espresso hover:text-cream text-espresso text-sm tracking-widest uppercase px-8 py-4 transition-colors duration-200"
              >
                Zamów indywidualnie
              </Link>
            </div>
          </div>
        )}

        {/* Filtry kategorii */}
        <div className={`border-b border-sand bg-warm-white sticky ${vacationEnabled ? "top-[120px]" : "top-20"} z-30 shadow-sm`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10 flex gap-2 overflow-x-auto py-4 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={cat.value === "wszystkie" ? "/sklep" : `/sklep?kategoria=${cat.value}`}
                className={`shrink-0 px-5 py-2 text-xs tracking-widest uppercase transition-all duration-200 ${
                  activeCategory === cat.value
                    ? "bg-espresso text-warm-white"
                    : "bg-cream text-charcoal hover:bg-sand border border-transparent hover:border-sand"
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Siatka produktów */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
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
              <p className="text-xs text-charcoal/40 tracking-widest uppercase mb-8">
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
      <Footer />
    </>
  );
}
