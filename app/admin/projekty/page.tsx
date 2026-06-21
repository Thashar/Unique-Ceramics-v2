export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Plus, Pencil } from "lucide-react";

export default async function AdminProjectsPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/logowanie");
  }

  const projects = await db.project.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl text-espresso">Projekty</h1>
        <Link
          href="/admin/projekty/nowy"
          className="flex items-center gap-2 px-5 py-2.5 bg-espresso text-warm-white text-sm tracking-widest uppercase hover:bg-clay transition-colors"
        >
          <Plus size={16} />
          Dodaj projekt
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24 text-charcoal/40">
          <p className="font-serif text-2xl text-espresso mb-2">Brak projektów</p>
          <p className="text-sm">Dodaj pierwszy projekt klikając przycisk powyżej.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/admin/projekty/${project.id}`}
              className="flex items-center gap-4 p-4 bg-warm-white border border-sand hover:border-terracotta transition-colors"
            >
              <div className="relative w-16 h-12 flex-shrink-0 bg-mist overflow-hidden rounded-sm">
                {project.images[0] && (
                  <Image
                    src={project.images[0]}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="64px"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-espresso truncate">{project.title}</p>
                <p className="text-xs text-charcoal/40 mt-0.5">
                  {project.images.length}{" "}
                  {project.images.length === 1
                    ? "zdjęcie"
                    : project.images.length < 5
                    ? "zdjęcia"
                    : "zdjęć"}{" "}
                  · kolejność: {project.order}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-sm ${
                    project.active
                      ? "bg-green-100 text-green-700"
                      : "bg-sand text-charcoal/50"
                  }`}
                >
                  {project.active ? "Widoczny" : "Ukryty"}
                </span>
                <Pencil size={14} className="text-charcoal/30" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
