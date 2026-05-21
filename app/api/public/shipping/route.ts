import { getSettings } from "@/lib/settings";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getSettings([
    "shipping_cost",
    "shipping_free_enabled",
    "shipping_free_from",
  ]);
  return NextResponse.json({
    cost: s.shipping_cost,
    freeEnabled: s.shipping_free_enabled,
    freeFrom: s.shipping_free_from,
  });
}
