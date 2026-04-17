import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { GameController } from "../../game/controller";
import { gameManager } from "../../game/manager";
import { t } from "../../services/text.service";
import { adminOnlyMiddleware } from "../middleware/admin-only";
import { groupOnly } from "../middleware/chat-type";

export function createGameCommands(controller: GameController): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  // /startgame — Yangi o'yin boshlash (faqat guruhda, faqat admin).
  // Agar o'yin allaqachon WAITING fazasida bo'lsa — registratsiya xabari
  // pastga qayta yuboriladi (bump).
  composer.command("startgame", groupOnly, adminOnlyMiddleware, async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    const engine = gameManager.getGame(chatId);
    if (engine) {
      if (engine.status === "WAITING") {
        // Ro'yxatdan o'tish davom etmoqda — xabarni pastga ko'chirish
        await controller.bumpRegistration(chatId);
        return;
      }
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

  // /quit, /leave, /exit — o'yindan chiqish (faqat WAITING fazasida)
  const leaveHandler = async (ctx: BotContext) => {
    if (!ctx.from || !ctx.chat) return;
    const chatId = BigInt(ctx.chat.id);
    const engine = gameManager.getGame(chatId);
    if (!engine) {
      await ctx.reply(t("game.noActiveGame"), { parse_mode: "HTML" });
      return;
    }
    if (engine.status !== "WAITING") {
      await ctx.reply("⚠️ O'yin allaqachon boshlangan — chiqib bo'lmaydi.", { parse_mode: "HTML" });
      return;
    }
    const player = engine.getPlayerByTelegramId(BigInt(ctx.from.id));
    if (!player) {
      await ctx.reply("⚠️ Siz bu o'yinda emassiz.", { parse_mode: "HTML" });
      return;
    }
    const firstName = player.firstName;
    const removed = await gameManager.removePlayerFromGame(chatId, BigInt(ctx.from.id));
    if (!removed) {
      await ctx.reply("❌ Chiqib bo'lmadi!", { parse_mode: "HTML" });
      return;
    }
    await ctx.reply(
      t("game.playerLeft", {
        name: firstName,
        count: engine.getPlayerCount(),
        max: engine.settings.maxPlayers,
      }),
      { parse_mode: "HTML" }
    );
  };

  composer.command("quit", groupOnly, leaveHandler);
  composer.command("leave", groupOnly, leaveHandler);
  composer.command("exit", groupOnly, leaveHandler);

  return composer;
}
