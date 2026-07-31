// GameEngine state'ini DB'ga saqlash/tiklash (bot restart'dan keyin o'yin davom etishi uchun)
import { Role } from "@prisma/client";
import { GameEngine } from "./engine";
import { PlayerState, MafiaVote, RobberResponse } from "../types";
import { prisma } from "../database/prisma";
import { logger } from "../utils/logger";

export interface SerializedEngine {
  v: 1; // schema versiyasi
  gameId: number;
  chatId: number;
  chatTelegramId: string; // bigint → string
  status: string;
  currentRound: number;
  settings: any;
  players: SerializedPlayer[];
  // Tun state
  nightActions: Array<[string, { actorId: number; targetId: number }]>;
  mafiaVotes: MafiaVote[];
  pendingNightRoles: string[];
  sheriffShootTarget: number | null;
  robberTargetResponse: RobberResponse | null;
  cupidPick?: { first: number; second: number } | null; // Kupidon juftligi
  // Ovoz berish state
  votes: Array<[number, number]>;
  kamikazeTarget: number | null;
  confirmVotes: Array<[number, boolean]>;
  nightSkips?: number[]; // ataylab "O'tkazish" bosganlar (eski snapshotlarda yo'q)
  pendingHangTarget: number | null;
  // Vaqt va xabar
  gameStartedAt: string | null; // ISO
  registrationMessageId: number | null;
  creatorTelegramId: string | null; // bigint → string
  // Timer tiklash uchun
  pendingPhaseAction: string | null;
  timerEndsAt: number | null; // epoch ms
}

export interface SerializedPlayer {
  playerId: number;
  userId: number;
  telegramId: string; // bigint → string
  firstName: string;
  username?: string;
  role: Role;
  isAlive: boolean;
  isBlocked: boolean;
  isProtectedByLawyer: boolean;
  isProtectedByWarlock: boolean;
  isHealedByDoctor: boolean;
  doctorSelfHealUsed: boolean;
  hasHeroActive: boolean;
  heroProtectionAvailable: boolean;
  heroDefendUsed: boolean;
  heroHP: number;
  heroProtection: number;
  hasShieldActive: boolean;
  shieldCharges: number;
  reservedShield: boolean;
  hasDocumentActive?: boolean;
  reservedDocument: boolean;
  preferredRole?: Role;
  originalRole?: Role;
  professorBoxes?: ("DEATH" | "EMPTY" | "HERO")[];
  professorChoice?: number;
  inactiveNights: number;
  chargesLeft?: Record<string, number>; // butun o'yin bo'yicha zaryad qoldig'i (Sniper/Archer/...)
  loverPlayerId?: number; // Kupidon juftligi
  hunterAimPlayerId?: number; // Ovchi mo'ljali
  hunterShotFired?: boolean;
  isFramed?: boolean; // Tuhmatchi belgisi (shu tunga)
}

function serializePlayer(p: PlayerState): SerializedPlayer {
  return {
    playerId: p.playerId,
    userId: p.userId,
    telegramId: p.telegramId.toString(),
    firstName: p.firstName,
    username: p.username,
    role: p.role,
    isAlive: p.isAlive,
    isBlocked: p.isBlocked,
    isProtectedByLawyer: p.isProtectedByLawyer,
    isProtectedByWarlock: p.isProtectedByWarlock,
    isHealedByDoctor: p.isHealedByDoctor,
    doctorSelfHealUsed: p.doctorSelfHealUsed,
    hasHeroActive: p.hasHeroActive,
    heroProtectionAvailable: p.heroProtectionAvailable,
    heroDefendUsed: p.heroDefendUsed,
    heroHP: p.heroHP,
    heroProtection: p.heroProtection,
    hasShieldActive: p.hasShieldActive,
    shieldCharges: p.shieldCharges,
    reservedShield: p.reservedShield ?? p.hasShieldActive,
    hasDocumentActive: p.hasDocumentActive,
    reservedDocument: p.reservedDocument ?? !!p.hasDocumentActive,
    preferredRole: p.preferredRole,
    originalRole: p.originalRole,
    professorBoxes: p.professorBoxes,
    professorChoice: p.professorChoice,
    inactiveNights: p.inactiveNights ?? 0,
    chargesLeft: p.chargesLeft,
    loverPlayerId: p.loverPlayerId,
    hunterAimPlayerId: p.hunterAimPlayerId,
    hunterShotFired: p.hunterShotFired,
    isFramed: p.isFramed,
  };
}

function deserializePlayer(s: SerializedPlayer): PlayerState {
  return {
    playerId: s.playerId,
    userId: s.userId,
    telegramId: BigInt(s.telegramId),
    firstName: s.firstName,
    username: s.username,
    role: s.role,
    isAlive: s.isAlive,
    isBlocked: s.isBlocked,
    isProtectedByLawyer: s.isProtectedByLawyer,
    isProtectedByWarlock: s.isProtectedByWarlock,
    isHealedByDoctor: s.isHealedByDoctor,
    doctorSelfHealUsed: s.doctorSelfHealUsed,
    hasHeroActive: s.hasHeroActive,
    heroProtectionAvailable: s.heroProtectionAvailable,
    heroDefendUsed: s.heroDefendUsed,
    heroHP: s.heroHP,
    heroProtection: s.heroProtection,
    hasShieldActive: s.hasShieldActive,
    shieldCharges: s.shieldCharges,
    reservedShield: s.reservedShield ?? s.hasShieldActive,
    hasDocumentActive: s.hasDocumentActive,
    reservedDocument: s.reservedDocument ?? !!s.hasDocumentActive,
    preferredRole: s.preferredRole,
    originalRole: s.originalRole,
    professorBoxes: s.professorBoxes,
    professorChoice: s.professorChoice,
    inactiveNights: s.inactiveNights ?? 0,
    chargesLeft: s.chargesLeft,
    loverPlayerId: s.loverPlayerId,
    hunterAimPlayerId: s.hunterAimPlayerId,
    hunterShotFired: s.hunterShotFired,
    isFramed: s.isFramed,
  };
}

export function serializeEngine(engine: GameEngine): SerializedEngine {
  const internal = engine.getInternalState();
  return {
    v: 1,
    gameId: engine.gameId,
    chatId: engine.chatId,
    chatTelegramId: engine.chatTelegramId.toString(),
    status: engine.status,
    currentRound: engine.currentRound,
    settings: engine.settings,
    players: [...engine.players.values()].map(serializePlayer),
    nightActions: internal.nightActions.map(([role, a]) => [role as string, a]),
    mafiaVotes: internal.mafiaVotes,
    pendingNightRoles: internal.pendingNightRoles.map((r) => r as string),
    sheriffShootTarget: internal.sheriffShootTarget,
    robberTargetResponse: engine.robberTargetResponse,
    cupidPick: engine.cupidPick,
    votes: internal.votes,
    kamikazeTarget: internal.kamikazeTarget,
    confirmVotes: internal.confirmVotes,
    nightSkips: internal.nightSkips,
    pendingHangTarget: engine.pendingHangTarget,
    gameStartedAt: engine.gameStartedAt ? engine.gameStartedAt.toISOString() : null,
    registrationMessageId: engine.registrationMessageId,
    creatorTelegramId: engine.creatorTelegramId ? engine.creatorTelegramId.toString() : null,
    pendingPhaseAction: engine.pendingPhaseAction,
    timerEndsAt: engine.timerEndsAt,
  };
}

export function applySerializedToEngine(engine: GameEngine, s: SerializedEngine): void {
  engine.status = s.status as any;
  engine.currentRound = s.currentRound;
  engine.players.clear();
  for (const sp of s.players) {
    engine.addPlayer(deserializePlayer(sp));
  }
  engine.setInternalState({
    nightActions: s.nightActions.map(([role, a]) => [role as Role, a]),
    mafiaVotes: s.mafiaVotes,
    pendingNightRoles: s.pendingNightRoles as Role[],
    sheriffShootTarget: s.sheriffShootTarget,
    votes: s.votes,
    kamikazeTarget: s.kamikazeTarget,
    confirmVotes: s.confirmVotes,
    nightSkips: s.nightSkips ?? [],
  });
  engine.robberTargetResponse = s.robberTargetResponse;
  engine.cupidPick = s.cupidPick ?? null;
  engine.pendingHangTarget = s.pendingHangTarget;
  engine.gameStartedAt = s.gameStartedAt ? new Date(s.gameStartedAt) : null;
  engine.registrationMessageId = s.registrationMessageId;
  engine.creatorTelegramId = s.creatorTelegramId ? BigInt(s.creatorTelegramId) : null;
  engine.pendingPhaseAction = s.pendingPhaseAction;
  engine.timerEndsAt = s.timerEndsAt;
}

// DB'ga yozish — fire-and-forget (await qilmaslik mumkin, xatolik log'lanadi)
export async function persistEngine(engine: GameEngine): Promise<void> {
  try {
    const snapshot = serializeEngine(engine);
    await prisma.game.update({
      where: { id: engine.gameId },
      data: { state: snapshot as any },
    });
  } catch (e) {
    logger.error(e, `persistEngine xatolik (gameId=${engine.gameId})`);
  }
}

// DB'dan aktiv o'yinlarni o'qish
export async function loadActiveGames(): Promise<SerializedEngine[]> {
  const games = await prisma.game.findMany({
    where: { status: { notIn: ["FINISHED", "CANCELLED"] } },
  });
  const result: SerializedEngine[] = [];
  for (const g of games) {
    const state = (g as any).state;
    if (!state || state.v !== 1) continue;
    result.push(state as SerializedEngine);
  }
  return result;
}
