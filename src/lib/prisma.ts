import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatasourceUrl(): string {
  const configuredUrl = process.env.DATABASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const fallbackSqlitePath = path.join(process.cwd(), "prisma", "dev.db");
  return `file:${fallbackSqlitePath}`;
}

const datasourceUrl = resolveDatasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: datasourceUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
