"use client";

// Vercel Web Analytics z filtrem: odsłony panelu admina **nie są wysyłane**.
// Właścicielka klika po panelu dziesiątki razy dziennie – w statystykach sklepu
// to szum, a na planie Hobby zużywa limit 50 000 zdarzeń miesięcznie.
// `beforeSend` jest funkcją, więc musi siedzieć w komponencie klienckim –
// z `app/layout.tsx` (serwerowego) nie da się jej przekazać.

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { isAdminPath } from "@/lib/traffic";

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    return isAdminPath(new URL(event.url).pathname) ? null : event;
  } catch {
    return event;
  }
}

export default function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
