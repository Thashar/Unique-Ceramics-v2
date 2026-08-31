import { CONTACT_FACEBOOK_DEFAULT, getSettings } from "@/lib/settings";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getSettings([
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
  ]);
  return NextResponse.json({
    phone: s.contact_phone,
    email: s.contact_email,
    instagram: s.contact_instagram,
    // Pusty wpis w bazie = pole nietknięte w panelu, więc wracamy do
    // adresu z kodu (Facebook ma być w stopce zawsze)
    facebook: s.contact_facebook || CONTACT_FACEBOOK_DEFAULT,
    youtube: s.contact_youtube,
    whatsapp: s.contact_whatsapp,
    hours: s.contact_hours,
    addressStreet: s.contact_address_street,
    addressCity: s.contact_address_city,
    addressRegion: s.contact_address_region,
  });
}
