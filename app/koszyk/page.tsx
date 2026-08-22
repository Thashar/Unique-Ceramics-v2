import { getSettings } from "@/lib/settings";
import { BUNDLED_SHIPPING_KEY, BUNDLE_OFF, bundleFromSettings } from "@/lib/bundled-shipping";
import CartView from "./CartView";

// Ustawienia wysyłki zmieniają się rzadko, a zapis w panelu robi
// revalidatePath("/", "layout"), więc krótkie ISR w zupełności wystarcza
export const revalidate = 300;

export default async function CartPage() {
  const settings = await getSettings([
    "shipping_cost",
    "shipping_cost_parcel_locker",
    "shipping_free_enabled",
    "shipping_free_from",
    BUNDLED_SHIPPING_KEY,
  ]);

  const bundle = bundleFromSettings(settings);

  return (
    <CartView
      shipping={{
        cost: Number(settings.shipping_cost) || 18,
        freeEnabled: settings.shipping_free_enabled === "true",
        freeFrom: Number(settings.shipping_free_from) || 300,
        bundle: bundle.enabled ? bundle : BUNDLE_OFF,
      }}
    />
  );
}
