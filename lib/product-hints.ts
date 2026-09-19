/**
 * **Podpowiedzi z prawdziwych produktów sklepu** – cena i wymiary, których
 * agent nie ma zgadywać (decyzja właściciela 19.09.2026).
 *
 * ⚠️ Do tego dnia cenę podpowiadała **mediana dwóch losowych** produktów
 * z kategorii. Przy 76 zł i 100 zł wychodziło 88 zł – kwota, której w sklepie
 * nie było na żadnym produkcie, a agent podawał ją jako „podobne produkty
 * kosztują ok. 88 zł”. **Nie licz średnich ani median.** Podpowiedzią może być
 * wyłącznie kwota, za którą naprawdę stoi jakiś produkt; gdy pasujące produkty
 * mają różne ceny, oddajemy kilka wariantów, a wyboru dokonuje właściciel.
 *
 * Dopasowanie idzie **po nazwie uzgodnionej z właścicielem** (czarka → czarki),
 * a nie po losowaniu z kategorii: „Czarka czarna” ma kosztować tyle, co inne
 * czarki, nie tyle, co średnia kubków.
 *
 * Moduł neutralny (bez bazy i Reacta) – testy w `tests/product-hints.test.ts`.
 */

import { keywords, normalizeText } from "@/lib/product-similarity";
import { DIMENSION_FIELDS, type DimensionId, type DimensionValues } from "@/lib/product-dimensions";

/** Produkt kategorii, z którego czerpiemy podpowiedzi. */
export type HintProduct = {
  name: string;
  price: number;
  dimensions: DimensionValues;
};

/** Ile różnych cen pokazujemy do wyboru. */
export const MAX_PRICE_OPTIONS = 4;

/** Jedna **realnie występująca** cena razem z tym, co za nią stoi. */
export type PriceOption = {
  price: number;
  /** Ile pasujących produktów ma dokładnie tę cenę. */
  count: number;
  /** Nazwy tych produktów – właściciel ma widzieć, skąd kwota. */
  names: string[];
};

export type DimensionHint = {
  id: DimensionId;
  /** Najczęstsza wartość wśród pasujących produktów, tak jak ją wpisano. */
  value: string;
  count: number;
};

export type ProductHints = {
  prices: PriceOption[];
  dimensions: DimensionHint[];
  /** Ile produktów uznaliśmy za podobne (0 = podpowiadamy z całej kategorii). */
  matched: number;
  /** Ile produktów miała cała kategoria. */
  scanned: number;
};

/**
 * Pokrycie słów nazwy. Liczymy **tylko po nazwie** – opis mówi o motywie
 * i szkliwie, a o cenie decyduje rodzaj i rozmiar przedmiotu.
 */
export function nameScore(name: string, other: string): number {
  const wanted = keywords(name);
  if (wanted.size === 0) return 0;
  const have = keywords(other);
  let hits = 0;
  for (const word of wanted) if (have.has(word)) hits += 1;
  // Ten sam rodzaj przedmiotu (pierwsze słowo nazwy) waży osobno – „czarka”
  // w „Czarka czarna” i „Czarka z żurawiem” to mocniejszy sygnał niż kolor
  const kind = normalizeText(name).split(" ")[0] ?? "";
  const otherKind = normalizeText(other).split(" ")[0] ?? "";
  const kindBonus = kind && kind === otherKind ? 1 : 0;
  return hits / wanted.size + kindBonus;
}

/**
 * Produkty podobne do nazwy. Pusta lista znaczy „nic nie pasuje” – wtedy
 * **nie podpowiadamy ceny wcale**, zamiast wymyślać ją z całej kategorii.
 */
export function matchByName(products: readonly HintProduct[], name: string): HintProduct[] {
  const scored = products
    .map((p) => ({ product: p, score: nameScore(name, p.name) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return [];
  // Bierzemy tylko najlepiej pasujące – produkt z jednym wspólnym słowem
  // („ceramiczny”) nie ma mówić o cenie czarki
  const best = scored[0].score;
  return scored.filter((r) => r.score >= Math.max(best * 0.6, 0.5)).map((r) => r.product);
}

/**
 * Ceny pasujących produktów, pogrupowane po **dokładnej kwocie**. Kolejność:
 * najpierw cena, która powtarza się najczęściej, potem niższa – nigdy nie
 * powstaje kwota, której nie ma w sklepie.
 */
export function priceOptions(products: readonly HintProduct[]): PriceOption[] {
  const groups = new Map<number, string[]>();
  for (const p of products) {
    if (!Number.isFinite(p.price) || p.price <= 0) continue;
    const price = Math.round(p.price * 100) / 100;
    groups.set(price, [...(groups.get(price) ?? []), p.name]);
  }
  return [...groups.entries()]
    .map(([price, names]) => ({ price, count: names.length, names: names.slice(0, 3) }))
    .sort((a, b) => b.count - a.count || a.price - b.price)
    .slice(0, MAX_PRICE_OPTIONS);
}

/**
 * Najczęstsza wartość każdego wymiaru wśród pasujących produktów. Remis
 * rozstrzyga **mniejsza liczba** – przy dwóch równie częstych wysokościach
 * lepiej podpowiedzieć niższą i dać się poprawić.
 */
export function dimensionHints(
  products: readonly HintProduct[],
  used: readonly DimensionId[]
): DimensionHint[] {
  const hints: DimensionHint[] = [];
  for (const field of DIMENSION_FIELDS) {
    if (!used.includes(field.id)) continue;
    const counts = new Map<string, number>();
    for (const p of products) {
      const value = p.dimensions[field.id]?.trim();
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    if (counts.size === 0) continue;
    const [value, count] = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || numeric(a[0]) - numeric(b[0])
    )[0];
    hints.push({ id: field.id, value, count });
  }
  return hints;
}

/** Liczba z wartości wymiaru („8,5 cm” → 8.5); nieliczbowa idzie na koniec. */
function numeric(value: string): number {
  const hit = /-?[\d]+(?:[.,][\d]+)?/.exec(value);
  return hit ? Number(hit[0].replace(",", ".")) : Number.POSITIVE_INFINITY;
}

/**
 * Komplet podpowiedzi dla jednego produktu. **Ceny wyłącznie z dopasowanych
 * po nazwie**; wymiary, gdy nic nie pasuje, biorą się z całej kategorii –
 * średnica kubka jest cechą kategorii, a cena już nie.
 */
export function productHints(
  products: readonly HintProduct[],
  name: string,
  used: readonly DimensionId[]
): ProductHints {
  const matched = matchByName(products, name);
  return {
    prices: priceOptions(matched),
    dimensions: dimensionHints(matched.length > 0 ? matched : products, used),
    matched: matched.length,
    scanned: products.length,
  };
}
