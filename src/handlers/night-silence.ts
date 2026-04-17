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
  const isPlayer = engine.getPlayerByTelegramId(BigInt(ctx.from!.id)) !== undefined;
  if (isPlayer || isAdmin) return next();

  // O'yinchi emas + admin emas → xabar o'chiriladi
  try {
    await ctx.deleteMessage();
  } catch (e) {
    logger.debug(e, "Non-player delete failed");
  }
});
