import { prisma } from "../database/prisma";
import { transactionRepo } from "../database/repositories/transaction.repository";

const DIAMOND_TRANSFER_FEE = 1;
const MONEY_TRANSFER_FEE = 100;

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
  ): Promise<{ success: boolean; error?: string }> {
    const totalCost = amount + DIAMOND_TRANSFER_FEE;
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

    await transactionRepo.create(senderId, "TRANSFER_OUT", "DIAMOND", amount, "transfer", DIAMOND_TRANSFER_FEE, recipientId);
    await transactionRepo.create(recipientId, "TRANSFER_IN", "DIAMOND", amount, "transfer", 0, senderId);

    return { success: true };
  },

  // Pul transfer (komissiya: 100 pul)
  async transferMoney(
    senderId: number,
    recipientId: number,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    const totalCost = amount + MONEY_TRANSFER_FEE;
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

    await transactionRepo.create(senderId, "TRANSFER_OUT", "MONEY", amount, "transfer", MONEY_TRANSFER_FEE, recipientId);
    await transactionRepo.create(recipientId, "TRANSFER_IN", "MONEY", amount, "transfer", 0, senderId);

    return { success: true };
  },

  // O'yin mukofoti
  async giveGameReward(userId: number, winner: string, role: string) {
    let diamonds = 2;
    let money = 500;

    if (winner === "MAFIA") {
      diamonds = 3;
      money = 700;
    } else if (winner === "SOLO") {
      diamonds = 5;
      money = 1000;
    }

    await this.addDiamonds(userId, diamonds, `game_win_${winner}`);
    await this.addMoney(userId, money, `game_win_${winner}`);

    return { diamonds, money };
  },
};
