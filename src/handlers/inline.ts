import { Composer, InlineKeyboard } from "grammy";
import { InlineQueryResultArticle } from "grammy/types";
import { BotContext } from "../types/context";
import { botUsername } from "../config";
import { gameManager } from "../game/manager";

export const inlineHandler = new Composer<BotContext>();

inlineHandler.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query.trim().toLowerCase();
  const results: InlineQueryResultArticle[] = [];

  // O'yinga qo'shilish — har doim ko'rinadi
  results.push({
    type: "article",
    id: "join_game",
    title: "🎭 O'yinga qo'shilish",
    description: "Mafia o'yiniga qo'shilish uchun bosing",
    input_message_content: {
      message_text:
        `🎭 <b>Mafia o'yiniga qo'shilish!</b>\n` +
        `Qo'shilish uchun quyidagi tugmani bosing 👇`,
      parse_mode: "HTML",
    },
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Qo'shilish", url: `https://t.me/${botUsername}?start=join` }],
      ],
    },
  });

  // Qoidalar
  results.push({
    type: "article",
    id: "rules",
    title: "📋 O'yin qoidalari",
    description: "Mafia o'yini qoidalari",
    input_message_content: {
      message_text:
        `🎭 <b>Mafia O'yini Qoidalari</b>\n\n` +
        `👨🏼 Tinch axoli — mafiyani toping!\n` +
        `🤵🏼 Mafiya — shaharliklarni o'ldiring!\n` +
        `🔪 Yakka rollar — hammani yo'q qiling!\n\n` +
        `🕵🏻‍♂ Komissar tekshiradi yoki otadi\n` +
        `👨🏼‍⚕️ Shifokor davolaydi\n` +
        `💃 Kezuvchi bloklaydi\n` +
        `🧙🏼‍♂️ Daydi kuzatadi\n\n` +
        `O'yin boshlash: /startgame`,
      parse_mode: "HTML",
    },
  });

  // Statistika
  results.push({
    type: "article",
    id: "stats",
    title: "📊 Statistikam",
    description: "O'yin statistikasini ko'rish",
    input_message_content: {
      message_text: `📊 Statistikangizni ko'rish uchun: /stats\n🏆 Top o'yinchilar: /top`,
      parse_mode: "HTML",
    },
  });

  await ctx.answerInlineQuery(results, { cache_time: 5 });
});
