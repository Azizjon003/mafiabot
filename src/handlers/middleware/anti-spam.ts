import { NextFunction } from "grammy";
import { BotContext } from "../../types/context";
import { tryHit } from "../../utils/rate-limiter";
import { t } from "../../services/text.service";
import { logger } from "../../utils/logger";

// Guruhdagi o'yin buyruqlari uchun chegaralar.
// MUHIM: chegara oshganda BOTGA JAVOB YOZDIRMAYMIZ — aynan javob spamni kuchaytiradi
// (har bir spam xabar => 1 getChatMember + 1 reply => guruh to'lib ketadi).
// Faqat buyruq xabarini o'chiramiz va bir marta ogohlantiramiz.
const PER_USER_MAX = 3;
const PER_USER_WINDOW_MS = 10_000;
const PER_CHAT_MAX = 8;
const PER_CHAT_WINDOW_MS = 10_000;
// Ogohlantirish har bir foydalanuvchiga shuncha vaqtda 1 marta
const WARN_WINDOW_MS = 60_000;
// Ogohlantirish xabari shuncha vaqtdan keyin o'chadi (guruh toza qolsin)
const WARN_TTL_MS = 6_000;

/**
 * Guruhdagi o'yin buyruqlari uchun spamga qarshi himoya.
 * `composer.command("extend", groupOnly, antiSpam, handler)` ko'rinishida ishlatiladi.
 */
export async function antiSpam(ctx: BotContext, next: NextFunction): Promise<void> {
  // Faqat guruh buyruqlari uchun
  if (!ctx.chat || ctx.chat.type === "private" || !ctx.from) return next();

  const chatKey = `spam:c${ctx.chat.id}`;
  const userKey = `spam:c${ctx.chat.id}:u${ctx.from.id}`;

  const userOk = tryHit(userKey, PER_USER_MAX, PER_USER_WINDOW_MS);
  // Bitta odam chegarani oshirsa — chat hisobini bekorga sarflamaymiz
  const chatOk = userOk ? tryHit(chatKey, PER_CHAT_MAX, PER_CHAT_WINDOW_MS) : false;

  if (userOk && chatOk) return next();

  // Buyruq xabarini o'chiramiz — guruh toza qolsin
  ctx.deleteMessage().catch(() => {});

  // Ogohlantirish — foydalanuvchiga daqiqada 1 marta, o'zi o'chadigan xabar
  const warnKey = `spamwarn:c${ctx.chat.id}:u${ctx.from.id}`;
  if (tryHit(warnKey, 1, WARN_WINDOW_MS)) {
    logger.warn(
      { chatId: ctx.chat.id, userId: ctx.from.id, reason: userOk ? "chat" : "user" },
      "Anti-spam: buyruq bloklandi"
    );
    try {
      const msg = await ctx.reply(t("errors.tooManyCommands"), { parse_mode: "HTML" });
      setTimeout(() => {
        ctx.api.deleteMessage(ctx.chat!.id, msg.message_id).catch(() => {});
      }, WARN_TTL_MS);
    } catch {
      /* yozolmasak ham mayli — asosiysi buyruq bajarilmadi */
    }
  }
  // next() CHAQIRILMAYDI — buyruq bajarilmaydi
}
