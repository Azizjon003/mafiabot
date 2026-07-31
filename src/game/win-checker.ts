import { Winner } from "@prisma/client";
import { PlayerState } from "../types";
import { ROLE_TEAM, Team, MAFIA_ROLES, SOLO_ROLES } from "../utils/constants";

/**
 * G'olib aniqlash.
 * - Mafiya yutadi: mafiya soni barcha boshqa tirik o'yinchilar soniga teng yoki ko'p bo'lganda
 * - Yakka rol yutadi: faqat bitta yakka rol tirik qolganda (boshqa barcha o'lganda)
 * - Shahar yutadi: barcha mafiya va yakka rollar o'lganda
 * - DRAW: hech kim qolmasa (kamdan-kam 2 yakka rol birgalikda qolganida maxRounds da)
 */
export function checkWinCondition(
  players: PlayerState[],
  maxRounds?: number,
  currentRound?: number
): { winner: Winner | null; winners: number[] } {
  const alive = players.filter((p) => p.isAlive);
  
  if (alive.length === 0) {
    return { winner: "DRAW", winners: [] };
  }

  const mafiaAlive = alive.filter((p) => MAFIA_ROLES.includes(p.role));
  const townAlive = alive.filter((p) => ROLE_TEAM[p.role] === Team.TOWN);
  const soloAlive = alive.filter((p) => SOLO_ROLES.includes(p.role));

  // MAFIA WINS: mafiaAlive >= all other alive players combined
  // (mafia >= townAlive + soloAlive)
  if (mafiaAlive.length > 0 && mafiaAlive.length >= (townAlive.length + soloAlive.length)) {
    return { 
      winner: "MAFIA", 
      winners: mafiaAlive.map(p => p.playerId) 
    };
  }

  // SOLO WIN: exactly one solo role alive, everyone else dead
  if (soloAlive.length > 0 && townAlive.length === 0 && mafiaAlive.length === 0) {
    if (soloAlive.length === 1) {
      return { 
        winner: "SOLO", 
        winners: soloAlive.map(p => p.playerId) 
      };
    }
    // Multiple solo roles alive -> DRAW (they can't kill each other)
    return { winner: "DRAW", winners: soloAlive.map(p => p.playerId) };
  }

  // TOWN WINS: all mafia and solo dead
  if (mafiaAlive.length === 0 && soloAlive.length === 0) {
    return { 
      winner: "TOWN", 
      winners: townAlive.map(p => p.playerId) 
    };
  }

  // MAX ROUNDS — chegaraga yetildi va hali g'olib yo'q → DURANG
  // (o'ldira olmaydigan rollar tiqilib qolganda o'yin cheksiz cho'zilmasligi uchun)
  if (maxRounds !== undefined && currentRound !== undefined && maxRounds > 0 && currentRound >= maxRounds) {
    return { winner: "DRAW", winners: alive.map((p) => p.playerId) };
  }

  // GAME CONTINUES
  return { winner: null, winners: [] };
}