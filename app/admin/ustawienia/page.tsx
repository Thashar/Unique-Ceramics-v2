export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getSettings([
    "regulamin",
    "contact_phone",
    "contact_email",
    "contact_instagram",
    "contact_hours",
    "shipping_cost",
    "shipping_free_enabled",
    "shipping_free_from",
  ]);

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-8">Ustawienia</h1>
      <SettingsForm
        initial={{
          regulamin: settings.regulamin,
          contact_phone: settings.contact_phone,
          contact_email: settings.contact_email,
          contact_instagram: settings.contact_instagram,
          contact_hours: settings.contact_hours,
          shipping_cost: settings.shipping_cost,
          shipping_free_enabled: settings.shipping_free_enabled,
          shipping_free_from: settings.shipping_free_from,
        }}
      />
    </div>
  );
}
