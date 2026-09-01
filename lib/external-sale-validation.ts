// Walidacja ręcznego wpisu sprzedaży poza sklepem (POST/PUT
// `/api/admin/external-sales`). Kwota wchodzi wprost do analityki, raportów PDF
// i limitu działalności nierejestrowanej, więc pilnujemy zakresów po stronie
// serwera – nie ufamy formularzowi nawet od admina.
//
// Moduł neutralny (bez bazy) – korzysta z niego trasa API i formularz w panelu.

export const EXTERNAL_SALE_MAX_DESCRIPTION = 200;
export const EXTERNAL_SALE_MAX_NOTE = 1000;
/** Górna granica kwoty – ta sama, co przy cenie produktu. */
export const EXTERNAL_SALE_MAX_AMOUNT = 1_000_000;

export type ValidExternalSale = {
  soldAt: Date;
  description: string;
  amount: number;
  note: string | null;
};

export function validateExternalSale(
  body: unknown
): { ok: true; data: ValidExternalSale } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Nieprawidłowe dane sprzedaży." };
  }
  const b = body as Record<string, unknown>;

  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (!description) {
    return { ok: false, error: "Opis sprzedaży jest wymagany." };
  }
  if (description.length > EXTERNAL_SALE_MAX_DESCRIPTION) {
    return { ok: false, error: `Opis może mieć maks. ${EXTERNAL_SALE_MAX_DESCRIPTION} znaków.` };
  }

  const amountNum = typeof b.amount === "number" ? b.amount : Number(b.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return { ok: false, error: "Kwota musi być liczbą większą od zera." };
  }
  if (amountNum > EXTERNAL_SALE_MAX_AMOUNT) {
    return { ok: false, error: "Kwota jest nierealnie wysoka." };
  }
  // Kwoty trzymamy w groszach – tak samo jak przy cenach produktów.
  const amount = Math.round(amountNum * 100) / 100;

  if (typeof b.soldAt !== "string" || !b.soldAt.trim()) {
    return { ok: false, error: "Data sprzedaży jest wymagana." };
  }
  const soldAt = new Date(b.soldAt);
  if (Number.isNaN(soldAt.getTime())) {
    return { ok: false, error: "Nieprawidłowa data sprzedaży." };
  }
  // Data z przyszłości zawyżyłaby bieżący miesiąc i limit kwartalny; jeden dzień
  // luzu na różnicę stref (serwer stoi w UTC, właściciel wpisuje czas polski).
  if (soldAt.getTime() > Date.now() + 86_400_000) {
    return { ok: false, error: "Data sprzedaży nie może być z przyszłości." };
  }

  if (b.note != null && typeof b.note !== "string") {
    return { ok: false, error: "Nieprawidłowa notatka." };
  }
  const noteRaw = typeof b.note === "string" ? b.note.trim() : "";
  if (noteRaw.length > EXTERNAL_SALE_MAX_NOTE) {
    return { ok: false, error: `Notatka może mieć maks. ${EXTERNAL_SALE_MAX_NOTE} znaków.` };
  }

  return { ok: true, data: { soldAt, description, amount, note: noteRaw || null } };
}
