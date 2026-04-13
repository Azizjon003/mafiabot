import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { gameManager } from "../../game/manager";
import { getRegistrationText } from "../../game/phases/registration";
import { joinGameKeyboard, votingPlayerListKeyboard } from "../../keyboards/game";
import { uz } from "../../locales/uz";
import { mention } from "../../utils/helpers";
import { botUsername } from "../../config";

export const startCommand = new Composer<BotContext>();

startCommand.command("start", async (ctx) => {
  if (ctx.chat.type !== "private") {
    await ctx.reply(uz.start.botStartedInGroup, { parse_mode: "HTML" });
    return;
  }

  // Deep link tekshirish: /start join_CHATID
  const payload = ctx.match;

  if (!ctx.from) return;

  if (payload && typeof payload === "string" && payload.startsWith("join_")) {
    const chatIdStr = payload.replace("join_", "");
    const chatTelegramId = BigInt(chatIdStr);

    const engine = gameManager.getGame(chatTelegramId);
    if (!engine || engine.status !== "WAITING") {
      await ctx.reply("⚠️ Bu o'yin allaqachon boshlangan yoki mavjud emas!", { parse_mode: "HTML" });
      return;
    }

    // Allaqachon qo'shilganmi
    if (engine.getPlayerByTelegramId(BigInt(ctx.from.id))) {
      await ctx.reply("⚠️ Siz allaqachon bu o'yinga qo'shilgansiz!", { parse_mode: "HTML" });
      return;
    }

    // Boshqa guruhda o'yindami
    if (gameManager.isPlayerInAnyGame(BigInt(ctx.from.id))) {
      await ctx.reply("⚠️ Siz allaqachon boshqa guruhda o'yin o'ynayapsiz!", { parse_mode: "HTML" });
      return;
    }

    // O'yinga qo'shish
    const player = await gameManager.addPlayerToGame(
      chatTelegramId,
      BigInt(ctx.from.id),
      ctx.from.first_name,
      ctx.from.username
    );

    if (!player) {
      await ctx.reply("❌ Qo'shila olmadi! O'yin to'lgan bo'lishi mumkin.", { parse_mode: "HTML" });
      return;
    }

    await ctx.reply(
      `✅ O'yinga muvaffaqiyatli qo'shildingiz!\n\n` +
      `👥 O'yinchilar: <b>${engine.getPlayerCount()}/${engine.settings.maxPlayers}</b>\n` +
      `O'yin boshlanishini kuting...`,
      { parse_mode: "HTML" }
    );

    // Guruhda registration xabarni yangilash
    const text = getRegistrationText(engine, engine.settings.registrationTimeout);
    try {
      // Guruhga yangilangan ro'yxatni yuborish
      await ctx.api.sendMessage(
        chatTelegramId.toString(),
        `✅ ${mention(ctx.from.first_name, BigInt(ctx.from.id))} qo'shildi! (${engine.getPlayerCount()}/${engine.settings.maxPlayers})`,
        { parse_mode: "HTML" }
      );
    } catch {
      // Guruhga yubora olmasa — ignore
    }

    return;
  }

  // Deep link: /start vote_CHATID — ovoz berish
  if (payload && typeof payload === "string" && payload.startsWith("vote_")) {
    const chatIdStr = payload.replace("vote_", "");
    const chatTelegramId = BigInt(chatIdStr);

    const engine = gameManager.getGame(chatTelegramId);
    if (!engine || engine.status !== "VOTING") {
      await ctx.reply("⚠️ Hozir ovoz berish vaqti emas!", { parse_mode: "HTML" });
      return;
    }

    const voter = engine.getPlayerByTelegramId(BigInt(ctx.from.id));
    if (!voter) {
      await ctx.reply("⚠️ Siz bu o'yinda emassiz!", { parse_mode: "HTML" });
      return;
    }
    if (!voter.isAlive) {
      await ctx.reply("⚠️ Siz allaqachon o'lik ekansiz!", { parse_mode: "HTML" });
      return;
    }

    // Allaqachon ovoz berganmi
    if (engine.hasVoted(voter.playerId)) {
      await ctx.reply("⚠️ Siz allaqachon ovoz bergansiz!", { parse_mode: "HTML" });
      return;
    }

    // Tirik o'yinchilar ro'yxati (o'zidan boshqa)
    const alive = engine.getAlivePlayers().filter((p) => p.playerId !== voter.playerId);
    const kb = votingPlayerListKeyboard(engine.gameId, alive);

    await ctx.reply(
      `🗳 <b>Kimga ovoz berasiz?</b>`,
      { parse_mode: "HTML", reply_markup: kb }
    );
    return;
  }

  // Oddiy /start
  await ctx.reply(uz.start.welcome, { parse_mode: "HTML" });
});

startCommand.command("help", async (ctx) => {
  await ctx.reply(uz.help.text, { parse_mode: "HTML" });
});

startCommand.command("rules", async (ctx) => {
  const rules =
    "🎭 <b>Mafia o'yini qoidalari</b>\n\n" +
    "1. Shahar uxlaydi — kechada maxfiy rollar ishlaydi\n" +
    "2. Shahar uyg'onadi — muhokama va ovoz berish\n" +
    "3. Eng ko'p ovoz olgan chiqariladi\n\n" +
    "<b>Jamoalar:</b>\n" +
    "👨🏼 Tinch axoli — mafiyani toping!\n" +
    "🤵🏼 Mafiya — shaharlikllarni o'ldiring!\n" +
    "🔪 Yakka rollar — hammani yo'q qiling!\n\n" +
    "/help — Barcha buyruqlar";

  await ctx.reply(rules, { parse_mode: "HTML" });
});
