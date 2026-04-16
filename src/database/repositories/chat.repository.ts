import { prisma } from "../prisma";
import { pricingService, PRICE_KEYS } from "../../services/pricing.service";

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
      // Bosh admin belgilagan default vaqtlarni olamiz
      const [reg, night, day, voting, minP, maxP] = await Promise.all([
        pricingService.get(PRICE_KEYS.DEFAULT_REGISTRATION_TIMEOUT),
        pricingService.get(PRICE_KEYS.DEFAULT_NIGHT_TIMEOUT),
        pricingService.get(PRICE_KEYS.DEFAULT_DAY_DISCUSSION_TIMEOUT),
        pricingService.get(PRICE_KEYS.DEFAULT_VOTING_TIMEOUT),
        pricingService.get(PRICE_KEYS.DEFAULT_MIN_PLAYERS),
        pricingService.get(PRICE_KEYS.DEFAULT_MAX_PLAYERS),
      ]);
      settings = await prisma.chatSettings.create({
        data: {
          chatId,
          registrationTimeout: reg,
          nightTimeout: night,
          dayDiscussionTimeout: day,
          votingTimeout: voting,
          minPlayers: minP,
          maxPlayers: maxP,
        },
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
