import { Role } from "@prisma/client";
import { GameEngine } from "../engine";
import { NotificationService } from "../../services/notification.service";
import { nightActionKeyboard, professorBoxesKeyboard } from "../../keyboards/game";
import { t } from "../../services/text.service";
import { MAFIA_KILL_VOTERS, MAFIA_ROLES, PACING, ROLE_EMOJI, ROLE_NAME, ROLE_TEAM, Team } from "../../utils/constants";
import { PlayerState } from "../../types";
import { mention, sleep } from "../../utils/helpers";

// Guruhga tundagi hikoya matnlarini yuborish
export async function sendNightStories(
  engine: GameEngine,
  notifier: NotificationService
): Promise<void> {
  const alive = engine.getAlivePlayers();
  const sentRoles = new Set<string>();
  let isFirst = true;

  // Har bir faol rolning hikoya matni
  for (const player of alive) {
    const story = t(`nightStory.${player.role}`);
    const hasStory = story && story !== `nightStory.${player.role}`;
    if (!hasStory || sentRoles.has(player.role)) continue;
    // Mafiya faqat bir marta chiqadi (DON va MAFIA bitta)
    if (player.role === "MAFIA" && sentRoles.has("DON")) continue;
    if (player.role === "DON" && sentRoles.has("MAFIA")) continue;

    // Tun tugagan bo'lsa (masalan hamma tezroq harakat qilgan), hikoyalarni davom ettirmaymiz
    if (engine.status !== "NIGHT") return;

    // Birinchi xabardan oldin emas, faqat xabarlar orasida pauza
    if (!isFirst) await sleep(PACING.NIGHT_STORY_MS);
    isFirst = false;

    sentRoles.add(player.role);
    await notifier.sendToGroup(engine.chatTelegramId, story).catch(() => {});
  }
}

// Har bir rolga tundagi xabar yuborish (shaxsiy chatda)
export async function sendNightPrompts(
  engine: GameEngine,
  notifier: NotificationService
): Promise<void> {
  const alive = engine.getAlivePlayers();

  for (const player of alive) {
    switch (player.role) {
      case "HOOKER":
        await sendHookerPrompt(engine, notifier, player, alive);
        break;
      case "TRAITOR":
        await sendTraitorPrompt(engine, notifier, player, alive);
        break;
      case "LAWYER":
        await sendLawyerPrompt(engine, notifier, player);
        break;
      case "SPY":
        await sendSpyPrompt(engine, notifier, player, alive);
        break;
      case "DON":
      case "MAFIA":
        await sendMafiaPrompt(engine, notifier, player, alive);
        break;
      case "LAB":
        await sendLabPrompt(engine, notifier, player, alive);
        break;
      case "SHERIFF":
        await sendSheriffPrompt(engine, notifier, player, alive);
        break;
      case "SERGEANT":
        await sendSergeantPrompt(engine, notifier, player);
        break;
      case "DOCTOR":
        await sendDoctorPrompt(engine, notifier, player, alive);
        break;
      case "WARLOCK":
        await sendWarlockPrompt(engine, notifier, player, alive);
        break;
      case "TRAMP":
        await sendTrampPrompt(engine, notifier, player, alive);
        break;
      case "KILLER":
        await sendKillerPrompt(engine, notifier, player, alive);
        break;
      case "SNIPER":
        await sendSniperPrompt(engine, notifier, player, alive);
        break;
      case "ARCHER":
        await sendArcherPrompt(engine, notifier, player, alive);
        break;
      case "MINER":
        await sendMinerPrompt(engine, notifier, player, alive);
        break;
      case "SNOWBOY":
        await sendSnowboyPrompt(engine, notifier, player, alive);
        break;
      case "SANTA":
        await sendSantaPrompt(engine, notifier, player, alive);
        break;
      case "ROBBER":
        await sendRobberPrompt(engine, notifier, player, alive);
        break;
      case "PROFESSOR":
        await sendProfessorPrompt(engine, notifier, player, alive);
        break;
    }
  }
}

async function sendHookerPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_hooker`);
  await notifier.sendToPlayer(player.telegramId, t("night.hookerPrompt"), kb);
}

async function sendTraitorPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_traitor`);
  await notifier.sendToPlayer(player.telegramId, t("night.traitorPrompt"), kb);
}

async function sendLawyerPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState) {
  const mafiaMembers = engine.getMafiaMembers().filter((p) => p.playerId !== player.playerId);
  if (mafiaMembers.length === 0) return;
  const kb = nightActionKeyboard(mafiaMembers, `night_lawyer`);
  await notifier.sendToPlayer(player.telegramId, t("night.lawyerPrompt"), kb);
}

async function sendSpyPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId && !MAFIA_ROLES.includes(p.role));
  const kb = nightActionKeyboard(targets, `night_spy`);
  await notifier.sendToPlayer(player.telegramId, t("night.spyPrompt"), kb);
}

async function sendMafiaPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => !MAFIA_ROLES.includes(p.role));
  const mafiaNames = engine.getMafiaMembers()
    .map((m) => `${ROLE_EMOJI[m.role]} ${m.firstName}`)
    .join(", ");

  const text = t("night.mafiaPrompt", { members: mafiaNames });
  const kb = nightActionKeyboard(targets, `night_mafia`);
  await notifier.sendToPlayer(player.telegramId, text, kb);
}

async function sendLabPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_lab`);
  await notifier.sendToPlayer(player.telegramId, t("night.labPrompt"), kb);
}

async function sendSheriffPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const showSkip = engine.currentRound > 1; // Birinchi tunda skip taqiqlanadi
  const kb = nightActionKeyboard(targets, `night_sheriff`, showSkip);
  await notifier.sendToPlayer(player.telegramId, t("night.sheriffPrompt"), kb);
}

async function sendSergeantPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState) {
  // Serjant avtomatik ma'lumot oladi
  await notifier.sendToPlayer(player.telegramId, t("night.sergeantPrompt"));
  engine.submitNightAction(player.playerId, player.playerId, "SERGEANT");
  engine.markNightRoleDone("SERGEANT");
}

async function sendDoctorPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  let targets = alive.filter((p) => p.playerId !== player.playerId);
  // O'zini qo'shish (agar hali davolamagan bo'lsa)
  if (!player.doctorSelfHealUsed) {
    targets = alive; // O'zini ham tanlashi mumkin
  }
  const kb = nightActionKeyboard(targets, `night_doctor`);
  await notifier.sendToPlayer(player.telegramId, t("night.doctorPrompt"), kb);
}

async function sendWarlockPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_warlock`);
  await notifier.sendToPlayer(player.telegramId, t("night.warlockPrompt"), kb);
}

async function sendTrampPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_tramp`);
  await notifier.sendToPlayer(player.telegramId, t("night.trampPrompt"), kb);
}

async function sendKillerPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_killer`);
  await notifier.sendToPlayer(player.telegramId, t("night.killerPrompt"), kb);
}

async function sendSniperPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_sniper`);
  await notifier.sendToPlayer(player.telegramId, t("night.sniperPrompt"), kb);
}

async function sendArcherPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_archer`);
  await notifier.sendToPlayer(player.telegramId, t("night.archerPrompt"), kb);
}

async function sendMinerPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_miner`);
  await notifier.sendToPlayer(player.telegramId, t("night.minerPrompt"), kb);
}

async function sendSnowboyPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_snowboy`);
  await notifier.sendToPlayer(player.telegramId, t("night.snowboyPrompt"), kb);
}

async function sendSantaPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_santa`);
  await notifier.sendToPlayer(player.telegramId, t("night.santaPrompt"), kb);
}

async function sendRobberPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_robber`);
  await notifier.sendToPlayer(player.telegramId, t("night.robberPrompt"), kb);
}

async function sendProfessorPrompt(engine: GameEngine, notifier: NotificationService, player: PlayerState, alive: PlayerState[]) {
  const targets = alive.filter((p) => p.playerId !== player.playerId);
  const kb = nightActionKeyboard(targets, `night_professor`);
  await notifier.sendToPlayer(player.telegramId, t("night.professorPrompt"), kb);
}

// Nishonga 3 ta yopiq quti yuborish
export async function sendProfessorBoxesToTarget(notifier: NotificationService, target: PlayerState) {
  const kb = professorBoxesKeyboard(target.playerId);
  await notifier.sendToPlayer(target.telegramId, t("night.professorBoxesPrompt"), kb);
}
