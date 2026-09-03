// Bezpieczne wstawianie wartości w kontekst HTML – moduł neutralny, bez bazy.
//
// Dwa różne konteksty, dwie różne funkcje. Nie zamieniaj ich miejscami:
// `escapeHtml` chroni tekst wstawiany między znaczniki (np. treść maila),
// `jsonLdHtml` chroni JSON wstawiany do <script type="application/ld+json">.

/**
 * Escapuje znaki, którymi da się wyjść z kontekstu tekstowego HTML.
 *
 * Używaj przy KAŻDEJ wartości pochodzącej od użytkownika albo z bazy, która
 * trafia do szablonu HTML budowanego przez sklejanie stringów – w praktyce do
 * treści maili (`app/api/checkout`, `app/api/admin/orders/[id]`). React escapuje
 * sam, więc w komponentach jest niepotrzebne.
 *
 * Powód: `parcelLockerCode` przechodził walidację sprawdzającą wyłącznie
 * niepustość i trafiał wprost do HTML-a maila wysyłanego na adres podany
 * w żądaniu – dawało to obcy HTML w wiadomości nadanej z domeny sklepu.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Serializuje dane strukturalne do wstawienia w `<script type="application/ld+json">`.
 *
 * `JSON.stringify` escapuje cudzysłowy i backslashe, ale **nie escapuje `<`**,
 * więc ciąg `</script>` w nazwie produktu albo w ustawieniu kontaktowym zamykał
 * blok skryptu i pozwalał dopisać dowolny znacznik do publicznej strony (CSP
 * dopuszcza `'unsafe-inline'`, więc taki skrypt by się wykonał).
 *
 * `\u003c`, `\u003e` i `\u0026` są poprawnymi ucieczkami JSON-a, więc parser
 * danych strukturalnych odczytuje dokładnie te same wartości co przed zmianą.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
