import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-[100svh] bg-warm-white">
      <AdminNav />
      {/* Desktop: offset for sidebar. Mobile: offset for top bar */}
      <main className="md:ml-56 pt-14 md:pt-0 p-5 md:p-8">
        {children}
      </main>
    </div>
  );
}
