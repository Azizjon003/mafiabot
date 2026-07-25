import { prisma } from "../database/prisma";
import { economyService } from "./economy.service";
import { pricingService, PRICE_KEYS } from "./pricing.service";

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
    const cost = await pricingService.get(PRICE_KEYS.VIP_MONTH);
    const currency = await pricingService.getCurrency(PRICE_KEYS.VIP_MONTH);
    const canSpend = currency === "diamond"
      ? await economyService.spendDiamonds(userId, cost, "vip_purchase")
      : await economyService.spendMoney(userId, cost, "vip_purchase");
    if (!canSpend) {
      const sym = currency === "diamond" ? "💎" : "💰";
      return { success: false, error: `Yetarli ${currency === "diamond" ? "olmosigiz" : "pulingiz"} yo'q! (${cost}${sym} kerak)` };
    }

    // Mavjud VIP muddatini uzaytirish (qayta ustiga yozmaslik).
    // Agar kelajakdagi vipExpiresAt bo'lsa: yangi muddat = max(now, joriy) + 30 kun.
    const now = new Date();
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { vipExpiresAt: true },
    });
    const base =
      current?.vipExpiresAt && current.vipExpiresAt > now
        ? current.vipExpiresAt
        : now;
    const expiresAt = new Date(base);
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
