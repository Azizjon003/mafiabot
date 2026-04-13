import { prisma } from "../prisma";

export const userRepo = {
  async findOrCreate(telegramId: bigint, firstName: string, username?: string, lastName?: string) {
    return prisma.user.upsert({
      where: { telegramId },
      update: { firstName, username, lastName, updatedAt: new Date() },
      create: { telegramId, firstName, username, lastName },
      include: { stats: true },
    });
  },

  async findByTelegramId(telegramId: bigint) {
    return prisma.user.findUnique({
      where: { telegramId },
      include: { stats: true },
    });
  },

async ban(telegramId: bigint) {
    return prisma.user.update({
      where: { telegramId },
      data: { isBanned: true },
    });
  },

  async unban(telegramId: bigint) {
    return prisma.user.update({
      where: { telegramId },
      data: { isBanned: false },
    });
  },
};
