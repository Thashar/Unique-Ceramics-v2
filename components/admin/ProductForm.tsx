"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X, Trash2, MoveLeft, MoveRight, Sparkles, Loader2 } from "lucide-react";
import { uploadErrorMessage } from "@/lib/upload-error";
import { PRODUCT_MAX_IMAGES } from "@/lib/product-validation";
import { AI_VARIANT_LABEL, type AiVariant } from "@/lib/ai-image";

/** Treść potwierdzenia przed płatnym wywołaniem modelu. */
const AI_CONFIRM: Record<AiVariant, string> = {
  ai: "Wygenerować przez AI zdjęcie tego produktu na jednolitym, matowym tle?\n\nPowstanie nowe zdjęcie dodane na końcu listy – oryginał zostaje bez zmian.",
  ai_plus:
    "Wygenerować przez AI zdjęcie tego produktu w wystylizowanej scenie (len, eukaliptus, kamienie)?\n\nPowstanie nowe zdjęcie dodane na końcu listy – oryginał zostaje bez zmian.",
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: string[];
  category: string;
  stock: number;
  featured: boolean;
  active: boolean;
  variesFromPhoto: boolean;
};

type Category = { slug: string; label: string };

export default function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product?.price?.toString() ?? "",
    category: product?.category ?? categories[0]?.slug ?? "",
    stock: product?.stock?.toString() ?? "0",
    featured: product?.featured ?? false,
    active: product?.active ?? true,
    variesFromPhoto: product?.variesFromPhoto ?? false,
  });
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  // Które zdjęcie jest właśnie przerabiane przez AI (indeks + wariant)
  const [generating, setGenerating] = useState<{ idx: number; variant: AiVariant } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ł/g, "l")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function removeImage(idx: number) {
    if (!confirm("Usunąć to zdjęcie z produktu?")) return;
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  /** Zamiana zdjęcia z sąsiadem – kolejność decyduje, które jest główne (pierwsze). */
  function moveImage(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    setImages((prev) => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  /**
   * Wysyła zdjęcie do Google AI i dokłada wynik na koniec listy.
   * Oryginał zostaje – wygenerowana wersja to osobny plik w Storage.
   */
  async function generateWithAi(idx: number, variant: AiVariant) {
    if (generating || uploading) return;
    if (images.length >= PRODUCT_MAX_IMAGES) {
      setError(`Do produktu można dodać maksymalnie ${PRODUCT_MAX_IMAGES} zdjęć.`);
      return;
    }
    if (!confirm(AI_CONFIRM[variant])) return;

    setGenerating({ idx, variant });
    setError("");
    try {
      const res = await fetch("/api/admin/ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: images[idx], variant }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        setImages((prev) => [...prev, data.url]);
      } else {
        setError(data?.error ?? "Nie udało się wygenerować zdjęcia.");
      }
    } catch {
      setError("Brak połączenia z serwerem – spróbuj ponownie.");
    } finally {
      setGenerating(null);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError("");

    let added: string[] = [];
    for (const file of Array.from(files)) {
      if (images.length + added.length >= PRODUCT_MAX_IMAGES) {
        setError(`Do produktu można dodać maksymalnie ${PRODUCT_MAX_IMAGES} zdjęć.`);
        break;
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        added = [...added, data.url];
      } else {
        setError(uploadErrorMessage(res.status, data?.error, file.name));
        break;
      }
    }
    if (added.length > 0) setImages((prev) => [...prev, ...added]);
    setUploading(false);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      images,
    };

    const res = await fetch(
      product ? `/api/admin/products/${product.id}` : "/api/admin/products",
      {
        method: product ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Wystąpił błąd");
      setSaving(false);
      return;
    }

    router.push("/admin/produkty");
    router.refresh();
  }

  async function handleDelete() {
    if (!product) return;
    if (!confirm("Czy na pewno chcesz usunąć ten produkt?")) return;
    await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    router.push("/admin/produkty");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      {/* Zdjęcia */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Zdjęcia produktu</label>
        <div className="flex flex-wrap items-start gap-3 mb-3">
          {images.map((url, i) => (
            <div key={`${i}-${url}`} className="w-28 border border-sand bg-warm-white p-1.5">
              <div className="relative w-full aspect-square bg-cream overflow-hidden">
                <Image src={url} alt={`Zdjęcie ${i + 1}`} fill className="object-cover" sizes="112px" />
                {i === 0 && images.length > 1 && (
                  <span className="absolute inset-x-0 bottom-0 bg-espresso/90 text-cream text-[9px] tracking-widest uppercase text-center py-0.5">
                    Główne
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <button
                  type="button"
                  onClick={() => moveImage(i, -1)}
                  disabled={i === 0}
                  title="Przesuń w lewo"
                  aria-label={`Przesuń zdjęcie ${i + 1} w lewo`}
                  className="p-1 text-charcoal hover:text-espresso disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MoveLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(i, 1)}
                  disabled={i === images.length - 1}
                  title="Przesuń w prawo"
                  aria-label={`Przesuń zdjęcie ${i + 1} w prawo`}
                  className="p-1 text-charcoal hover:text-espresso disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MoveRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  title="Usuń zdjęcie"
                  aria-label={`Usuń zdjęcie ${i + 1}`}
                  className="p-1 text-red-700 hover:bg-red-50"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex gap-1 mt-1">
                {(["ai", "ai_plus"] as AiVariant[]).map((variant) => {
                  const busy = generating?.idx === i && generating.variant === variant;
                  return (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => generateWithAi(i, variant)}
                      disabled={generating !== null}
                      title={
                        variant === "ai"
                          ? "AI – produkt na jednolitym tle"
                          : "AI+ – produkt w wystylizowanej scenie"
                      }
                      aria-label={`Wygeneruj wersję ${AI_VARIANT_LABEL[variant]} ze zdjęcia ${i + 1}`}
                      className="flex-1 inline-flex items-center justify-center gap-0.5 border border-sand bg-cream hover:bg-sand text-espresso text-[10px] tracking-wide uppercase py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {busy ? (
                        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Sparkles size={11} aria-hidden="true" />
                      )}
                      {AI_VARIANT_LABEL[variant]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {images.length < PRODUCT_MAX_IMAGES && (
            <label className={`w-24 h-24 border-2 border-dashed border-sand flex flex-col items-center justify-center cursor-pointer hover:border-clay transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <Upload size={20} strokeWidth={1.5} className="text-charcoal/80 mb-1" />
              <span className="text-[10px] text-charcoal/80">{uploading ? "Upload..." : "Dodaj"}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          )}
        </div>
        <p className="text-[11px] text-charcoal/80">
          Pierwsze zdjęcie jest główne – widać je na liście produktów i w koszyku. Strzałki zmieniają
          kolejność, krzyżyk usuwa zdjęcie (maks. {PRODUCT_MAX_IMAGES}).
        </p>
        <p className="text-[11px] text-charcoal/80 mt-1">
          <strong className="font-medium">AI</strong> tworzy wersję zdjęcia na jednolitym, matowym tle,{" "}
          <strong className="font-medium">AI+</strong> – w wystylizowanej scenie. Wynik dodaje się jako
          nowe zdjęcie na końcu listy (oryginał zostaje). Model dla obu wariantów wybierzesz
          w Ustawieniach → AI (zdjęcia).
        </p>
        {generating && (
          <p className="text-[11px] text-clay mt-1">
            Generuję wersję {AI_VARIANT_LABEL[generating.variant]} ze zdjęcia {generating.idx + 1} –
            to może potrwać kilkadziesiąt sekund.
          </p>
        )}
      </div>

      {/* Podstawowe */}
      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-2">
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Nazwa *</label>
          <input required value={form.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!product) set("slug", autoSlug(e.target.value));
            }}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Slug URL *</label>
          <input required value={form.slug} onChange={(e) => set("slug", e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm font-mono" />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Kategoria *</label>
          <select value={form.category} onChange={(e) => set("category", e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm">
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Cena (zł) *</label>
          <input required type="number" step="0.01" min="0" value={form.price}
            onChange={(e) => set("price", e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Stan magazynowy</label>
          <input type="number" min="0" value={form.stock}
            onChange={(e) => set("stock", e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Opis</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
            rows={4} className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm resize-none" />
        </div>
      </div>

      {/* Opcje */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-8">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.featured}
              onChange={(e) => set("featured", e.target.checked)} className="accent-clay w-4 h-4" />
            <span className="text-sm text-espresso">Wyróżniony na stronie głównej</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.active}
              onChange={(e) => set("active", e.target.checked)} className="accent-clay w-4 h-4" />
            <span className="text-sm text-espresso">Aktywny (widoczny w sklepie)</span>
          </label>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.variesFromPhoto}
            onChange={(e) => set("variesFromPhoto", e.target.checked)} className="accent-clay w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="text-sm text-espresso">Produkt może różnić się od zdjęcia</span>
            <p className="text-xs text-charcoal/80 mt-0.5">Wyświetla informację o naturalnej unikalności ceramiki na stronie produktu.</p>
          </div>
        </label>
      </div>

      {/* Przyciski */}
      <div className="flex items-center gap-4 pt-4 border-t border-sand">
        <button type="submit" disabled={saving}
          className="bg-clay hover:bg-terracotta hover:text-espresso disabled:bg-sand disabled:text-charcoal/40 text-warm-white text-xs tracking-widest uppercase px-8 py-3.5 transition-colors">
          {saving ? "Zapisuję..." : product ? "Zapisz zmiany" : "Dodaj produkt"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-sm text-charcoal/80 hover:text-espresso transition-colors">
          Anuluj
        </button>
        {product && (
          <button type="button" onClick={handleDelete}
            className="ml-auto flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors">
            <Trash2 size={15} />
            Usuń produkt
          </button>
        )}
      </div>
    </form>
  );
}
