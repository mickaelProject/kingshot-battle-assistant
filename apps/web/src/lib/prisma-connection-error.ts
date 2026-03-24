import { Prisma } from "@prisma/client";

/** True when Prisma cannot reach PostgreSQL (dev overlay / P1001 / init errors). */
export function isPrismaConnectionError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P1001"
  ) {
    return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  return /can't reach database|Can't reach database|database server/i.test(msg);
}
