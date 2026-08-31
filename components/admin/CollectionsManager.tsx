"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, MoveUp, MoveDown } from "lucide-react";
import type { Collection } from "@/lib/collection-defaults";

function autoSlug(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Kolekcje produktów (serie) w /admin/kategorie. Prostsze niż kategorie:
 * kolejność zmienia się strzałkami (kolekcji jest z natury mało i nie stoją
 * jako filtry w sklepie), a usunięcie tylko **wypisuje** produkty z serii –
 * kolekcja jest opcjonalna, więc nie ma dokąd ich przenosić.
 */
export default function CollectionsManager({ initial }: { initial: Collection[] }) {
  const [collections, setCollections] = useState<Collection[]>(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function addCollection() {
    const label = addLabel.trim();
    if (!label) { setError("Nazwa jest wymagana"); return; }
    const slug = autoSlug(label);
    if (!slug) { setError("Nie można wygenerować sluga z podanej nazwy"); return; }

    setSaving(true);
    setError("");
    const maxOrder = collections.reduce((max, c) => Math.max(max, c.order), -1);
    const res = await fetch("/api/admin/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, label, order: maxOrder + 1 }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) { setError(data?.error ?? "Błąd zapisu"); return; }
    setCollections((prev) => [...prev, data]);
    setAddLabel("");
    setAddOpen(false);
  }

  async function saveEdit(collection: Collection) {
    const label = editLabel.trim();
    if (!label) { setError("Nazwa jest wymagana"); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/collections/${collection.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: autoSlug(label), label, order: collection.order }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) { setError(data?.error ?? "Błąd zapisu"); return; }
    setCollections((prev) => prev.map((c) => (c.id === collection.id ? data : c)));
    setEditId(null);
  }

  async function remove(collection: Collection) {
    if (!confirm(`Usunąć kolekcję „${collection.label}"?\n\nProdukty zostaną z niej wypisane, ale same zostaną w sklepie.`)) return;
    setError("");
    const res = await fetch(`/api/admin/collections/${collection.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Błąd usuwania");
      return;
    }
    setCollections((prev) => prev.filter((c) => c.id !== collection.id));
  }

  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= collections.length) return;
    const next = [...collections];
    [next[idx], next[target]] = [next[target], next[idx]];
    const reordered = next.map((c, i) => ({ ...c, order: i }));
    setCollections(reordered);
    // Kolejność zapisujemy od razu – dwa wiersze, które zamieniły się miejscami
    await Promise.all(
      [reordered[idx], reordered[target]].map((c) =>
        fetch(`/api/admin/collections/${c.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: c.slug, label: c.label, order: c.order }),
        })
      )
    );
  }

  return (
    <div className="max-w-xl mt-14">
      <h2 className="font-serif text-2xl text-espresso mb-2">Kolekcje</h2>
      <p className="text-sm text-charcoal/80 mb-6">
        Kolekcja to seria produktów powstałych razem (np. „Zima 2026”). Produkt przypisujesz do niej
        w jego formularzu. W sekcji „Podobne produkty” na karcie produktu kolekcja **waży więcej niż
        kategoria** – najpierw pokazujemy resztę serii.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-4 hover:opacity-70" aria-label="Zamknij">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="border border-sand divide-y divide-sand mb-4">
        {collections.length === 0 && (
          <p className="px-4 py-6 text-sm text-charcoal/80 text-center">
            Brak kolekcji – dodaj pierwszą poniżej.
          </p>
        )}

        {collections.map((collection, idx) => (
          <div key={collection.id} className="flex items-center gap-2 px-3 py-3 bg-warm-white">
            <div className="flex flex-col shrink-0">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="Przesuń wyżej"
                className="p-1 text-charcoal/80 hover:text-charcoal disabled:opacity-20"
              >
                <MoveUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === collections.length - 1}
                aria-label="Przesuń niżej"
                className="p-1 text-charcoal/80 hover:text-charcoal disabled:opacity-20"
              >
                <MoveDown size={12} />
              </button>
            </div>

            {editId === collection.id ? (
              <>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="flex-1 min-w-0 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => saveEdit(collection)}
                  disabled={saving}
                  aria-label="Zapisz"
                  className="p-1.5 text-green-700 hover:bg-green-50 disabled:opacity-50"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  aria-label="Anuluj"
                  className="p-1.5 text-charcoal/80 hover:text-charcoal"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-espresso truncate">{collection.label}</p>
                  <p className="text-[11px] text-charcoal/80 font-mono truncate">{collection.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditId(collection.id); setEditLabel(collection.label); }}
                  aria-label="Edytuj"
                  className="p-1.5 text-charcoal/80 hover:text-espresso"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(collection)}
                  aria-label="Usuń"
                  className="p-1.5 text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {addOpen ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            placeholder="Nazwa kolekcji"
            className="flex-1 min-w-0 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") addCollection(); }}
          />
          <button
            type="button"
            onClick={addCollection}
            disabled={saving}
            className="bg-clay hover:bg-espresso disabled:opacity-50 text-cream text-xs tracking-widest uppercase px-5 py-2.5 transition-colors"
          >
            {saving ? "Zapisuję..." : "Dodaj"}
          </button>
          <button
            type="button"
            onClick={() => { setAddOpen(false); setAddLabel(""); }}
            aria-label="Anuluj"
            className="p-2 text-charcoal/80 hover:text-charcoal"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors py-2"
        >
          <Plus size={14} />
          Dodaj kolekcję
        </button>
      )}
    </div>
  );
}
