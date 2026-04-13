import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { economyService } from "../../services/economy.service";
import { userRepo } from "../../database/repositories/user.repository";
import { gameManager } from "../../game/manager";
import { mention } from "../../utils/helpers";

export const economyCommand = new Composer<BotContext>();

// /balance — Balans ko'rish
economyCommand.command("balance", async (ctx) => {
  if (!ctx.dbUser) return;
  const balance = await economyService.getBalance(ctx.dbUser.id);

  await ctx.reply(
    `💰 <b>Balansingiz:</b>\n` +
    `💎 Olmoslar: <b>${balance.diamonds}</b>\n` +
    `💰 Pul: <b>${balance.money.toLocaleString()}</b>`,
    { parse_mode: "HTML" }
  );
});

// /send N — Olmos yuborish (reply = birovga, guruhda = tarqatish)
economyCommand.command("send", async (ctx) => {
  if (!ctx.dbUser || !ctx.message) return;

  const args = ctx.message.text?.split(" ") || [];
  const amount = parseInt(args[1] || "");
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("⚠️ To'g'ri miqdor kiriting: /send 5");
    return;
  }

  // Reply bo'lsa — birovga yuborish
  if (ctx.message.reply_to_message?.from) {
    const recipientTg = ctx.message.reply_to_message.from;

    // O'ziga yuborish taqiqlanadi
    if (recipientTg.id === ctx.from!.id) {
      await ctx.reply("⚠️ O'zingizga yuborib bo'lmaydi!");
      return;
    }

    const recipient = await userRepo.findOrCreate(
      BigInt(recipientTg.id),
      recipientTg.first_name,
      recipientTg.username
    );

    const result = await economyService.transferDiamonds(ctx.dbUser.id, recipient.id, amount);
    if (!result.success) {
      await ctx.reply(`❌ ${result.error}`);
      return;
    }

    await ctx.reply(
      `💎 ${mention(ctx.from!.first_name, BigInt(ctx.from!.id))} → ` +
      `${mention(recipientTg.first_name, BigInt(recipientTg.id))}: ` +
      `<b>${amount}</b> olmos (komissiya: 1💎)`,
      { parse_mode: "HTML" }
    );
    return;
  }

  // Guruhda — barcha guruh a'zolariga tarqatish (hozircha xabar)
  if (ctx.chat.type !== "private") {
    await ctx.reply(
      `💎 ${mention(ctx.from!.first_name, BigInt(ctx.from!.id))} guruhga <b>${amount}</b> olmos tarqatmoqda!`,
      { parse_mode: "HTML" }
    );
  }
});

// /money N — Pul yuborish (reply bilan)
economyCommand.command("money", async (ctx) => {
  if (!ctx.dbUser || !ctx.message) return;

  const args = ctx.message.text?.split(" ") || [];
  const amount = parseInt(args[1] || "");
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("⚠️ To'g'ri miqdor kiriting: /money 500");
    return;
  }

  if (!ctx.message.reply_to_message?.from) {
    await ctx.reply("⚠️ Kimgadir reply qilib yozing!");
    return;
  }

  const recipientTg = ctx.message.reply_to_message.from;

  if (recipientTg.id === ctx.from!.id) {
    await ctx.reply("⚠️ O'zingizga yuborib bo'lmaydi!");
    return;
  }

  const recipient = await userRepo.findOrCreate(
    BigInt(recipientTg.id),
    recipientTg.first_name,
    recipientTg.username
  );

  const result = await economyService.transferMoney(ctx.dbUser.id, recipient.id, amount);
  if (!result.success) {
    await ctx.reply(`❌ ${result.error}`);
    return;
  }

  await ctx.reply(
    `💰 ${mention(ctx.from!.first_name, BigInt(ctx.from!.id))} → ` +
    `${mention(recipientTg.first_name, BigInt(recipientTg.id))}: ` +
    `<b>${amount.toLocaleString()}</b> pul (komissiya: 100💰)`,
    { parse_mode: "HTML" }
  );
});

// /gsend N — Ro'yxatdagi o'yinchilarga olmos tarqatish
economyCommand.command("gsend", async (ctx) => {
  if (!ctx.dbUser || !ctx.message || ctx.chat.type === "private") return;

  const args = ctx.message.text?.split(" ") || [];
  const amount = parseInt(args[1] || "");
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("⚠️ To'g'ri miqdor kiriting: /gsend 5");
    return;
  }

  const engine = gameManager.getGame(BigInt(ctx.chat.id));
  if (!engine || engine.status !== "WAITING") {
    await ctx.reply("⚠️ Hozir registratsiya davom etayotgan o'yin yo'q!");
    return;
  }

  const players = [...engine.players.values()];
  if (players.length === 0) {
    await ctx.reply("⚠️ Hali hech kim qo'shilmagan!");
    return;
  }

  const totalCost = amount + 1; // 1 olmos komissiya
  const canSpend = await economyService.spendDiamonds(ctx.dbUser.id, totalCost, "gsend");
  if (!canSpend) {
    await ctx.reply(`❌ Yetarli olmosigiz yo'q! (${totalCost}💎 kerak)`);
    return;
  }

  const perPlayer = Math.floor(amount / players.length);
  for (const player of players) {
    await economyService.addDiamonds(player.userId, perPlayer, "gsend_receive");
  }

  await ctx.reply(
    `💎 ${mention(ctx.from!.first_name, BigInt(ctx.from!.id))} o'yinchilarga ` +
    `<b>${perPlayer}</b>💎 tarqatdi! (${players.length} kishi)`,
    { parse_mode: "HTML" }
  );
});

// /change N — Random g'olib olmos oladi
economyCommand.command("change", async (ctx) => {
  if (!ctx.dbUser || !ctx.message || ctx.chat.type === "private") return;

  const args = ctx.message.text?.split(" ") || [];
  const amount = parseInt(args[1] || "");
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("⚠️ To'g'ri miqdor kiriting: /change 5");
    return;
  }

  const engine = gameManager.getGame(BigInt(ctx.chat.id));
  if (!engine || engine.status !== "WAITING") {
    await ctx.reply("⚠️ Hozir registratsiya davom etayotgan o'yin yo'q!");
    return;
  }

  const players = [...engine.players.values()];
  if (players.length === 0) {
    await ctx.reply("⚠️ Hali hech kim qo'shilmagan!");
    return;
  }

  const totalCost = amount + 1;
  const canSpend = await economyService.spendDiamonds(ctx.dbUser.id, totalCost, "change");
  if (!canSpend) {
    await ctx.reply(`❌ Yetarli olmosigiz yo'q! (${totalCost}💎 kerak)`);
    return;
  }

  // Random g'olib
  const winner = players[Math.floor(Math.random() * players.length)];
  await economyService.addDiamonds(winner.userId, amount, "change_win");

  await ctx.reply(
    `🎰 ${mention(ctx.from!.first_name, BigInt(ctx.from!.id))} <b>${amount}</b>💎 o'yinga qo'ydi!\n` +
    `🏆 G'olib: ${mention(winner.firstName, winner.telegramId)} — <b>${amount}</b>💎 oldi!`,
    { parse_mode: "HTML" }
  );
});
