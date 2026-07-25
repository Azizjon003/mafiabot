import { Currency, ShopCategory } from "@prisma/client";
import { prisma } from "../database/prisma";
import { economyService } from "./economy.service";

export const shopService = {
  async getItems(category?: ShopCategory) {
    return prisma.shopItem.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: { price: "asc" },
    });
  },

  async buyItem(userId: number, itemId: number): Promise<{ success: boolean; error?: string }> {
    const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item || !item.isActive) return { success: false, error: "Bu mahsulot topilmadi!" };

    // Pul yetarlimi
    const spent = item.priceType === "DIAMOND"
      ? await economyService.spendDiamonds(userId, item.price, `shop_${item.name}`)
      : await economyService.spendMoney(userId, item.price, `shop_${item.name}`);

    if (!spent) {
      return { success: false, error: `Yetarli ${item.priceType === "DIAMOND" ? "olmosigiz" : "pulingiz"} yo'q!` };
    }

    // Purchase yozish
    await prisma.purchase.create({
      data: { userId, itemId, quantity: 1 },
    });

    // Maxsus effektlar
    switch (item.category) {
      case "HERO":
        await prisma.user.update({
          where: { id: userId },
          data: { hasHero: true },
        });
        break;
      case "SHIELD":
        await prisma.user.update({
          where: { id: userId },
          data: { hasShield: true },
        });
        break;
      case "VIP":
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await prisma.user.update({
          where: { id: userId },
          data: { isVip: true, vipExpiresAt: expiresAt },
        });
        break;
    }

    return { success: true };
  },

  // Default do'kon itemlarni yaratish (seed)
  async seedDefaultItems() {
    const count = await prisma.shopItem.count();
    if (count > 0) return;

    await prisma.shopItem.createMany({
      data: [
        {
          name: "Geroy",
          description: "O'yinda hujum yoki himoya qo'shimcha kuchi",
          emoji: "🥷",
          category: "HERO",
          priceType: "DIAMOND",
          price: 25,
        },
        {
          name: "Shield",
          description: "O'yinda birinchi o'limdan saqlaydi (1 martalik)",
          emoji: "🛡",
          category: "SHIELD",
          priceType: "DIAMOND",
          price: 10,
        },
        {
          name: "Sandiq",
          description: "Random mukofot oling!",
          emoji: "🗃",
          category: "CHEST",
          priceType: "MONEY",
          price: 2000,
        },
        {
          name: "VIP (1 oy)",
          description: "VIP imtiyozlar: cheksiz sandiq va maxsus badge",
          emoji: "⭐️",
          category: "VIP",
          priceType: "DIAMOND",
          price: 20,
        },
      ],
    });
  },
};
