import { prisma } from "../database/prisma";
import { economyService } from "./economy.service";

const VIP_COST_DIAMONDS = 100;
const VIP_DURATION_DAYS = 30;

export const vipService = {
  async isVip(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isVip: true, vipExpiresAt: true },
    });
    if (!user || !user.isVip) return false;
    if (user.vipExpiresAt && user.vipExpiresAt < new Date()) {
      // VIP muddati tugagan — o'chirish
      await prisma.user.update({
        where: { id: userId },
        data: { isVip: false, vipExpiresAt: null },
      });
      return false;
    }
    return true;
  },

  async buyVip(userId: number): Promise<{ success: boolean; error?: string; expiresAt?: Date }> {
    const canSpend = await economyService.spendDiamonds(userId, VIP_COST_DIAMONDS, "vip_purchase");
    if (!canSpend) {
      return { success: false, error: `Yetarli olmosigiz yo'q! (${VIP_COST_DIAMONDS}💎 kerak)` };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + VIP_DURATION_DAYS);

    await prisma.user.update({
      where: { id: userId },
      data: { isVip: true, vipExpiresAt: expiresAt },
    });

    return { success: true, expiresAt };
  },

  async getVipInfo(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isVip: true, vipExpiresAt: true },
    });
    return user;
  },
};
