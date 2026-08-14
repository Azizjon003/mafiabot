import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { GameController } from "../../game/controller";
import { gameManager } from "../../game/manager";
import { GameEngine } from "../../game/engine";
import { t } from "../../services/text.service";
import { groupOnly } from "../middleware/chat-type";
import { antiSpam } from "../middleware/anti-spam";
import { isChatAdminCached } from "../../utils/admin-cache";
import { logger } from "../../utils/logger";

// Guruh admini (yoki egasi) ekanligini tekshirish
// Keshlangan — spam paytida har bir buyruq uchun Telegram API so'rovi ketmasin
async function isChatAdmin(ctx: BotContext): Promise<boolean> {
  if (!ctx.from) return false;
  return isChatAdminCached(ctx);
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
  composer.command("startgame", groupOnly, antiSpam, async (ctx) => {
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

  // /begingame — O'yinni boshlash (ro'yxatni yopish).
  // ISTALGAN foydalanuvchi chaqira oladi: admin kutib o'tirish shart emas.
  composer.command("begingame", groupOnly, antiSpam, async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    const engine = gameManager.getGame(chatId);
    if (!engine || engine.status !== "WAITING") {
      await ctx.reply(t("game.noActiveGame"), { parse_mode: "HTML" });
      return;
    }

    // MUHIM: handleRegistrationEnd o'yinchi yetmasa o'yinni BEKOR QILADI.
    // Bu vaqt tugaganda to'g'ri, lekin qo'lda /begingame uchun emas — aks holda
    // istalgan odam ro'yxat boshida yozib o'yinni yo'q qilib yuborardi.
    const count = engine.getPlayerCount();
    const min = engine.settings.minPlayers;
    if (count < min) {
      await ctx.reply(t("game.notEnoughToBegin", { count, min }), { parse_mode: "HTML" });
      return;
    }

    // FONDA — rol tarqatish + tun boshlanishi (~30s) guruh navbatini ushlab turmasin.
    // Qayta kirishdan handleRegistrationEnd ichidagi sinxron guard himoya qiladi.
    controller.handleRegistrationEnd(chatId).catch((e) => logger.error(e, "handleRegistrationEnd (fonda) xatolik"));
  });

  // /stopgame — O'yinni to'xtatish — o'yinni YARATGAN kishi yoki guruh admini
  composer.command("stopgame", groupOnly, antiSpam, async (ctx) => {
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

  // /extend — Vaqtni uzaytirish. ISTALGAN foydalanuvchi chaqira oladi.
  // Xavfsiz: ro'yxatni cheksiz qiladi (hech narsa yo'qolmaydi), o'yin ichidagi
  // fazalar esa MAX_PHASE_EXTENDS bilan cheklangan. Spamni antiSpam ushlaydi.
  composer.command("extend", groupOnly, antiSpam, async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    const engine = gameManager.getGame(chatId);
    if (!engine) {
      await ctx.reply(t("game.noActiveGame"), { parse_mode: "HTML" });
      return;
    }
    const res = await controller.handleExtend(chatId);
    const key =
      res === "unlimited" ? "game.registrationUnlimited"
      : res === "already" ? "game.registrationAlreadyUnlimited"
      : res === "phase" ? "game.extended"
      : res === "limit" ? "game.extendLimit"
      : "game.noActiveGame";
    await ctx.reply(t(key), { parse_mode: "HTML" });
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

  composer.command("quit", groupOnly, antiSpam, leaveHandler);
  composer.command("leave", groupOnly, antiSpam, leaveHandler);
  composer.command("exit", groupOnly, antiSpam, leaveHandler);

  return composer;
}
