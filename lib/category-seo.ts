/**
 * Adresy i teksty stron kategorii sklepu.
 *
 * Kategorie mają **własne adresy** (`/sklep/kategoria/kubki`), a nie parametr
 * `?kategoria=` – tamten wariant canonicalizował się do `/sklep`, więc żadna
 * kategoria nie mogła trafić do wyników wyszukiwania pod swoją nazwą.
 * Stare linki są przekierowywane w `app/sklep/page.tsx`.
 *
 * Opis kategorii **nie jest drukowany na stronie** – idzie wyłącznie do
 * `<meta name="description">` i do `CollectionPage` w danych strukturalnych,
 * czyli tam, skąd bierze go wyszukiwarka (decyzja właściciela 28.08.2026).
 * To jedyny **legalny** sposób na tekst „widoczny tylko w wyszukiwarce”:
 * ukrywanie akapitu CSS-em albo podawanie robotowi innej treści niż
 * użytkownikowi to cloaking, za który Google karze ręcznie.
 *
 * Teksty są **generowane z nazwy kategorii**, żeby nowa kategoria od razu miała
 * komplet metadanych. Ręczna edycja opisów w panelu została wycofana
 * (decyzja właściciela 31.08.2026) – nie wracaj do ustawień `category_intro_*`.
 *
 * Moduł neutralny (bez bazy) – korzysta z niego strona serwerowa i panel.
 */

import { t } from "./dictionary";
import type { Locale } from "./i18n";

/** Adres strony kategorii (bez prefiksu języka – dokłada go `localePath`). */
export function categoryPath(slug: string): string {
  return `/sklep/kategoria/${slug}`;
}

/**
 * Nazwa kategorii **zawsze otwiera zdanie**, w mianowniku, tak jak wpisano ją
 * w panelu. Wersje wciągające ją w środek zdania („znajdziesz {nazwa}…")
 * łamały się na nazwach takich jak „Inne" czy „Zestawy kawowe" – szablon musi
 * działać z każdą nazwą, bo kategorie dodaje właściciel.
 */

/** Tytuł strony – bez marki, dokłada ją szablon z layoutu. Treść w `lib/dictionary.ts`. */
export function categoryTitle(label: string, locale: Locale = "pl"): string {
  return t(locale).meta.categoryTitle(label);
}

/**
 * Opis kategorii dla wyszukiwarki. Mieści się w ~160 znakach, które Google
 * pokazuje pod tytułem – dłuższy zostałby ucięty w połowie zdania.
 */
export function categoryDescription(label: string, locale: Locale = "pl"): string {
  return t(locale).meta.categoryDescription(label);
}
