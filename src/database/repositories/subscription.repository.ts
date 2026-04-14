import { prisma } from "../prisma";

export const subscriptionRepo = {
  // Obuna bor mi
  async exists(userId: number, chatTelegramId: bigint): Promise<boolean> {
    const sub = await prisma.nextGameSubscription.findUnique({
      where: { userId_chatTelegramId: { userId, chatTelegramId } },
    });
    return !!sub;
  },

  // Obuna qo'shish (idempotent)
  async add(userId: number, chatTelegramId: bigint) {
    return prisma.nextGameSubscription.upsert({
      where: { userId_chatTelegramId: { userId, chatTelegramId } },
      update: {},
      create: { userId, chatTelegramId },
    });
  },

  // Obunadan chiqish
  async remove(userId: number, chatTelegramId: bigint): Promise<boolean> {
    try {
      await prisma.nextGameSubscription.delete({
        where: { userId_chatTelegramId: { userId, chatTelegramId } },
      });
      return true;
    } catch {
      return false; // Obuna yo'q edi
    }
  },

  // User uchun barcha obunalar ro'yxati
  async listForUser(userId: number) {
    return prisma.nextGameSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  // Bir guruhdagi barcha obunachilarni olish (userId ro'yxati)
  async listForChat(chatTelegramId: bigint): Promise<number[]> {
    const rows = await prisma.nextGameSubscription.findMany({
      where: { chatTelegramId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  },

  // Bir guruhdagi barcha obunalarni o'chirish (o'yin boshlandi, xabar yuborildi)
  async clearForChat(chatTelegramId: bigint): Promise<number> {
    const result = await prisma.nextGameSubscription.deleteMany({
      where: { chatTelegramId },
    });
    return result.count;
  },
};
