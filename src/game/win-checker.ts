import { Winner } from "@prisma/client";
import { PlayerState } from "../types";
import { ROLE_TEAM, Team, MAFIA_ROLES } from "../utils/constants";

export function checkWinCondition(players: PlayerState[]): Winner | null {
  const alive = players.filter((p) => p.isAlive);

  const townAlive = alive.filter((p) => ROLE_TEAM[p.role] === Team.TOWN);
  const mafiaAlive = alive.filter((p) => ROLE_TEAM[p.role] === Team.MAFIA);
  const soloAlive = alive.filter((p) => ROLE_TEAM[p.role] === Team.SOLO);
  // Neutral (Sotqin) — jamoa o'zgargandan keyin boshqa teamga o'tadi

  // Agar hech kim qolmasa — durrang
  if (alive.length === 0) return "DRAW";

  // Mafiya yutadi: mafiya soni >= shahar soni (solo hisobga olinmaydi)
  if (mafiaAlive.length > 0 && mafiaAlive.length >= townAlive.length && soloAlive.length === 0) {
    return "MAFIA";
  }

  // Yakka rol yutadi: faqat solo qolsa
  if (soloAlive.length > 0 && townAlive.length === 0 && mafiaAlive.length === 0) {
    return "SOLO";
  }

  // Shahar yutadi: barcha mafiya va solo o'lgan
  if (mafiaAlive.length === 0 && soloAlive.length === 0) {
    return "TOWN";
  }

  // O'yin davom etadi
  return null;
}
