import { getSettings, settingNumber } from "@/lib/settings";
import {
  findActiveFreeShipping,
  findActiveQuantityPromo,
  toFreeShippingConfig,
  toQuantityConfig,
} from "@/lib/promos";
import { DISCOUNT_HOLD_CATALOG_MS } from "@/lib/product-price";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import CartView from "./CartView";

// Ustawienia wysyłki i promocje zmieniają się rzadko, a zapis w panelu robi
// revalidatePath("/", "layout"), więc krótkie ISR w zupełności wystarcza
export const revalidate = 300;

export default async function CartPage() {
  // `holdMs` = okno cache tej strony: promocji kończącej się w czasie życia
  // zapisanego HTML-a nie pokazujemy, żeby koszyk nie obiecywał rabatu,
  // którego `/api/checkout` już nie policzy
  const hold = { holdMs: DISCOUNT_HOLD_CATALOG_MS };
  const [settings, quantityPromo, freeShipping] = await Promise.all([
    getSettings(["shipping_cost", "shipping_cost_parcel_locker"]),
    findActiveQuantityPromo(hold),
    findActiveFreeShipping(hold),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <CartView
          shipping={{
            // Koszyk nie zna jeszcze metody dostawy – pokazujemy najtańszą stawkę
            cheapestCost: Math.min(
              settingNumber(settings.shipping_cost, 18),
              settingNumber(settings.shipping_cost_parcel_locker, 18)
            ),
            freeShipping: toFreeShippingConfig(freeShipping),
          }}
          quantityPromo={toQuantityConfig(quantityPromo)}
        />
      </main>
      <Footer />
    </>
  );
}
