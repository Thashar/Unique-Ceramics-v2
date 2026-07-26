"use client";

import { useState } from "react";
import { uploadErrorMessage } from "@/lib/upload-error";

interface Props {
  currentUrl: string;
  onUploaded: (url: string) => void;
  label?: string;
}

export default function ImageUploader({ currentUrl, onUploaded, label = "Zdjęcie nagłówka" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      // Przy błędach platformy (np. za duże żądanie) odpowiedź nie jest JSON-em
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        setPreviewBroken(false);
        setPreview(data.url);
        onUploaded(data.url);
      } else {
        setError(uploadErrorMessage(res.status, data?.error));
      }
    } catch {
      setError("Brak połączenia z serwerem — spróbuj ponownie.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">{label}</label>
      {preview && !previewBroken && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="w-full object-contain mb-3 bg-sand"
          onError={() => setPreviewBroken(true)}
          onLoad={() => setPreviewBroken(false)}
        />
      )}
      {preview && previewBroken && (
        <p className="mb-3 bg-sand text-charcoal/70 text-xs px-4 py-6 text-center">
          Nie udało się wczytać podglądu tego zdjęcia — wgraj je ponownie.
        </p>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        disabled={uploading}
        className="text-sm text-charcoal/70 file:mr-3 file:px-4 file:py-1.5 file:text-xs file:tracking-widest file:uppercase file:bg-espresso file:text-cream file:border-0 file:cursor-pointer hover:file:bg-clay"
      />
      {uploading && <p className="text-xs text-clay mt-2">Przesyłanie...</p>}
      {error && (
        <p className="text-xs text-red-700 mt-2 bg-red-50 border border-red-200 px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
