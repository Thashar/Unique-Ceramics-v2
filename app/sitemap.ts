import { MetadataRoute } from "next";
import { db } from "@/lib/db";

const BASE = "https://uniqueceramics.pl";

const staticRoutes: MetadataRoute.Sitemap = [
  { url: BASE,                               changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE}/sklep`,                    changeFrequency: "daily",   priority: 0.9 },
  { url: `${BASE}/o-mnie`,                   changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE}/warsztaty`,                changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE}/zamowienie-indywidualne`,  changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/kontakt`,                  changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: { slug: string; updatedAt: Date }[] = [];
  try {
    products = await db.product.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    });
  } catch {
    // DB not available — return static routes only
  }

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/sklep/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
