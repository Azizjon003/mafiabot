import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { GameController } from "../../game/controller";
import { gameManager } from "../../game/manager";
import { t } from "../../services/text.service";
import { adminOnlyMiddleware } from "../middleware/admin-only";
import { groupOnly } from "../middleware/chat-type";

export function createGameCommands(controller: GameController): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  // /startgame — Yangi o'yin boshlash (faqat guruhda, faqat admin)
  composer.command("startgame", groupOnly, adminOnlyMiddleware, async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    if (gameManager.hasGame(chatId)) {
      await ctx.reply(t("game.gameInProgress"), { parse_mode: "HTML" });
      return;
    }
    await controller.handleStartGame(chatId, ctx.chat.title);
  });

  // /begingame — O'yinni boshlash (ro'yxatni yopish)
  composer.command("begingame", groupOnly, adminOnlyMiddleware, async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    const engine = gameManager.getGame(chatId);
    if (!engine || engine.status !== "WAITING") {
      await ctx.reply(t("game.noActiveGame"), { parse_mode: "HTML" });
      return;
    }
    await controller.handleRegistrationEnd(chatId);
  });

  // /stopgame — O'yinni to'xtatish
  composer.command("stopgame", groupOnly, adminOnlyMiddleware, async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    if (!gameManager.hasGame(chatId)) {
      await ctx.reply(t("game.noActiveGame"), { parse_mode: "HTML" });
      return;
    }
    await controller.handleStopGame(chatId);
  });

  // /extend — Vaqtni uzaytirish
  composer.command("extend", groupOnly, adminOnlyMiddleware, async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    if (!gameManager.hasGame(chatId)) {
      await ctx.reply(t("game.noActiveGame"), { parse_mode: "HTML" });
      return;
    }
    const extended = await controller.handleExtend(chatId);
    if (extended) {
      await ctx.reply(t("game.extended"), { parse_mode: "HTML" });
    }
  });

  return composer;
}
