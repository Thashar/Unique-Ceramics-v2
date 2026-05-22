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
    "payment_przelewy24_enabled",
    "payment_przelewy24_merchant_id",
    "payment_przelewy24_pos_id",
    "payment_przelewy24_api_key",
    "payment_przelewy24_crc",
    "payment_payu_enabled",
    "payment_payu_pos_id",
    "payment_payu_md5",
    "payment_payu_oauth_client_id",
    "payment_payu_oauth_client_secret",
    "payment_payu_sandbox",
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl text-espresso mb-8">Ustawienia</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SettingsForm section={section} initial={settings as any} />
    </div>
  );
}
