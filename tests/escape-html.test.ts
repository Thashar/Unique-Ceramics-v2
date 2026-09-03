import { describe, expect, it } from "vitest";
import { escapeHtml, jsonLdHtml } from "@/lib/escape-html";

// Obie funkcje pilnują granicy między naszym znacznikiem a cudzą treścią:
// `escapeHtml` w mailach sklejanych ze stringów, `jsonLdHtml` w blokach
// <script type="application/ld+json">. Regresja tutaj wraca jako wstrzyknięcie
// obcego HTML-a do wiadomości z domeny sklepu albo skryptu na stronę produktu.

describe("escapeHtml", () => {
  it("escapuje znaki wychodzące z kontekstu HTML", () => {
    expect(escapeHtml('<b>"x"</b>')).toBe("&lt;b&gt;&quot;x&quot;&lt;/b&gt;");
    expect(escapeHtml("Kowalski & Syn")).toBe("Kowalski &amp; Syn");
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapuje ampersand raz, nie podwójnie", () => {
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("neutralizuje ładunek, który przechodził przez kod paczkomatu", () => {
    const payload = '</strong><a href="https://evil.tld">Dokończ płatność</a>';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain("<a");
    expect(escaped).not.toContain("</strong>");
  });

  it("zamienia brak wartości na pusty tekst", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(0)).toBe("0");
  });
});

describe("jsonLdHtml", () => {
  it("nie zostawia sekwencji zamykającej blok skryptu", () => {
    const out = jsonLdHtml({ name: "Kubek</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
  });

  it("zachowuje wartość po sparsowaniu – dane strukturalne się nie zmieniają", () => {
    const data = { name: "Kubek < > & \" koniec", description: "a</script>b" };
    expect(JSON.parse(jsonLdHtml(data))).toEqual(data);
  });

  it("escapuje wartości zagnieżdżone w tablicach i obiektach", () => {
    const out = jsonLdHtml({ items: [{ label: "<img src=x onerror=alert(1)>" }] });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).items[0].label).toBe("<img src=x onerror=alert(1)>");
  });
});
