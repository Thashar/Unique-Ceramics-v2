export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import ProjectForm from "@/components/admin/ProjectForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewProjectPage() {
  if (!await requireAdmin()) {
    redirect("/logowanie");
  }

  return (
    <div>
      <Link
        href="/admin/projekty"
        className="flex items-center gap-1 text-sm text-charcoal/50 hover:text-charcoal mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        Powrót do projektów
      </Link>
      <h1 className="font-serif text-3xl text-espresso mb-8">Nowy projekt</h1>
      <ProjectForm />
    </div>
  );
}
