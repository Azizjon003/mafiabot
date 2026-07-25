import { prisma } from "../database/prisma";
import { Role } from "@prisma/client";

// Narx kalitlari — bosh admin buyruqlar orqali bularni o'zgartira oladi
export const PRICE_KEYS = {
  // Dokon (💎 olmosda)
  SHIELD: "price_shield",                        // 50💎
  DOCUMENT: "price_document",                    // 30💎
  HERO_CREATE: "price_hero_create",              // 100💎
  VIP_MONTH: "price_vip_month",                  // 100💎
  HERO_POINTS_1000: "price_hero_points_1000",    // 100💎 → 1000 ball
  HERO_PROTECTION_REFRESH: "price_hero_prot",    // 100💎

  // Pul bilan (💰)
  HERO_CHARGE: "price_hero_charge",              // 400💰 (zaryadlash)
  HERO_RENAME: "price_hero_rename",              // 2000💰 (nomini o'zgartirish)
  CHEST_BASIC: "price_chest_basic",              // 10 000💰
  CHEST_SILVER: "price_chest_silver",            // 25 000💰
  CHEST_GOLD: "price_chest_gold",                // 50 000💰

  // Transfer komissiyalari
  FEE_DIAMOND_TRANSFER: "fee_diamond",           // 1💎
  FEE_MONEY_TRANSFER: "fee_money",               // 100💰

  // O'yin mukofotlari
  REWARD_TOWN_MONEY: "reward_town_money",        // Shahar yutganiga pul
  REWARD_TOWN_DIAMOND: "reward_town_diamond",    // Shahar yutganiga olmos
  REWARD_MAFIA_MONEY: "reward_mafia_money",
  REWARD_MAFIA_DIAMOND: "reward_mafia_diamond",
  REWARD_SOLO_MONEY: "reward_solo_money",
  REWARD_SOLO_DIAMOND: "reward_solo_diamond",
  REWARD_WINNER_BONUS: "reward_winner_bonus",    // +100💰 bonus
  REWARD_LOSER_CONSOLATION: "reward_loser",      // 30💰 yutqazganga
  REWARD_HERO_POINTS_TOWN: "reward_hero_town",   // Geroy ball (shahar)
  REWARD_HERO_POINTS_MAFIA: "reward_hero_mafia",
  REWARD_HERO_POINTS_SOLO: "reward_hero_solo",

  // Default o'yin vaqtlari (yangi guruhlar uchun)
  DEFAULT_REGISTRATION_TIMEOUT: "default_registration_timeout",
  DEFAULT_NIGHT_TIMEOUT: "default_night_timeout",
  DEFAULT_DAY_DISCUSSION_TIMEOUT: "default_day_discussion_timeout",
  DEFAULT_VOTING_TIMEOUT: "default_voting_timeout",
  DEFAULT_MIN_PLAYERS: "default_min_players",
  DEFAULT_MAX_PLAYERS: "default_max_players",
} as const;

// Aktiv rol narxi har rol uchun alohida (💰 pulda)
export function rolePriceKey(role: Role): string {
  return `price_role_${role}`;
}

// Default narxlar
const DEFAULTS: Record<string, number> = {
  // Do'kon (💎 olmosda) — OLGANLIK UCHUN ARZONLASHTIRILDI
  [PRICE_KEYS.SHIELD]: 15,                    // 15💎 (eski 50)
  [PRICE_KEYS.DOCUMENT]: 10,                  // 10💎 (eski 30)
  [PRICE_KEYS.HERO_CREATE]: 30,               // 30💎 (eski 100)
  [PRICE_KEYS.VIP_MONTH]: 20,                 // 20💎/oy (eski 100)
  [PRICE_KEYS.HERO_POINTS_1000]: 20,          // 20💎 → 1000 ball (eski 100)
  [PRICE_KEYS.HERO_PROTECTION_REFRESH]: 15,   // 15💎 (eski 100)

  // Pul bilan (💰)
  [PRICE_KEYS.HERO_CHARGE]: 200,              // 200💰 zaryadlash (eski 400)
  [PRICE_KEYS.HERO_RENAME]: 1000,             // 1000💰 nom o'zgartirish (eski 2000)
  [PRICE_KEYS.CHEST_BASIC]: 5000,             // 5000💰 (eski 10000)
  [PRICE_KEYS.CHEST_SILVER]: 12000,           // 12000💰 (eski 25000)
  [PRICE_KEYS.CHEST_GOLD]: 25000,             // 25000💰 (eski 50000)

  // Transfer komissiyalari
  [PRICE_KEYS.FEE_DIAMOND_TRANSFER]: 1,       // 1💎
  [PRICE_KEYS.FEE_MONEY_TRANSFER]: 50,        // 50💰 (eski 100)

  // O'yin mukofotlari
  [PRICE_KEYS.REWARD_TOWN_MONEY]: 300,        // Shahar: 300💰 (eski 500)
  [PRICE_KEYS.REWARD_TOWN_DIAMOND]: 3,        // + 3💎 (eski 2)
  [PRICE_KEYS.REWARD_MAFIA_MONEY]: 500,       // Mafiya: 500💰 (eski 700)
  [PRICE_KEYS.REWARD_MAFIA_DIAMOND]: 5,       // + 5💎 (eski 3)
  [PRICE_KEYS.REWARD_SOLO_MONEY]: 800,        // Yakka rol: 800💰 (eski 1000)
  [PRICE_KEYS.REWARD_SOLO_DIAMOND]: 8,        // + 8💎 (eski 5)
  [PRICE_KEYS.REWARD_WINNER_BONUS]: 100,      // G'olib bonusi +100💰
  [PRICE_KEYS.REWARD_LOSER_CONSOLATION]: 20,  // Yutqazganga 20💰 (eski 30)
  [PRICE_KEYS.REWARD_HERO_POINTS_TOWN]: 150,  // Geroy: shahar yutsa 150 ball (eski 100)
  [PRICE_KEYS.REWARD_HERO_POINTS_MAFIA]: 200, // Mafiya yutsa 200 ball (eski 150)
  [PRICE_KEYS.REWARD_HERO_POINTS_SOLO]: 300,  // Yakka yutsa 300 ball (eski 200)

  // Default o'yin vaqtlari (sekundda / soni)
  [PRICE_KEYS.DEFAULT_REGISTRATION_TIMEOUT]: 90,
  [PRICE_KEYS.DEFAULT_NIGHT_TIMEOUT]: 90,
  [PRICE_KEYS.DEFAULT_DAY_DISCUSSION_TIMEOUT]: 180,
  [PRICE_KEYS.DEFAULT_VOTING_TIMEOUT]: 90,
  [PRICE_KEYS.DEFAULT_MIN_PLAYERS]: 4,
  [PRICE_KEYS.DEFAULT_MAX_PLAYERS]: 30,

  // Aktiv rollar (💰 pulda) — REBALANS QILINDI
  price_role_CIVILIAN: 150,
  price_role_DOCTOR: 200,
  price_role_TRAMP: 200,
  price_role_SHERIFF: 250,
  price_role_KAMIKAZE: 250,
  price_role_HOOKER: 250,
  price_role_SERGEANT: 180,
  price_role_WARLOCK: 250,
  price_role_SANTA: 180,
  price_role_SNOWBOY: 180,
  price_role_DON: 300,
  price_role_MAFIA: 250,
  price_role_LAWYER: 200,
  price_role_SPY: 250,
  price_role_LAB: 250,
  price_role_KILLER: 350,
  price_role_MINER: 200,
  price_role_SNIPER: 400,
  price_role_ARCHER: 350,
  price_role_TRAITOR: 300,
  price_role_ROBBER: 250,
  price_role_PROFESSOR: 300,
};

// Valyuta turi — diamond yoki money
export type Currency = "diamond" | "money";

// Default valyutalar
const DEFAULT_CURRENCIES: Record<string, Currency> = {
  [PRICE_KEYS.SHIELD]: "diamond",
  [PRICE_KEYS.DOCUMENT]: "diamond",
  [PRICE_KEYS.HERO_CREATE]: "diamond",
  [PRICE_KEYS.VIP_MONTH]: "diamond",
  [PRICE_KEYS.HERO_POINTS_1000]: "diamond",
  [PRICE_KEYS.HERO_PROTECTION_REFRESH]: "diamond",
  [PRICE_KEYS.HERO_CHARGE]: "money",
  [PRICE_KEYS.HERO_RENAME]: "money",
  [PRICE_KEYS.CHEST_BASIC]: "money",
  [PRICE_KEYS.CHEST_SILVER]: "money",
  [PRICE_KEYS.CHEST_GOLD]: "money",
};

function currencyKey(priceKey: string): string {
  return `currency_${priceKey}`;
}

// Cache — DB'ga har safar borish emas
const cache = new Map<string, number>();
const currencyCache = new Map<string, Currency>();

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
    currencyCache.clear();
  },

  // Valyuta turini olish (diamond/money)
  async getCurrency(priceKey: string): Promise<Currency> {
    const key = currencyKey(priceKey);
    if (currencyCache.has(key)) return currencyCache.get(key)!;
    const cfg = await prisma.config.findUnique({ where: { key } });
    const value = (cfg?.value as Currency) || DEFAULT_CURRENCIES[priceKey] || "diamond";
    currencyCache.set(key, value);
    return value;
  },

  async setCurrency(priceKey: string, currency: Currency): Promise<void> {
    const key = currencyKey(priceKey);
    await prisma.config.upsert({
      where: { key },
      update: { value: currency },
      create: { key, value: currency },
    });
    currencyCache.set(key, currency);
  },

  async toggleCurrency(priceKey: string): Promise<Currency> {
    const current = await this.getCurrency(priceKey);
    const next: Currency = current === "diamond" ? "money" : "diamond";
    await this.setCurrency(priceKey, next);
    return next;
  },
};
