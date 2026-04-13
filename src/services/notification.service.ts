import { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { BotContext } from "../types/context";
import { PlayerState, NightResult, VoteResult } from "../types";
import { ROLE_EMOJI, ROLE_NAME, ROLE_TEAM, Team } from "../utils/constants";
import { mention } from "../utils/helpers";
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
    let text = "";

    if (result.killed.length === 0) {
      text = uz.game.noOneDied;
    } else {
      for (const { player: dead, cause } of result.killed) {
        // Atmosferali o'lim hikoyasi
        const story = uz.deathStory[cause];
        if (story) {
          text += story.replace("{name}", mention(dead.firstName, dead.telegramId));
        } else {
          text += uz.game.playerDied.replace("{name}", mention(dead.firstName, dead.telegramId));
        }

        if (showRole) {
          text += ` Roli: ${ROLE_EMOJI[dead.role]} <b>${ROLE_NAME[dead.role]}</b>`;
        }
        text += "\n\n";
      }
    }

    // Shield ishlatilganlar — guruhga maxsus xabar
    const shieldEvents = result.events.filter((e) => e.type === "SHIELD_USED");
    for (const ev of shieldEvents) {
      text += ev.message + "\n";
    }

    // Shifokor davolaganlar (shield emas)
    const healedSaves = result.saved.filter(
      (s) => !shieldEvents.some((ev) => ev.actorId === s.playerId)
    );
    if (healedSaves.length > 0) {
      text += "💊 Shifokor bir kishini saqlab qoldi!";
    }

    await this.sendToGroup(chatId, text);
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
    soloWinnerRole?: string
  ): Promise<void> {
    let text: string;

    switch (winner) {
      case "TOWN":
        text = uz.game.townWins;
        break;
      case "MAFIA":
        text = uz.game.mafiaWins;
        break;
      case "SOLO":
        text = uz.game.soloWins.replace("{role}", soloWinnerRole || "Yakka rol");
        break;
      default:
        text = uz.game.gameFinished;
    }

    // Barcha rollar ro'yxati
    const roleList = players
      .map((p) => {
        const status = p.isAlive ? "✅" : "💀";
        return `${status} ${mention(p.firstName, p.telegramId)} — ${ROLE_EMOJI[p.role]} ${ROLE_NAME[p.role]}`;
      })
      .join("\n");

    text += uz.game.finalRoles.replace("{list}", roleList);
    text += `\n\n🎭 Yangi o'yin boshlash: /startgame`;

    await this.sendToGroup(chatId, text);
  }
}
