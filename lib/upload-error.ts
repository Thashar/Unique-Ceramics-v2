/**
 * Wspólny komunikat błędu uploadu zdjęcia (`/api/admin/upload`).
 * Odpowiedzi platformy (np. 413 przy zbyt dużym żądaniu) nie są JSON-em,
 * więc `serverError` bywa puste – wtedy budujemy komunikat ze statusu HTTP.
 */
export function uploadErrorMessage(
  status: number,
  serverError?: string,
  fileName?: string
): string {
  const detail =
    status === 413
      ? "plik jest za duży – wybierz mniejsze zdjęcie (do ok. 4 MB)."
      : serverError || `nie udało się wgrać zdjęcia (błąd ${status}).`;

  if (fileName) return `„${fileName}": ${detail}`;
  return detail.charAt(0).toUpperCase() + detail.slice(1);
}
