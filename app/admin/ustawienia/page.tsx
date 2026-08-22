export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { getAiUsageStats } from "@/lib/ai-usage";
import SettingsForm from "@/components/admin/SettingsForm";

const VALID_SECTIONS = new Set([
  "strona_glowna", "omnie", "warsztaty", "regulamin", "polityka",
  "kontakt", "wysylka", "urlop", "zam_indywidualne", "ai", "promocje",
  "platnosci_przelew", "platnosci_stripe",
]);

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  if (s && !VALID_SECTIONS.has(s)) redirect("/admin/ustawienia");
  const section = s ?? "strona_glowna";

  const settings = await getSettings([
    "home_hero_image",
    "home_hero_position",
    "home_about_image",
    "home_about_position",
    "home_workshops_image",
    "home_workshops_position",
    "about_hero_image",
    "about_hero_position",
    "about_hero_overlay_color",
    "about_hero_overlay_opacity",
    "about_hero_height",
    "about_content_gallery",
    "about_content_image",
    "about_content_position",
    "about_story",
    "workshops_hero_image",
    "workshops_hero_position",
    "workshops_hero_overlay_color",
    "workshops_hero_overlay_opacity",
    "workshops_hero_height",
    "workshops_content_gallery",
    "workshops_content_image",
    "workshops_content_position",
    "workshops_intro",
    "workshops_includes_gallery",
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
    "contact_hours",
    "contact_address_street",
    "contact_address_city",
    "contact_address_region",
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
    "ai_image_model",
    "ai_image_model_plus",
    "ai_text_model",
    "ai_usd_pln_rate",
    "ai_prompt_presets",
    "ai_prompt_preset_ai",
    "ai_prompt_preset_ai_plus",
    "bundled_shipping_enabled",
  ]);

  // Statystyki zużycia AI potrzebne tylko na jednej zakładce – nie odpytuj bazy poza nią
  const aiUsage = section === "ai" ? await getAiUsageStats() : null;

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl text-espresso mb-8">Ustawienia</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SettingsForm section={section} initial={settings as any} aiUsage={aiUsage} />
    </div>
  );
}
