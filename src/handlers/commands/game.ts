import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { GameController } from "../../game/controller";
import { gameManager } from "../../game/manager";
import { uz } from "../../locales/uz";
import { adminOnlyMiddleware } from "../middleware/admin-only";

export function createGameCommands(controller: GameController): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  // /startgame — Yangi o'yin boshlash (faqat guruhda, faqat admin)
  composer.command("startgame", adminOnlyMiddleware, async (ctx) => {
    if (ctx.chat.type === "private") {
      await ctx.reply(uz.errors.onlyInGroup, { parse_mode: "HTML" });
      return;
    }

    const chatId = BigInt(ctx.chat.id);

    if (gameManager.hasGame(chatId)) {
      await ctx.reply(uz.game.gameInProgress, { parse_mode: "HTML" });
      return;
    }

    await controller.handleStartGame(chatId, ctx.chat.title);
  });

  // /begingame — O'yinni boshlash (ro'yxatni yopish)
  composer.command("begingame", adminOnlyMiddleware, async (ctx) => {
    if (ctx.chat.type === "private") {
      await ctx.reply(uz.errors.onlyInGroup, { parse_mode: "HTML" });
      return;
    }

    const chatId = BigInt(ctx.chat.id);
    const engine = gameManager.getGame(chatId);

    if (!engine || engine.status !== "WAITING") {
      await ctx.reply(uz.game.noActiveGame, { parse_mode: "HTML" });
      return;
    }

    await controller.handleRegistrationEnd(chatId);
  });

  // /stopgame — O'yinni to'xtatish
  composer.command("stopgame", adminOnlyMiddleware, async (ctx) => {
    if (ctx.chat.type === "private") {
      await ctx.reply(uz.errors.onlyInGroup, { parse_mode: "HTML" });
      return;
    }

    const chatId = BigInt(ctx.chat.id);

    if (!gameManager.hasGame(chatId)) {
      await ctx.reply(uz.game.noActiveGame, { parse_mode: "HTML" });
      return;
    }

    await controller.handleStopGame(chatId);
  });

  // /extend — Vaqtni uzaytirish
  composer.command("extend", adminOnlyMiddleware, async (ctx) => {
    if (ctx.chat.type === "private") return;

    const chatId = BigInt(ctx.chat.id);

    if (!gameManager.hasGame(chatId)) {
      await ctx.reply(uz.game.noActiveGame, { parse_mode: "HTML" });
      return;
    }

    const extended = await controller.handleExtend(chatId);
    if (extended) {
      await ctx.reply(uz.game.extended, { parse_mode: "HTML" });
    }
  });

  return composer;
}
