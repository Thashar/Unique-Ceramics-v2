// Koszyk: wyrównanie do stanu z serwera i scalanie po zalogowaniu.
//
// Obie operacje zmieniają koszyk **za plecami klienta**, więc każdy przypadek
// brzegowy ma tu własny test: wyprzedany produkt musi zniknąć i zostać nazwany,
// a scalanie nie może podwoić koszyka przy kolejnym logowaniu.

import { describe, expect, it } from "vitest";
import {
  mergeCarts,
  reducedMessage,
  soldOutMessage,
  syncCartWithServer,
  type SyncCartItem,
} from "@/lib/cart-sync";

function item(overrides: Partial<SyncCartItem> & { id: string }): SyncCartItem {
  return {
    slug: "kubek",
    name: "Kubek",
    price: 100,
    image: "/k.webp",
    quantity: 1,
    stock: 5,
    ...overrides,
  };
}

describe("wyrównanie koszyka do serwera", () => {
  it("aktualizuje cenę i stan", () => {
    const r = syncCartWithServer(
      [item({ id: "a", price: 100, stock: 5 })],
      [{ id: "a", price: 80, basePrice: 100, stock: 3 }]
    );
    expect(r.items[0].price).toBe(80);
    expect(r.items[0].basePrice).toBe(100);
    expect(r.items[0].stock).toBe(3);
    expect(r.priceChanged).toBe(true);
    expect(r.changed).toBe(true);
  });

  it("nie zgłasza zmiany, gdy nic się nie zmieniło", () => {
    const r = syncCartWithServer(
      [item({ id: "a", price: 100, stock: 5, name: "Kubek" })],
      [{ id: "a", name: "Kubek", price: 100, stock: 5 }]
    );
    expect(r.changed).toBe(false);
    expect(r.priceChanged).toBe(false);
    expect(r.soldOut).toEqual([]);
  });

  it("usuwa wyprzedany produkt i podaje jego nazwę", () => {
    const r = syncCartWithServer(
      [item({ id: "a", name: "Miska ceramiczna" }), item({ id: "b", name: "Kubek" })],
      [
        { id: "a", price: 100, stock: 0 },
        { id: "b", price: 100, stock: 5 },
      ]
    );
    expect(r.items.map((i) => i.id)).toEqual(["b"]);
    expect(r.soldOut).toEqual(["Miska ceramiczna"]);
    expect(r.changed).toBe(true);
  });

  it("usuwa produkt, którego serwer w ogóle nie zna", () => {
    // Wycofany ze sprzedaży albo usunięty – /api/cart/prices go nie zwróci
    const r = syncCartWithServer([item({ id: "a", name: "Wazon" })], []);
    expect(r.items).toEqual([]);
    expect(r.soldOut).toEqual(["Wazon"]);
  });

  it("przycina ilość do dostępnego stanu i to zgłasza", () => {
    const r = syncCartWithServer(
      [item({ id: "a", name: "Kubek", quantity: 5, stock: 5 })],
      [{ id: "a", price: 100, stock: 2 }]
    );
    expect(r.items[0].quantity).toBe(2);
    expect(r.reduced).toEqual([{ name: "Kubek", quantity: 2 }]);
    expect(r.changed).toBe(true);
  });

  it("nie zgłasza przycięcia, gdy ilość mieści się w stanie", () => {
    const r = syncCartWithServer(
      [item({ id: "a", quantity: 2, stock: 5 })],
      [{ id: "a", price: 100, stock: 5 }]
    );
    expect(r.reduced).toEqual([]);
  });
});

describe("scalanie koszyka po zalogowaniu", () => {
  it("łączy pozycje z obu koszyków", () => {
    const merged = mergeCarts(
      [item({ id: "a", quantity: 1 })],
      [item({ id: "b", quantity: 2 })]
    );
    expect(merged.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("NIE sumuje ilości tej samej pozycji – bierze większą", () => {
    // Ten sam koszyk bywa zapisany po obu stronach; sumowanie podwajałoby go
    // przy każdym kolejnym logowaniu
    const merged = mergeCarts(
      [item({ id: "a", quantity: 2 })],
      [item({ id: "a", quantity: 2 })]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(2);
  });

  it("bierze większą ilość, gdy koszyki się różnią", () => {
    expect(mergeCarts([item({ id: "a", quantity: 3 })], [item({ id: "a", quantity: 1 })])[0].quantity).toBe(3);
    expect(mergeCarts([item({ id: "a", quantity: 1 })], [item({ id: "a", quantity: 3 })])[0].quantity).toBe(3);
  });

  it("przycina ilość do znanego stanu magazynowego", () => {
    const merged = mergeCarts(
      [item({ id: "a", quantity: 9, stock: 2 })],
      [item({ id: "a", quantity: 1, stock: 2 })]
    );
    expect(merged[0].quantity).toBe(2);
  });

  it("dane pozycji bierze z koszyka lokalnego – jest świeższy", () => {
    const merged = mergeCarts(
      [item({ id: "a", name: "Kubek nowy", price: 80 })],
      [item({ id: "a", name: "Kubek stary", price: 100 })]
    );
    expect(merged[0].name).toBe("Kubek nowy");
    expect(merged[0].price).toBe(80);
  });

  it("pusty koszyk lokalny nie kasuje zapisanego na koncie", () => {
    const merged = mergeCarts([], [item({ id: "a", quantity: 2 })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(2);
  });

  it("pomija pozycje bez identyfikatora i o zerowej ilości", () => {
    const merged = mergeCarts(
      [item({ id: "", quantity: 1 }), item({ id: "a", quantity: 0, stock: 0 })],
      []
    );
    expect(merged).toEqual([]);
  });
});

describe("komunikaty", () => {
  it("nazywa pojedynczy wyprzedany produkt", () => {
    expect(soldOutMessage(["Kubek"])).toContain("„Kubek”");
    expect(soldOutMessage(["Kubek"])).toContain("usunęliśmy go z koszyka");
  });

  it("wylicza kilka wyprzedanych produktów w jednym komunikacie", () => {
    const msg = soldOutMessage(["Kubek", "Miska"]);
    expect(msg).toContain("„Kubek”");
    expect(msg).toContain("„Miska”");
  });

  it("brak wyprzedanych = brak komunikatu", () => {
    expect(soldOutMessage([])).toBeNull();
    expect(reducedMessage([])).toBeNull();
  });

  it("podaje, ile sztuk zostało", () => {
    expect(reducedMessage([{ name: "Kubek", quantity: 2 }])).toContain("tylko 2 szt.");
  });
});
