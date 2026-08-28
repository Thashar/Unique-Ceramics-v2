import { headers } from "next/headers";

/** Nagłówek dokładany przez Vercela: kod kraju wyliczony z adresu IP. */
const COUNTRY_HEADER = "x-vercel-ip-country";

/**
 * Czy odwiedzający wygląda na osobę spoza Polski.
 *
 * **To jest wyłącznie podpowiedź, nigdy podstawa decyzji.** VPN, wakacje,
 * roaming albo Polak mieszkający w Berlinie dają fałszywy odczyt w obie strony,
 * a poza Vercelem nagłówka w ogóle nie ma. Dlatego wynik wolno wykorzystać
 * tylko do **zaproponowania** czegoś (drugie zdanie po angielsku o wysyłce
 * zagranicznej), a nigdy do ustalania ceny, blokowania zamówienia czy
 * ukrywania metod dostawy. O kraju dostawy rozstrzyga adres podany
 * w zamówieniu, a nie adres IP.
 *
 * Strona wołająca musi być dynamiczna – odczyt nagłówków wyklucza cache.
 */
export async function isForeignVisitor(): Promise<boolean> {
  try {
    const country = (await headers()).get(COUNTRY_HEADER);
    return Boolean(country) && country !== "PL";
  } catch {
    // Brak nagłówków (build, inne środowisko) traktujemy jak ruch krajowy
    return false;
  }
}
