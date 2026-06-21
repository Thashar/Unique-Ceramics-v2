import { getSettings } from "@/lib/settings";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getSettings([
    "contact_phone",
    "contact_email",
    "contact_instagram",
    "contact_facebook",
    "contact_youtube",
    "contact_whatsapp",
  ]);
  return NextResponse.json({
    phone: s.contact_phone,
    email: s.contact_email,
    instagram: s.contact_instagram,
    facebook: s.contact_facebook,
    youtube: s.contact_youtube,
    whatsapp: s.contact_whatsapp,
  });
}
