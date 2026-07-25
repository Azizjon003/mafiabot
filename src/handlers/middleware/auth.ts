import { NextFunction } from "grammy";
import { BotContext } from "../../types/context";
import { userRepo } from "../../database/repositories/user.repository";
import { chatActivity } from "../../services/chat-activity.service";

export async function authMiddleware(ctx: BotContext, next: NextFunction): Promise<void> {
  if (ctx.from) {
    // Hot-path: har bir xabarda YOZISH o'rniga avval O'QIYMIZ.
    // Foydalanuvchi mavjud bo'lsa — bitta read; faqat topilmasa yaratamiz.
    let user = await userRepo.findByTelegramId(BigInt(ctx.from.id));
    if (!user) {
      user = await userRepo.findOrCreate(
        BigInt(ctx.from.id),
        ctx.from.first_name,
        ctx.from.username,
        ctx.from.last_name
      );
    }

    // Ban tekshirish
    if (user.isBanned) {
      return; // Hech narsa qilmaslik
    }

    ctx.dbUser = {
      id: user.id,
      telegramId: BigInt(ctx.from.id),
      language: user.language,
    };

    // Guruhda faol a'zolarni kuzatib borish (random tarqatish uchun)
    if (ctx.chat && ctx.chat.type !== "private") {
      chatActivity.track(BigInt(ctx.chat.id), user.id, BigInt(ctx.from.id), ctx.from.first_name);
    }
  }
  await next();
}
