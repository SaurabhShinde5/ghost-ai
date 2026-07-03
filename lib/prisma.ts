import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaClient } from "@/app/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// The two transports produce structurally different client types (the Accelerate
// extension augments the base client), which would otherwise widen the export to
// a union whose model methods have incompatible signatures. Both are supersets of
// the base `PrismaClient` surface we use, so we normalise the return type to it.
function createPrismaClient(url: string): PrismaClient {
  // Prisma Postgres / Accelerate connection strings use the `prisma+postgres://`
  // protocol and connect over HTTP via the Accelerate engine — no driver adapter.
  if (url.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: url }).$extends(
      withAccelerate(),
    ) as unknown as PrismaClient;
  }

  // Standard Node.js path: connect directly with the `pg` driver adapter.
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient(databaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
