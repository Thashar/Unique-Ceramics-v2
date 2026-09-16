import { requireAdmin } from "@/lib/admin-auth";
import { runTrafficSync } from "@/lib/traffic-store";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ręczna synchronizacja ruchu z przycisku w `/admin/ruch`. Jedno wywołanie
 * obsługuje kilka dni (limit czasu funkcji); klient woła je w pętli, dopóki
 * `remaining > 0` – tak dociąga się całe okno po pierwszym uruchomieniu.
 */
export async function POST() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const report = await runTrafficSync();
    if (report.results.some((r) => r.ok)) revalidatePath("/admin/ruch");
    return NextResponse.json(report);
  } catch (e) {
    console.error("[admin/traffic/sync] synchronizacja nieudana:", e);
    return NextResponse.json({ error: "Synchronizacja nie powiodła się." }, { status: 500 });
  }
}
