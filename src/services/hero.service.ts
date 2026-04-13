import { heroRepo } from "../database/repositories/hero.repository";
import { economyService } from "./economy.service";
import { pricingService, PRICE_KEYS } from "./pricing.service";

export const HERO_MAX_LEVEL = 10;

// Keyingi darajaga kerakli ball
function pointsForNextLevel(level: number): number {
  return level * 1000 + level * 100; // 1100, 2200, 3300...
}

// Daraja bo'yicha kuch oralig'i (lvl 1: 40-46, lvl 10: 94-100)
export function powerForLevel(level: number): { min: number; max: number } {
  const min = 40 + (level - 1) * 6;
  const max = 46 + (level - 1) * 6;
  return { min: Math.min(min, 94), max: Math.min(max, 100) };
}

// Daraja bo'yicha max himoya (lvl 1: 30, lvl 5: 50, lvl 10: 100)
// Linear formula: 30 + (level-1) * 70/9
export function maxProtectionForLevel(level: number): number {
  const value = 30 + Math.round((level - 1) * 70 / 9);
  return Math.min(100, value);
}

export const heroService = {
  async getOrNull(userId: number) {
    return heroRepo.findByUser(userId);
  },

  async create(userId: number): Promise<{ success: boolean; error?: string }> {
    const existing = await heroRepo.findByUser(userId);
    if (existing) return { success: false, error: "Sizda allaqachon Geroy bor!" };

    const cost = await pricingService.get(PRICE_KEYS.HERO_CREATE);
    const currency = await pricingService.getCurrency(PRICE_KEYS.HERO_CREATE);
    const spent = currency === "diamond"
      ? await economyService.spendDiamonds(userId, cost, "hero_create")
      : await economyService.spendMoney(userId, cost, "hero_create");
    if (!spent) {
      const sym = currency === "diamond" ? "💎" : "💰";
      return { success: false, error: `Yetarli ${currency === "diamond" ? "olmosingiz" : "pulingiz"} yo'q! (${cost}${sym} kerak)` };
    }

    await heroRepo.create(userId);
    const { inventoryRepo } = await import("../database/repositories/inventory.repository");
    await inventoryRepo.setUseFlag(userId, "hero", true);
    return { success: true };
  },

  async rename(userId: number, name: string): Promise<{ success: boolean; error?: string }> {
    if (!name || name.length < 2 || name.length > 20) {
      return { success: false, error: "Ism 2-20 belgi orasida bo'lishi kerak" };
    }
    const cost = await pricingService.get(PRICE_KEYS.HERO_RENAME);
    if (cost > 0) {
      const currency = await pricingService.getCurrency(PRICE_KEYS.HERO_RENAME);
      const spent = currency === "diamond"
        ? await economyService.spendDiamonds(userId, cost, "hero_rename")
        : await economyService.spendMoney(userId, cost, "hero_rename");
      if (!spent) {
        const sym = currency === "diamond" ? "💎" : "💰";
        return { success: false, error: `Yetarli ${currency === "diamond" ? "olmosingiz" : "pulingiz"} yo'q! (${cost}${sym})` };
      }
    }
    await heroRepo.rename(userId, name);
    return { success: true };
  },

  async buyPoints(userId: number): Promise<{ success: boolean; error?: string; gained?: number }> {
    const cost = await pricingService.get(PRICE_KEYS.HERO_POINTS_1000);
    const currency = await pricingService.getCurrency(PRICE_KEYS.HERO_POINTS_1000);
    const spent = currency === "diamond"
      ? await economyService.spendDiamonds(userId, cost, "hero_points")
      : await economyService.spendMoney(userId, cost, "hero_points");
    if (!spent) {
      const sym = currency === "diamond" ? "💎" : "💰";
      return { success: false, error: `Yetarli ${currency === "diamond" ? "olmosingiz" : "pulingiz"} yo'q! (${cost}${sym})` };
    }

    await heroRepo.addPoints(userId, 1000);
    await this.maybeLevelUp(userId);
    return { success: true, gained: 1000 };
  },

  async refreshProtection(userId: number): Promise<{ success: boolean; error?: string }> {
    const hero = await heroRepo.findByUser(userId);
    if (!hero) return { success: false, error: "Sizda Geroy yo'q!" };

    const cost = await pricingService.get(PRICE_KEYS.HERO_PROTECTION_REFRESH);
    const currency = await pricingService.getCurrency(PRICE_KEYS.HERO_PROTECTION_REFRESH);
    const spent = currency === "diamond"
      ? await economyService.spendDiamonds(userId, cost, "hero_protection")
      : await economyService.spendMoney(userId, cost, "hero_protection");
    if (!spent) {
      const sym = currency === "diamond" ? "💎" : "💰";
      return { success: false, error: `Yetarli ${currency === "diamond" ? "olmosingiz" : "pulingiz"} yo'q! (${cost}${sym})` };
    }

    const max = maxProtectionForLevel(hero.level);
    await heroRepo.refreshProtection(userId, max);
    return { success: true };
  },

  async charge(userId: number): Promise<{ success: boolean; error?: string }> {
    const cost = await pricingService.get(PRICE_KEYS.HERO_CHARGE);
    const currency = await pricingService.getCurrency(PRICE_KEYS.HERO_CHARGE);
    const spent = currency === "diamond"
      ? await economyService.spendDiamonds(userId, cost, "hero_charge")
      : await economyService.spendMoney(userId, cost, "hero_charge");
    if (!spent) {
      const sym = currency === "diamond" ? "💎" : "💰";
      return { success: false, error: `Yetarli ${currency === "diamond" ? "olmosingiz" : "pulingiz"} yo'q! (${cost}${sym})` };
    }

    await heroRepo.addCharge(userId, 1);
    return { success: true };
  },

  // Loop — agar hero bir nechta darajaga oshishi mumkin bo'lsa (max 10)
  async maybeLevelUp(userId: number): Promise<number> {
    let levelsGained = 0;
    while (true) {
      const hero = await heroRepo.findByUser(userId);
      if (!hero) break;
      if (hero.level >= HERO_MAX_LEVEL) break; // Cap

      const needed = pointsForNextLevel(hero.level);
      if (hero.points >= needed) {
        const newLevel = hero.level + 1;
        const newPower = powerForLevel(newLevel);
        const newMaxProt = maxProtectionForLevel(newLevel);
        await heroRepo.applyLevelUp(userId, needed, newPower.min, newPower.max, newMaxProt);
        levelsGained++;
      } else {
        break;
      }
    }
    return levelsGained;
  },

  // O'yinda yutganda ball berish (dinamik)
  async addPointsForWin(userId: number, winner: string): Promise<void> {
    const hero = await heroRepo.findByUser(userId);
    if (!hero) return;

    let key: string = PRICE_KEYS.REWARD_HERO_POINTS_TOWN;
    if (winner === "MAFIA") key = PRICE_KEYS.REWARD_HERO_POINTS_MAFIA;
    if (winner === "SOLO") key = PRICE_KEYS.REWARD_HERO_POINTS_SOLO;

    const points = await pricingService.get(key);
    if (points > 0) {
      await heroRepo.addPoints(userId, points);
      await this.maybeLevelUp(userId);
    }
  },

  getNeededPoints(level: number): number {
    return pointsForNextLevel(level);
  },

  // Hero hujum qilishi mumkin va shu hujum kuchi
  async getAttackInfo(userId: number): Promise<{ canAttack: boolean; power: number; charges: number; error?: string }> {
    const hero = await heroRepo.findByUser(userId);
    if (!hero) return { canAttack: false, power: 0, charges: 0, error: "Sizda Geroy yo'q!" };
    if (hero.charge < 1) return { canAttack: false, power: 0, charges: 0, error: "Zaryad yetmaydi!" };

    const power = Math.floor(Math.random() * (hero.powerMax - hero.powerMin + 1)) + hero.powerMin;
    return { canAttack: true, power, charges: hero.charge };
  },

  // Hujumdan keyin zaryadni kamaytirish
  async consumeCharge(userId: number): Promise<void> {
    await heroRepo.decrementCharge(userId, 1);
  },

};
