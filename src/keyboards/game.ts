import { InlineKeyboard } from "grammy";
import { ChatSettings } from "@prisma/client";
import { PlayerState } from "../types";
import { t } from "../services/text.service";

export function joinGameKeyboard(gameId: number, botUsername: string, chatId: bigint): InlineKeyboard {
  return new InlineKeyboard()
    .url("✅ Qo'shilish", `https://t.me/${botUsername}?start=join_${chatId}`);
}

// Osishni tasdiqlash — 👍/👎
export function confirmHangKeyboard(gameId: number, targetPlayerId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("👍 0", `confirm_hang:${gameId}:${targetPlayerId}:yes`)
    .text("👎 0", `confirm_hang:${gameId}:${targetPlayerId}:no`);
}

export function nightActionKeyboard(
  players: PlayerState[],
  actionPrefix: string,
  showSkip: boolean = true
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const player of players) {
    kb.text(`👤 ${player.firstName}`, `${actionPrefix}:${player.playerId}`).row();
  }
  if (showSkip) {
    kb.text("🚫 O'tkazish", `${actionPrefix}:skip`);
  }
  return kb;
}

// Qaroqchi nishoni uchun — "Pul ber / Bosh tort"
export function robberResponseKeyboard(gameId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("💰 Pul beraman", `robber_response:${gameId}:pay`)
    .text("🏃 Bosh tortaman", `robber_response:${gameId}:refuse`);
}

// Komissar uchun — avval nishon tanlash, keyin "Tekshirish / Otish"
export function sheriffActionKeyboard(targetPlayerId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔍 Tekshirish", `sheriff_action:check:${targetPlayerId}`)
    .text("🔫 Otish", `sheriff_action:shoot:${targetPlayerId}`)
    .row()
    .text("🔙 Ortga", `sheriff_action:back`);
}

// Professor qutilari — nishonga 3 ta yopiq quti taklif qilinadi
export function professorBoxesKeyboard(targetPlayerId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("🎁", `professor_box:${targetPlayerId}:0`)
    .text("🎁", `professor_box:${targetPlayerId}:1`)
    .text("🎁", `professor_box:${targetPlayerId}:2`);
}

export function mafiaTargetKeyboard(
  players: PlayerState[],
  gameId: number
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const player of players) {
    kb.text(`👤 ${player.firstName}`, `mafia_kill:${player.playerId}`).row();
  }
  kb.text("🚫 O'tkazish", `mafia_kill:skip`);
  return kb;
}

// Guruhda — faqat "Ovoz berish" URL tugma (botga o'tkazadi)
export function votingButtonKeyboard(botUsername: string, chatId: bigint): InlineKeyboard {
  return new InlineKeyboard()
    .url(t("game.votingButton"), `https://t.me/${botUsername}?start=vote_${chatId}`);
}

// PMda — o'yinchilar ro'yxati (shaxsiy chatda)
export function votingPlayerListKeyboard(
  gameId: number,
  players: PlayerState[]
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const player of players) {
    kb.text(`👤 ${player.firstName}`, `vote:${gameId}:${player.playerId}`).row();
  }
  kb.text(`🚫 Hech kimga`, `vote:${gameId}:skip`);
  return kb;
}

export function kamikazeTargetKeyboard(
  players: PlayerState[]
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const player of players) {
    kb.text(`💣 ${player.firstName}`, `kamikaze:${player.playerId}`).row();
  }
  kb.text("🚫 Hech kimni", `kamikaze:skip`);
  return kb;
}

// ==================== SETTINGS ====================

const SETTINGS_KEYS = [
  "registrationTimeout",
  "nightTimeout",
  "dayDiscussionTimeout",
  "votingTimeout",
  "minPlayers",
  "maxPlayers",
] as const;

export type SettingKey = (typeof SETTINGS_KEYS)[number];

export const SETTING_LIMITS: Record<SettingKey, { min: number; max: number; steps: number[] }> = {
  registrationTimeout: { min: 30, max: 300, steps: [-30, -10, 10, 30] },
  nightTimeout: { min: 30, max: 180, steps: [-30, -10, 10, 30] },
  dayDiscussionTimeout: { min: 30, max: 300, steps: [-30, -10, 10, 30] },
  votingTimeout: { min: 30, max: 180, steps: [-30, -10, 10, 30] },
  minPlayers: { min: 3, max: 10, steps: [-2, -1, 1, 2] },
  maxPlayers: { min: 10, max: 30, steps: [-5, -1, 1, 5] },
};

export function settingsText(settings: ChatSettings): string {
  const lines = [
    t("settings.title"),
    "",
    t("settings.registrationTimeout", { value: settings.registrationTimeout }),
    t("settings.nightTimeout", { value: settings.nightTimeout }),
    t("settings.dayDiscussionTimeout", { value: settings.dayDiscussionTimeout }),
    t("settings.votingTimeout", { value: settings.votingTimeout }),
    t("settings.minPlayers", { value: settings.minPlayers }),
    t("settings.maxPlayers", { value: settings.maxPlayers }),
    t("settings.muteOnNight", { value: settings.muteOnNight ? "Yoqiq ✅" : "O'chiq ❌" }),
  ];
  return lines.join("\n");
}

export function settingsMainKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(t("settings.btn.registrationTimeout"), "settings:registrationTimeout")
    .text(t("settings.btn.nightTimeout"), "settings:nightTimeout")
    .row()
    .text(t("settings.btn.dayDiscussionTimeout"), "settings:dayDiscussionTimeout")
    .text(t("settings.btn.votingTimeout"), "settings:votingTimeout")
    .row()
    .text(t("settings.btn.minPlayers"), "settings:minPlayers")
    .text(t("settings.btn.maxPlayers"), "settings:maxPlayers")
    .row()
    .text(t("settings.btn.muteOnNight"), "settings:muteOnNight");
}

export function settingsEditKeyboard(key: SettingKey, currentValue: number): InlineKeyboard {
  const limits = SETTING_LIMITS[key];
  const kb = new InlineKeyboard();
  for (const step of limits.steps) {
    const label = step > 0 ? `+${step}` : `${step}`;
    kb.text(label, `settings_adj:${key}:${step}`);
  }
  kb.row().text(t("settings.back"), "settings:back");
  return kb;
}

export function settingsEditText(key: SettingKey, value: number): string {
  return t(`settings.${key}`, { value });
}
