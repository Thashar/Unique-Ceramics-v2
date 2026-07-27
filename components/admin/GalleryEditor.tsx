"use client";

import { useState } from "react";
import { Upload, X, MoveUp, MoveDown } from "lucide-react";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import { uploadErrorMessage } from "@/lib/upload-error";
import { parseGallery, GALLERY_MAX_IMAGES, GALLERY_DEFAULT_POSITION, type GalleryImage } from "@/lib/gallery";

interface Props {
  /** JSON galerii (format z lib/gallery.ts) */
  json: string;
  onChange: (json: string) => void;
  /** Proporcje podglądu – takie same jak na stronie publicznej */
  aspectRatio?: string;
}

export default function GalleryEditor({ json, onChange, aspectRatio = "3/4" }: Props) {
  const [items, setItems] = useState<GalleryImage[]>(() => parseGallery(json));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const emit = (next: GalleryImage[]) => {
    setItems(next);
    onChange(JSON.stringify(next));
  };

  const update = (idx: number, patch: Partial<GalleryImage>) =>
    emit(items.map((img, i) => (i === idx ? { ...img, ...patch } : img)));

  const remove = (idx: number) => {
    if (!confirm("Usunąć to zdjęcie z galerii?")) return;
    emit(items.filter((_, i) => i !== idx));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    emit(next);
  };

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError("");
    let added: GalleryImage[] = [];
    for (const file of Array.from(files)) {
      if (items.length + added.length >= GALLERY_MAX_IMAGES) {
        setError(`Galeria mieści maksymalnie ${GALLERY_MAX_IMAGES} zdjęć.`);
        break;
      }
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      // Przy błędach platformy (np. za duże żądanie) odpowiedź nie jest JSON-em
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        added = [...added, { url: data.url, position: GALLERY_DEFAULT_POSITION }];
      } else {
        setError(uploadErrorMessage(res.status, data?.error, file.name));
        break;
      }
    }
    if (added.length > 0) emit([...items, ...added]);
    setUploading(false);
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((img, idx) => (
            <div key={`${idx}-${img.url}`} className="border border-sand bg-warm-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs tracking-widest uppercase text-charcoal/80">
                  Zdjęcie {idx + 1}
                  {idx === 0 && items.length > 1 && " – pierwsze w pokazie"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    title="W górę"
                    className="p-1.5 text-charcoal hover:text-espresso disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <MoveUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === items.length - 1}
                    title="W dół"
                    className="p-1.5 text-charcoal hover:text-espresso disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <MoveDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    title="Usuń"
                    className="p-1.5 text-red-700 hover:bg-red-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <FocalPointPicker
                imageUrl={img.url}
                value={img.position}
                onChange={(position) => update(idx, { position })}
                aspectRatio={aspectRatio}
              />
            </div>
          ))}
        </div>
      )}

      <label
        className={`flex items-center gap-2 border border-dashed border-sand px-4 py-3 cursor-pointer text-sm text-charcoal/80 hover:border-terracotta hover:text-clay transition-colors ${
          uploading ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <Upload size={16} />
        {uploading ? "Wgrywanie..." : items.length > 0 ? "Dodaj kolejne zdjęcia" : "Dodaj zdjęcia"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>

      <p className="text-[11px] text-charcoal/80">
        {items.length > 1
          ? "Zdjęcia przewijają się automatycznie co 5 sekund. Na telefonie można je przesuwać palcem, na komputerze kliknięcie przechodzi do następnego."
          : "Dodaj co najmniej dwa zdjęcia, żeby uruchomić pokaz. Przy jednym wyświetla się zwykłe zdjęcie."}
      </p>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
      )}
    </div>
  );
}
