import { Role } from "@prisma/client";

// Jamoa turlari
export enum Team {
  TOWN = "TOWN",
  MAFIA = "MAFIA",
  SOLO = "SOLO",
  NEUTRAL = "NEUTRAL", // Sotqin boshlang'ich holati
}

// Rol -> Jamoa mapping
export const ROLE_TEAM: Record<Role, Team> = {
  CIVILIAN: Team.TOWN,
  DOCTOR: Team.TOWN,
  TRAMP: Team.TOWN,
  SHERIFF: Team.TOWN,
  KAMIKAZE: Team.TOWN,
  HOOKER: Team.TOWN,
  SERGEANT: Team.TOWN,
  WARLOCK: Team.TOWN,
  SANTA: Team.TOWN,
  SNOWBOY: Team.TOWN,
  DON: Team.MAFIA,
  MAFIA: Team.MAFIA,
  LAWYER: Team.MAFIA,
  SPY: Team.MAFIA,
  LAB: Team.MAFIA,
  KILLER: Team.SOLO,
  MINER: Team.SOLO,
  SNIPER: Team.SOLO,
  ARCHER: Team.SOLO,
  TRAITOR: Team.NEUTRAL,
  ROBBER: Team.SOLO,
  PROFESSOR: Team.SOLO,
};

// Rol emoji
export const ROLE_EMOJI: Record<Role, string> = {
  CIVILIAN: "👨🏼",
  DOCTOR: "👨🏼‍⚕️",
  TRAMP: "🧙🏼‍♂️",
  SHERIFF: "🕵🏻‍♂",
  KAMIKAZE: "💣",
  HOOKER: "💃",
  SERGEANT: "👮🏻‍♂",
  WARLOCK: "⚡️",
  SANTA: "🎅🏻",
  SNOWBOY: "⛄️",
  DON: "🤵🏻",
  MAFIA: "🤵🏼",
  LAWYER: "👨🏼‍💼",
  SPY: "🦇",
  LAB: "👨‍🔬",
  KILLER: "🔪",
  MINER: "☠️",
  SNIPER: "👨🏻‍🎤",
  ARCHER: "🏹",
  TRAITOR: "🦎",
  ROBBER: "👺",
  PROFESSOR: "🎩",
};

// Rol nomi (uz)
export const ROLE_NAME: Record<Role, string> = {
  CIVILIAN: "Tinch axoli",
  DOCTOR: "Shifokor",
  TRAMP: "Daydi",
  SHERIFF: "Komissar",
  KAMIKAZE: "Kamikaze",
  HOOKER: "Kezuvchi",
  SERGEANT: "Serjant",
  WARLOCK: "Koldun",
  SANTA: "Qorbobo",
  SNOWBOY: "Qorbola",
  DON: "Don",
  MAFIA: "Mafiya",
  LAWYER: "Advokat",
  SPY: "Ayg'oqchi",
  LAB: "Labarant",
  KILLER: "Qotil",
  MINER: "Minior",
  SNIPER: "Snayperchi",
  ARCHER: "Kamonchi",
  TRAITOR: "Sotqin",
  ROBBER: "Qaroqchi",
  PROFESSOR: "Professor",
};

// Tunda harakat qiladigan rollar
export const NIGHT_ACTIVE_ROLES: Role[] = [
  "HOOKER",
  "TRAITOR",
  "LAWYER",
  "SPY",
  "DON",
  "MAFIA",
  "LAB",
  "SHERIFF",
  "SERGEANT",
  "DOCTOR",
  "WARLOCK",
  "TRAMP",
  "KILLER",
  "SNIPER",
  "ARCHER",
  "MINER",
  "SNOWBOY",
  "SANTA",
  "ROBBER",
  "PROFESSOR",
];

// Mafiya jamoasi rollari
export const MAFIA_ROLES: Role[] = ["DON", "MAFIA", "LAWYER", "SPY", "LAB"];

//// Mafiya ovoz beradigan rollar (o'ldirish uchun)
export const MAFIA_KILL_VOTERS: Role[] = ["DON", "MAFIA"];

// Geroy bilan kunduzi otish/himoyalanish faqat shu rollarga ruxsat
export const HERO_ATTACK_ROLES: Role[] = ["SNIPER", "DON", "SHERIFF"];

// ========== CHARGE LIMITS (ZARYAD CHEGARALARI) ==========
// PRD v2: Har bir kuchli rol uchun zaryad chegarasi
export const CHARGE_LIMITS: Record<string, number> = {
  "SNIPER": 2,      // 2 o'q butun o'yin uchun
  "ARCHER": 2,      // 2 o'q butun o'yin uchun
  "WARLOCK": 1,     // 1 marta o'ldirish imkoniyati (koldun faqat 1 marta o'ldira oladi)
  "MINER": 2,       // 2 mina butun o'yin uchun
  "SNOWBOY": 1,     // 1 qorbo'ron butun o'yin uchun
  "KILLER": 0,      // Cheklanmagan (yakkachilik sharti bilan)
  "ROBBER": 0,      // Cheklanmagan
  "PROFESSOR": 0,   // Cheklanmagan (qutilar random)
};

// Rol uchun zaryad limitini olish
export function getChargeLimit(role: string): number {
  return CHARGE_LIMITS[role] ?? 0;
}

// Zaryad bor-yo'qligini tekshirish
export function hasCharge(player: any, role: string): boolean {
  const limit = CHARGE_LIMITS[role];
  if (!limit || limit <= 0) return true; // Cheklanmagan
  const used = player.chargesLeft?.[role] ?? 0;
  return used < limit;
}

// Zaryad ishlatish
export function useCharge(player: any, role: string): boolean {
  const limit = CHARGE_LIMITS[role];
  if (!limit || limit <= 0) return true; // Cheklanmagan
  const used = (player.chargesLeft?.[role] ?? 0) + 1;
  if (used > limit) return false;
  if (!player.chargesLeft) player.chargesLeft = {};
  player.chargesLeft[role] = used;
  return true;
}

// Zaryad qaytarish (yoki boshlang'ich qiymat o'rnatish)
export function initCharges(player: any): void {
  if (!player.chargesLeft) player.chargesLeft = {};
  for (const [role, limit] of Object.entries(CHARGE_LIMITS)) {
    if (limit > 0) {
      player.chargesLeft[role] = limit;
    }
  }
}

// Zaryad qoldig'ini olish
export function getRemainingCharges(player: any, role: string): number {
  const limit = CHARGE_LIMITS[role];
  if (!limit || limit <= 0) return -1; // Cheklanmagan
  const used = player.chargesLeft?.[role] ?? 0;
  return Math.max(0, limit - used);
}
