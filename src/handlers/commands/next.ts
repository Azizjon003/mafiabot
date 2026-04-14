import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { gameManager } from "../../game/manager";
import { subscriptionRepo } from "../../database/repositories/subscription.repository";
import { groupOnly } from "../middleware/chat-type";
import { botUsername } from "../../config";

export const nextCommand = new Composer<BotContext>();

// /next — Keyingi o'yin uchun obuna (guruh only)
nextCommand.command("next", groupOnly, async (ctx) => {
  if (!ctx.dbUser) return;
  const chatId = BigInt(ctx.chat.id);

  // Hozir registratsiya davom etayotgan bo'lsa — link yuborish
  const engine = gameManager.getGame(chatId);
  if (engine && engine.status === "WAITING") {
    try {
      await ctx.api.sendMessage(
        ctx.from!.id,
        `🎭 <b>Guruhda o'yin boshlanmoqda!</b>\n\n` +
        `Qo'shilish uchun tugmani bosing:`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Qo'shilish", url: `https://t.me/${botUsername}?start=join_${chatId}` },
            ]],
          },
        }
      );
      await ctx.reply("✅ Shaxsiy chatga xabar yuborildi!");
    } catch {
      await ctx.reply(
        `⚠️ Avval botga shaxsiy xabar yuboring: @${botUsername}`,
        { parse_mode: "HTML" }
      );
    }
    return;
  }

  // Obuna bor mi
  const already = await subscriptionRepo.exists(ctx.dbUser.id, chatId);
  if (already) {
    await ctx.reply(
      "✅ Siz allaqachon keyingi o'yinga obunasiz.\nO'yin boshlanganida sizga xabar keladi.",
    );
    return;
  }

  // Botga DM yozilganmi tekshirish
  try {
    await ctx.api.sendChatAction(ctx.from!.id, "typing");
  } catch {
    await ctx.reply(
      `⚠️ Avval botga shaxsiy xabar yuboring: @${botUsername}\n\n` +
      `Keyin /next ni qaytadan yozing.`,
      { parse_mode: "HTML" }
    );
    return;
  }

  // Obunaga qo'shish
  await subscriptionRepo.add(ctx.dbUser.id, chatId);
  await ctx.reply(
    "🔔 <b>Obuna bo'ldingiz!</b>\n\n" +
    "Keyingi o'yin boshlanganida sizga shaxsiy xabar keladi.\n" +
    "Bekor qilish uchun: /unsubscribe",
    { parse_mode: "HTML" }
  );
});

// /unsubscribe — obunadan chiqish (guruh only)
nextCommand.command("unsubscribe", groupOnly, async (ctx) => {
  if (!ctx.dbUser) return;
  const chatId = BigInt(ctx.chat.id);
  const removed = await subscriptionRepo.remove(ctx.dbUser.id, chatId);
  if (removed) {
    await ctx.reply("🔕 Obuna bekor qilindi.");
  } else {
    await ctx.reply("ℹ️ Siz bu guruhga obuna bo'lmagan edingiz.");
  }
});
