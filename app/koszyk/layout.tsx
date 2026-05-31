import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Koszyk",
  description: "Twój koszyk zakupowy — Unique Ceramics.",
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
