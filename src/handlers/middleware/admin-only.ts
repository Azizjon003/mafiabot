import { NextFunction } from "grammy";
import { BotContext } from "../../types/context";
import { t } from "../../services/text.service";

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

  await ctx.reply(t("errors.notAdmin"), { parse_mode: "HTML" });
}
