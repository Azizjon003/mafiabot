import { Role, ChatSettings } from "@prisma/client";
import { shuffle } from "../utils/helpers";
import { ROLE_TEAM, Team } from "../utils/constants";
import { roleTemplatesService } from "../services/role-templates.service";
import { UNIQUE_ROLES } from "../services/role-templates.defaults";
import {
  calculateRoleDistribution,
  RoleDistributionResult,
} from "../services/role-distribution.formula";

interface RoleConfig {
  role: Role;
  settingsKey: keyof ChatSettings | null;
}

/**
 * Formula-based role assignment.
 * Uses Mafia Count formula + Power Role Pool + Civilian Floor.
 */
export async function assignRoles(
  playerCount: number,
  settings: ChatSettings
): Promise<Role[]> {
  // Get formula-based distribution
  const distribution = await calculateRoleDistribution(playerCount, settings);
  const roles = distribution.roles;

  // Assign roles to players (priority to preferred roles)
  // This is handled in GameEngine.assignRoles() which calls this function
  // The returned roles array will be assigned to players

  return roles;
}

// getRoleDistributionPreview olib tashlandi — o'lik kod edi va o'zini cheksiz chaqirardi.
// Haqiqiy implementatsiya: services/role-distribution.formula.ts

// ============================================
// KETMA-KET TAKRORLANISHDAN HIMOYA
// ============================================

// Oldingi o'yindagi rol qaytarilsa beriladigan "jarima" og'irliklari.
// SAME_ROLE boshqalaridan ancha katta — aynan o'sha rol imkoni boricha HECH QACHON qaytmaydi;
// jamoa jarimalari esa faqat "iloji bo'lsa qochamiz" darajasida.
const REPEAT_PENALTY = {
  SAME_ROLE: 100, // aynan o'sha rol (mas. ketma-ket 2 marta SHERIFF)
  SAME_MAFIA: 5,  // ketma-ket mafiya jamoasi (DON → MAFIA ham takror hisoblanadi)
  SAME_SOLO: 3,   // ketma-ket yakka rol
};

/**
 * O'yinchiga `role` berilsa qancha "jarima" to'planishini hisoblaydi.
 * lastRole yo'q bo'lsa (birinchi o'yin) — jarima yo'q.
 */
export function repeatPenalty(lastRole: Role | undefined, role: Role): number {
  if (!lastRole) return 0;
  let penalty = 0;
  if (lastRole === role) penalty += REPEAT_PENALTY.SAME_ROLE;
  const lastTeam = ROLE_TEAM[lastRole];
  const team = ROLE_TEAM[role];
  // TOWN qasddan hisobga olinmaydi: o'yinchilarning ko'pchiligi tinch axoli bo'ladi,
  // ketma-ket TOWN'ni jarimalash taqsimotni buzadi (hammani mafiyaga itarardi).
  if (lastTeam === Team.MAFIA && team === Team.MAFIA) penalty += REPEAT_PENALTY.SAME_MAFIA;
  if (lastTeam === Team.SOLO && team === Team.SOLO) penalty += REPEAT_PENALTY.SAME_SOLO;
  return penalty;
}

export interface AssignTarget {
  playerId: number;
  userId: number;
}

/**
 * Rollarni o'yinchilarga taqsimlaydi — KETMA-KET 2 O'YINDA BIR XIL ROL TUSHMASLIGI uchun.
 *
 * lastRoles: userId -> oldingi o'yindagi rol (bo'lmasa — cheklovsiz).
 * Algoritm:
 *   1) Ochko'z (greedy): random tartibda har bir o'yinchiga eng kam jarimali rol beriladi,
 *      teng variantlar orasidan random tanlanadi — tasodifiylik saqlanadi.
 *   2) Lokal qidiruv: juftlarni almashtirib umumiy jarima kamaytiriladi. Greedy'da oxirgi
 *      o'yinchiga faqat "takror" rol qolib ketishi mumkin — swap aynan shuni tuzatadi.
 *      Har almashtirish jarimani QAT'IY kamaytiradi, shuning uchun sikl albatta tugaydi.
 *
 * Kafolat: agar pool'da mos rol bo'lsa — takror bo'lmaydi. Agar bo'lmasa (mas. 5 kishilik
 * o'yinda 3 ta CIVILIAN va uchalasi ham o'tgan o'yinda tinch axoli edi) — jarima minimal
 * bo'ladigan variant tanlanadi.
 */
export function matchRolesAvoidingRepeat<T extends AssignTarget>(
  players: T[],
  roles: Role[],
  lastRoles: Map<number, Role>
): { player: T; role: Role }[] {
  const pool = shuffle(roles);
  const pairs: { player: T; role: Role }[] = [];

  // 1) Greedy
  for (const player of shuffle(players)) {
    if (pool.length === 0) break;
    const last = lastRoles.get(player.userId);
    let best = Infinity;
    let candidates: number[] = [];
    pool.forEach((role, i) => {
      const cost = repeatPenalty(last, role);
      if (cost < best) {
        best = cost;
        candidates = [i];
      } else if (cost === best) {
        candidates.push(i);
      }
    });
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    pairs.push({ player, role: pool[idx] });
    pool.splice(idx, 1);
  }

  // 2) Lokal qidiruv (2-swap)
  const costOf = (i: number, role: Role) =>
    repeatPenalty(lastRoles.get(pairs[i].player.userId), role);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 100) {
    improved = false;
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const before = costOf(i, pairs[i].role) + costOf(j, pairs[j].role);
        const after = costOf(i, pairs[j].role) + costOf(j, pairs[i].role);
        if (after < before) {
          const tmp = pairs[i].role;
          pairs[i].role = pairs[j].role;
          pairs[j].role = tmp;
          improved = true;
        }
      }
    }
  }

  return pairs;
}

/**
 * Validate that settings allow a valid game
 */
export function validateRoleSettings(settings: ChatSettings): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // At least Sheriff must be enabled (SHERIFF is always enabled in formula)
  // At least one protective role
  if (!settings.enableWarlock) {
    errors.push("Kamida bitta himoya roli (WARLOCK) yoqilgan bo'lishi kerak");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}