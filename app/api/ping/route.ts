import { db } from "@/lib/db";
import { runTrafficSync } from "@/lib/traffic-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// Synchronizacja ruchu to do 60 zapytań do API Vercela (4 dni × 15 wymiarów)
export const maxDuration = 60;

/**
 * Cron Vercela (8:00 UTC, `vercel.json`): health check bazy + codzienny zapis
 * ruchu na stronie do `TrafficStat` (patrz `lib/traffic-store.ts`). Błąd
 * synchronizacji nie zmienia `ok` – to nadal odpowiedź „sklep żyje".
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }

  let traffic: unknown;
  try {
    const report = await runTrafficSync();
    traffic = {
      skipped: report.skipped,
      synced: report.results.filter((r) => r.ok).map((r) => r.day),
      failed: report.results.filter((r) => !r.ok).map((r) => ({ day: r.day, error: r.error })),
      remaining: report.remaining,
    };
  } catch (e) {
    console.error("[ping] synchronizacja ruchu nieudana:", e);
    traffic = { error: "sync failed" };
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString(), traffic });
}
