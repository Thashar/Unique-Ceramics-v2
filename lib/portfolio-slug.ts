/**
 * Adresy stron projektów portfolio (moduł neutralny, bez bazy).
 *
 * `Project` nie ma w bazie kolumny `slug`, a dołożenie jej wymaga ręcznej migracji
 * na Supabase – do czasu jej wykonania zapytania o projekty padałyby i całe
 * portfolio przestałoby się renderować. Dlatego slug **wyliczamy z tytułu**
 * na podstawie całej (krótkiej, cachowanej) listy projektów: ta sama lista daje
 * zawsze ten sam adres, a kolizje tytułów rozstrzyga kolejność z panelu.
 *
 * Skutek uboczny: zmiana tytułu zmienia adres. Stare linki nie umierają –
 * `findProjectBySlug` przyjmuje też `id` projektu.
 */

/** Minimum, którego potrzebuje ten moduł – nie ciągnie typu z `lib/portfolio.ts` (Prisma). */
export type SluggableProject = { id: string; title: string };

/** Tytuł → część adresu. Ta sama zasada co przy slugach produktów w panelu. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Slug dla każdego projektu z listy. Powtórzony tytuł dostaje kolejny numer
 * (`waza`, `waza-2`), a projekt bez sensownego tytułu – `projekt`.
 */
export function projectSlugs(projects: SluggableProject[]): Map<string, string> {
  const used = new Map<string, number>();
  const out = new Map<string, string>();

  for (const project of projects) {
    const base = slugifyTitle(project.title) || "projekt";
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    out.set(project.id, seen === 0 ? base : `${base}-${seen + 1}`);
  }
  return out;
}

/** Slug pojedynczego projektu w kontekście całej listy. */
export function projectSlug(projects: SluggableProject[], id: string): string {
  return projectSlugs(projects).get(id) ?? id;
}

export function projectPath(slug: string): string {
  return `/moje-projekty/${slug}`;
}

/**
 * Projekt spod adresu. Najpierw po wyliczonym slugu, potem po `id` –
 * dzięki temu link skopiowany przed zmianą tytułu nadal dokądś prowadzi.
 */
export function findProjectBySlug<T extends SluggableProject>(
  projects: T[],
  slug: string,
): T | null {
  const slugs = projectSlugs(projects);
  const bySlug = projects.find((p) => slugs.get(p.id) === slug);
  if (bySlug) return bySlug;
  return projects.find((p) => p.id === slug) ?? null;
}
