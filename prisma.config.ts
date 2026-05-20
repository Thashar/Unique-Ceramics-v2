import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Transaction pooler (port 6543) — dla Vercel serverless
    url: process.env.DATABASE_URL!,
    // Direct connection (port 5432) — dla prisma db push / migrate
    directUrl: process.env.DIRECT_URL,
  },
});
