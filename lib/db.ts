import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildUrl() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.includes("pgbouncer=true") && !url.includes("connection_limit=")) {
    return `${url}&connection_limit=1&pool_timeout=0`;
  }
  return url;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: { db: { url: buildUrl() } },
  });

globalForPrisma.prisma = db;
