import { auth } from "@/auth";
import { getSetting } from "@/lib/settings";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key } = await params;
  const value = await getSetting(key);

  return NextResponse.json({ value });
}
