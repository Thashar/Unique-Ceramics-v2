/**
 * Teksty pełnoekranowych sekcji strony głównej – hero, „O mnie" i „Warsztaty".
 * Neutralny moduł bez bazy, bo korzysta z niego strona serwerowa, klienckie
 * komponenty sekcji i formularz ustawień w panelu.
 *
 * Domyślne wartości są jednocześnie treścią pokazywaną przed pierwszym zapisem
 * w panelu (`lib/settings.ts` bierze je do `DEFAULTS`) i podpowiedzią w polach
 * formularza. **Puste ustawienie ukrywa dany element** – dzięki temu właściciel
 * może zostawić np. samo zdjęcie bez nagłówka.
 *
 * Wszystkie trzy sekcje mają ten sam układ: napis nad nagłówkiem, nagłówek,
 * opis i przycisk. Enter w polu łamie wiersz (`whitespace-pre-line`), a pusta
 * linia w opisie robi odstęp między akapitami.
 */
export const HOME_HERO_DEFAULT = {
  eyebrow: "Unique Ceramics - Alicja Ulbrich",
  title: "Ręcznie tworzone\nz sercem",
  text: "Unikalna ceramika użytkowa z pracowni w okolicach Gliwic – każdy egzemplarz jest niepowtarzalny. Tworzę z pasją i dbałością o każdy detal.",
  ctaPrimary: "Sprawdź ofertę",
  ctaSecondary: "O mnie",
  scroll: "Przewiń",
} as const;

export const HOME_ABOUT_DEFAULT = {
  eyebrow: "Pracownia ceramiczna · Gliwice",
  title: "Ręcznie tworzone\nz sercem",
  text:
    "Od 20 lat zajmuję się ceramiką w obszarze przemysłu, dlatego moje doświadczenie przeniosłam na ceramikę artystyczną, którą zajmuję się od około roku. Każdą pracę wykonuję samodzielnie, dbając o detale, estetykę i niepowtarzalny charakter wyrobów.\n\n" +
    "Ceramika daje mi ogromną satysfakcję oraz pozwala odnaleźć wewnętrzny spokój i chwilę wyciszenia. Daje mi to też motywację do ciągłego rozwijania swoich umiejętności.",
  cta: "Poznaj moją historię",
} as const;

export const HOME_WORKSHOPS_DEFAULT = {
  eyebrow: "Warsztaty",
  title: "Spróbuj stworzyć\ncoś własnego",
  text: "Organizuję warsztaty ceramiczne dla grup i indywidualnych uczestników. Idealne na urodziny, wieczory panieńskie, imprezy firmowe czy po prostu wyjątkowy wieczór z przyjaciółmi. Nie potrzebujesz żadnego doświadczenia!",
  cta: "Zobacz terminy",
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

export const HOME_ABOUT_KEYS = {
  eyebrow: "home_about_eyebrow",
  title: "home_about_title",
  text: "home_about_text",
  cta: "home_about_cta",
} as const;

export const HOME_WORKSHOPS_KEYS = {
  eyebrow: "home_workshops_eyebrow",
  title: "home_workshops_title",
  text: "home_workshops_text",
  cta: "home_workshops_cta",
} as const;

/** Wszystkie klucze tekstowe strony głównej – do jednego `getSettings`. */
export const HOME_TEXT_SETTING_KEYS = [
  ...Object.values(HOME_HERO_KEYS),
  ...Object.values(HOME_ABOUT_KEYS),
  ...Object.values(HOME_WORKSHOPS_KEYS),
];

/**
 * Angielskie wartości domyślne tych samych sekcji – pokazywane na `/en`,
 * dopóki właściciel nie wpisze własnych w panelu (klucze `en_home_*`).
 * Odpowiadają polskim defaultom wyżej; zmieniając jedne, popraw drugie.
 */
export const HOME_HERO_DEFAULT_EN = {
  eyebrow: "Unique Ceramics - Alicja Ulbrich",
  title: "Handmade\nwith heart",
  text: "Unique functional ceramics from a studio near Gliwice, Poland – every piece is one of a kind. Made with passion and attention to every detail.",
  ctaPrimary: "Browse the shop",
  ctaSecondary: "About me",
  scroll: "Scroll",
} as const;

export const HOME_ABOUT_DEFAULT_EN = {
  eyebrow: "Pottery studio · Gliwice",
  title: "Handmade\nwith heart",
  text:
    "For 20 years I have worked with ceramics in industry, and I brought that experience into artistic ceramics, which I have been making for about a year. I make every piece myself, paying attention to detail, aesthetics and the unique character of each object.\n\n" +
    "Ceramics gives me great satisfaction and lets me find inner calm and a moment of quiet. It also motivates me to keep developing my skills.",
  cta: "Read my story",
} as const;

export const HOME_WORKSHOPS_DEFAULT_EN = {
  eyebrow: "Workshops",
  title: "Try making\nsomething of your own",
  text: "I run pottery workshops for groups and individuals. Perfect for birthdays, hen parties, company events or simply a special evening with friends. No experience needed!",
  cta: "See the dates",
} as const;
