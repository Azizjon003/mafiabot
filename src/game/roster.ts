import { GameEngine } from "./engine";
import { ROLE_EMOJI, ROLE_NAME, ROLE_TEAM, Team } from "../utils/constants";
import { mention } from "../utils/helpers";
import { t } from "../services/text.service";

// Tirik o'yinchilar ro'yxati + jamoa breakdown (rollar tarqatilganda va har kun)
// Geroydan zarar olganlar HP% bilan ko'rsatiladi: "3. Javohir — 56%"
export function buildRoster(engine: GameEngine): string {
  const alive = engine.getAlivePlayers();
  const playerList = alive
    .map((p, i) => {
      // HP 100 dan kam bo'lsa — HP% ko'rsat
      const hpSuffix = p.heroHP > 0 && p.heroHP < 100
        ? ` — <b>${Math.round(p.heroHP)}%</b> 🫀`
        : "";
      return `${i + 1}. ${mention(p.firstName, p.telegramId)}${hpSuffix}`;
    })
    .join("\n");

  const byTeam: Record<string, typeof alive> = { TOWN: [], MAFIA: [], SOLO: [] };
  for (const p of alive) {
    const team = ROLE_TEAM[p.role];
    const key = team === Team.NEUTRAL ? "MAFIA" : team;
    if (byTeam[key]) byTeam[key].push(p);
  }

  const rolesLine = (players: typeof alive) =>
    players.map((p) => `${ROLE_EMOJI[p.role]} ${ROLE_NAME[p.role]}`).join(", ");

  const soloBlock = byTeam.SOLO.length > 0
    ? t("game.playerRosterSoloBlock", {
        soloCount: byTeam.SOLO.length,
        soloRoles: rolesLine(byTeam.SOLO),
      })
    : "";

  return t("game.playerRoster", {
    playerList,
    townCount: byTeam.TOWN.length,
    townRoles: rolesLine(byTeam.TOWN),
    mafiaCount: byTeam.MAFIA.length,
    mafiaRoles: rolesLine(byTeam.MAFIA),
    soloBlock,
    total: alive.length,
  });
}
