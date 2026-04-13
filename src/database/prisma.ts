import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? [{ emit: "event", level: "query" }]
      : [],
});

if (process.env.NODE_ENV === "development") {
  prisma.$on("query" as never, (e: any) => {
    logger.debug({ query: e.query, duration: e.duration }, "Prisma query");
  });
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("PostgreSQL ga ulanish muvaffaqiyatli!");
  } catch (error) {
    logger.error(error, "PostgreSQL ga ulanishda xatolik!");
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("PostgreSQL dan uzildi");
}
