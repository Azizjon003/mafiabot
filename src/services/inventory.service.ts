import { Role } from "@prisma/client";
import { prisma } from "../database/prisma";
import { inventoryRepo } from "../database/repositories/inventory.repository";
import { economyService } from "./economy.service";
import { pricingService, PRICE_KEYS, rolePriceKey } from "./pricing.service";

export const inventoryService = {
  // Shield sotib olish — avtomatik keyingi o'yinga yoqiladi
  async buyShield(userId: number): Promise<{ success: boolean; error?: string; price?: number }> {
    const price = await pricingService.get(PRICE_KEYS.SHIELD);
    const currency = await pricingService.getCurrency(PRICE_KEYS.SHIELD);
    const spent = currency === "diamond"
      ? await economyService.spendDiamonds(userId, price, "buy_shield")
      : await economyService.spendMoney(userId, price, "buy_shield");
    if (!spent) {
      const sym = currency === "diamond" ? "💎" : "💰";
      const cur = currency === "diamond" ? "olmosingiz" : "pulingiz";
      return { success: false, error: `Yetarli ${cur} yo'q! (${price}${sym})` };
    }
    await inventoryRepo.addShield(userId, 1);
    await inventoryRepo.setUseFlag(userId, "shield", true);
    return { success: true, price };
  },

  // Document sotib olish — avtomatik yoqiladi
  async buyDocument(userId: number): Promise<{ success: boolean; error?: string; price?: number }> {
    const price = await pricingService.get(PRICE_KEYS.DOCUMENT);
    const currency = await pricingService.getCurrency(PRICE_KEYS.DOCUMENT);
    const spent = currency === "diamond"
      ? await economyService.spendDiamonds(userId, price, "buy_document")
      : await economyService.spendMoney(userId, price, "buy_document");
    if (!spent) {
      const sym = currency === "diamond" ? "💎" : "💰";
      const cur = currency === "diamond" ? "olmosingiz" : "pulingiz";
      return { success: false, error: `Yetarli ${cur} yo'q! (${price}${sym})` };
    }
    await inventoryRepo.addDocument(userId, 1);
    await inventoryRepo.setUseFlag(userId, "document", true);
    return { success: true, price };
  },

  // Aktiv rol sotib olish — valyuta admin paneldan sozlanadi (olmos yoki pul)
  async buyActiveRole(userId: number, role: Role): Promise<{ success: boolean; error?: string; price?: number }> {
    const key = rolePriceKey(role);
    const price = await pricingService.get(key);
    const currency = await pricingService.getCurrency(key);
    const spent = currency === "diamond"
      ? await economyService.spendDiamonds(userId, price, `buy_role_${role}`)
      : await economyService.spendMoney(userId, price, `buy_role_${role}`);
    if (!spent) {
      const sym = currency === "diamond" ? "💎" : "💰";
      const word = currency === "diamond" ? "olmosingiz" : "pulingiz";
      return { success: false, error: `Yetarli ${word} yo'q! (${price}${sym})` };
    }
    await inventoryRepo.setActiveRole(userId, role);
    await inventoryRepo.setUseFlag(userId, "activeRole", true);
    return { success: true, price };
  },

  // Aktiv rolni o'chirish — flag ham reset
  async clearActiveRole(userId: number): Promise<void> {
    await inventoryRepo.setActiveRole(userId, null);
    await inventoryRepo.setUseFlag(userId, "activeRole", false);
  },

  // Foydalanish flag'ini almashtirish (toggle)
  async toggleUseFlag(userId: number, flag: "shield" | "document" | "activeRole" | "hero" | "premiumEmoji"): Promise<{ enabled: boolean; error?: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { enabled: false, error: "User topilmadi" };

    // Tekshirish — kerakli predmet bormi
    if (flag === "shield" && user.shieldCount < 1) {
      return { enabled: false, error: "Sizda Shield yo'q!" };
    }
    if (flag === "document" && user.documentCount < 1) {
      return { enabled: false, error: "Sizda Hujjat yo'q!" };
    }
    if (flag === "activeRole" && !user.activeRole) {
      return { enabled: false, error: "Sizda Aktiv rol yo'q!" };
    }
    if (flag === "hero") {
      const hero = await prisma.hero.findUnique({ where: { userId } });
      if (!hero) return { enabled: false, error: "Sizda Geroy yo'q!" };
    }

    const fieldMap = {
      shield: "useShieldNextGame",
      document: "useDocumentNextGame",
      activeRole: "useActiveRoleNextGame",
      hero: "useHeroNextGame",
      premiumEmoji: "usePremiumEmoji",
    } as const;
    const newValue = !user[fieldMap[flag]];
    await inventoryRepo.setUseFlag(userId, flag, newValue);
    return { enabled: newValue };
  },

  // O'yinga qo'shilishda foydalanish — barcha flag'larni qaytaradi va consume qiladi
  async consumeForGame(userId: number): Promise<{
    shieldUsed: boolean; // 1 o'yin = 1 marta saqlash
    documentUsed: boolean;
    activeRole: Role | null;
    heroUsed: boolean;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { hero: true },
    });
    if (!user) return { shieldUsed: false, documentUsed: false, activeRole: null, heroUsed: false };

    const result = {
      shieldUsed: user.useShieldNextGame && user.shieldCount > 0,
      documentUsed: user.useDocumentNextGame && user.documentCount > 0,
      activeRole: user.useActiveRoleNextGame ? user.activeRole : null,
      heroUsed: user.useHeroNextGame && !!user.hero,
    };

    // Consume — har bir item 1 marta ishlatiladi
    const updates: any = {};
    if (result.shieldUsed) {
      updates.shieldCount = { decrement: 1 };
      updates.useShieldNextGame = false;
    }
    if (result.documentUsed) {
      updates.documentCount = { decrement: 1 };
      updates.useDocumentNextGame = false;
    }
    if (result.activeRole) {
      updates.activeRole = null;
      updates.useActiveRoleNextGame = false;
    }
    // Hero — flag o'chirilmaydi (har o'yinda doimiy ishlatiladi)

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: updates });
    }

    return result;
  },
};
