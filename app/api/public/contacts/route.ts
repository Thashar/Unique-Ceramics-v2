import { getSettings } from "@/lib/settings";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getSettings(["contact_phone", "contact_email", "contact_instagram"]);
  return NextResponse.json({
    phone: s.contact_phone,
    email: s.contact_email,
    instagram: s.contact_instagram,
  });
}
