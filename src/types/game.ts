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
  hasDocumentActive?: boolean; // Hujjat faolmi (komissar tekshiruvini aldash)
  preferredRole?: Role; // Aktiv rol — tarqatishda ustuvor
  // Sotqin
  originalRole?: Role; // Sotqin uchun — asl rol
  // Professor qutilari — nishonga yuborilgan 3 ta aralashtirilgan natija
  professorBoxes?: ("DEATH" | "EMPTY" | "HERO")[];
  professorChoice?: number; // Nishon tanlagan quti indeksi (0..2)
  // Faol tun harakatsiz tunlar soni — 2 ga yetsa avtomatik o'lim
  inactiveNights: number;
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
