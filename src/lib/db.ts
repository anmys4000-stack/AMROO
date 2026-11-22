import { PrismaClient } from "@prisma/client";

// اتصال واحد بقاعدة البيانات يُعاد استخدامه أثناء التطوير لتجنّب فتح اتصالات كثيرة.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
