export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const section = s ?? "strona_glowna";

  const settings = await getSettings([
    "home_hero_image",
    "home_hero_position",
    "home_about_image",
    "home_about_position",
    "home_workshops_image",
    "home_workshops_position",
    "shop_hero_image",
    "shop_hero_position",
    "shop_hero_overlay_color",
    "shop_hero_overlay_opacity",
    "shop_hero_height",
    "shop_subtitle",
    "about_hero_image",
    "about_hero_position",
    "about_hero_overlay_color",
    "about_hero_overlay_opacity",
    "about_hero_height",
    "about_content_image",
    "about_content_position",
    "about_story",
    "workshops_hero_image",
    "workshops_hero_position",
    "workshops_hero_overlay_color",
    "workshops_hero_overlay_opacity",
    "workshops_hero_height",
    "workshops_content_image",
    "workshops_content_position",
    "workshops_intro",
    "workshops_offers",
    "workshops_includes",
    "workshops_faq",
    "regulamin",
    "polityka_prywatnosci",
    "contact_phone",
    "contact_email",
    "contact_instagram",
    "contact_facebook",
    "contact_youtube",
    "contact_whatsapp",
    "shipping_cost",
    "shipping_cost_parcel_locker",
    "shipping_free_enabled",
    "shipping_free_from",
    "shipping_time",
    "payment_bank_account_name",
    "payment_bank_account_number",
    "payment_bank_name",
    "payment_bank_transfer_title",
    "payment_blik_enabled",
    "payment_blik_phone",
    "payment_stripe_enabled",
    "vacation_enabled",
    "vacation_end_date",
    "vacation_message",
    "custom_order_notify_email_enabled",
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl text-espresso mb-8">Ustawienia</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SettingsForm section={section} initial={settings as any} />
    </div>
  );
}
