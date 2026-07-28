import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Zamówienie indywidualne",
  description:
    "Zamów ceramikę na miarę – zestawy ślubne, prezenty firmowe, naczynia z personalizacją. Każde zamówienie realizowane ręcznie.",
  path: "/zamowienie-indywidualne",
});

export default function CustomOrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
