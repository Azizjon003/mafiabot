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
  CUPID: Team.TOWN,
  BARMEN: Team.TOWN,
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
  CUPID: "💘",
  BARMEN: "🍺",
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
  CUPID: "Kupidon",
  BARMEN: "Barmen",
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
  "CUPID",
  "BARMEN",
];

// Mafiya jamoasi rollari
export const MAFIA_ROLES: Role[] = ["DON", "MAFIA", "LAWYER", "SPY", "LAB"];

//// Mafiya ovoz beradigan rollar (o'ldirish uchun)
export const MAFIA_KILL_VOTERS: Role[] = ["DON", "MAFIA"];

// Yakka (SOLO) g'olib bo'la oladigan rollar — win-checker va mukofot mantig'i BIR XIL
// ro'yxatdan foydalanishi shart (aks holda g'olib deb e'lon qilinib, mukofot berilmay qoladi).
export const SOLO_ROLES: Role[] = ["KILLER", "MINER", "SNIPER", "ARCHER", "TRAITOR", "ROBBER", "PROFESSOR"];

// Geroy bilan kunduzi otish/himoyalanish faqat shu rollarga ruxsat
export const HERO_ATTACK_ROLES: Role[] = ["SNIPER", "DON", "SHERIFF"];

// Qorbobo sovg'asi — nishonga beriladigan haqiqiy pul miqdori
export const SANTA_GIFT_AMOUNT = 25;

// ========== XABAR SUR'ATI (PACING) ==========
// Guruhga bir necha xabar ketma-ket ketganda o'yinchilar o'qishga ulgurmaydi.
// Quyidagi pauzalar xabarlarni "birin-ketin" emas, bosqichma-bosqich chiqaradi.
export const PACING = {
  MORNING_INTRO_MS: 5000,   // "Tong otmoqda..." dan keyin — o'limlar e'lon qilinishidan oldin
  DEATH_STORY_MS: 3500,     // har bir o'lim/saqlanish xabari orasida
  BEFORE_DAY_MS: 4000,      // tun natijalari tugab, kun boshlanishidan oldin
  DAY_STEP_MS: 3000,        // kunduzgi xabarlar orasida (tong matni → roster → muhokama)
  GAME_SETUP_MS: 2000,      // o'yin boshida (rollar tarqatilgandagi xabarlar orasida)
  BEFORE_NIGHT_MS: 4000,    // ovoz berish natijasidan keyin, tun boshlanishidan oldin
  PRIVATE_RESULT_MS: 1200,  // BITTA o'yinchiga ketma-ket ketadigan shaxsiy natijalar orasida
  NIGHT_STORY_MS: 1500,     // tundagi hikoya matnlari orasida
  ROLE_INTRO_MS: 1500,      // rol xabari → jamoa tanishtiruvi orasida
  MAFIA_SYNC_MS: 800,       // mafiya sheriklariga "kim kimni tanladi" xabarlari orasida
  GAME_END_MS: 2500,        // yakuniy jadval → shaxsiy natijalar orasida
};

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

// chargesLeft[role] = QOLDIQ zaryad soni (limit'dan boshlanib, har ishlatishda kamayadi).

// Zaryad bor-yo'qligini tekshirish
export function hasCharge(player: any, role: string): boolean {
  const limit = CHARGE_LIMITS[role];
  if (!limit || limit <= 0) return true; // Cheklanmagan
  const remaining = player.chargesLeft?.[role] ?? limit;
  return remaining > 0;
}

// Zaryad ishlatish (bittaga kamaytiradi)
export function useCharge(player: any, role: string): boolean {
  const limit = CHARGE_LIMITS[role];
  if (!limit || limit <= 0) return true; // Cheklanmagan
  if (!player.chargesLeft) player.chargesLeft = {};
  const remaining = player.chargesLeft[role] ?? limit;
  if (remaining <= 0) return false;
  player.chargesLeft[role] = remaining - 1;
  return true;
}

// Boshlang'ich qiymat o'rnatish — IDEMPOTENT: mavjud qoldiqni O'ZGARTIRMAYDI
// (har tun chaqirilsa ham reset qilmaydi, faqat birinchi marta limit qo'yadi)
export function initCharges(player: any): void {
  if (!player.chargesLeft) player.chargesLeft = {};
  for (const [role, limit] of Object.entries(CHARGE_LIMITS)) {
    if (limit > 0 && player.chargesLeft[role] === undefined) {
      player.chargesLeft[role] = limit;
    }
  }
}

// Zaryad qoldig'ini olish
export function getRemainingCharges(player: any, role: string): number {
  const limit = CHARGE_LIMITS[role];
  if (!limit || limit <= 0) return -1; // Cheklanmagan
  return player.chargesLeft?.[role] ?? limit;
}
