export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const section = s ?? "omnie";

  const settings = await getSettings([
    "home_hero_image",
    "home_hero_position",
    "home_about_image",
    "home_about_position",
    "home_workshops_image",
    "home_workshops_position",
    "about_hero_image",
    "about_story",
    "workshops_hero_image",
    "workshops_intro",
    "regulamin",
    "polityka_prywatnosci",
    "contact_phone",
    "contact_email",
    "contact_instagram",
    "shipping_cost",
    "shipping_free_enabled",
    "shipping_free_from",
    "payment_bank_account_name",
    "payment_bank_account_number",
    "payment_bank_name",
    "payment_bank_transfer_title",
    "payment_blik_enabled",
    "payment_blik_phone",
    "payment_stripe_enabled",
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl text-espresso mb-8">Ustawienia</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SettingsForm section={section} initial={settings as any} />
    </div>
  );
}
