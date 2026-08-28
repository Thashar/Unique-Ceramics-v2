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
 * komplet metadanych. Właściciel może je nadpisać własnym opisem w panelu
 * (ustawienie `category_intro_{slug}`, zakładka Kategorie) – i powinien, bo
 * własny tekst jest dla wyszukiwarki wart więcej niż szablon.
 *
 * Moduł neutralny (bez bazy) – korzysta z niego strona serwerowa i panel.
 */

/** Adres strony kategorii. */
export function categoryPath(slug: string): string {
  return `/sklep/kategoria/${slug}`;
}

/** Klucz ustawienia z własnym opisem kategorii. */
export function categoryIntroKey(slug: string): string {
  return `category_intro_${slug}`;
}

/**
 * Nazwa kategorii **zawsze otwiera zdanie**, w mianowniku, tak jak wpisano ją
 * w panelu. Wersje wciągające ją w środek zdania („znajdziesz {nazwa}…")
 * łamały się na nazwach takich jak „Inne" czy „Zestawy kawowe" – szablon musi
 * działać z każdą nazwą, bo kategorie dodaje właściciel.
 */

/** Tytuł strony – bez marki, dokłada ją szablon z layoutu. */
export function categoryTitle(label: string): string {
  return `${label} – ceramika ręcznie robiona`;
}

/**
 * Opis kategorii dla wyszukiwarki. Mieści się w ~160 znakach, które Google
 * pokazuje pod tytułem – dłuższy zostałby ucięty w połowie zdania.
 */
export function categoryDescription(label: string): string {
  return `${label} wykonane ręcznie w pracowni pod Gliwicami. Każdą sztukę formuję i szkliwię pojedynczo, więc dwie nigdy nie są identyczne. Wysyłka w całej Polsce.`;
}
