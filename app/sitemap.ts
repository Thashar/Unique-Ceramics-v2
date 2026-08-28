import { MetadataRoute } from "next";
import { db, withDbRetry } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getCategories } from "@/lib/categories";
import { categoryPath } from "@/lib/category-seo";
import { absoluteUrl } from "@/lib/seo";

// Odświeżaj sitemapę co godzinę – nowe produkty trafiają do niej bez deployu
export const revalidate = 3600;

const BASE = "https://uniqueceramics.pl";

const staticRoutes: MetadataRoute.Sitemap = [
  { url: BASE,                               changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE}/sklep`,                    changeFrequency: "daily",   priority: 0.9 },
  { url: `${BASE}/o-mnie`,                   changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE}/warsztaty`,                changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE}/moje-projekty`,            changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/zamowienie-indywidualne`,  changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/kontakt`,                  changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/regulamin`,                changeFrequency: "yearly",  priority: 0.3 },
  { url: `${BASE}/polityka-prywatnosci`,     changeFrequency: "yearly",  priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: { slug: string; updatedAt: Date; images: string[] }[] = [];
  try {
    products = await withDbRetry(() =>
      db.product.findMany({
        where: { active: true },
        select: { slug: true, updatedAt: true, images: true },
      })
    );
  } catch {
    // DB not available – return static routes only
  }

  // Zdjęcia w sitemapie: mówią wyszukiwarce, które obrazy należą do której
  // strony. Hero jest głównym zdjęciem strony głównej (patrz `primaryImageOfPage`
  // w `app/page.tsx`), a karta produktu wnosi swoje zdjęcia
  // `getSetting` ma własny try/catch – przy niedostępnej bazie odda pusty string
  const heroImage = await getSetting("home_hero_image");

  const routes: MetadataRoute.Sitemap = staticRoutes.map((route) =>
    route.url === BASE && heroImage
      ? { ...route, images: [absoluteUrl(heroImage)] }
      : route
  );

  // Strony kategorii – własne adresy zamiast dawnego `?kategoria=`
  const categories = await getCategories();
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE}${categoryPath(c.slug)}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/sklep/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
    ...(p.images.length ? { images: p.images.map(absoluteUrl) } : {}),
  }));

  return [...routes, ...categoryRoutes, ...productRoutes];
}
