"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { MoreVertical, Pencil, Copy } from "lucide-react";

/**
 * Menu akcji przy produkcie na liście w panelu admina (edycja, duplikowanie).
 * Duplikowanie prowadzi do formularza nowego produktu wypełnionego danymi
 * oryginału – kopia powstaje dopiero po zapisaniu, więc kliknięcie „Duplikuj"
 * niczego nie zmienia w sklepie i nie wymaga potwierdzenia.
 */
export default function ProductRowActions({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Klik poza menu i Escape zamykają listę – bez tego zostaje otwarta
  // przy przewijaniu długiej listy produktów.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-espresso hover:bg-cream transition-colors";

  return (
    <div ref={wrapperRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Opcje produktu ${productName}`}
        className="p-2 text-clay hover:text-espresso transition-colors"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Opcje produktu ${productName}`}
          className="absolute right-0 top-full z-20 mt-1 w-48 border border-sand bg-warm-white shadow-lg py-1"
        >
          <Link
            href={`/admin/produkty/${productId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Pencil size={14} className="text-clay shrink-0" />
            Edytuj
          </Link>
          <Link
            href={`/admin/produkty/nowy?kopia=${productId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Copy size={14} className="text-clay shrink-0" />
            Duplikuj
          </Link>
        </div>
      )}
    </div>
  );
}
