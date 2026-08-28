/**
 * Teksty sekcji hero na stronie głównej – neutralny moduł bez bazy, bo korzysta
 * z niego i strona serwerowa, i kliencki `Hero`, i formularz ustawień w panelu.
 *
 * Domyślne wartości są jednocześnie treścią pokazywaną przed pierwszym zapisem
 * w panelu (`lib/settings.ts` bierze je do `DEFAULTS`) i podpowiedzią
 * w polach formularza. **Puste ustawienie ukrywa dany element** – dzięki temu
 * właściciel może np. zostawić samo zdjęcie bez nagłówka.
 */
export const HOME_HERO_DEFAULT = {
  eyebrow: "Ceramika ręcznie robiona · Gliwice",
  // Enter w polu panelu = złamanie wiersza w nagłówku (`whitespace-pre-line`)
  title: "Ręcznie tworzone\nz sercem",
  text: "Unikalna ceramika użytkowa z pracowni w okolicach Gliwic – każdy egzemplarz jest niepowtarzalny. Tworzę z pasją i dbałością o każdy detal.",
  ctaPrimary: "Sprawdź ofertę",
  ctaSecondary: "O mnie",
  scroll: "Przewiń",
} as const;

/** Klucze ustawień odpowiadające polom powyżej. */
export const HOME_HERO_KEYS = {
  eyebrow: "home_hero_eyebrow",
  title: "home_hero_title",
  text: "home_hero_text",
  ctaPrimary: "home_hero_cta_primary",
  ctaSecondary: "home_hero_cta_secondary",
  scroll: "home_hero_scroll",
} as const;

/** Lista kluczy do pobrania jednym `getSettings`. */
export const HOME_HERO_SETTING_KEYS = Object.values(HOME_HERO_KEYS);
