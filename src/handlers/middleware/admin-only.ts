import { NextFunction } from "grammy";
import { BotContext } from "../../types/context";
import { uz } from "../../locales/uz";

export async function adminOnlyMiddleware(ctx: BotContext, next: NextFunction): Promise<void> {
  if (!ctx.chat || ctx.chat.type === "private") {
    await next();
    return;
  }

  try {
    const member = await ctx.getChatMember(ctx.from!.id);
    if (member.status === "creator" || member.status === "administrator") {
      await next();
      return;
    }
  } catch {
    // ignore
  }

  await ctx.reply(uz.errors.notAdmin, { parse_mode: "HTML" });
}
