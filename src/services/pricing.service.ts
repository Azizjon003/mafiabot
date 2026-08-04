import { prisma } from "../database/prisma";
import { Role } from "@prisma/client";

// Narx kalitlari — bosh admin buyruqlar orqali bularni o'zgartira oladi
export const PRICE_KEYS = {
  // Dokon (💎 olmosda)
  SHIELD: "price_shield",                        // 50💎
  DOCUMENT: "price_document",                    // 30💎
  BULLET: "price_bullet",                        // Snayper o'qi — Shieldga teskari
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
  // Do'kon (💎 olmosda) — olmos daromadiga moslab REBALANS (~1.5💎/yutuq)
  [PRICE_KEYS.SHIELD]: 10,                    // 10💎 (~7 yutuq) — eski 15
  [PRICE_KEYS.DOCUMENT]: 6,                   // 6💎 (~4 yutuq) — eski 10
  [PRICE_KEYS.BULLET]: 14,                    // 14💎 — Shielddan qimmatroq (hujum > himoya)
  [PRICE_KEYS.HERO_CREATE]: 25,              // 25💎 (~17 yutuq) — eski 30
  [PRICE_KEYS.VIP_MONTH]: 20,                 // 20💎/oy (~13 yutuq)
  [PRICE_KEYS.HERO_POINTS_1000]: 12,          // 12💎 → 1000 ball — eski 20
  [PRICE_KEYS.HERO_PROTECTION_REFRESH]: 10,   // 10💎 — eski 15

  // Pul bilan (💰) — pul daromadiga moslab REBALANS (~280💰/yutuq)
  [PRICE_KEYS.HERO_CHARGE]: 150,              // 150💰 zaryadlash — eski 200
  [PRICE_KEYS.HERO_RENAME]: 800,              // 800💰 nom o'zgartirish — eski 1000
  [PRICE_KEYS.CHEST_BASIC]: 2000,             // 2000💰 (~14 o'yin) — eski 5000
  [PRICE_KEYS.CHEST_SILVER]: 5000,            // 5000💰 — eski 12000
  [PRICE_KEYS.CHEST_GOLD]: 10000,             // 10000💰 — eski 25000

  // Transfer komissiyalari
  [PRICE_KEYS.FEE_DIAMOND_TRANSFER]: 1,       // 1💎
  [PRICE_KEYS.FEE_MONEY_TRANSFER]: 50,        // 50💰

  // O'yin mukofotlari — G'OLIBGA FAQAT 25💰. Olmos yutuqdan BERILMAYDI,
  // yutqazganga HECH NARSA berilmaydi.
  // (olmos faqat sandiq: pul→olmos, va o'zaro o'tkazma orqali keladi)
  [PRICE_KEYS.REWARD_TOWN_MONEY]: 25,         // Shahar yutsa: 25💰
  [PRICE_KEYS.REWARD_TOWN_DIAMOND]: 0,
  [PRICE_KEYS.REWARD_MAFIA_MONEY]: 25,        // Mafiya yutsa: 25💰
  [PRICE_KEYS.REWARD_MAFIA_DIAMOND]: 0,
  [PRICE_KEYS.REWARD_SOLO_MONEY]: 25,         // Yakka rol yutsa: 25💰
  [PRICE_KEYS.REWARD_SOLO_DIAMOND]: 0,
  [PRICE_KEYS.REWARD_WINNER_BONUS]: 0,        // Bonus o'chirilgan
  [PRICE_KEYS.REWARD_LOSER_CONSOLATION]: 0,   // Yutqazganga hech narsa berilmaydi
  [PRICE_KEYS.REWARD_HERO_POINTS_TOWN]: 150,  // Geroy: shahar yutsa 150 ball
  [PRICE_KEYS.REWARD_HERO_POINTS_MAFIA]: 200, // Mafiya yutsa 200 ball
  [PRICE_KEYS.REWARD_HERO_POINTS_SOLO]: 300,  // Yakka yutsa 300 ball

  // Default o'yin vaqtlari (sekundda / soni)
  [PRICE_KEYS.DEFAULT_REGISTRATION_TIMEOUT]: 60,
  [PRICE_KEYS.DEFAULT_NIGHT_TIMEOUT]: 30,
  [PRICE_KEYS.DEFAULT_DAY_DISCUSSION_TIMEOUT]: 30,
  [PRICE_KEYS.DEFAULT_VOTING_TIMEOUT]: 30,
  [PRICE_KEYS.DEFAULT_MIN_PLAYERS]: 4,
  [PRICE_KEYS.DEFAULT_MAX_PLAYERS]: 30,

  // Aktiv rollar (💰 pulda) — har o'yin sarflanadi, ~1 yutuqqa moslab 100-300💰
  price_role_CIVILIAN: 100,
  price_role_SERGEANT: 120,
  price_role_SANTA: 120,
  price_role_SNOWBOY: 120,
  price_role_DOCTOR: 150,
  price_role_TRAMP: 150,
  price_role_LAWYER: 150,
  price_role_MINER: 150,
  price_role_SHERIFF: 180,
  price_role_HOOKER: 180,
  price_role_MAFIA: 180,
  price_role_SPY: 180,
  price_role_LAB: 180,
  price_role_ROBBER: 180,
  price_role_KAMIKAZE: 200,
  price_role_WARLOCK: 200,
  price_role_CUPID: 200,
  price_role_BARMEN: 180,
  price_role_BODYGUARD: 180,
  price_role_HUNTER: 220,
  price_role_ORACLE: 150,
  price_role_FRAMER: 200,
  price_role_DON: 220,
  price_role_TRAITOR: 220,
  price_role_PROFESSOR: 220,
  price_role_ARCHER: 250,
  price_role_KILLER: 250,
  price_role_SNIPER: 300,
};

// Valyuta turi — diamond yoki money
export type Currency = "diamond" | "money";

// Default valyutalar
const DEFAULT_CURRENCIES: Record<string, Currency> = {
  [PRICE_KEYS.SHIELD]: "diamond",
  [PRICE_KEYS.BULLET]: "diamond",
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

// Bir martalik: DB'dagi eski (juda katta) mukofot override'larini tozalash.
// Eski qiymatlar (500-700💰 + olmos, keyin 80+80💰) koddagi defaultlarni bosib ketardi.
// Endi mukofot siyosati: g'olibga 25💰, olmos yo'q, yutqazganga hech narsa.
// Flag Config'da saqlanadi — faqat BIR marta ishlaydi, keyin admin /setprice bilan
// xohlaganicha o'zgartira oladi (qayta boot'da qayta o'chirilmaydi).
const REWARD_RESET_FLAG = "migration_rewards_reset_v1";
const REWARD_KEYS_TO_RESET = [
  PRICE_KEYS.REWARD_TOWN_MONEY,
  PRICE_KEYS.REWARD_TOWN_DIAMOND,
  PRICE_KEYS.REWARD_MAFIA_MONEY,
  PRICE_KEYS.REWARD_MAFIA_DIAMOND,
  PRICE_KEYS.REWARD_SOLO_MONEY,
  PRICE_KEYS.REWARD_SOLO_DIAMOND,
  PRICE_KEYS.REWARD_WINNER_BONUS,
  PRICE_KEYS.REWARD_LOSER_CONSOLATION,
];

export async function resetRewardOverridesOnce(): Promise<void> {
  const done = await prisma.config.findUnique({ where: { key: REWARD_RESET_FLAG } });
  if (done) return;
  const res = await prisma.config.deleteMany({
    where: { key: { in: [...REWARD_KEYS_TO_RESET] } },
  });
  await prisma.config.create({ data: { key: REWARD_RESET_FLAG, value: "done" } });
  cache.clear();
  const { logger } = await import("../utils/logger");
  logger.info(
    { deleted: res.count },
    "Mukofot override'lari tozalandi — endi: g'olibga 25💰, olmos 0, yutqazganga 0"
  );
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
