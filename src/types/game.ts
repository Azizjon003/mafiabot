import { Role } from "@prisma/client";

export interface PlayerState {
  playerId: number;
  userId: number;
  telegramId: bigint;
  firstName: string;
  username?: string;
  role: Role;
  isAlive: boolean;
  // Kecha harakatlari
  isBlocked: boolean; // Kezuvchi tomonidan bloklangan
  isProtectedByLawyer: boolean; // Advokat himoyasi
  isProtectedByWarlock: boolean; // Koldun himoyasi (kunduzgi osilishdan)
  isHealedByDoctor: boolean; // Shifokor davolagan
  doctorSelfHealUsed: boolean; // Shifokor o'zini davolagan
  // Geroy va Shield
  hasHeroActive: boolean; // Geroy faolmi
  heroProtectionAvailable: boolean; // Himoyalanish bosilganmi (faol)
  heroDefendUsed: boolean; // Bu o'yinda Himoyalanish ishlatilganmi (1 marta)
  heroHP: number; // Umumiy jon (100 max)
  heroProtection: number; // Himoya qoldig'i (damage shield, depleted by attacks)
  hasShieldActive: boolean; // Shield faolmi
  shieldCharges: number; // Shield necha hujumdan saqlay oladi
  reservedShield: boolean; // O'yin boshida shield reserve qilinganmi (finalize uchun)
  hasDocumentActive?: boolean; // Hujjat faolmi (komissar tekshiruvini aldash)
  reservedDocument: boolean; // O'yin boshida hujjat reserve qilinganmi
  preferredRole?: Role; // Aktiv rol — tarqatishda ustuvor
  // Sotqin
  originalRole?: Role; // Sotqin uchun — asl rol
  // Professor qutilari — nishonga yuborilgan 3 ta aralashtirilgan natija
  professorBoxes?: ("DEATH" | "EMPTY" | "HERO")[];
  professorChoice?: number; // Nishon tanlagan quti indeksi (0..2)
  // Kupidon sevishtirgan juft — biri o'lsa ikkinchisi ham qayg'udan o'ladi
  loverPlayerId?: number;
  // Ovchi mo'ljali — o'lsa mo'ljaldagi odam ham o'ladi (o'q avtomatik uziladi)
  hunterAimPlayerId?: number;
  hunterShotFired?: boolean;
  // Tuhmatchi tuhmat qilgan — shu tunda Komissar/Folbin uni "yovuz" deb ko'radi
  isFramed?: boolean;
  // Faol tun harakatsiz tunlar soni — 2 ga yetsa avtomatik o'lim
  inactiveNights: number;
  // Zaryadlar/chegaralar uchun (Snayper, Kamonchi, Koldun, Minior, Qorbola)
  chargesLeft?: Record<string, number>; // { "SNIPER": 2, "ARCHER": 2, "WARLOCK": 1, "MINER": 2, "SNOWBOY": 1 }
}

export interface KilledPlayer {
  player: PlayerState;
  cause: string; // DeathCause enum value
}

export interface NightResult {
  killed: KilledPlayer[]; // O'lganlar + sababi
  saved: PlayerState[]; // Saqlab qolinganlar
  events: NightEvent[];
}

export interface NightEvent {
  type: string;
  actorId: number;
  targetId?: number;
  message: string;
  privateMessage?: string; // Faqat actorga ko'rinadigan xabar
  targetPrivateMessage?: string; // Faqat targetga ko'rinadigan xabar
}

export interface VoteResult {
  votedOut: PlayerState | null;
  votes: Map<number, number>; // targetPlayerId -> voteCount
  kamikazeTarget?: PlayerState; // Agar votedOut kamikaze bo'lsa
  loverVictims?: PlayerState[]; // Osilganning jufti qayg'udan o'lsa
  hunterVictims?: { hunter: PlayerState; victim: PlayerState }[]; // O'lgan Ovchining o'qi
}

// Rollar taqsimoti konfiguratsiyasi
export interface RoleDistribution {
  DON: number;
  MAFIA: number;
  LAWYER: number;
  SPY: number;
  LAB: number;
  SHERIFF: number;
  SERGEANT: number;
  DOCTOR: number;
  TRAMP: number;
  HOOKER: number;
  WARLOCK: number;
  KAMIKAZE: number;
  KILLER: number;
  SNIPER: number;
  ARCHER: number;
  MINER: number;
  TRAITOR: number;
  SANTA: number;
  SNOWBOY: number;
  ROBBER: number;
  PROFESSOR: number;
}

export type RobberResponse = "PAY" | "REFUSE";

export interface MafiaVote {
  voterId: number;
  targetId: number;
}
