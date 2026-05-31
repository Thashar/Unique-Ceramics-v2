import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logowanie",
  description: "Zaloguj się do swojego konta Unique Ceramics.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
