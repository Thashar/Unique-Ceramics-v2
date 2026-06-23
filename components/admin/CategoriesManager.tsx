"use client";

import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, Check, X, GripVertical } from "lucide-react";
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
  const [editLabel, setEditLabel] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // drag & drop state
  const dragIdxRef = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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
    setEditLabel(cat.label);
    setError("");
  }

  function cancelEdit() {
    setEditId(null);
    setError("");
  }

  async function saveEdit(cat: Category) {
    if (!editLabel.trim()) {
      setError("Nazwa jest wymagana");
      return;
    }
    setSaving(true);
    setError("");
    const slug = autoSlug(editLabel.trim()) || cat.slug;
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, label: editLabel.trim(), order: cat.order }),
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

  async function addCategory() {
    if (!addLabel.trim()) {
      setError("Nazwa jest wymagana");
      return;
    }
    const slug = autoSlug(addLabel.trim());
    if (!slug) {
      setError("Nie można wygenerować sluga z podanej nazwy");
      return;
    }
    setSaving(true);
    setError("");
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.order), -1);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, label: addLabel.trim(), order: maxOrder + 1 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Błąd zapisu");
      setSaving(false);
      return;
    }
    setCategories((prev) => [...prev, data]);
    setAddLabel("");
    setAddOpen(false);
    showToast("Dodano kategorię");
    setSaving(false);
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  function handleDragStart(idx: number) {
    dragIdxRef.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  function handleDrop(idx: number) {
    const from = dragIdxRef.current;
    if (from === null || from === idx) {
      dragIdxRef.current = null;
      setDragOverIdx(null);
      return;
    }
    const updated = [...categories];
    const [moved] = updated.splice(from, 1);
    updated.splice(idx, 0, moved);
    // assign new order values
    const reordered = updated.map((c, i) => ({ ...c, order: i }));
    setCategories(reordered);
    setOrderDirty(true);
    dragIdxRef.current = null;
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    dragIdxRef.current = null;
    setDragOverIdx(null);
  }

  async function saveOrder() {
    setSavingOrder(true);
    setError("");
    try {
      await Promise.all(
        categories.map((cat) =>
          fetch(`/api/admin/categories/${cat.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: cat.slug, label: cat.label, order: cat.order }),
          })
        )
      );
      setOrderDirty(false);
      showToast("Kolejność zapisana");
    } catch {
      setError("Błąd zapisu kolejności");
    } finally {
      setSavingOrder(false);
    }
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
          <div className="mb-4">
            <p className="text-xs text-charcoal/40 tracking-widest uppercase">
              {categories.length} {categories.length === 1 ? "kategoria" : categories.length < 5 ? "kategorie" : "kategorii"}
            </p>
          </div>

          <div className="border border-sand divide-y divide-sand mb-4">
            {categories.length === 0 && (
              <p className="px-4 py-6 text-sm text-charcoal/40 text-center">Brak kategorii — dodaj pierwszą poniżej.</p>
            )}

            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 px-3 py-3 bg-warm-white transition-colors ${
                  dragOverIdx === idx ? "bg-sand/40" : ""
                }`}
              >
                {/* Uchwyt drag & drop */}
                <div
                  className="cursor-grab active:cursor-grabbing text-charcoal/25 hover:text-charcoal/50 transition-colors shrink-0 touch-none"
                  title="Przeciągnij, aby zmienić kolejność"
                >
                  <GripVertical size={16} strokeWidth={1.5} />
                </div>

                {editId === cat.id ? (
                  /* Wiersz edycji */
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Nazwa"
                      className="flex-1 min-w-[100px] bg-cream border border-sand focus:border-clay outline-none px-3 py-1.5 text-espresso text-sm"
                      autoFocus
                    />
                    <span className="text-xs text-charcoal/35 font-mono hidden sm:inline">
                      → {autoSlug(editLabel) || cat.slug}
                    </span>
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
                      {cat.slug === "inne" && (
                        <span className="ml-2 text-[10px] tracking-widest uppercase text-charcoal/30">domyślna</span>
                      )}
                    </div>
                    {cat.slug !== "inne" && (
                      <>
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
                  </>
                )}
              </div>
            ))}
          </div>

          {orderDirty && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700 flex-1">Kolejność zmieniona — zatwierdź, żeby zapisać.</p>
              <button
                onClick={saveOrder}
                disabled={savingOrder}
                className="flex items-center gap-1.5 bg-clay hover:bg-espresso disabled:opacity-50 text-cream text-xs tracking-widest uppercase px-4 py-2 transition-colors shrink-0"
              >
                <Check size={12} />
                {savingOrder ? "Zapisuję..." : "Zatwierdź"}
              </button>
            </div>
          )}

          {/* Formularz dodawania */}
          {addOpen ? (
            <div className="border border-clay/40 bg-cream px-4 py-4 space-y-3">
              <p className="text-xs tracking-widest uppercase text-charcoal/60">Nowa kategoria</p>
              <div className="space-y-1.5">
                <input
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  placeholder="Nazwa (np. Miski)"
                  className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-3 py-2 text-espresso text-sm"
                  autoFocus
                />
                {addLabel && (
                  <p className="text-xs text-charcoal/35 font-mono pl-1">
                    slug: {autoSlug(addLabel) || "—"}
                  </p>
                )}
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
                  onClick={() => { setAddOpen(false); setAddLabel(""); setError(""); }}
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
              Slug kategorii musi odpowiadać wartości pola Kategoria w produktach. Zmiana sluga nie aktualizuje automatycznie produktów.
            </p>
          )}
        </>
      )}
    </div>
  );
}
