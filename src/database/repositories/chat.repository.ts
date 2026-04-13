import { prisma } from "../prisma";

export const chatRepo = {
  async findOrCreate(telegramId: bigint, title?: string, type: string = "supergroup") {
    return prisma.chat.upsert({
      where: { telegramId },
      update: { title, updatedAt: new Date() },
      create: { telegramId, title, type },
      include: { settings: true },
    });
  },

  async getSettings(chatId: number) {
    let settings = await prisma.chatSettings.findUnique({
      where: { chatId },
    });

    if (!settings) {
      settings = await prisma.chatSettings.create({
        data: { chatId },
      });
    }

    return settings;
  },

  async updateSettings(chatId: number, data: Record<string, any>) {
    return prisma.chatSettings.upsert({
      where: { chatId },
      update: data,
      create: { chatId, ...data },
    });
  },
};
