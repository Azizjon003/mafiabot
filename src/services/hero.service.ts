import { heroRepo } from "../database/repositories/hero.repository";
import { economyService } from "./economy.service";
import { pricingService, PRICE_KEYS } from "./pricing.service";

// Keyingi darajaga kerakli ball
function pointsForNextLevel(level: number): number {
  return level * 1000 + level * 100; // 1100, 2200, 3300...
}

export const heroService = {
  async getOrNull(userId: number) {
    return heroRepo.findByUser(userId);
  },

  async create(userId: number): Promise<{ success: boolean; error?: string }> {
    const existing = await heroRepo.findByUser(userId);
    if (existing) return { success: false, error: "Sizda allaqachon Geroy bor!" };

    const cost = await pricingService.get(PRICE_KEYS.HERO_CREATE);
    const spent = await economyService.spendDiamonds(userId, cost, "hero_create");
    if (!spent) return { success: false, error: `Yetarli olmosingiz yo'q! (${cost}💎 kerak)` };

    await heroRepo.create(userId);
    // Geroy doimiy — har o'yinda foydalanish flag'ini default yoqib qo'yamiz
    const { inventoryRepo } = await import("../database/repositories/inventory.repository");
    await inventoryRepo.setUseFlag(userId, "hero", true);
    return { success: true };
  },

  async rename(userId: number, name: string): Promise<{ success: boolean; error?: string }> {
    if (!name || name.length < 2 || name.length > 20) {
      return { success: false, error: "Ism 2-20 belgi orasida bo'lishi kerak" };
    }
    await heroRepo.rename(userId, name);
    return { success: true };
  },

  async buyPoints(userId: number): Promise<{ success: boolean; error?: string; gained?: number }> {
    const cost = await pricingService.get(PRICE_KEYS.HERO_POINTS_1000);
    const spent = await economyService.spendDiamonds(userId, cost, "hero_points");
    if (!spent) return { success: false, error: `Yetarli olmosingiz yo'q! (${cost}💎)` };

    await heroRepo.addPoints(userId, 1000);
    await this.maybeLevelUp(userId);
    return { success: true, gained: 1000 };
  },

  async refreshProtection(userId: number): Promise<{ success: boolean; error?: string }> {
    const cost = await pricingService.get(PRICE_KEYS.HERO_PROTECTION_REFRESH);
    const spent = await economyService.spendDiamonds(userId, cost, "hero_protection");
    if (!spent) return { success: false, error: `Yetarli olmosingiz yo'q! (${cost}💎)` };

    await heroRepo.refreshProtection(userId);
    return { success: true };
  },

  async charge(userId: number): Promise<{ success: boolean; error?: string }> {
    const cost = await pricingService.get(PRICE_KEYS.HERO_CHARGE);
    const spent = await economyService.spendDiamonds(userId, cost, "hero_charge");
    if (!spent) return { success: false, error: `Yetarli olmosingiz yo'q! (${cost}💎)` };

    await heroRepo.addCharge(userId, 1);
    return { success: true };
  },

  // Loop — agar hero bir nechta darajaga oshishi mumkin bo'lsa
  async maybeLevelUp(userId: number): Promise<number> {
    let levelsGained = 0;
    while (true) {
      const hero = await heroRepo.findByUser(userId);
      if (!hero) break;
      const needed = pointsForNextLevel(hero.level);
      if (hero.points >= needed) {
        await heroRepo.levelUp(userId, needed);
        levelsGained++;
      } else {
        break;
      }
    }
    return levelsGained;
  },

  // O'yinda yutganda ball berish
  async addPointsForWin(userId: number, winner: string): Promise<void> {
    const hero = await heroRepo.findByUser(userId);
    if (!hero) return;

    let points = 100; // Tinch axoli
    if (winner === "MAFIA") points = 150;
    if (winner === "SOLO") points = 200;

    await heroRepo.addPoints(userId, points);
    await this.maybeLevelUp(userId);
  },

  getNeededPoints(level: number): number {
    return pointsForNextLevel(level);
  },
};
