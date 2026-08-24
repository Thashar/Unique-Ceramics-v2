import QuantityPromoForm from "@/components/admin/QuantityPromoForm";

export default function NewQuantityPromoPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">Nowy rabat za większe zakupy</h1>
      <p className="text-sm text-charcoal/80 mb-8">
        Im więcej sztuk w koszyku, tym wyższy rabat. Rabat schodzi proporcjonalnie z każdej
        kwalifikującej się pozycji.
      </p>
      <QuantityPromoForm />
    </div>
  );
}
