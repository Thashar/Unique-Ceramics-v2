import { db } from "@/lib/db";

const DEFAULTS: Record<string, string> = {
  regulamin: "<p>Regulamin sklepu Unique Ceramics.</p>",
  contact_phone: "+48 668 443 706",
  contact_email: "kontakt@uniqueceramics.pl",
  contact_instagram: "@unique.ceramics",
  contact_hours: "Pon–Pt 9:00–17:00",
  shipping_cost: "18",
  shipping_free_enabled: "true",
  shipping_free_from: "300",
};

export async function getSetting(key: string): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function getSettings(
  keys: string[]
): Promise<Record<string, string>> {
  const rows = await db.setting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  for (const key of keys) {
    map[key] = rows.find((r) => r.key === key)?.value ?? DEFAULTS[key] ?? "";
  }
  return map;
}
