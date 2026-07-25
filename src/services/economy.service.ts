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

  // Olmos sarflash (atomik — shartli update, poyga xavfsiz)
  async spendDiamonds(userId: number, amount: number, reason: string): Promise<boolean> {
    if (!Number.isFinite(amount) || amount <= 0) return false;

    const res = await prisma.user.updateMany({
      where: { id: userId, diamonds: { gte: amount } },
      data: { diamonds: { decrement: amount } },
    });
    if (res.count === 0) return false;

    await transactionRepo.create(userId, "SPEND", "DIAMOND", amount, reason);
    return true;
  },

  // Pul sarflash (atomik — shartli update, poyga xavfsiz)
  async spendMoney(userId: number, amount: number, reason: string): Promise<boolean> {
    if (!Number.isFinite(amount) || amount <= 0) return false;

    const res = await prisma.user.updateMany({
      where: { id: userId, money: { gte: amount } },
      data: { money: { decrement: amount } },
    });
    if (res.count === 0) return false;

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

    try {
      await prisma.$transaction(async (tx) => {
        // Atomik shartli debit — balans yetarli bo'lmasa count===0 → rollback
        const debit = await tx.user.updateMany({
          where: { id: senderId, diamonds: { gte: totalCost } },
          data: { diamonds: { decrement: totalCost } },
        });
        if (debit.count === 0) {
          throw new Error("INSUFFICIENT");
        }
        await tx.user.update({
          where: { id: recipientId },
          data: { diamonds: { increment: amount } },
        });
      });
    } catch {
      return { success: false, error: "Yetarli olmosigiz yo'q!" };
    }

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

    try {
      await prisma.$transaction(async (tx) => {
        // Atomik shartli debit — balans yetarli bo'lmasa count===0 → rollback
        const debit = await tx.user.updateMany({
          where: { id: senderId, money: { gte: totalCost } },
          data: { money: { decrement: totalCost } },
        });
        if (debit.count === 0) {
          throw new Error("INSUFFICIENT");
        }
        await tx.user.update({
          where: { id: recipientId },
          data: { money: { increment: amount } },
        });
      });
    } catch {
      return { success: false, error: "Yetarli pulingiz yo'q!" };
    }

    await transactionRepo.create(senderId, "TRANSFER_OUT", "MONEY", amount, "transfer", fee, recipientId);
    await transactionRepo.create(recipientId, "TRANSFER_IN", "MONEY", amount, "transfer", 0, senderId);

    return { success: true, fee };
  },

  // O'yin mukofoti — HAR yutuqda beriladi (faktsiya bo'yicha pul + olmos)
  async giveGameReward(userId: number, winner: string, role: string) {
    const { pricingService, PRICE_KEYS } = await import("./pricing.service");

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

    if (diamonds > 0) await this.addDiamonds(userId, diamonds, `game_win_${winner}`);
    if (money > 0) await this.addMoney(userId, money, `game_win_${winner}`);

    return { diamonds, money };
  },
};
