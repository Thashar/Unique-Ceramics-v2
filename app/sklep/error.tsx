"use client";

export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[100svh] bg-warm-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase text-clay mb-4">Błąd</p>
        <h1 className="font-serif text-3xl text-espresso mb-4">Nie można wczytać sklepu</h1>
        <p className="text-charcoal/80 text-sm mb-8">
          Wystąpił chwilowy problem. Spróbuj ponownie za moment.
        </p>
        <button
          onClick={reset}
          className="bg-clay hover:bg-terracotta text-warm-white text-xs tracking-widest uppercase px-8 py-4 transition-colors"
        >
          Spróbuj ponownie
        </button>
      </div>
    </div>
  );
}
