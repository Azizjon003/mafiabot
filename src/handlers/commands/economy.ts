import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { economyService } from "../../services/economy.service";
import { userRepo } from "../../database/repositories/user.repository";
import { gameManager } from "../../game/manager";
import { mention } from "../../utils/helpers";
import { groupOnly, privateOnly } from "../middleware/chat-type";

export const economyCommand = new Composer<BotContext>();

// /balance — Balans ko'rish (DM only)
economyCommand.command("balance", privateOnly, async (ctx) => {
  if (!ctx.dbUser) return;
  const balance = await economyService.getBalance(ctx.dbUser.id);

  await ctx.reply(
    `💰 <b>Balansingiz:</b>\n` +
    `💎 Olmoslar: <b>${balance.diamonds}</b>\n` +
    `💰 Pul: <b>${balance.money.toLocaleString()}</b>`,
    { parse_mode: "HTML" }
  );
});

// /send N — Olmos yuborish (faqat guruhda, reply bilan)
economyCommand.command("send", groupOnly, async (ctx) => {
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

    // Reply bo'lgan xabarga javob qaytaradi
    await ctx.reply(
      `💎 <b>${amount}</b> olmos o'tkazildi!\n` +
      `${mention(ctx.from!.first_name, BigInt(ctx.from!.id))} → ` +
      `${mention(recipientTg.first_name, BigInt(recipientTg.id))}\n` +
      `Komissiya: ${result.fee ?? 1}💎`,
      {
        parse_mode: "HTML",
        reply_parameters: { message_id: ctx.message.reply_to_message.message_id },
      }
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

// /money N — Pul yuborish (faqat guruhda, reply bilan)
economyCommand.command("money", groupOnly, async (ctx) => {
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

  // Reply bo'lgan xabarga javob qaytaradi
  await ctx.reply(
    `💰 <b>${amount.toLocaleString()}</b> pul o'tkazildi!\n` +
    `${mention(ctx.from!.first_name, BigInt(ctx.from!.id))} → ` +
    `${mention(recipientTg.first_name, BigInt(recipientTg.id))}\n` +
    `Komissiya: ${result.fee ?? 100}💰`,
    {
      parse_mode: "HTML",
      reply_parameters: { message_id: ctx.message.reply_to_message!.message_id },
    }
  );
});

// /gsend N — Ro'yxatdagi o'yinchilarga olmos tarqatish (faqat guruhda)
economyCommand.command("gsend", groupOnly, async (ctx) => {
  if (!ctx.dbUser || !ctx.message) return;

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

// /change N — Random g'olib olmos oladi (faqat guruhda)
economyCommand.command("change", groupOnly, async (ctx) => {
  if (!ctx.dbUser || !ctx.message) return;

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
