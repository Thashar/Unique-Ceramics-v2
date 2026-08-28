import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rejestracja",
  description: "Utwórz konto w Unique Ceramics.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://uniqueceramics.pl/rejestracja" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
