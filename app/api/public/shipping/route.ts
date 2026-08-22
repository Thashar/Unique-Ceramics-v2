import { getSettings } from "@/lib/settings";
import { NextResponse } from "next/server";
import { BUNDLED_SHIPPING_KEY, bundleFromSettings } from "@/lib/bundled-shipping";

export async function GET() {
  const s = await getSettings([
    "shipping_cost",
    "shipping_cost_parcel_locker",
    "shipping_free_enabled",
    "shipping_free_from",
    BUNDLED_SHIPPING_KEY,
  ]);
  return NextResponse.json({
    cost: s.shipping_cost,
    freeEnabled: s.shipping_free_enabled,
    freeFrom: s.shipping_free_from,
    // Promocja „Wielosztuki” – koszyk i checkout muszą liczyć tak samo jak katalog
    bundle: bundleFromSettings(s),
  });
}
