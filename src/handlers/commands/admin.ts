import { Composer, NextFunction } from "grammy";
import { BotContext } from "../../types/context";
import { adminOnlyMiddleware } from "../middleware/admin-only";
import { userRepo } from "../../database/repositories/user.repository";
import { chatRepo } from "../../database/repositories/chat.repository";
import { gameManager } from "../../game/manager";
import { prisma } from "../../database/prisma";
import { mention } from "../../utils/helpers";
import { settingsText, settingsMainKeyboard } from "../../keyboards/game";
import { setPhasePhoto, isOwner } from "../../config";
import { groupOnly } from "../middleware/chat-type";

export const adminCommand = new Composer<BotContext>();

// Faqat bosh admin (owner) uchun. ban/unban GLOBAL isBanned flagini o'zgartiradi,
// shuning uchun uni guruh adminiga emas, faqat owner'ga cheklaymiz.
async function ownerOnly(ctx: BotContext, next: NextFunction): Promise<void> {
  if (!ctx.from || !isOwner(BigInt(ctx.from.id))) {
    await ctx.reply("⚠️ Bu buyruq faqat bosh admin uchun!");
    return;
  }
  await next();
}

// Targetni olish — reply yoki id orqali
async function getTargetUserId(ctx: BotContext): Promise<{ telegramId: bigint; firstName: string } | null> {
  if (!ctx.message) return null;

  // Reply orqali
  if (ctx.message.reply_to_message?.from) {
    const from = ctx.message.reply_to_message.from;
    return { telegramId: BigInt(from.id), firstName: from.first_name };
  }

  // ID orqali
  const args = ctx.message.text?.split(" ");
  if (args && args[1]) {
    const id = parseInt(args[1]);
    if (!isNaN(id)) {
      const user = await userRepo.findByTelegramId(BigInt(id));
      if (user) return { telegramId: user.telegramId, firstName: user.firstName };
    }
  }

  return null;
}

// /mute — O'yinchini mute qilish
adminCommand.command("mute", groupOnly, adminOnlyMiddleware, async (ctx) => {
  if (ctx.chat.type === "private") return;

  const target = await getTargetUserId(ctx);
  if (!target) {
    await ctx.reply("⚠️ Reply qilib yoki ID bilan yozing: /mute 123456789");
    return;
  }

  await prisma.user.update({
    where: { telegramId: target.telegramId },
    data: { isMuted: true },
  });

  // O'yindan ham chiqarish
  const engine = gameManager.getGame(BigInt(ctx.chat.id));
  if (engine) {
    await gameManager.removePlayerFromGame(BigInt(ctx.chat.id), target.telegramId);
  }

  await ctx.reply(
    `🔇 ${mention(target.firstName, target.telegramId)} mute qilindi va o'yindan chetlatildi!`,
    { parse_mode: "HTML" }
  );
});

// /kick — O'yindan chiqarish
adminCommand.command("kick", groupOnly, adminOnlyMiddleware, async (ctx) => {
  if (ctx.chat.type === "private") return;

  const target = await getTargetUserId(ctx);
  if (!target) {
    await ctx.reply("⚠️ Reply qilib yoki ID bilan yozing: /kick 123456789");
    return;
  }

  const engine = gameManager.getGame(BigInt(ctx.chat.id));
  if (!engine) {
    await ctx.reply("⚠️ Hozir aktiv o'yin yo'q!");
    return;
  }

  const removed = await gameManager.removePlayerFromGame(BigInt(ctx.chat.id), target.telegramId);
  if (!removed) {
    await ctx.reply("⚠️ Bu o'yinchi o'yinda emas!");
    return;
  }

  await ctx.reply(
    `🗑 ${mention(target.firstName, target.telegramId)} o'yindan chetlatildi!`,
    { parse_mode: "HTML" }
  );
});

// /ban — Botdan ban (GLOBAL — faqat owner)
adminCommand.command("ban", groupOnly, ownerOnly, async (ctx) => {
  if (ctx.chat.type === "private") return;

  const target = await getTargetUserId(ctx);
  if (!target) {
    await ctx.reply("⚠️ Reply qilib yoki ID bilan yozing: /ban 123456789");
    return;
  }

  await userRepo.ban(target.telegramId);

  // O'yindan ham chiqarish
  const engine = gameManager.getGame(BigInt(ctx.chat.id));
  if (engine) {
    await gameManager.removePlayerFromGame(BigInt(ctx.chat.id), target.telegramId);
  }

  await ctx.reply(
    `🚫 ${mention(target.firstName, target.telegramId)} botdan ban qilindi!`,
    { parse_mode: "HTML" }
  );
});

// /unban — GLOBAL isBanned flagini olib tashlaydi (faqat owner, guruhda)
adminCommand.command("unban", groupOnly, ownerOnly, async (ctx) => {
  const target = await getTargetUserId(ctx);
  if (!target) {
    await ctx.reply("⚠️ Reply qilib yoki ID bilan yozing: /unban 123456789");
    return;
  }

  await userRepo.unban(target.telegramId);
  await ctx.reply(
    `✅ ${mention(target.firstName, target.telegramId)} ban olib tashlandi!`,
    { parse_mode: "HTML" }
  );
});

// /setphoto night|day — Rasmga reply qilib file_id saqlash
adminCommand.command("setphoto", groupOnly, adminOnlyMiddleware, async (ctx) => {
  const args = ctx.message?.text?.split(" ");
  const phase = args?.[1]?.toLowerCase();

  if (phase !== "night" && phase !== "day") {
    await ctx.reply("⚠️ Foydalanish: rasmga reply qilib /setphoto night yoki /setphoto day");
    return;
  }

  const photo = ctx.message?.reply_to_message?.photo;
  if (!photo || photo.length === 0) {
    await ctx.reply("⚠️ Rasmga reply qiling!");
    return;
  }

  const fileId = photo[photo.length - 1].file_id;
  setPhasePhoto(phase, fileId);

  const label = phase === "night" ? "🌙 Tun" : "☀️ Kunduz";
  await ctx.reply(`✅ ${label} rasmi saqlandi!`);
});

// /settings — O'yin sozlamalari (guruh only)
adminCommand.command("settings", groupOnly, adminOnlyMiddleware, async (ctx) => {
  const chat = await chatRepo.findOrCreate(BigInt(ctx.chat.id), ctx.chat.title);
  const settings = await chatRepo.getSettings(chat.id);

  await ctx.reply(settingsText(settings), {
    parse_mode: "HTML",
    reply_markup: settingsMainKeyboard(),
  });
});
