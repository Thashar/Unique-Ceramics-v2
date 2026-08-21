// Sortowanie listy produktów w panelu admina. Neutralny moduł – korzysta z niego
// serwerowa strona listy (kolejność zapytania) i kliencki select (etykiety opcji).

/** Kolejność opcji w selekcie; pusta wartość = domyślne sortowanie (najnowsze). */
export const PRODUCT_SORTS = [
  { value: "", label: "Najnowsze" },
  { value: "oldest", label: "Najstarsze" },
  { value: "name-asc", label: "Nazwa A–Z" },
  { value: "name-desc", label: "Nazwa Z–A" },
  { value: "price-asc", label: "Cena rosnąco" },
  { value: "price-desc", label: "Cena malejąco" },
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number]["value"];

/** Wartość spoza listy (ręcznie zmieniony adres) wraca do domyślnej. */
export function resolveProductSort(value?: string): ProductSort {
  const match = PRODUCT_SORTS.find((s) => s.value === value);
  return match ? match.value : "";
}

/**
 * Kolejność dla zapytania do bazy. Sortowanie po nazwie zwraca `null`, bo
 * układa je dopiero `sortByName` – porównanie w Postgresie zależy od collation
 * bazy i potrafi wstawić „Ćmielów" po „Czara", a w sklepie z polskimi nazwami
 * to widać od razu.
 */
export function productOrderBy(sort: ProductSort) {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" } as const;
    case "price-asc":
      return { price: "asc" } as const;
    case "price-desc":
      return { price: "desc" } as const;
    case "name-asc":
    case "name-desc":
      return null;
    default:
      return { createdAt: "desc" } as const;
  }
}

/** Kolator polski: „ą" tuż po „a", wielkość liter bez znaczenia, liczby po wartości. */
const collator = new Intl.Collator("pl", { sensitivity: "base", numeric: true });

/** Układa produkty po nazwie (kopia tablicy) – dla pozostałych sortowań bez zmian. */
export function sortByName<T extends { name: string }>(products: T[], sort: ProductSort): T[] {
  if (sort !== "name-asc" && sort !== "name-desc") return products;
  const dir = sort === "name-asc" ? 1 : -1;
  return [...products].sort((a, b) => dir * collator.compare(a.name, b.name));
}
