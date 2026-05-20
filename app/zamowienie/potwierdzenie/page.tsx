import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <div className="min-h-[100svh] bg-warm-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <CheckCircle size={64} strokeWidth={1} className="mx-auto text-green-500 mb-8" />
        <h1 className="font-serif text-4xl text-espresso mb-4">Dziękuję za zamówienie!</h1>
        <p className="text-charcoal/60 mb-3">
          Twoje zamówienie zostało przyjęte. Potwierdzenie wyślę na podany adres e-mail.
        </p>
        {id && (
          <p className="text-xs text-charcoal/40 mb-8">
            Nr zamówienia: <span className="font-mono text-charcoal/60">{id}</span>
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sklep"
            className="px-8 py-4 bg-terracotta hover:bg-clay text-warm-white text-xs tracking-widest uppercase transition-colors"
          >
            Wróć do sklepu
          </Link>
          <Link
            href="/konto/zamowienia"
            className="px-8 py-4 border border-sand hover:border-clay text-espresso text-xs tracking-widest uppercase transition-colors"
          >
            Moje zamówienia
          </Link>
        </div>
      </div>
    </div>
  );
}
