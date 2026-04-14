import { NextFunction } from "grammy";
import { BotContext } from "../../types/context";

// Faqat guruhda ishlasin
export async function groupOnly(ctx: BotContext, next: NextFunction): Promise<void> {
  if (!ctx.chat) return;
  if (ctx.chat.type === "private") {
    await ctx.reply("⚠️ Bu buyruq faqat guruhda ishlaydi!");
    return;
  }
  await next();
}

// Faqat shaxsiy chatda ishlasin
export async function privateOnly(ctx: BotContext, next: NextFunction): Promise<void> {
  if (!ctx.chat) return;
  if (ctx.chat.type !== "private") {
    const botInfo = await ctx.api.getMe();
    await ctx.reply(
      `⚠️ Bu buyruq faqat shaxsiy chatda ishlaydi!\n\n` +
      `👉 <a href="https://t.me/${botInfo.username}">@${botInfo.username}</a>`,
      { parse_mode: "HTML" }
    );
    return;
  }
  await next();
}
