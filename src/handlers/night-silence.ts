import { Composer } from "grammy";
import { BotContext } from "../types/context";
import { gameManager } from "../game/manager";
import { logger } from "../utils/logger";

export const nightSilenceHandler = new Composer<BotContext>();

// O'yin davomida guruhdagi xabarlarni filtrlash:
// - NIGHT fazasi (muteOnNight yoqilgan): hamma mute, faqat admin "!" bilan
// - DAY / VOTING / CONFIRMING: faqat o'yinchilar va adminlar yoza oladi,
//   o'yinda bo'lmaganlarning xabari o'chiriladi
nightSilenceHandler.on("message", async (ctx, next) => {
  if (!ctx.chat || ctx.chat.type === "private") return next();
  if (!ctx.message) return next();

  const chatTelegramId = BigInt(ctx.chat.id);
  const engine = gameManager.getGame(chatTelegramId);

  // O'yin yo'q — hech narsa qilmaymiz
  if (!engine) return next();

  // Botning o'z xabarini o'chirmaslik
  if (ctx.from?.id === ctx.me.id) return next();

  const status = engine.status;
  const isNight = status === "NIGHT";
  const isActivePhase = ["NIGHT", "DAY", "VOTING", "CONFIRMING"].includes(status);

  // Boshqa fazalar (WAITING, STARTING, FINISHED) — hech narsa qilmaymiz
  if (!isActivePhase) return next();

  // Tun rejimi tekshiruvi — faqat NIGHT uchun
  if (isNight && !engine.settings.muteOnNight) return next();

  // Xabar matnini olish (caption ham bo'lishi mumkin)
  const text = (ctx.message.text ?? ctx.message.caption ?? "").trim();

  // Admin tekshirish
  let isAdmin = false;
  try {
    const member = await ctx.getChatMember(ctx.from!.id);
    isAdmin = member.status === "creator" || member.status === "administrator";
  } catch { /* ignore */ }

  // Admin + "!" bilan boshlangan → har doim qoldiramiz (tunda ham, kunduzda ham)
  if (isAdmin && text.startsWith("!")) {
    return next();
  }

  // NIGHT: admin "!"siz bo'lsa ham o'chir, o'yinchi ham o'chir — hamma mute
  if (isNight) {
    try { await ctx.deleteMessage(); } catch (e) { logger.debug(e, "Night delete failed"); }
    return;
  }

  // DAY/VOTING/CONFIRMING: o'yinchi bo'lsa yoki admin bo'lsa — qoldiramiz
  const fromId = ctx.from?.id;
  const player = fromId !== undefined ? engine.getPlayerByTelegramId(BigInt(fromId)) : undefined;

  // Kezuvchi uxlatgan o'yinchi kunduzi guruhda yozolmaydi ham
  if (player && player.isAlive && player.isBlocked) {
    try { await ctx.deleteMessage(); } catch (e) { logger.debug(e, "Blocked player delete failed"); }
    return;
  }

  // O'lgan o'yinchilar guruhga yozolmaydi (ular uchun bot PMda o'liklar chati bor)
  if (player && !player.isAlive) {
    try { await ctx.deleteMessage(); } catch (e) { logger.debug(e, "Dead player delete failed"); }
    return;
  }

  if (player !== undefined || isAdmin) return next();

  // O'yinchi emas + admin emas:
  // - Rasm / video / media → qoldiramiz (hamma yubora oladi)
  // - Faqat matn → o'chiriladi
  const msg: any = ctx.message;
  const isMediaOnly = !!(msg.photo || msg.video || msg.animation || msg.sticker || msg.document || msg.video_note || msg.voice);
  if (isMediaOnly && !msg.text) return next();

  // Matn xabari — o'chiriladi
  try {
    await ctx.deleteMessage();
  } catch (e) {
    logger.debug(e, "Non-player delete failed");
  }
});
