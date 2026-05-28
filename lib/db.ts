import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildUrl() {
  let url = process.env.DATABASE_URL ?? "";
  const sep = url.includes("?") ? "&" : "?";
  // connection_limit=1 zawsze — jeden klient Prisma na instancję serverless
  if (!url.includes("connection_limit=")) url += `${sep}connection_limit=1`;
  if (!url.includes("pool_timeout="))    url += "&pool_timeout=10";
  if (!url.includes("connect_timeout=")) url += "&connect_timeout=10";
  return url;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: { db: { url: buildUrl() } },
  });

if (!globalForPrisma.prisma) globalForPrisma.prisma = db;
