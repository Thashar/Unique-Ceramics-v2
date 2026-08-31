import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";
import { db, withDbRetry } from "@/lib/db";

export type Project = {
  id: string;
  title: string;
  description: string;
  images: string[];
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Odczyt z bazy – **bez** przechwytywania błędu, żeby nieudana próba nie trafiła
 * do cache. Wcześniej fallback `[]` był w środku funkcji cachowanej: jedna chwila
 * niedostępności bazy (np. wyczerpany pooler w trakcie builda) zapisywała pustą
 * listę na stałe, a portfolio zostawało puste do najbliższej edycji w panelu –
 * od kiedy projekty mają własne strony, oznaczało to też 404 na każdej z nich.
 */
const cachedProjects = unstable_cache(
  async (): Promise<Project[]> =>
    withDbRetry(() =>
      db.project.findMany({
        where: { active: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      })
    ),
  ["projects"],
  { tags: ["projects"] }
);

/** Aktywne projekty; przy niedostępnej bazie pusta lista (build ma się udać). */
export async function getProjects(): Promise<Project[]> {
  try {
    return await cachedProjects();
  } catch {
    return [];
  }
}

export function revalidatePortfolioPages() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidateTag("projects", "max" as any);
}
