import { prisma } from "../database/prisma";
import { Role } from "@prisma/client";

// Narx kalitlari — bosh admin buyruqlar orqali bularni o'zgartira oladi
export const PRICE_KEYS = {
  // Dokon (💎 olmosda)
  SHIELD: "price_shield",                   // Himoya (50💎)
  DOCUMENT: "price_document",               // Hujjat (30💎)
  HERO_CREATE: "price_hero_create",         // Geroy yaratish (100💎)
  VIP_MONTH: "price_vip_month",             // VIP 1 oy (100💎)

  // Sandiq (💰 pulda)
  CHEST_BASIC: "price_chest_basic",         // Oddiy sandiq (10000💰)
  CHEST_SILVER: "price_chest_silver",
  CHEST_GOLD: "price_chest_gold",

  // Geroy ball (💎 olmosda)
  HERO_POINTS_1000: "price_hero_points_1000",   // 1000 ball = 100💎
  HERO_PROTECTION_REFRESH: "price_hero_prot",    // Himoyani yangilash
  HERO_CHARGE: "price_hero_charge",              // Zaryadlash

  // Transfer komissiyalari
  FEE_DIAMOND_TRANSFER: "fee_diamond",
  FEE_MONEY_TRANSFER: "fee_money",
} as const;

// Aktiv rol narxi har rol uchun alohida (💰 pulda)
export function rolePriceKey(role: Role): string {
  return `price_role_${role}`;
}

// Default narxlar
const DEFAULTS: Record<string, number> = {
  [PRICE_KEYS.SHIELD]: 50,
  [PRICE_KEYS.DOCUMENT]: 30,
  [PRICE_KEYS.HERO_CREATE]: 100,
  [PRICE_KEYS.VIP_MONTH]: 100,
  [PRICE_KEYS.CHEST_BASIC]: 10000,
  [PRICE_KEYS.CHEST_SILVER]: 25000,
  [PRICE_KEYS.CHEST_GOLD]: 50000,
  [PRICE_KEYS.HERO_POINTS_1000]: 100,
  [PRICE_KEYS.HERO_PROTECTION_REFRESH]: 50,
  [PRICE_KEYS.HERO_CHARGE]: 20,
  [PRICE_KEYS.FEE_DIAMOND_TRANSFER]: 1,
  [PRICE_KEYS.FEE_MONEY_TRANSFER]: 100,
  // Rollar
  price_role_SNIPER: 400,
  price_role_MINER: 300,
  price_role_SHERIFF: 400,
  price_role_DON: 400,
  price_role_LAB: 400,
  price_role_WARLOCK: 400,
  price_role_ARCHER: 400,
  price_role_KAMIKAZE: 400,
  price_role_ROBBER: 400,
  price_role_PROFESSOR: 400,
  price_role_MAFIA: 400,
  price_role_KILLER: 400,
  price_role_SERGEANT: 300,
  price_role_HOOKER: 400,
  price_role_TRAMP: 350,
  price_role_LAWYER: 350,
  price_role_DOCTOR: 350,
  price_role_CIVILIAN: 300,
  price_role_SPY: 400,
  price_role_TRAITOR: 400,
  price_role_SANTA: 300,
  price_role_SNOWBOY: 300,
};

// Cache — DB'ga har safar borish emas
const cache = new Map<string, number>();

async function loadFromDb(key: string): Promise<number> {
  const cfg = await prisma.config.findUnique({ where: { key } });
  if (cfg && cfg.value) {
    const n = parseInt(cfg.value);
    if (!isNaN(n)) return n;
  }
  return DEFAULTS[key] ?? 0;
}

export const pricingService = {
  async get(key: string): Promise<number> {
    if (cache.has(key)) return cache.get(key)!;
    const val = await loadFromDb(key);
    cache.set(key, val);
    return val;
  },

  async set(key: string, value: number): Promise<void> {
    await prisma.config.upsert({
      where: { key },
      update: { value: value.toString() },
      create: { key, value: value.toString() },
    });
    cache.set(key, value);
  },

  async getAll(): Promise<Record<string, number>> {
    const rows = await prisma.config.findMany();
    const result: Record<string, number> = { ...DEFAULTS };
    for (const row of rows) {
      const n = parseInt(row.value);
      if (!isNaN(n)) result[row.key] = n;
    }
    return result;
  },

  // Cache'ni tozalash (admin narx o'zgartirgandan keyin)
  clearCache(): void {
    cache.clear();
  },
};
