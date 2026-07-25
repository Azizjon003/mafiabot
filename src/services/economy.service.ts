import { prisma } from "../database/prisma";
import { transactionRepo } from "../database/repositories/transaction.repository";

export const economyService = {
  // Balans olish
  async getBalance(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { diamonds: true, money: true },
    });
    return user || { diamonds: 0, money: 0 };
  },

  // Olmos qo'shish
  async addDiamonds(userId: number, amount: number, reason: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { diamonds: { increment: amount } },
    });
    await transactionRepo.create(userId, "EARN", "DIAMOND", amount, reason);
  },

  // Pul qo'shish
  async addMoney(userId: number, amount: number, reason: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { money: { increment: amount } },
    });
    await transactionRepo.create(userId, "EARN", "MONEY", amount, reason);
  },

  // Olmos sarflash
  async spendDiamonds(userId: number, amount: number, reason: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.diamonds < amount) return false;

    await prisma.user.update({
      where: { id: userId },
      data: { diamonds: { decrement: amount } },
    });
    await transactionRepo.create(userId, "SPEND", "DIAMOND", amount, reason);
    return true;
  },

  // Pul sarflash
  async spendMoney(userId: number, amount: number, reason: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.money < amount) return false;

    await prisma.user.update({
      where: { id: userId },
      data: { money: { decrement: amount } },
    });
    await transactionRepo.create(userId, "SPEND", "MONEY", amount, reason);
    return true;
  },

  // Olmos transfer (komissiya: 1 olmos)
  async transferDiamonds(
    senderId: number,
    recipientId: number,
    amount: number
  ): Promise<{ success: boolean; error?: string; fee?: number }> {
    const { pricingService, PRICE_KEYS } = await import("./pricing.service");
    const fee = await pricingService.get(PRICE_KEYS.FEE_DIAMOND_TRANSFER);
    const totalCost = amount + fee;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });

    if (!sender || sender.diamonds < totalCost) {
      return { success: false, error: "Yetarli olmosigiz yo'q!" };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: senderId },
        data: { diamonds: { decrement: totalCost } },
      }),
      prisma.user.update({
        where: { id: recipientId },
        data: { diamonds: { increment: amount } },
      }),
    ]);

    await transactionRepo.create(senderId, "TRANSFER_OUT", "DIAMOND", amount, "transfer", fee, recipientId);
    await transactionRepo.create(recipientId, "TRANSFER_IN", "DIAMOND", amount, "transfer", 0, senderId);

    return { success: true, fee };
  },

  // Pul transfer (komissiya dinamik)
  async transferMoney(
    senderId: number,
    recipientId: number,
    amount: number
  ): Promise<{ success: boolean; error?: string; fee?: number }> {
    const { pricingService, PRICE_KEYS } = await import("./pricing.service");
    const fee = await pricingService.get(PRICE_KEYS.FEE_MONEY_TRANSFER);
    const totalCost = amount + fee;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });

    if (!sender || sender.money < totalCost) {
      return { success: false, error: "Yetarli pulingiz yo'q!" };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: senderId },
        data: { money: { decrement: totalCost } },
      }),
      prisma.user.update({
        where: { id: recipientId },
        data: { money: { increment: amount } },
      }),
    ]);

    await transactionRepo.create(senderId, "TRANSFER_OUT", "MONEY", amount, "transfer", fee, recipientId);
    await transactionRepo.create(recipientId, "TRANSFER_IN", "MONEY", amount, "transfer", 0, senderId);

    return { success: true, fee };
  },

  // O'yin mukofoti — FAQAT 5, 10, 15, 20... o'yin yutganda beriladi
  async giveGameReward(userId: number, winner: string, role: string) {
    const { pricingService, PRICE_KEYS } = await import("./pricing.service");
    const { statsRepo } = await import("../database/repositories/stats.repository");

    // Foydalanuvchini yutishlar sonini olish
    const stats = await statsRepo.findByUserId(userId);
    if (!stats) return { diamonds: 0, money: 0 };

    const wins = stats.gamesWon;

    // Faqat 5, 10, 15, 20... yutishlarda mukofot beriladi
    if (wins % 5 !== 0) {
      return { diamonds: 0, money: 0 };
    }

    let moneyKey: string = PRICE_KEYS.REWARD_TOWN_MONEY;
    let diamondKey: string = PRICE_KEYS.REWARD_TOWN_DIAMOND;
    if (winner === "MAFIA") {
      moneyKey = PRICE_KEYS.REWARD_MAFIA_MONEY;
      diamondKey = PRICE_KEYS.REWARD_MAFIA_DIAMOND;
    } else if (winner === "SOLO") {
      moneyKey = PRICE_KEYS.REWARD_SOLO_MONEY;
      diamondKey = PRICE_KEYS.REWARD_SOLO_DIAMOND;
    }

    const money = await pricingService.get(moneyKey);
    const diamonds = await pricingService.get(diamondKey);

    if (diamonds > 0) await this.addDiamonds(userId, diamonds, `game_win_${winner}_milestone_${stats.gamesWon}`);
    if (money > 0) await this.addMoney(userId, money, `game_win_${winner}_milestone_${stats.gamesWon}`);

    return { diamonds, money };
  },
};
