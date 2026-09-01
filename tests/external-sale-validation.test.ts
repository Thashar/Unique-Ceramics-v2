import { describe, expect, it } from "vitest";
import {
  EXTERNAL_SALE_MAX_AMOUNT,
  EXTERNAL_SALE_MAX_DESCRIPTION,
  validateExternalSale,
} from "@/lib/external-sale-validation";

// Kwota z tych wpisów wchodzi wprost do przychodu, podstawy PIT i limitu
// działalności nierejestrowanej, więc walidacja jest liczona do wyceny.

const base = { soldAt: "2026-08-15", description: "Jarmark – 4 kubki", amount: 240 };

describe("validateExternalSale", () => {
  it("przyjmuje poprawny wpis i normalizuje kwotę do groszy", () => {
    const res = validateExternalSale({ ...base, amount: 240.129 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.amount).toBe(240.13);
    expect(res.data.description).toBe("Jarmark – 4 kubki");
    expect(res.data.note).toBeNull();
    expect(res.data.soldAt.toISOString().slice(0, 10)).toBe("2026-08-15");
  });

  it("przyjmuje kwotę podaną jako tekst z formularza", () => {
    const res = validateExternalSale({ ...base, amount: "99.90" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.amount).toBe(99.9);
  });

  it("odrzuca kwotę zerową i ujemną", () => {
    expect(validateExternalSale({ ...base, amount: 0 }).ok).toBe(false);
    expect(validateExternalSale({ ...base, amount: -50 }).ok).toBe(false);
  });

  it("odrzuca kwotę nierealnie wysoką", () => {
    expect(validateExternalSale({ ...base, amount: EXTERNAL_SALE_MAX_AMOUNT + 1 }).ok).toBe(false);
  });

  it("wymaga opisu", () => {
    expect(validateExternalSale({ ...base, description: "   " }).ok).toBe(false);
    expect(
      validateExternalSale({ ...base, description: "x".repeat(EXTERNAL_SALE_MAX_DESCRIPTION + 1) }).ok
    ).toBe(false);
  });

  it("odrzuca datę z przyszłości – zawyżałaby bieżący miesiąc i limit kwartalny", () => {
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
    expect(validateExternalSale({ ...base, soldAt: future }).ok).toBe(false);
  });

  it("odrzuca datę nieprawidłową i brakującą", () => {
    expect(validateExternalSale({ ...base, soldAt: "wczoraj" }).ok).toBe(false);
    expect(validateExternalSale({ ...base, soldAt: "" }).ok).toBe(false);
  });

  it("zwija pustą notatkę do null", () => {
    const res = validateExternalSale({ ...base, note: "   " });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.note).toBeNull();
  });
});
