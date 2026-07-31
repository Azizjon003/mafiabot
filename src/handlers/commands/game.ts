import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { GameController } from "../../game/controller";
import { gameManager } from "../../game/manager";
import { GameEngine } from "../../game/engine";
import { t } from "../../services/text.service";
import { groupOnly } from "../middleware/chat-type";

// Guruh admini (yoki egasi) ekanligini tekshirish
async function isChatAdmin(ctx: BotContext): Promise<boolean> {
  if (!ctx.from) return false;
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return member.status === "creator" || member.status === "administrator";
  } catch {
    return false;
  }
}

// O'yinni boshqarishga ruxsat: o'yinni YARATGAN foydalanuvchi YOKI guruh admini
async function canControlGame(ctx: BotContext, engine: GameEngine): Promise<boolean> {
  if (ctx.from && engine.creatorTelegramId != null && BigInt(ctx.from.id) === engine.creatorTelegramId) {
    return true;
  }
  return isChatAdmin(ctx);
}

export function createGameCommands(controller: GameController): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  // /startgame — Yangi o'yin boshlash (guruhda ISTALGAN foydalanuvchi yarata oladi).
  // Agar o'yin allaqachon WAITING fazasida bo'lsa — registratsiya xabari
  // pastga qayta yuboriladi (bump).
  composer.command("startgame", groupOnly, async (ctx) => {
    // Buyruq xabarini (/startgame yoki /startgame@bot) o'chirish — guruh toza turishi uchun.
    // Bot "Delete messages" huquqiga ega bo'lmasa — jim davom etadi.
    ctx.deleteMessage().catch(() => {});

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
    // Yaratuvchini eslab qolamiz — u ham o'yinni to'xtata/boshqara oladi
    await controller.handleStartGame(chatId, ctx.chat.title, ctx.from ? BigInt(ctx.from.id) : undefined);
  });

  // /begingame — O'yinni boshlash (ro'yxatni yopish) — yaratuvchi yoki admin
  composer.command("begingame", groupOnly, async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    const engine = gameManager.getGame(chatId);
    if (!engine || engine.status !== "WAITING") {
      await ctx.reply(t("game.noActiveGame"), { parse_mode: "HTML" });
      return;
    }
    if (!(await canControlGame(ctx, engine))) {
      await ctx.reply(t("errors.notAdmin"), { parse_mode: "HTML" });
      return;
    }
    await controller.handleRegistrationEnd(chatId);
  });

  // /stopgame — O'yinni to'xtatish — o'yinni YARATGAN kishi yoki guruh admini
  composer.command("stopgame", groupOnly, async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    const engine = gameManager.getGame(chatId);
    if (!engine) {
      await ctx.reply(t("game.noActiveGame"), { parse_mode: "HTML" });
      return;
    }
    if (!(await canControlGame(ctx, engine))) {
      await ctx.reply(t("errors.notAdmin"), { parse_mode: "HTML" });
      return;
    }
    await controller.handleStopGame(chatId);
  });

  // /extend — Vaqtni uzaytirish — yaratuvchi yoki admin
  composer.command("extend", groupOnly, async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    const engine = gameManager.getGame(chatId);
    if (!engine) {
      await ctx.reply(t("game.noActiveGame"), { parse_mode: "HTML" });
      return;
    }
    if (!(await canControlGame(ctx, engine))) {
      await ctx.reply(t("errors.notAdmin"), { parse_mode: "HTML" });
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
