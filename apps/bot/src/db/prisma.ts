import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (process.env.NODE_ENV === "production") {
  void prisma.$connect().then(
    () => console.log("[kingshot:bot] Prisma connecté à PostgreSQL."),
    (err) =>
      console.error("[kingshot:bot] Prisma $connect a échoué :", err),
  );
}
