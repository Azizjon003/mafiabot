import { Composer } from "grammy";
import { Role } from "@prisma/client";
import { BotContext } from "../../types/context";
import { prisma } from "../../database/prisma";
import { statsRepo } from "../../database/repositories/stats.repository";
import { vipService } from "../../services/vip.service";
import { heroService } from "../../services/hero.service";
import { inventoryService } from "../../services/inventory.service";
import { pricingService, PRICE_KEYS, rolePriceKey } from "../../services/pricing.service";
import {
  profileMainKeyboard,
  shopCategoriesKeyboard,
  buyItemKeyboard,
  activeRoleListKeyboard,
  heroKeyboard,
  useItemsKeyboard,
  premiumGroupsKeyboard,
} from "../../keyboards/profile";
import { ROLE_EMOJI, ROLE_NAME } from "../../utils/constants";
import { mention } from "../../utils/helpers";

export const profileCommand = new Composer<BotContext>();

// ==================== /profile ====================
async function buildProfileText(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stats: true, hero: true },
  });
  if (!user) return "User topilmadi";

  const rank = user.stats ? statsRepo.getRank(user.stats.rating) : "Yangi fuqaro";
  const isVip = await vipService.isVip(userId);

  let t = `👤 <b>${user.firstName}</b>\n\n`;
  t += `⭐️ Reyting: <b>${user.stats?.rating || 1000}</b> (${rank})\n`;
  t += `💰 Pul: <b>${user.money.toLocaleString()}</b>\n`;
  t += `💎 Olmos: <b>${user.diamonds}</b>\n`;
  t += `🛡 Himoya: <b>${user.shieldCount}</b>\n`;
  t += `📜 Hujjatlar: <b>${user.documentCount}</b>\n`;
  t += `🥷 Geroy: <b>${user.hero ? user.hero.name + " (lvl " + user.hero.level + ")" : "Yo'q"}</b>\n`;
  if (user.activeRole) {
    const flagIcon = user.useActiveRoleNextGame ? "✅" : "⬜️";
    t += `🎭 Aktiv rol: ${ROLE_EMOJI[user.activeRole]} <b>${ROLE_NAME[user.activeRole]}</b> ${flagIcon}\n`;
  }
  if (user.useShieldNextGame && user.shieldCount > 0) t += `🛡 Shield keyingi o'yinda ✅\n`;
  if (user.useDocumentNextGame && user.documentCount > 0) t += `📜 Hujjat keyingi o'yinda ✅\n`;
  if (user.useHeroNextGame && user.hero) t += `🥷 Geroy keyingi o'yinda ✅\n`;
  if (isVip && user.vipExpiresAt) {
    t += `⭐️ VIP: <b>${user.vipExpiresAt.toLocaleDateString("uz-UZ")}</b> gacha\n`;
  }
  t += `\n🎮 O'yinlar: <b>${user.stats?.gamesPlayed || 0}</b> | 🏆 Yutgan: <b>${user.stats?.gamesWon || 0}</b>`;
  return t;
}

profileCommand.command("profile", async (ctx) => {
  if (!ctx.dbUser) return;
  const text = await buildProfileText(ctx.dbUser.id);
  await ctx.reply(text, { parse_mode: "HTML", reply_markup: profileMainKeyboard() });
});

// ==================== Profile navigatsiya ====================
profileCommand.callbackQuery("prof:back", async (ctx) => {
  if (!ctx.dbUser) return;
  const text = await buildProfileText(ctx.dbUser.id);
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: profileMainKeyboard() }).catch(() => {});
});

// ==================== Do'kon kategoriyalari ====================
profileCommand.callbackQuery("prof:shop", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText("🏪 <b>Do'kon</b>\nKategoriyani tanlang:", {
    parse_mode: "HTML",
    reply_markup: shopCategoriesKeyboard(),
  }).catch(() => {});
});
profileCommand.callbackQuery("prof:buy", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText("🛒 Sotib olish — kategoriyani tanlang:", {
    parse_mode: "HTML",
    reply_markup: shopCategoriesKeyboard(),
  }).catch(() => {});
});

// Shield
profileCommand.callbackQuery("shop:cat:shield", async (ctx) => {
  const price = await pricingService.get(PRICE_KEYS.SHIELD);
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    `🛡 <b>Himoya (Shield)</b>\n\nO'yinda 1 marta o'limdan saqlaydi (Snayperdan tashqari).\n\n💎 Narxi: <b>${price}</b>`,
    { parse_mode: "HTML", reply_markup: buyItemKeyboard("shield") }
  ).catch(() => {});
});

// Document
profileCommand.callbackQuery("shop:cat:document", async (ctx) => {
  const price = await pricingService.get(PRICE_KEYS.DOCUMENT);
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    `📜 <b>Hujjat</b>\n\nKomissar tekshiruvini bekor qiladi (1 marta).\n\n💎 Narxi: <b>${price}</b>`,
    { parse_mode: "HTML", reply_markup: buyItemKeyboard("document") }
  ).catch(() => {});
});

// Hero category
profileCommand.callbackQuery("shop:cat:hero", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  return openHeroPage(ctx);
});

// Chest
profileCommand.callbackQuery("shop:cat:chest", async (ctx) => {
  const price = await pricingService.get(PRICE_KEYS.CHEST_BASIC);
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    `🗃 <b>Sandiq</b>\n\nRandom mukofot oling.\n\n💰 Narxi: <b>${price.toLocaleString()}</b>`,
    { parse_mode: "HTML", reply_markup: buyItemKeyboard("chest") }
  ).catch(() => {});
});

// VIP
profileCommand.callbackQuery("shop:cat:vip", async (ctx) => {
  const price = await pricingService.get(PRICE_KEYS.VIP_MONTH);
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    `⭐️ <b>VIP (1 oy)</b>\n\nSandiqni cheksiz ochish, maxsus badge.\n\n💎 Narxi: <b>${price}</b>`,
    { parse_mode: "HTML", reply_markup: buyItemKeyboard("vip") }
  ).catch(() => {});
});

// Aktiv rol ro'yxati
profileCommand.callbackQuery("shop:cat:role", async (ctx) => {
  const prices = await pricingService.getAll();
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    `🎭 <b>Qaysi rolni sotib olmoqchisiz?</b>\n\nKeyingi o'yinda shu rol tarqatiladi.`,
    { parse_mode: "HTML", reply_markup: activeRoleListKeyboard(prices) }
  ).catch(() => {});
});

// ==================== Sotib olish callback'lar ====================
profileCommand.callbackQuery(/^shop:buy:(shield|document|vip|chest)$/, async (ctx) => {
  if (!ctx.dbUser) return;
  const item = ctx.match[1];

  let res: { success: boolean; error?: string; reward?: any };
  if (item === "shield") {
    res = await inventoryService.buyShield(ctx.dbUser.id);
  } else if (item === "document") {
    res = await inventoryService.buyDocument(ctx.dbUser.id);
  } else if (item === "vip") {
    res = await vipService.buyVip(ctx.dbUser.id);
  } else if (item === "chest") {
    // Sandiq ochish
    const { chestService } = await import("../../services/chest.service");
    const chestRes = await chestService.openChest(ctx.dbUser.id);
    if (!chestRes.success) {
      await ctx.answerCallbackQuery({ text: `❌ ${chestRes.error}`, show_alert: true }).catch(() => {});
      return;
    }
    const r = chestRes.reward!;
    let rewardText = "🗃 <b>Sandiq ochildi!</b>\n\nMukofot:\n";
    if (r.diamonds > 0) rewardText += `💎 <b>${r.diamonds}</b> olmos\n`;
    if (r.money > 0) rewardText += `💰 <b>${r.money.toLocaleString()}</b> pul\n`;
    if (r.hero) rewardText += `🥷 <b>Geroy!</b> 🎉\n`;
    await ctx.answerCallbackQuery({ text: "🗃 Sandiq ochildi!", show_alert: true }).catch(() => {});
    await ctx.editMessageText(rewardText, { parse_mode: "HTML", reply_markup: profileMainKeyboard() }).catch(() => {});
    return;
  } else {
    return;
  }

  if (!res.success) {
    await ctx.answerCallbackQuery({ text: `❌ ${res.error}`, show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCallbackQuery({ text: "✅ Sotib olindi!", show_alert: true }).catch(() => {});

  // Profile ekraniga qaytarish
  const text = await buildProfileText(ctx.dbUser.id);
  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: profileMainKeyboard() }).catch(() => {});
});

// Aktiv rol sotib olish
profileCommand.callbackQuery(/^shop:role:(.+)$/, async (ctx) => {
  if (!ctx.dbUser) return;
  const value = ctx.match[1];

  if (value === "clear") {
    await inventoryService.clearActiveRole(ctx.dbUser.id);
    await ctx.answerCallbackQuery({ text: "🗑 Aktiv rol o'chirildi" }).catch(() => {});
  } else {
    const role = value as Role;
    const res = await inventoryService.buyActiveRole(ctx.dbUser.id, role);
    if (!res.success) {
      await ctx.answerCallbackQuery({ text: `❌ ${res.error}`, show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCallbackQuery({ text: `✅ ${ROLE_NAME[role]} sotib olindi!`, show_alert: true }).catch(() => {});
  }

  const text = await buildProfileText(ctx.dbUser.id);
  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: profileMainKeyboard() }).catch(() => {});
});

// ==================== HERO ====================
async function openHeroPage(ctx: BotContext) {
  if (!ctx.dbUser) return;
  const hero = await heroService.getOrNull(ctx.dbUser.id);
  let text: string;
  if (!hero) {
    const price = await pricingService.get(PRICE_KEYS.HERO_CREATE);
    text = `🥷 <b>Sizda Geroy yo'q</b>\n\nGeroy yarating va o'yinda qo'shimcha kuchga ega bo'ling!\n\n💎 Narxi: <b>${price}</b>`;
  } else {
    const needed = heroService.getNeededPoints(hero.level);
    text =
      `🥷 <b>Geroy: ${hero.name}</b>\n\n` +
      `📊 Daraja: <b>${hero.level}</b>\n` +
      `💪 Kuch: <b>${hero.powerMin}-${hero.powerMax}</b> oralig'ida\n` +
      `🛡 Himoya: <b>${hero.protection}%</b>\n` +
      `⚡ Zaryad: <b>${hero.charge}</b>\n` +
      `⭐ Jami ballar: <b>${hero.points}</b>\n` +
      `🎯 Keyingi daraja: <b>${needed}</b> ball kerak`;
  }
  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: heroKeyboard(!!hero) }).catch(() => {});
}

profileCommand.callbackQuery("prof:hero", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await openHeroPage(ctx);
});

profileCommand.callbackQuery("hero:create", async (ctx) => {
  if (!ctx.dbUser) return;
  const res = await heroService.create(ctx.dbUser.id);
  if (!res.success) {
    await ctx.answerCallbackQuery({ text: `❌ ${res.error}`, show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCallbackQuery({ text: "🥷 Geroy yaratildi!", show_alert: true }).catch(() => {});
  await openHeroPage(ctx);
});

profileCommand.callbackQuery("hero:buypoints", async (ctx) => {
  if (!ctx.dbUser) return;
  const res = await heroService.buyPoints(ctx.dbUser.id);
  if (!res.success) {
    await ctx.answerCallbackQuery({ text: `❌ ${res.error}`, show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCallbackQuery({ text: `✅ +${res.gained} ball!`, show_alert: true }).catch(() => {});
  await openHeroPage(ctx);
});

profileCommand.callbackQuery("hero:protection", async (ctx) => {
  if (!ctx.dbUser) return;
  const res = await heroService.refreshProtection(ctx.dbUser.id);
  if (!res.success) {
    await ctx.answerCallbackQuery({ text: `❌ ${res.error}`, show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCallbackQuery({ text: "🛡 Himoya 100%!" }).catch(() => {});
  await openHeroPage(ctx);
});

profileCommand.callbackQuery("hero:charge", async (ctx) => {
  if (!ctx.dbUser) return;
  const res = await heroService.charge(ctx.dbUser.id);
  if (!res.success) {
    await ctx.answerCallbackQuery({ text: `❌ ${res.error}`, show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCallbackQuery({ text: "⚡ Zaryadlandi!" }).catch(() => {});
  await openHeroPage(ctx);
});

profileCommand.callbackQuery("hero:rename", async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Yangi nom yozish uchun: /heroname YangiIsm",
    show_alert: true,
  }).catch(() => {});
});

profileCommand.command("heroname", async (ctx) => {
  if (!ctx.dbUser || !ctx.message?.text) return;
  const name = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!name) {
    await ctx.reply("⚠️ Foydalanish: /heroname YangiIsm");
    return;
  }
  const res = await heroService.rename(ctx.dbUser.id, name);
  if (!res.success) {
    await ctx.reply(`❌ ${res.error}`);
    return;
  }
  await ctx.reply(`✅ Geroy nomi o'zgartirildi: <b>${name}</b>`, { parse_mode: "HTML" });
});

// ==================== USE FLAGS ====================
async function openUsePage(ctx: BotContext) {
  if (!ctx.dbUser) return;
  const user = await prisma.user.findUnique({ where: { id: ctx.dbUser.id }, include: { hero: true } });
  if (!user) return;

  const text =
    `🎁 <b>Keyingi o'yinda nimadan foydalanasiz?</b>\n\n` +
    `🛡 Himoya: ${user.shieldCount} ta\n` +
    `📜 Hujjat: ${user.documentCount} ta\n` +
    `🎭 Aktiv rol: ${user.activeRole ? ROLE_NAME[user.activeRole] : "yo'q"}\n` +
    `🥷 Geroy: ${user.hero ? "✅" : "❌"}`;

  const flags = {
    shield: user.useShieldNextGame,
    document: user.useDocumentNextGame,
    activeRole: user.useActiveRoleNextGame,
    hero: user.useHeroNextGame,
    premiumEmoji: user.usePremiumEmoji,
  };

  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: useItemsKeyboard(flags) }).catch(() => {});
}

profileCommand.callbackQuery("prof:use", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await openUsePage(ctx);
});

profileCommand.callbackQuery(/^use:(shield|document|activeRole|hero|premiumEmoji)$/, async (ctx) => {
  if (!ctx.dbUser) return;
  const flag = ctx.match[1] as "shield" | "document" | "activeRole" | "hero" | "premiumEmoji";
  const res = await inventoryService.toggleUseFlag(ctx.dbUser.id, flag);
  if (res.error) {
    await ctx.answerCallbackQuery({ text: `❌ ${res.error}`, show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCallbackQuery({ text: res.enabled ? "✅ Yoqildi" : "⬜️ O'chirildi" }).catch(() => {});
  await openUsePage(ctx);
});

// ==================== Premium guruhlar ====================
profileCommand.callbackQuery("prof:premium", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    `⭐️ <b>Premium guruhlar</b>\n\nHozircha bo'sh — admin tomonidan qo'shiladi.`,
    { parse_mode: "HTML", reply_markup: premiumGroupsKeyboard() }
  ).catch(() => {});
});

// ==================== Statistika ====================
profileCommand.callbackQuery("prof:stats", async (ctx) => {
  if (!ctx.dbUser) return;
  const stats = await statsRepo.getOrCreate(ctx.dbUser.id);
  const rank = statsRepo.getRank(stats.rating);

  const text =
    `📊 <b>Batafsil statistika:</b>\n\n` +
    `🎮 O'yinlar: <b>${stats.gamesPlayed}</b>\n` +
    `🏆 Yutgan: <b>${stats.gamesWon}</b>\n` +
    `💀 Yutqazgan: <b>${stats.gamesLost}</b>\n` +
    `🔪 O'ldirganlar: <b>${stats.killCount}</b>\n` +
    `💊 Saqlab qolganlar: <b>${stats.savedCount}</b>\n` +
    `🔍 To'g'ri tekshiruvlar: <b>${stats.correctChecks}</b>\n` +
    `🔥 Seriya: <b>${stats.winStreak}</b> (max: ${stats.maxWinStreak})\n` +
    `⭐️ Reyting: <b>${stats.rating}</b> (${rank})`;

  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: profileMainKeyboard() }).catch(() => {});
});
