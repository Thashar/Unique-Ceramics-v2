import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, withDbRetry } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { getSettings } from "@/lib/settings";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import {
  categoryDimensionsKey,
  parseCategoryDimensions,
  parseProductDimensions,
  productDimensionsKey,
} from "@/lib/product-dimensions";
import { productHints, type HintProduct } from "@/lib/product-hints";

/** Ile produktów kategorii bierzemy pod uwagę. */
const SCAN_LIMIT = 60;

/**
 * **Podpowiedzi z prawdziwych produktów sklepu** dla agenta dodawania
 * produktów (ADMIN): `{ category, name }` → `{ prices, dimensions, used, matched, scanned }`.
 *
 * ⚠️ **Modelu tu nie ma i nie ma go po co dokładać** – to wyłącznie odczyt
 * bazy i porównanie nazw, więc wywołanie nic nie kosztuje i za każdym razem
 * daje ten sam wynik. Cena wraca **tylko taka, za jaką naprawdę stoi produkt
 * w sklepie**: do 19.09.2026 agent podpowiadał medianę dwóch losowych
 * produktów kategorii i zaproponował 88 zł, których nie miał żaden produkt.
 *
 * Wymiary bierzemy z ustawienia kategorii (`category_dims_{id}`), a ich
 * wartości z `product_dims_{id}` podobnych produktów – oba odczyty w try/catch,
 * bo brak podpowiedzi nie może zatrzymać dodawania produktu.
 *
 * Produkty **wyłączone i wyprzedane też liczą się do ceny** – to, że czarki
 * nie ma dziś na stanie, nie zmienia tego, ile kosztowała.
 */
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (await isRateLimited(`product-hints:${getClientIp(req)}`, 60, 10 * 60_000)) {
    return NextResponse.json({ error: "Za dużo zapytań – odczekaj chwilę." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const slug = typeof body?.category === "string" ? body.category.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : "";
  if (!slug) return NextResponse.json({ error: "Brak kategorii." }, { status: 400 });

  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return NextResponse.json({ error: "Nieznana kategoria." }, { status: 400 });

  const dimsSetting = await getSettings([categoryDimensionsKey(category.id)]);
  const used = parseCategoryDimensions(dimsSetting[categoryDimensionsKey(category.id)]);

  let products: HintProduct[] = [];
  try {
    const rows = await withDbRetry(() =>
      db.product.findMany({
        where: { category: category.slug },
        select: { id: true, name: true, price: true },
        take: SCAN_LIMIT,
        orderBy: { createdAt: "desc" },
      })
    );
    const values = rows.length
      ? await getSettings(rows.map((r) => productDimensionsKey(r.id)))
      : {};
    products = rows.map((r) => ({
      name: r.name,
      price: r.price,
      dimensions: parseProductDimensions(values[productDimensionsKey(r.id)]),
    }));
  } catch (e) {
    // Brak podpowiedzi jest do przeżycia – agent po prostu zapyta bez nich
    console.error("[admin/product-hints]", e);
  }

  return NextResponse.json({ ...productHints(products, name, used), used });
}
