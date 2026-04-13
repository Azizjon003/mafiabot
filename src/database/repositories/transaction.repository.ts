import { TransactionType, Currency } from "@prisma/client";
import { prisma } from "../prisma";

export const transactionRepo = {
  async create(
    userId: number,
    type: TransactionType,
    currency: Currency,
    amount: number,
    reason: string,
    fee: number = 0,
    relatedId?: number
  ) {
    return prisma.transaction.create({
      data: { userId, type, currency, amount, fee, reason, relatedId },
    });
  },

  async getUserHistory(userId: number, limit: number = 20) {
    return prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
