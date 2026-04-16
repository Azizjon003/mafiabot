import { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { BotContext } from "../types/context";
import { PlayerState, NightResult, VoteResult } from "../types";
import { ROLE_EMOJI, ROLE_NAME, ROLE_TEAM, Team } from "../utils/constants";
import { mention, sleep } from "../utils/helpers";
import { t } from "./text.service";
import { logger } from "../utils/logger";
import { Winner } from "@prisma/client";
import { getPhasePhotos } from "../config";

export class NotificationService {
  constructor(private bot: Bot<BotContext>) {}

  async sendPhasePhoto(
    chatId: bigint,
    phase: "night" | "day",
    caption?: string,
    keyboard?: InlineKeyboard,
  ): Promise<boolean> {
    try {
      const photos = getPhasePhotos();
      const fileId = photos[phase];
      if (!fileId) return false;
      await this.bot.api.sendPhoto(chatId.toString(), fileId, {
        caption,
        parse_mode: caption ? "HTML" : undefined,
        reply_markup: keyboard,
      });
      return true;
    } catch (error) {
      logger.error(error, `Faza rasmini yuborishda xatolik: ${chatId} (${phase})`);
      return false;
    }
  }

  // Eski mute/unmute tizimi olib tashlandi — endi xabarlar avtomatik o'chiriladi
  // src/handlers/night-silence.ts orqali
  async muteGroup(_chatId: bigint): Promise<void> { /* no-op */ }
  async unmuteGroup(_chatId: bigint): Promise<void> { /* no-op */ }

  async sendToGroup(chatId: bigint, text: string, keyboard?: InlineKeyboard): Promise<number | undefined> {
    try {
      const msg = await this.bot.api.sendMessage(chatId.toString(), text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      return msg.message_id;
    } catch (error) {
      logger.error(error, `Guruhga xabar yuborishda xatolik: ${chatId}`);
      return undefined;
    }
  }

  async pinMessage(chatId: bigint, messageId: number, silent = true): Promise<void> {
    try {
      await this.bot.api.pinChatMessage(chatId.toString(), messageId, {
        disable_notification: silent,
      });
    } catch (error) {
      logger.error(error, `Xabarni pin qilishda xatolik: ${chatId}/${messageId}`);
    }
  }

  async unpinMessage(chatId: bigint, messageId: number): Promise<void> {
    try {
      await this.bot.api.unpinChatMessage(chatId.toString(), messageId);
    } catch (error) {
      // Allaqachon unpin bo'lgan yoki ruxsat yo'q — ignore
    }
  }

  async editGroupMessage(chatId: bigint, messageId: number, text: string, keyboard?: InlineKeyboard): Promise<void> {
    try {
      await this.bot.api.editMessageText(chatId.toString(), messageId, text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (error) {
      // Xabar o'zgarmagan bo'lsa xatolik chiqadi, ignore
    }
  }

  async sendToPlayer(telegramId: bigint, text: string, keyboard?: InlineKeyboard): Promise<number | undefined> {
    try {
      const msg = await this.bot.api.sendMessage(telegramId.toString(), text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      return msg.message_id;
    } catch (error) {
      logger.error(error, `Shaxsiy xabar yuborishda xatolik: ${telegramId}`);
      return undefined;
    }
  }

  async sendRoleToPlayer(player: PlayerState): Promise<void> {
    let roleMessage = t(`roleAssigned.${player.role}`);
    if (!roleMessage) return;

    // Shield faol bo'lsa — qo'shimcha bildirish
    if (player.hasShieldActive) {
      roleMessage += t("roleAssigned.shieldActive");
    }
    if (player.hasHeroActive) {
      roleMessage += t("roleAssigned.heroActive");
    }

    await this.sendToPlayer(player.telegramId, roleMessage);
  }

  async sendMafiaIntro(mafiaMembers: PlayerState[]): Promise<void> {
    const memberList = mafiaMembers
      .map((m) => `${ROLE_EMOJI[m.role]} ${mention(m.firstName, m.telegramId)}`)
      .join("\n");

    const text = t("game.mafiaIntro", { members: memberList });

    for (const member of mafiaMembers) {
      await this.sendToPlayer(member.telegramId, text);
    }
  }

  async announceNightResults(chatId: bigint, result: NightResult, showRole: boolean): Promise<void> {
    // Tong otmoqda — kirish xabari
    await this.sendToGroup(chatId, t("game.morningRising"));
    await sleep(5000);

    // Shield ishlatilganlar — alohida xabar (anonim)
    const shieldEvents = result.events.filter((e) => e.type === "SHIELD_USED");
    for (const ev of shieldEvents) {
      await this.sendToGroup(chatId, ev.message);
      await sleep(2500);
    }

    // O'limlar — har biri alohida xabar, orasida pauza
    if (result.killed.length === 0) {
      // Hech kim o'lmadi
      const healedSaves = result.saved.filter(
        (s) => !shieldEvents.some((ev) => ev.actorId === s.playerId)
      );
      if (healedSaves.length > 0) {
        await this.sendToGroup(chatId, t("game.doctorSaved"));
      } else {
        await this.sendToGroup(chatId, t("game.noOneDied"));
      }
      return;
    }

    for (const { player: dead, cause } of result.killed) {
      // Atmosferali o'lim hikoyasi
      const nameMention = mention(dead.firstName, dead.telegramId);
      const roleInline = showRole
        ? ` ${ROLE_EMOJI[dead.role]} <b>${ROLE_NAME[dead.role]}</b>`
        : "";
      const story = t(`deathStory.${cause}`, { name: nameMention, roleInline });
      // Agar kalit topilmasa (t key'ni qaytaradi) — playerDied ga tushamiz
      const text = story && story !== `deathStory.${cause}`
        ? story
        : t("game.playerDied", { name: nameMention, roleInline });

      await this.sendToGroup(chatId, text);
      await sleep(2500);
    }

    // Shifokor saqlaganlar — shielddan tashqari
    const healedSaves = result.saved.filter(
      (s) => !shieldEvents.some((ev) => ev.actorId === s.playerId)
    );
    if (healedSaves.length > 0) {
      await this.sendToGroup(chatId, t("game.doctorSaved"));
    }
  }

  async announceVoteResults(chatId: bigint, result: VoteResult, showRole: boolean): Promise<void> {
    let text: string;

    if (!result.votedOut) {
      text = t("game.voteInconclusive");
    } else {
      const roleInline = showRole
        ? ` ${ROLE_EMOJI[result.votedOut.role]} <b>${ROLE_NAME[result.votedOut.role]}</b>`
        : "";
      text = t("game.voteEndedPrefix") +
        t("deathStory.VOTED_OUT", {
          name: mention(result.votedOut.firstName, result.votedOut.telegramId),
          roleInline,
        });
    }

    // Kamikaze
    if (result.kamikazeTarget) {
      text +=
        "\n\n" +
        t("game.kamikazeActivated", {
          name: mention(result.votedOut!.firstName, result.votedOut!.telegramId),
          target: mention(result.kamikazeTarget.firstName, result.kamikazeTarget.telegramId),
        });
    }

    await this.sendToGroup(chatId, text);
  }

  async announceGameEnd(
    chatId: bigint,
    winner: Winner,
    players: PlayerState[],
    soloWinnerRole?: string,
    isWinnerFn?: (player: PlayerState) => boolean,
    durationMinutes?: number
  ): Promise<void> {
    let text = t("game.gameEndHeader");

    // Sarlavha
    switch (winner) {
      case "TOWN":
        text += t("game.townWinsHeader");
        break;
      case "MAFIA":
        text += t("game.mafiaWinsHeader");
        break;
      case "SOLO":
        text += t("game.soloWinsHeader", { role: soloWinnerRole || "Yakka rol" });
        break;
      default:
        text += t("game.gameEndDraw");
    }

    // G'oliblar va qolganlar
    const winners = isWinnerFn ? players.filter(isWinnerFn) : [];
    const losers = isWinnerFn ? players.filter((p) => !isWinnerFn(p)) : players;

    if (winners.length > 0) {
      text += t("game.gameEndWinnersLabel");
      winners.forEach((p, i) => {
        text += `   ${i + 1}. ${mention(p.firstName, p.telegramId)} — ${ROLE_EMOJI[p.role]} ${ROLE_NAME[p.role]}\n`;
      });
      text += `\n`;
    }

    if (losers.length > 0) {
      text += t("game.gameEndLosersLabel");
      losers.forEach((p, i) => {
        text += `   ${winners.length + i + 1}. ${mention(p.firstName, p.telegramId)} — ${ROLE_EMOJI[p.role]} ${ROLE_NAME[p.role]}\n`;
      });
      text += `\n`;
    }

    if (durationMinutes !== undefined) {
      text += t("game.gameEndDuration", { min: durationMinutes });
    }

    text += t("game.gameEndFooter");

    await this.sendToGroup(chatId, text);
  }
}
