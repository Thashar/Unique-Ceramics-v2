"use client";

import { useState } from "react";

interface Props {
  currentUrl: string;
  onUploaded: (url: string) => void;
  label?: string;
}

export default function ImageUploader({ currentUrl, onUploaded, label = "Zdjęcie nagłówka" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setPreview(data.url);
        onUploaded(data.url);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-3">{label}</label>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="w-full h-48 object-cover mb-3 bg-sand" />
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        disabled={uploading}
        className="text-sm text-charcoal/70 file:mr-3 file:px-4 file:py-1.5 file:text-xs file:tracking-widest file:uppercase file:bg-espresso file:text-cream file:border-0 file:cursor-pointer hover:file:bg-clay"
      />
      {uploading && <p className="text-xs text-clay mt-2">Przesyłanie...</p>}
    </div>
  );
}
