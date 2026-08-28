/**
 * Adresy i teksty stron kategorii sklepu.
 *
 * Kategorie mają **własne adresy** (`/sklep/kategoria/kubki`), a nie parametr
 * `?kategoria=` – tamten wariant canonicalizował się do `/sklep`, więc żadna
 * kategoria nie mogła trafić do wyników wyszukiwania pod swoją nazwą.
 * Stare linki są przekierowywane w `app/sklep/page.tsx`.
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

/** Opis do `<meta description>` – inny niż tekst na stronie, żeby się nie dublowały. */
export function categoryDescription(label: string): string {
  return `${label} z pracowni ceramicznej w okolicach Gliwic – wszystko robione ręcznie. Każdy egzemplarz powstaje pojedynczo, wysyłka w całej Polsce.`;
}

/** Tekst wstępu widoczny na stronie kategorii (gdy właściciel nie wpisał własnego). */
export function categoryIntro(label: string): string {
  return `${label} wykonane ręcznie w pracowni pod Gliwicami. Każdą sztukę formuję i szkliwię pojedynczo, więc drobne różnice w kolorze i kształcie są naturalne – to znak, że przedmiot nie wyszedł z formy przemysłowej.`;
}
