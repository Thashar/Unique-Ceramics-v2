import { getSettings, settingNumber } from "@/lib/settings";
import { NextResponse } from "next/server";
import { findActiveFreeShipping, toFreeShippingConfig } from "@/lib/promos";

export async function GET() {
  const [s, freeShipping] = await Promise.all([
    getSettings(["shipping_cost", "shipping_cost_parcel_locker"]),
    findActiveFreeShipping(),
  ]);

  const courier = settingNumber(s.shipping_cost, 18);
  const parcelLocker = settingNumber(s.shipping_cost_parcel_locker, 18);

  return NextResponse.json({
    courier,
    parcelLocker,
    // Najtańsza stawka – tę pokazuje karta produktu („Wysyłka od …”)
    cheapest: Math.min(courier, parcelLocker),
    // Promocja „Darmowa wysyłka” – null, gdy żadna nie obowiązuje
    freeShipping: toFreeShippingConfig(freeShipping),
  });
}
