"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

export default function StripeResumeButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Nie udało się otworzyć płatności. Spróbuj ponownie.");
        setLoading(false);
      }
    } catch {
      setError("Błąd połączenia. Spróbuj ponownie.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-terracotta hover:bg-clay disabled:opacity-60 text-warm-white text-xs tracking-widest uppercase py-3 transition-colors"
      >
        <CreditCard size={14} strokeWidth={1.5} />
        {loading ? "Przekierowanie..." : "Dokończ płatność"}
      </button>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}
