"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const RichEditor = dynamic(() => import("@/components/admin/RichEditor"), { ssr: false });

type Project = {
  id: string;
  title: string;
  description: string;
  images: string[];
  order: number;
  active: boolean;
};

export default function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [images, setImages] = useState<string[]>(project?.images ?? []);
  const [order, setOrder] = useState(project?.order?.toString() ?? "0");
  const [active, setActive] = useState(project?.active ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      title: title.trim(),
      description,
      images,
      order: parseInt(order) || 0,
      active,
    };

    const url = project ? `/api/admin/portfolio/${project.id}` : "/api/admin/portfolio";
    const method = project ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Nie udało się zapisać projektu.");
      return;
    }
    router.push("/admin/projekty");
    router.refresh();
  }

  async function handleDelete() {
    if (!project || !confirm("Na pewno usunąć ten projekt?")) return;
    const res = await fetch(`/api/admin/portfolio/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/projekty");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Tytuł */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
          Tytuł
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-sand bg-warm-white px-4 py-3 text-sm text-charcoal focus:outline-none focus:border-terracotta transition-colors"
          placeholder="Tytuł projektu"
        />
      </div>

      {/* Zdjęcia */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">
          Zdjęcia
        </label>
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-3">
            {images.map((url, i) => (
              <div key={i} className="relative aspect-[4/3] group overflow-hidden rounded-sm border border-sand">
                <Image src={url} alt="" fill className="object-cover" unoptimized sizes="200px" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
                {i > 0 && (
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                    {i + 1}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <label
          className={`flex items-center gap-2 border border-dashed border-sand px-4 py-3 cursor-pointer text-sm text-charcoal/50 hover:border-terracotta hover:text-terracotta transition-colors ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <Upload size={16} />
          {uploading ? "Wgrywanie..." : "Dodaj zdjęcia"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
            disabled={uploading}
          />
        </label>
        <p className="text-xs text-charcoal/40 mt-1">Pierwsze zdjęcie wyświetla się jako główne.</p>
      </div>

      {/* Opis */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">
          Opis
        </label>
        <RichEditor value={description} onChange={setDescription} />
      </div>

      {/* Kolejność */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
          Kolejność
        </label>
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="w-24 border border-sand bg-warm-white px-4 py-3 text-sm text-charcoal focus:outline-none focus:border-terracotta transition-colors"
        />
        <p className="text-xs text-charcoal/40 mt-1">Niższa liczba = wyżej na liście.</p>
      </div>

      {/* Aktywny */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="w-4 h-4 accent-terracotta"
        />
        <label htmlFor="active" className="text-sm text-charcoal cursor-pointer">
          Widoczny na stronie
        </label>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex items-center gap-4 pt-4 border-t border-sand">
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 bg-espresso text-warm-white text-sm tracking-widest uppercase hover:bg-clay transition-colors disabled:opacity-50"
        >
          {saving ? "Zapisywanie..." : project ? "Zapisz zmiany" : "Dodaj projekt"}
        </button>
        {project && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 px-6 py-3 border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            Usuń projekt
          </button>
        )}
      </div>
    </form>
  );
}
