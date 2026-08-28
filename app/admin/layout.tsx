import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import BfcacheGuard from "@/components/admin/BfcacheGuard";

// Panel jest za logowaniem, ale bez tego dziedziczył `index, follow` z layoutu
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-[100svh] bg-warm-white">
      <BfcacheGuard />
      <AdminNav />
      {/* Desktop: offset for sidebar. Mobile: offset for top bar */}
      <main className="md:ml-56 pt-[72px] md:pt-10 px-5 pb-8 md:px-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}
