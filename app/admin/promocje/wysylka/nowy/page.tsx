import FreeShippingPromoForm from "@/components/admin/FreeShippingPromoForm";

export default function NewFreeShippingPromoPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">Nowa promocja darmowej wysyłki</h1>
      <p className="text-sm text-charcoal/80 mb-8">
        Zeruje koszt dostawy – stale albo na wskazany czas, opcjonalnie od progu wartości koszyka.
      </p>
      <FreeShippingPromoForm />
    </div>
  );
}
