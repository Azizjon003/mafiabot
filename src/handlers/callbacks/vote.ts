import { Composer, InlineKeyboard } from "grammy";
import { BotContext } from "../../types/context";
import { GameController } from "../../game/controller";
import { gameManager } from "../../game/manager";
import { t } from "../../services/text.service";
import { mention } from "../../utils/helpers";

export function createVoteCallbacks(controller: GameController): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  // Ovoz berish: vote:{gameId}:{playerId|skip} — PMda keladi
  composer.callbackQuery(/^vote:(\d+):(.+)$/, async (ctx) => {
    if (!ctx.from) return;

    const gameId = parseInt(ctx.match[1]);
    const targetValue = ctx.match[2];

    // O'yinni topish
    let engine = null;
    for (const game of gameManager.getAllGames()) {
      if (game.gameId === gameId) {
        engine = game;
        break;
      }
    }

    if (!engine || engine.status !== "VOTING") {
      await ctx.answerCallbackQuery({ text: "Hozir ovoz berish vaqti emas!" });
      return;
    }

    const voter = engine.getPlayerByTelegramId(BigInt(ctx.from.id));
    if (!voter) {
      await ctx.answerCallbackQuery({ text: "Siz bu o'yinda emassiz!" });
      return;
    }
    if (!voter.isAlive) {
      await ctx.answerCallbackQuery({ text: t("errors.playerDead") });
      return;
    }

    // Allaqachon ovoz berganmi
    if (engine.hasVoted(voter.playerId)) {
      await ctx.answerCallbackQuery({ text: "⚠️ Siz allaqachon ovoz bergansiz!" }).catch(() => {});
      await ctx.editMessageText("⚠️ Siz allaqachon ovoz bergansiz!", { parse_mode: "HTML" }).catch(() => {});
      return;
    }

    const targetId = targetValue === "skip" ? -1 : parseInt(targetValue);
    if (isNaN(targetId) && targetValue !== "skip") {
      await ctx.answerCallbackQuery({ text: t("errors.invalidTarget") }).catch(() => {});
      return;
    }

    // DARHOL answerCallbackQuery
    const target = targetId === -1 ? null : engine.getPlayer(targetId);
    await ctx.answerCallbackQuery({ text: target ? `✅ ${target.firstName}ga ovoz berdingiz` : "🚫 Hech kimga" }).catch(() => {});

    // Ovoz berish
    engine.submitVote(voter.playerId, targetId);

    // PMda tasdiqlash
    if (targetId === -1) {
      await ctx.editMessageText("🚫 Hech kimga ovoz berdingiz.", { parse_mode: "HTML" }).catch(() => {});
    } else {
      await ctx.editMessageText(
        `✅ Siz <b>${target?.firstName}</b>ga ovoz berdingiz.`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }

    // GURUHGA alohida xabar
    try {
      const voteText = target
        ? `${mention(voter.firstName, voter.telegramId)} 👊 -- ${mention(target.firstName, target.telegramId)} ga ovoz berdi`
        : `${mention(voter.firstName, voter.telegramId)} -- <b>Hech kimga</b> ovoz berdi`;

      await ctx.api.sendMessage(engine.chatTelegramId.toString(), voteText, { parse_mode: "HTML" });
    } catch {
      // ignore
    }
  });

  // Osishni tasdiqlash: confirm_hang:{gameId}:{targetPlayerId}:{yes|no}
  composer.callbackQuery(/^confirm_hang:(\d+):(\d+):(yes|no)$/, async (ctx) => {
    const chatId = ctx.callbackQuery.message?.chat.id;
    if (!chatId || !ctx.from) return;

    const gameId = parseInt(ctx.match[1]);
    const targetPlayerId = parseInt(ctx.match[2]);
    const vote = ctx.match[3]; // "yes" or "no"

    const chatTelegramId = BigInt(chatId);
    const engine = gameManager.getGame(chatTelegramId);

    if (!engine || engine.gameId !== gameId || engine.status !== "CONFIRMING" || !engine.pendingHangTarget) {
      await ctx.answerCallbackQuery({ text: "Bu ovoz berish tugagan!" }).catch(() => {});
      return;
    }

    const voter = engine.getPlayerByTelegramId(BigInt(ctx.from.id));
    if (!voter || !voter.isAlive) {
      await ctx.answerCallbackQuery({ text: "Siz ovoz bera olmaysiz!" }).catch(() => {});
      return;
    }

    // Osilayotgan odam ovoz bera olmaydi
    if (voter.playerId === engine.pendingHangTarget) {
      await ctx.answerCallbackQuery({ text: "Siz o'zingizga ovoz bera olmaysiz!" }).catch(() => {});
      return;
    }

    // Ovoz berish
    engine.submitConfirmVote(voter.playerId, vote === "yes");
    await ctx.answerCallbackQuery({ text: vote === "yes" ? "👍 Ha" : "👎 Yo'q" }).catch(() => {});

    // Keyboard yangilash — countlar
    const { yes, no } = engine.getConfirmCounts();
    const candidate = engine.getPlayer(targetPlayerId);
    const candidateName = candidate?.firstName || "???";

    const kb = new InlineKeyboard()
      .text(`👍 ${yes}`, `confirm_hang:${gameId}:${targetPlayerId}:yes`)
      .text(`👎 ${no}`, `confirm_hang:${gameId}:${targetPlayerId}:no`);

    await ctx.editMessageText(
      `⚖️ <b>${candidateName}</b>ni osmoqchimisiz?\n\n👍 Ha — osish\n👎 Yo'q — qo'yib yuborish`,
      { parse_mode: "HTML", reply_markup: kb }
    ).catch(() => {});
  });

  // Kamikaze nishon tanlash: kamikaze:{playerId|skip}
  composer.callbackQuery(/^kamikaze:(.+)$/, async (ctx) => {
    if (!ctx.from) return;

    const targetValue = ctx.match[1];

    if (targetValue === "skip") {
      await ctx.answerCallbackQuery({ text: "🚫 Hech kimni olmadingiz" });
      await ctx.editMessageText("💣 Hech kimni tanlamadingiz.", { parse_mode: "HTML" });
      return;
    }

    const targetPlayerId = parseInt(targetValue);
    if (isNaN(targetPlayerId)) return;

    const telegramId = BigInt(ctx.from.id);
    for (const game of gameManager.getAllGames()) {
      const player = game.getPlayerByTelegramId(telegramId);
      if (player) {
        game.setKamikazeTarget(targetPlayerId);
        const target = game.getPlayer(targetPlayerId);
        await ctx.answerCallbackQuery({
          text: `💣 ${target?.firstName}ni o'zingiz bilan olib ketdingiz!`,
        });
        await ctx.editMessageText(
          `💣 Siz <b>${target?.firstName}</b>ni o'zingiz bilan olib ketdingiz!`,
          { parse_mode: "HTML" }
        );
        break;
      }
    }
  });

  return composer;
}
