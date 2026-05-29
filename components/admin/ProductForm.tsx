"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X, Trash2 } from "lucide-react";

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
};

const CATEGORIES = ["kubki", "miski", "wazy", "talerze", "inne"];

export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product?.price?.toString() ?? "",
    category: product?.category ?? "inne",
    stock: product?.stock?.toString() ?? "0",
    featured: product?.featured ?? false,
    active: product?.active ?? true,
  });
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setImages((prev) => [...prev, url]);
      }
    }
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
        <div className="flex flex-wrap gap-3 mb-3">
          {images.map((url, i) => (
            <div key={i} className="relative w-24 h-24 bg-cream overflow-hidden group">
              <Image src={url} alt={`Zdjęcie ${i + 1}`} fill className="object-cover" sizes="96px" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <label className={`w-24 h-24 border-2 border-dashed border-sand flex flex-col items-center justify-center cursor-pointer hover:border-clay transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload size={20} strokeWidth={1.5} className="text-charcoal/40 mb-1" />
            <span className="text-[10px] text-charcoal/40">{uploading ? "Upload..." : "Dodaj"}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
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
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
      <div className="flex gap-8">
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

      {/* Przyciski */}
      <div className="flex items-center gap-4 pt-4 border-t border-sand">
        <button type="submit" disabled={saving}
          className="bg-clay hover:bg-terracotta disabled:bg-sand disabled:text-charcoal/40 text-warm-white text-xs tracking-widest uppercase px-8 py-3.5 transition-colors">
          {saving ? "Zapisuję..." : product ? "Zapisz zmiany" : "Dodaj produkt"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-sm text-charcoal/50 hover:text-espresso transition-colors">
          Anuluj
        </button>
        {product && (
          <button type="button" onClick={handleDelete}
            className="ml-auto flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors">
            <Trash2 size={15} />
            Usuń produkt
          </button>
        )}
      </div>
    </form>
  );
}
