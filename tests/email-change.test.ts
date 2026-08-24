// Zmiana adresu e-mail – walidacja, tokeny i termin ważności.
//
// E-mail jest loginem, więc każdy z tych elementów jest częścią zabezpieczenia:
// token musi być nieodgadywalny, w bazie ma leżeć wyłącznie jego hash, a link
// musi wygasać. Testy pilnują właśnie tych własności.

import { describe, expect, it } from "vitest";
import {
  EMAIL_CHANGE_TTL_MS,
  checkNewEmail,
  createToken,
  expiryFrom,
  hashToken,
  isExpired,
  isValidEmail,
  normalizeEmail,
  tokenMatches,
} from "@/lib/email-change";

describe("adres e-mail", () => {
  it("normalizuje do porównywalnej postaci", () => {
    expect(normalizeEmail("  Ania@Example.COM ")).toBe("ania@example.com");
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(42)).toBe("");
  });

  it("odrzuca adresy bez sensu i absurdalnie długie", () => {
    expect(isValidEmail("ania@example.com")).toBe(true);
    expect(isValidEmail("ania@example")).toBe(false);
    expect(isValidEmail("ania example.com")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("a".repeat(250) + "@example.com")).toBe(false);
  });
});

describe("walidacja nowego adresu", () => {
  it("przyjmuje poprawny adres i zwraca go znormalizowanego", () => {
    const r = checkNewEmail("  Nowa@Example.COM ", "stara@example.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe("nowa@example.com");
  });

  it("odrzuca pusty i nieprawidłowy adres", () => {
    expect(checkNewEmail("", "stara@example.com").ok).toBe(false);
    expect(checkNewEmail("bez-malpy", "stara@example.com").ok).toBe(false);
  });

  it("odrzuca zmianę na ten sam adres – niezależnie od wielkości liter", () => {
    // Inaczej wysłalibyśmy dwa maile i unieważnili sesje bez żadnego powodu
    const r = checkNewEmail("Stara@Example.com", "stara@example.com");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("obecny adres");
  });
});

describe("token potwierdzający", () => {
  it("jest długi i za każdym razem inny", () => {
    const a = createToken();
    const b = createToken();
    expect(a).toHaveLength(64); // 32 bajty w hex
    expect(a).not.toBe(b);
  });

  it("hash jest stały dla tokenu i nie zawiera go w sobie", () => {
    const token = createToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toHaveLength(64);
  });

  it("rozpoznaje właściwy token i odrzuca cudzy", () => {
    const token = createToken();
    const hash = hashToken(token);
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches(createToken(), hash)).toBe(false);
  });

  it("nie wywraca się na uszkodzonym hashu z bazy", () => {
    expect(tokenMatches(createToken(), "")).toBe(false);
    expect(tokenMatches(createToken(), "nie-hex")).toBe(false);
  });
});

describe("termin ważności", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("nowy link jest ważny godzinę", () => {
    expect(expiryFrom(now).getTime() - now.getTime()).toBe(EMAIL_CHANGE_TTL_MS);
    expect(isExpired(expiryFrom(now), now)).toBe(false);
  });

  it("po terminie link nie działa", () => {
    const expiry = expiryFrom(now);
    const later = new Date(expiry.getTime() + 1000);
    expect(isExpired(expiry, later)).toBe(true);
  });

  it("moment wygaśnięcia liczy się już jako wygasły", () => {
    const expiry = expiryFrom(now);
    expect(isExpired(expiry, expiry)).toBe(true);
  });

  it("nieczytelna data jest traktowana jak wygasła", () => {
    // Lepiej odmówić zmiany niż zaufać wpisowi, którego nie rozumiemy
    expect(isExpired("kompletnie-nie-data", now)).toBe(true);
  });
});
