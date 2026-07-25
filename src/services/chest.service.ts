import { prisma } from "../database/prisma";
import { economyService } from "./economy.service";
import { vipService } from "./vip.service";
import { pricingService, PRICE_KEYS } from "./pricing.service";

interface ChestReward {
  diamonds: number;
  money: number;
  hero: boolean;
}

export const chestService = {
  async canOpenChest(userId: number): Promise<{ canOpen: boolean; reason?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isVip: true, vipExpiresAt: true, lastChestOpenedAt: true, money: true, diamonds: true },
    });
    if (!user) return { canOpen: false, reason: "Foydalanuvchi topilmadi!" };

    const cost = await pricingService.get(PRICE_KEYS.CHEST_BASIC);
    const currency = await pricingService.getCurrency(PRICE_KEYS.CHEST_BASIC);
    const balance = currency === "diamond" ? user.diamonds : user.money;
    const sym = currency === "diamond" ? "💎" : "💰";
    if (balance < cost) {
      return { canOpen: false, reason: `Yetarli ${currency === "diamond" ? "olmosingiz" : "pulingiz"} yo'q! (${cost}${sym} kerak)` };
    }

    const isVip = await vipService.isVip(userId);
    if (!isVip && user.lastChestOpenedAt) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      if (user.lastChestOpenedAt > oneMonthAgo) {
        return { canOpen: false, reason: "Oyiga 1 marta ochish mumkin! ⭐️ VIP bo'lsangiz cheksiz!" };
      }
    }

    return { canOpen: true };
  },

  async openChest(userId: number): Promise<{ success: boolean; reward?: ChestReward; error?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastChestOpenedAt: true },
    });
    if (!user) return { success: false, error: "Foydalanuvchi topilmadi!" };

    const cost = await pricingService.get(PRICE_KEYS.CHEST_BASIC);
    const currency = await pricingService.getCurrency(PRICE_KEYS.CHEST_BASIC);

    const isVip = await vipService.isVip(userId);
    const now = new Date();
    const prevLastOpened = user.lastChestOpenedAt;
    let claimedCooldown = false;

    // Oyiga 1 marta cheklovi — atomik "claim" (VIP uchun cheksiz).
    // Bir vaqtda ikkita /openchest kelsa faqat bittasi count===1 oladi.
    if (!isVip) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const gate = await prisma.user.updateMany({
        where: {
          id: userId,
          OR: [
            { lastChestOpenedAt: null },
            { lastChestOpenedAt: { lt: oneMonthAgo } },
          ],
        },
        data: { lastChestOpenedAt: now },
      });
      if (gate.count === 0) {
        return { success: false, error: "Oyiga 1 marta ochish mumkin! ⭐️ VIP bo'lsangiz cheksiz!" };
      }
      claimedCooldown = true;
    }

    // To'lov (atomik spend)
    const spent = currency === "diamond"
      ? await economyService.spendDiamonds(userId, cost, "chest_open")
      : await economyService.spendMoney(userId, cost, "chest_open");
    if (!spent) {
      // Spend muvaffaqiyatsiz — cooldown "claim"ni ortga qaytaramiz
      if (claimedCooldown) {
        await prisma.user.update({
          where: { id: userId },
          data: { lastChestOpenedAt: prevLastOpened },
        });
      }
      const sym = currency === "diamond" ? "💎" : "💰";
      return { success: false, error: `Yetarli ${currency === "diamond" ? "olmosingiz" : "pulingiz"} yo'q! (${cost}${sym} kerak)` };
    }

    // Random reward
    const reward = this.generateReward();

    // Rewardni berish
    if (reward.diamonds > 0) {
      await economyService.addDiamonds(userId, reward.diamonds, "chest_reward");
    }
    if (reward.money > 0) {
      await economyService.addMoney(userId, reward.money, "chest_reward");
    }
    if (reward.hero) {
      await prisma.user.update({
        where: { id: userId },
        data: { hasHero: true },
      });
    }

    // Sandiq yozish
    await prisma.chest.create({
      data: {
        userId,
        type: "BASIC",
        reward: JSON.stringify(reward),
        openedAt: new Date(),
      },
    });

    // Oxirgi ochilgan vaqtni yangilash.
    // Non-VIP uchun yuqoridagi atomik "gate" allaqachon o'rnatgan; VIP uchun bu yerda.
    if (isVip) {
      await prisma.user.update({
        where: { id: userId },
        data: { lastChestOpenedAt: now },
      });
    }

    return { success: true, reward };
  },

  generateReward(): ChestReward {
    const rand = Math.random() * 100;
    const reward: ChestReward = { diamonds: 0, money: 0, hero: false };

    if (rand < 40) {
      // 40% — 1-5 olmos
      reward.diamonds = Math.floor(Math.random() * 5) + 1;
    } else if (rand < 65) {
      // 25% — 5-15 olmos
      reward.diamonds = Math.floor(Math.random() * 11) + 5;
    } else if (rand < 75) {
      // 10% — 15-50 olmos
      reward.diamonds = Math.floor(Math.random() * 36) + 15;
    } else if (rand < 95) {
      // 20% — 1000-5000 pul
      reward.money = Math.floor(Math.random() * 4001) + 1000;
    } else {
      // 5% — Geroy!
      reward.hero = true;
    }

    return reward;
  },
};
