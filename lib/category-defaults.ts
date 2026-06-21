export type Category = { id: string; slug: string; label: string; order: number };

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "_kubki",   slug: "kubki",   label: "Kubki",   order: 0 },
  { id: "_miski",   slug: "miski",   label: "Miski",   order: 1 },
  { id: "_wazy",    slug: "wazy",    label: "Wazy",    order: 2 },
  { id: "_talerze", slug: "talerze", label: "Talerze", order: 3 },
  { id: "_inne",    slug: "inne",    label: "Inne",    order: 4 },
];
