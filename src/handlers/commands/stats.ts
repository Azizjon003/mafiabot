import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { statsRepo } from "../../database/repositories/stats.repository";
import { userRepo } from "../../database/repositories/user.repository";
import { uz } from "../../locales/uz";
import { ROLE_EMOJI } from "../../utils/constants";
import { groupOnly } from "../middleware/chat-type";

export const statsCommand = new Composer<BotContext>();

// /stats — Shaxsiy statistika
statsCommand.command("stats", async (ctx) => {
  if (!ctx.from) return;

  const user = await userRepo.findByTelegramId(BigInt(ctx.from.id));
  if (!user?.stats) {
    await ctx.reply(uz.stats.noStats, { parse_mode: "HTML" });
    return;
  }

  const s = user.stats;
  const rank = statsRepo.getRank(s.rating);

  const text =
    uz.stats.header.replace("{name}", ctx.from.first_name) +
    "\n" +
    uz.stats.gamesPlayed.replace("{count}", s.gamesPlayed.toString()) +
    "\n" +
    uz.stats.wins.replace("{count}", s.gamesWon.toString()) +
    "\n" +
    uz.stats.losses.replace("{count}", s.gamesLost.toString()) +
    "\n" +
    uz.stats.rating.replace("{rating}", s.rating.toString()).replace("{rank}", rank) +
    "\n" +
    uz.stats.killCount.replace("{count}", s.killCount.toString()) +
    "\n" +
    uz.stats.savedCount.replace("{count}", s.savedCount.toString());

  await ctx.reply(text, { parse_mode: "HTML" });
});

// /top — Kunlik top
statsCommand.command("top", groupOnly, async (ctx) => {
  await showTopByDays(ctx, 1, "Kunlik");
});

// /top7 — Haftalik top
statsCommand.command("top7", groupOnly, async (ctx) => {
  await showTopByDays(ctx, 7, "Haftalik");
});

// /top30 — Oylik top
statsCommand.command("top30", groupOnly, async (ctx) => {
  await showTopByDays(ctx, 30, "Oylik");
});

async function showTopByDays(ctx: any, days: number, label: string) {
  const topPlayers = await statsRepo.getTopByDateRange(days, 10);

  if (topPlayers.length === 0) {
    await ctx.reply(`📊 ${label} top — hali hech kim o'ynamagan!`, { parse_mode: "HTML" });
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  let text = `🏆 <b>${label} top reyting:</b>\n\n`;

  for (let i = 0; i < topPlayers.length; i++) {
    const { user, gamesInPeriod } = topPlayers[i];
    const pos = medals[i] || `${i + 1}.`;
    const rating = user.stats?.rating || 1000;
    text += `${pos} <b>${user.firstName}</b> — ${rating}⭐️ (${gamesInPeriod} o'yin)\n`;
  }

  await ctx.reply(text, { parse_mode: "HTML" });
}

// /topall — Umumiy reyting (eski /top)
statsCommand.command("topall", groupOnly, async (ctx) => {
  const topPlayers = await statsRepo.getTopPlayers(10);

  if (topPlayers.length === 0) {
    await ctx.reply(uz.top.empty, { parse_mode: "HTML" });
    return;
  }

  let text = uz.top.header;
  const medals = ["🥇", "🥈", "🥉"];

  for (let i = 0; i < topPlayers.length; i++) {
    const s = topPlayers[i];
    const pos = medals[i] || `${i + 1}.`;
    text +=
      uz.top.row
        .replace("{pos}", pos.toString())
        .replace("{emoji}", "⭐️")
        .replace("{name}", s.user.firstName)
        .replace("{rating}", s.rating.toString())
        .replace("{wins}", s.gamesWon.toString())
        .replace("{games}", s.gamesPlayed.toString()) + "\n";
  }

  await ctx.reply(text, { parse_mode: "HTML" });
});
