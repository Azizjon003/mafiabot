import { Composer } from "grammy";
import { BotContext } from "../types/context";
import { gameManager } from "../game/manager";
import { logger } from "../utils/logger";

export const nightSilenceHandler = new Composer<BotContext>();

// Tunda guruhda kelgan xabarlarni avtomatik o'chirish (mute o'rniga)
// Faqat NIGHT fazasida va chat settings.muteOnNight yoqilgan bo'lsa
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

  // Adminlar xabarini o'chirmaymiz
  try {
    const member = await ctx.getChatMember(ctx.from!.id);
    if (member.status === "creator" || member.status === "administrator") {
      return next();
    }
  } catch { /* ignore */ }

  // Xabarni o'chirish
  try {
    await ctx.deleteMessage();
  } catch (e) {
    // Bot huquqi yo'q yoki xabar eski — loglaymiz
    logger.debug(e, "Night delete message failed");
  }
});
