import { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { BotContext } from "../types/context";
import { PlayerState, NightResult, VoteResult } from "../types";
import { ROLE_EMOJI, ROLE_NAME, ROLE_TEAM, Team } from "../utils/constants";
import { mention, sleep } from "../utils/helpers";
import { uz } from "../locales/uz";
import { logger } from "../utils/logger";
import { Winner } from "@prisma/client";
import { getPhasePhotos } from "../config";

export class NotificationService {
  constructor(private bot: Bot<BotContext>) {}

  async sendPhasePhoto(chatId: bigint, phase: "night" | "day"): Promise<void> {
    try {
      const photos = getPhasePhotos();
      const fileId = photos[phase];
      if (!fileId) return;
      await this.bot.api.sendPhoto(chatId.toString(), fileId);
    } catch (error) {
      logger.error(error, `Faza rasmini yuborishda xatolik: ${chatId} (${phase})`);
    }
  }

  async muteGroup(chatId: bigint): Promise<void> {
    try {
      await this.bot.api.setChatPermissions(chatId.toString(), {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      });
    } catch (error) {
      logger.error(error, `Guruhni mute qilishda xatolik: ${chatId}`);
    }
  }

  async unmuteGroup(chatId: bigint): Promise<void> {
    try {
      await this.bot.api.setChatPermissions(chatId.toString(), {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      });
    } catch (error) {
      logger.error(error, `Guruhni unmute qilishda xatolik: ${chatId}`);
    }
  }

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
    let roleMessage = uz.roleAssigned[player.role];
    if (!roleMessage) return;

    // Shield faol bo'lsa — qo'shimcha bildirish
    if (player.hasShieldActive) {
      roleMessage += `\n\n🛡 <b>Shield faol!</b> 1 marta o'limdan saqlaydi (Snayperdan tashqari).`;
    }
    if (player.hasHeroActive) {
      roleMessage += `\n\n🥷 <b>Geroy faol!</b> Sizda maxsus qo'shimcha qobiliyat bor.`;
    }

    await this.sendToPlayer(player.telegramId, roleMessage);
  }

  async sendMafiaIntro(mafiaMembers: PlayerState[]): Promise<void> {
    const memberList = mafiaMembers
      .map((m) => `${ROLE_EMOJI[m.role]} ${mention(m.firstName, m.telegramId)}`)
      .join("\n");

    const text =
      `🤵🏼 <b>Mafiya jamoasi:</b>\n${memberList}\n\n` +
      `Tunda birgalikda nishon tanlaysiz!`;

    for (const member of mafiaMembers) {
      await this.sendToPlayer(member.telegramId, text);
    }
  }

  async announceNightResults(chatId: bigint, result: NightResult, showRole: boolean): Promise<void> {
    // Tong otmoqda — kirish xabari
    await this.sendToGroup(chatId, "🌅 <b>Tong otmoqda...</b>");
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
        await this.sendToGroup(chatId, "💊 Shifokor bir kishini saqlab qoldi!");
      } else {
        await this.sendToGroup(chatId, uz.game.noOneDied);
      }
      return;
    }

    for (const { player: dead, cause } of result.killed) {
      // Atmosferali o'lim hikoyasi
      const story = uz.deathStory[cause];
      let text = story
        ? story.replace("{name}", mention(dead.firstName, dead.telegramId))
        : uz.game.playerDied.replace("{name}", mention(dead.firstName, dead.telegramId));

      if (showRole) {
        text += `\nRoli: ${ROLE_EMOJI[dead.role]} <b>${ROLE_NAME[dead.role]}</b>`;
      }

      await this.sendToGroup(chatId, text);
      await sleep(2500);
    }

    // Shifokor saqlaganlar — shielddan tashqari
    const healedSaves = result.saved.filter(
      (s) => !shieldEvents.some((ev) => ev.actorId === s.playerId)
    );
    if (healedSaves.length > 0) {
      await this.sendToGroup(chatId, "💊 Shifokor bir kishini saqlab qoldi!");
    }
  }

  async announceVoteResults(chatId: bigint, result: VoteResult, showRole: boolean): Promise<void> {
    let text: string;

    if (!result.votedOut) {
      text =
        `Ovoz berish yakunlandi:\n` +
        `Axoli kelisha olmadi... Kelisha olmaslik oqibatida hech kim osilmadi...`;
    } else {
      // Hikoyali matn
      const deathStory = uz.deathStory["VOTED_OUT"];
      text = `Ovoz berish yakunlandi:\n` +
        deathStory.replace("{name}", mention(result.votedOut.firstName, result.votedOut.telegramId));

      if (showRole) {
        text += `\nRoli: ${ROLE_EMOJI[result.votedOut.role]} <b>${ROLE_NAME[result.votedOut.role]}</b>`;
      }
    }

    // Kamikaze
    if (result.kamikazeTarget) {
      text +=
        "\n\n" +
        uz.game.kamikazeActivated
          .replace("{name}", mention(result.votedOut!.firstName, result.votedOut!.telegramId))
          .replace("{target}", mention(result.kamikazeTarget.firstName, result.kamikazeTarget.telegramId));
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
    let text = "🎉 <b>O'yin tugadi!</b>\n\n";

    // Sarlavha
    switch (winner) {
      case "TOWN":
        text += `🏆 <b>Shahar yutdi!</b>\n\n`;
        break;
      case "MAFIA":
        text += `🏆 <b>Mafiya yutdi!</b>\n\n`;
        break;
      case "SOLO":
        text += `🏆 <b>${soloWinnerRole || "Yakka rol"} yutdi!</b>\n\n`;
        break;
      default:
        text += `🏁 <b>O'yin tugadi (durrang)</b>\n\n`;
    }

    // G'oliblar va qolganlar
    const winners = isWinnerFn ? players.filter(isWinnerFn) : [];
    const losers = isWinnerFn ? players.filter((p) => !isWinnerFn(p)) : players;

    if (winners.length > 0) {
      text += `🏆 <b>G'oliblar:</b>\n`;
      winners.forEach((p, i) => {
        text += `   ${i + 1}. ${mention(p.firstName, p.telegramId)} — ${ROLE_EMOJI[p.role]} ${ROLE_NAME[p.role]}\n`;
      });
      text += `\n`;
    }

    if (losers.length > 0) {
      text += `💀 <b>Qolgan o'yinchilar:</b>\n`;
      losers.forEach((p, i) => {
        text += `   ${winners.length + i + 1}. ${mention(p.firstName, p.telegramId)} — ${ROLE_EMOJI[p.role]} ${ROLE_NAME[p.role]}\n`;
      });
      text += `\n`;
    }

    if (durationMinutes !== undefined) {
      text += `⏱ O'yin: <b>${durationMinutes}</b> minut davom etdi\n`;
    }

    text += `\n🎭 Yangi o'yin boshlash: /startgame`;

    await this.sendToGroup(chatId, text);
  }
}
