import { Composer } from "grammy";
import { BotContext } from "../../types/context";

export const shopCommand = new Composer<BotContext>();

// /shop — Endi profile orqali boshqariladi
shopCommand.command("shop", async (ctx) => {
  await ctx.reply(
    "🏪 Do'kon endi profil orqali boshqariladi.\n\n" +
    "👇 Bosing: /profile",
    { parse_mode: "HTML" }
  );
});
