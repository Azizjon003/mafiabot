import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { gameManager } from "../../game/manager";

export const nextCommand = new Composer<BotContext>();

// /next — Keyingi o'yinga qo'shilish xabari
nextCommand.command("next", async (ctx) => {
  if (ctx.chat.type === "private") {
    await ctx.reply("⚠️ Bu buyruq faqat guruhda ishlaydi!");
    return;
  }

  const chatId = BigInt(ctx.chat.id);
  const engine = gameManager.getGame(chatId);

  if (engine && engine.status === "WAITING") {
    // Registratsiya davom etmoqda — botdan qo'shilish havolasini yuborish
    try {
      const botInfo = await ctx.api.getMe();
      await ctx.api.sendMessage(ctx.from!.id,
        `🎭 <b>Guruhda o'yin boshlanmoqda!</b>\n\n` +
        `Guruhga o'tib "✅ Qo'shilish" tugmasini bosing.`,
        { parse_mode: "HTML" }
      );
      await ctx.reply("✅ Shaxsiy chatga xabar yuborildi!");
    } catch {
      const botInfo = await ctx.api.getMe();
      await ctx.reply(
        `⚠️ Avval botga shaxsiy xabar yuboring: @${botInfo.username}`,
        { parse_mode: "HTML" }
      );
    }
  } else {
    await ctx.reply(
      "⏳ Hozir registratsiya davom etayotgan o'yin yo'q.\n" +
      "Keyingi o'yin boshlanganida xabar olasiz!",
      { parse_mode: "HTML" }
    );
  }
});
