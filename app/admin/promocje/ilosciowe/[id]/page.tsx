export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getQuantityPromo } from "@/lib/promos";
import QuantityPromoForm from "@/components/admin/QuantityPromoForm";

export default async function EditQuantityPromoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promo = await getQuantityPromo(id);
  if (!promo) notFound();

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">{promo.name}</h1>
      <p className="text-sm text-charcoal/80 mb-8">
        Rabat za większe zakupy. Zmiany działają od razu – złożone zamówienia zostają bez zmian.
      </p>
      <QuantityPromoForm
        id={promo.id}
        initial={{
          name: promo.name,
          active: promo.active,
          stackable: promo.stackable,
          includeDiscountedProducts: promo.includeDiscountedProducts,
          minItemPrice: promo.minItemPrice,
          maxDiscount: promo.maxDiscount,
          tiers: promo.tiers,
          startsAt: promo.startsAt,
          endsAt: promo.endsAt,
        }}
      />
    </div>
  );
}
