import { Composer } from "grammy";
import { BotContext } from "../types/context";
import { gameManager } from "../game/manager";
import { logger } from "../utils/logger";

export const nightSilenceHandler = new Composer<BotContext>();

// Tunda guruhda kelgan xabarlarni avtomatik o'chirish (mute o'rniga)
// Faqat NIGHT fazasida va chat settings.muteOnNight yoqilgan bo'lsa.
//
// Qoida:
// - Oddiy o'yinchi — xabari o'chiriladi (hech narsa yoza olmaydi)
// - Admin — xabari "!" bilan boshlansa qoldiriladi, aks holda o'chiriladi
nightSilenceHandler.on("message", async (ctx, next) => {
  if (!ctx.chat || ctx.chat.type === "private") return next();
  if (!ctx.message) return next();

  const chatTelegramId = BigInt(ctx.chat.id);
  const engine = gameManager.getGame(chatTelegramId);

  // O'yin yo'q yoki tun emas — hech narsa qilmaymiz
  if (!engine || engine.status !== "NIGHT") return next();

  // Tun rejimi o'chirilgan bo'lsa — hech narsa qilmaymiz
  if (!engine.settings.muteOnNight) return next();

  // Botning o'z xabarini o'chirmaslik
  if (ctx.from?.id === ctx.me.id) return next();

  // Xabar matnini olish (caption ham bo'lishi mumkin — foto/video)
  const text = (ctx.message.text ?? ctx.message.caption ?? "").trim();

  // Admin tekshirish
  let isAdmin = false;
  try {
    const member = await ctx.getChatMember(ctx.from!.id);
    isAdmin = member.status === "creator" || member.status === "administrator";
  } catch { /* ignore — admin emas deb qoldiramiz */ }

  // Admin + "!" bilan boshlangan → qoldiramiz
  if (isAdmin && text.startsWith("!")) {
    return next();
  }

  // Qolgan barcha xabar (oddiy o'yinchi yoki admin "!"siz) — o'chirish
  try {
    await ctx.deleteMessage();
  } catch (e) {
    logger.debug(e, "Night delete message failed");
  }
});
