"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown } from "lucide-react";
import { DEFAULT_CATEGORIES, type Category } from "@/lib/category-defaults";

interface Props {
  initialCategories: Category[];
}

function autoSlug(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [addSlug, setAddSlug] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const isEmpty = categories.length === 0 || categories[0].id.startsWith("_");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function seedDefaults() {
    setSaving(true);
    setError("");
    const created: Category[] = [];
    for (const def of DEFAULT_CATEGORIES) {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: def.slug, label: def.label, order: def.order }),
      });
      if (res.ok) created.push(await res.json());
    }
    if (created.length > 0) {
      setCategories(created);
      showToast("Domyślne kategorie zostały zapisane");
    }
    setSaving(false);
  }

  function startEdit(cat: Category) {
    setEditId(cat.id);
    setEditSlug(cat.slug);
    setEditLabel(cat.label);
    setError("");
  }

  function cancelEdit() {
    setEditId(null);
    setError("");
  }

  async function saveEdit(cat: Category) {
    if (!editLabel.trim() || !editSlug.trim()) {
      setError("Slug i nazwa są wymagane");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: editSlug.trim(), label: editLabel.trim(), order: cat.order }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Błąd zapisu");
      setSaving(false);
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? data : c)));
    setEditId(null);
    showToast("Zapisano");
    setSaving(false);
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(`Usunąć kategorię „${cat.label}"?`)) return;
    setError("");
    const res = await fetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Błąd usuwania");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    showToast("Kategoria usunięta");
  }

  async function moveCategory(cat: Category, dir: "up" | "down") {
    const idx = categories.findIndex((c) => c.id === cat.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const updated = [...categories];
    const orderA = updated[idx].order;
    const orderB = updated[swapIdx].order;

    // Swap orders
    updated[idx] = { ...updated[idx], order: orderB };
    updated[swapIdx] = { ...updated[swapIdx], order: orderA };
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setCategories(updated);

    // Persist both
    await Promise.all([
      fetch(`/api/admin/categories/${updated[idx].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: updated[idx].slug, label: updated[idx].label, order: updated[idx].order }),
      }),
      fetch(`/api/admin/categories/${updated[swapIdx].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: updated[swapIdx].slug, label: updated[swapIdx].label, order: updated[swapIdx].order }),
      }),
    ]);
  }

  async function addCategory() {
    if (!addLabel.trim() || !addSlug.trim()) {
      setError("Slug i nazwa są wymagane");
      return;
    }
    setSaving(true);
    setError("");
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.order), -1);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: addSlug.trim(), label: addLabel.trim(), order: maxOrder + 1 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Błąd zapisu");
      setSaving(false);
      return;
    }
    setCategories((prev) => [...prev, data]);
    setAddLabel("");
    setAddSlug("");
    setAddOpen(false);
    showToast("Dodano kategorię");
    setSaving(false);
  }

  const isDefaultFallback = categories.length > 0 && categories[0].id.startsWith("_");

  return (
    <div className="max-w-xl">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-espresso text-cream text-sm px-5 py-3 shadow-lg">
          {toast}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-4 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {isDefaultFallback && (
        <div className="mb-6 p-4 bg-cream border border-sand text-sm text-charcoal/70 space-y-3">
          <p>Brak kategorii w bazie danych — sklep wyświetla domyślne. Kliknij poniżej, aby je zapisać i móc edytować.</p>
          <button
            onClick={seedDefaults}
            disabled={saving}
            className="bg-clay hover:bg-espresso disabled:opacity-50 text-cream text-xs tracking-widest uppercase px-5 py-2.5 transition-colors"
          >
            {saving ? "Zapisuję..." : "Zainicjuj domyślne kategorie"}
          </button>
        </div>
      )}

      {!isDefaultFallback && (
        <>
          <p className="text-xs text-charcoal/40 tracking-widest uppercase mb-4">
            {categories.length} {categories.length === 1 ? "kategoria" : categories.length < 5 ? "kategorie" : "kategorii"}
          </p>

          <div className="border border-sand divide-y divide-sand mb-4">
            {categories.length === 0 && (
              <p className="px-4 py-6 text-sm text-charcoal/40 text-center">Brak kategorii — dodaj pierwszą poniżej.</p>
            )}

            {categories.map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-2 px-4 py-3 bg-warm-white">
                {/* Kolejność */}
                <div className="flex flex-col gap-0.5 mr-1">
                  <button
                    onClick={() => moveCategory(cat, "up")}
                    disabled={idx === 0 || saving}
                    className="text-charcoal/30 hover:text-espresso disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveCategory(cat, "down")}
                    disabled={idx === categories.length - 1 || saving}
                    className="text-charcoal/30 hover:text-espresso disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {editId === cat.id ? (
                  /* Wiersz edycji */
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <input
                      value={editLabel}
                      onChange={(e) => {
                        setEditLabel(e.target.value);
                        setEditSlug(autoSlug(e.target.value));
                      }}
                      placeholder="Nazwa"
                      className="flex-1 min-w-[100px] bg-cream border border-sand focus:border-clay outline-none px-3 py-1.5 text-espresso text-sm"
                    />
                    <input
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      placeholder="slug"
                      className="w-32 bg-cream border border-sand focus:border-clay outline-none px-3 py-1.5 text-espresso text-sm font-mono"
                    />
                    <button
                      onClick={() => saveEdit(cat)}
                      disabled={saving}
                      className="p-1.5 text-green-600 hover:text-green-800 disabled:opacity-40 transition-colors"
                      title="Zapisz"
                    >
                      <Check size={16} />
                    </button>
                    <button onClick={cancelEdit} className="p-1.5 text-charcoal/40 hover:text-espresso transition-colors" title="Anuluj">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  /* Wiersz normalny */
                  <>
                    <div className="flex-1">
                      <span className="text-sm text-espresso font-medium">{cat.label}</span>
                      <span className="ml-2 text-xs text-charcoal/40 font-mono">{cat.slug}</span>
                    </div>
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-charcoal/40 hover:text-espresso transition-colors"
                      title="Edytuj"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat)}
                      className="p-1.5 text-charcoal/40 hover:text-red-600 transition-colors"
                      title="Usuń"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Formularz dodawania */}
          {addOpen ? (
            <div className="border border-clay/40 bg-cream px-4 py-4 space-y-3">
              <p className="text-xs tracking-widest uppercase text-charcoal/60">Nowa kategoria</p>
              <div className="flex gap-2 flex-wrap">
                <input
                  value={addLabel}
                  onChange={(e) => {
                    setAddLabel(e.target.value);
                    setAddSlug(autoSlug(e.target.value));
                  }}
                  placeholder="Nazwa (np. Misy)"
                  className="flex-1 min-w-[120px] bg-warm-white border border-sand focus:border-clay outline-none px-3 py-2 text-espresso text-sm"
                  autoFocus
                />
                <input
                  value={addSlug}
                  onChange={(e) => setAddSlug(e.target.value)}
                  placeholder="slug"
                  className="w-32 bg-warm-white border border-sand focus:border-clay outline-none px-3 py-2 text-espresso text-sm font-mono"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addCategory}
                  disabled={saving}
                  className="bg-clay hover:bg-espresso disabled:opacity-50 text-cream text-xs tracking-widest uppercase px-5 py-2.5 transition-colors"
                >
                  {saving ? "Dodaję..." : "Dodaj"}
                </button>
                <button
                  onClick={() => { setAddOpen(false); setAddLabel(""); setAddSlug(""); setError(""); }}
                  className="text-sm text-charcoal/40 hover:text-espresso transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddOpen(true); setError(""); }}
              className="flex items-center gap-2 text-sm text-clay hover:text-espresso transition-colors"
            >
              <Plus size={16} />
              Dodaj kategorię
            </button>
          )}

          {!isEmpty && (
            <p className="mt-8 text-xs text-charcoal/35">
              Slug kategorii musi odpowiadać wartości pola „Kategoria" w produktach. Zmiana sluga nie aktualizuje automatycznie produktów.
            </p>
          )}
        </>
      )}
    </div>
  );
}
