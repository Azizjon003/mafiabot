import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { gameManager } from "../../game/manager";
import { groupOnly } from "../middleware/chat-type";

export const nextCommand = new Composer<BotContext>();

// /next — Keyingi o'yinga qo'shilish xabari (guruh only)
nextCommand.command("next", groupOnly, async (ctx) => {
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
