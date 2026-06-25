export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import ProjectForm from "@/components/admin/ProjectForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!await requireAdmin()) {
    redirect("/logowanie");
  }

  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <div>
      <Link
        href="/admin/projekty"
        className="flex items-center gap-1 text-sm text-charcoal/50 hover:text-charcoal mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        Powrót do projektów
      </Link>
      <h1 className="font-serif text-3xl text-espresso mb-8">Edytuj projekt</h1>
      <ProjectForm
        project={{
          id: project.id,
          title: project.title,
          description: project.description,
          images: project.images,
          order: project.order,
          active: project.active,
        }}
      />
    </div>
  );
}
