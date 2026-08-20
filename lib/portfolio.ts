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

export const getProjects = unstable_cache(
  async (): Promise<Project[]> => {
    try {
      return await withDbRetry(() =>
        db.project.findMany({
          where: { active: true },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        })
      );
    } catch {
      return [];
    }
  },
  ["projects"],
  { tags: ["projects"] }
);

export function revalidatePortfolioPages() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidateTag("projects", "max" as any);
}
