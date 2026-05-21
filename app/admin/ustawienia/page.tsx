export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
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
          about_hero_image: settings.about_hero_image,
          about_story: settings.about_story,
          workshops_hero_image: settings.workshops_hero_image,
          workshops_intro: settings.workshops_intro,
          regulamin: settings.regulamin,
          polityka_prywatnosci: settings.polityka_prywatnosci,
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
