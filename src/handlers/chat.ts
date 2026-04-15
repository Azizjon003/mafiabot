import { Composer } from "grammy";
import { BotContext } from "../types/context";
import { gameManager } from "../game/manager";
import { MAFIA_ROLES, ROLE_EMOJI } from "../utils/constants";
import { logger } from "../utils/logger";
import { privateOnly } from "./middleware/chat-type";

export const chatHandler = new Composer<BotContext>();

// /say <matn> — Anonim shivir (DM only)
chatHandler.command("say", privateOnly, async (ctx) => {
  if (!ctx.from || !ctx.message?.text) return;

  const text = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!text) {
    await ctx.reply("⚠️ Foydalanish: <code>/say xabar matni</code>", { parse_mode: "HTML" });
    return;
  }

  // Foydalanuvchi qaysi o'yinda
  const telegramId = BigInt(ctx.from.id);
  let foundGame = null;
  for (const game of gameManager.getAllGames()) {
    const player = game.getPlayerByTelegramId(telegramId);
    if (player && player.isAlive) {
      foundGame = { engine: game, player };
      break;
    }
  }

  if (!foundGame) {
    await ctx.reply("⚠️ Anonim shivir faqat tirik o'yinchilar uchun!");
    return;
  }

  // Guruhga anonim yuborish
  try {
    await ctx.api.sendMessage(
      foundGame.engine.chatTelegramId.toString(),
      `🎭 <b>Kimdir shivirladi:</b>\n<i>${escapeHtml(text)}</i>`,
      { parse_mode: "HTML" }
    );
    await ctx.reply("✅ Shivir yuborildi.");
  } catch (e) {
    logger.error(e, "Whisper send error");
    await ctx.reply("❌ Yuborib bo'lmadi!");
  }
});

// Asosiy PM text handler — mafiya, o'lganlar chati, oxirgi so'z
chatHandler.on("message:text", async (ctx, next) => {
  if (!ctx.from || !ctx.message?.text) return next();
  if (ctx.chat.type !== "private") return next();

  // Buyruqlarni o'tkazish
  if (ctx.message.text.startsWith("/")) return next();

  const text = ctx.message.text.trim();
  if (!text) return next();

  const telegramId = BigInt(ctx.from.id);

  // ===== OXIRGI SO'Z (eng oldin tekshiramiz) =====
  const { lastWordsService } = await import("../services/last-words.service");
  const lwWindow = lastWordsService.consume(telegramId);
  if (lwWindow) {
    try {
      await ctx.api.sendMessage(
        lwWindow.chatTelegramId.toString(),
        `💀 <b>${escapeHtml(lwWindow.playerName)}ning oxirgi so'zi:</b>\n<i>${escapeHtml(text)}</i>`,
        { parse_mode: "HTML" }
      );
      await ctx.reply("✅ Oxirgi so'zingiz guruhga yetkazildi.");
    } catch (e) {
      logger.error(e, "Last words forward error");
      await ctx.reply("❌ Yuborib bo'lmadi.");
    }
    return;
  }

  // O'yinchi o'yindami
  let foundGame = null;
  for (const game of gameManager.getAllGames()) {
    const player = game.getPlayerByTelegramId(telegramId);
    if (player) {
      foundGame = { engine: game, player };
      break;
    }
  }

  if (!foundGame) return next(); // O'yinda emas

  const { player, engine } = foundGame;

  // ===== O'LGAN O'YINCHILAR CHATI =====
  if (!player.isAlive) {
    await broadcastDeadChat(ctx, engine, player.playerId, player.firstName, text);
    return;
  }

  // ===== MAFIYA JAMOA CHATI (faqat kechasi) =====
  if (MAFIA_ROLES.includes(player.role) && engine.status === "NIGHT") {
    await broadcastMafiaChat(ctx, engine, player.playerId, player.firstName, player.role, text);
    return;
  }

  // Boshqa holat — hech narsa qilmaymiz (next ga o'tkazmaymiz chunki tezlik)
  return next();
});

// Mafiya jamoasiga xabar
async function broadcastMafiaChat(
  ctx: BotContext, engine: any, senderId: number, senderName: string, senderRole: string, text: string
): Promise<void> {
  const mafia = engine.getMafiaMembers();
  const recipients = mafia.filter((m: any) => m.playerId !== senderId && m.isAlive);

  const emoji = ROLE_EMOJI[senderRole as keyof typeof ROLE_EMOJI] || "🤵🏼";
  const formatted = `${emoji} <b>${escapeHtml(senderName)}:</b> ${escapeHtml(text)}`;

  let sent = 0;
  for (const mate of recipients) {
    try {
      await ctx.api.sendMessage(mate.telegramId.toString(), formatted, { parse_mode: "HTML" });
      sent++;
    } catch {
      // ignore
    }
  }

  // Yuboruvchiga — tasdiq (tick bilan edit yoki hech narsa)
  if (sent === 0 && recipients.length === 0) {
    await ctx.reply("ℹ️ Boshqa tirik mafiya a'zosi yo'q.");
  }
}

// O'lganlar chatiga xabar
async function broadcastDeadChat(
  ctx: BotContext, engine: any, senderId: number, senderName: string, text: string
): Promise<void> {
  const allPlayers = [...engine.players.values()];
  const deadRecipients = allPlayers.filter((p: any) => !p.isAlive && p.playerId !== senderId);

  const formatted = `💀 <b>${escapeHtml(senderName)}:</b> ${escapeHtml(text)}`;

  let sent = 0;
  for (const mate of deadRecipients) {
    try {
      await ctx.api.sendMessage(mate.telegramId.toString(), formatted, { parse_mode: "HTML" });
      sent++;
    } catch {
      // ignore
    }
  }

  if (sent === 0 && deadRecipients.length === 0) {
    await ctx.reply("ℹ️ Boshqa o'lgan o'yinchi yo'q.");
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
