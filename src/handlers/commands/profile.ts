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
  heroAttackTargetsKeyboard,
  useItemsKeyboard,
  premiumGroupsKeyboard,
} from "../../keyboards/profile";
import { gameManager } from "../../game/manager";
import { privateOnly } from "../middleware/chat-type";
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

profileCommand.command("profile", privateOnly, async (ctx) => {
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
  const dayActions: { canAttack?: boolean; canDefend?: boolean; alreadyDefending?: boolean } = {};
  if (!hero) {
    const price = await pricingService.get(PRICE_KEYS.HERO_CREATE);
    text = `🥷 <b>Sizda Geroy yo'q</b>\n\nGeroy yarating va o'yinda qo'shimcha kuchga ega bo'ling!\n\n💎 Narxi: <b>${price}</b>`;
  } else {
    const { maxProtectionForLevel, HERO_MAX_LEVEL } = await import("../../services/hero.service");
    const maxProt = maxProtectionForLevel(hero.level);
    const protectionValid = hero.protection > 0;
    const isMaxLevel = hero.level >= HERO_MAX_LEVEL;

    text =
      `🥷 <b>Geroy: ${hero.name}</b>\n\n` +
      `⭐ Daraja: <b>${hero.level}</b>${isMaxLevel ? " (max)" : ""}\n` +
      `💪 Kuch: <b>${hero.powerMin}-${hero.powerMax}</b> oralig'ida\n` +
      `❤️ Jon (HP): <b>100</b> (o'yinda)\n` +
      `🛡 Himoya (qalqon): <b>${hero.protection}</b>\n` +
      `🛡 Max himoya: <b>${maxProt}</b>\n` +
      `✅ Himoya yaroqliligi: ${protectionValid ? "✅" : "❌"}\n` +
      `⚡ Zaryad miqdori: <b>${hero.charge}</b>\n` +
      `⭐ Jami ballar: <b>${hero.points}</b>\n`;
    if (!isMaxLevel) {
      const needed = heroService.getNeededPoints(hero.level);
      text += `🎯 Keyingi daraja: <b>${hero.level + 1}</b> = <b>${needed}</b> ball kerak`;
    }

    // Hujum/Himoya tanlovi faqat aktiv o'yinda + KUNDUZDA + tirik + ruxsat berilgan rolda
    const game = findUserGame(ctx.dbUser.telegramId);
    if (game && game.engine.status === "DAY" && game.player.isAlive) {
      const { HERO_ATTACK_ROLES } = await import("../../utils/constants");
      const allowedRole = HERO_ATTACK_ROLES.includes(game.player.role);
      if (allowedRole) {
        dayActions.canAttack = hero.charge > 0;
        dayActions.canDefend = !game.player.heroProtectionAvailable && !game.player.heroDefendUsed;
        dayActions.alreadyDefending = game.player.heroProtectionAvailable;
      }
    }
  }
  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: heroKeyboard(!!hero, dayActions) }).catch(() => {});
}

// Yordamchi: foydalanuvchi qaysi o'yinda
function findUserGame(telegramId: bigint) {
  for (const game of gameManager.getAllGames()) {
    const p = game.getPlayerByTelegramId(telegramId);
    if (p) return { engine: game, player: p };
  }
  return null;
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

// Himoyalanish — hero.protection'ni Player.heroHP'ga yuklaydi
profileCommand.callbackQuery("hero:defend", async (ctx) => {
  if (!ctx.dbUser) return;

  const game = findUserGame(ctx.dbUser.telegramId);
  if (!game || game.engine.status !== "DAY") {
    await ctx.answerCallbackQuery({ text: "Faqat kunduzda!", show_alert: true }).catch(() => {});
    return;
  }

  const { HERO_ATTACK_ROLES } = await import("../../utils/constants");
  if (!HERO_ATTACK_ROLES.includes(game.player.role)) {
    await ctx.answerCallbackQuery({ text: "Sizning rolingiz Geroy bilan ishlamaydi!", show_alert: true }).catch(() => {});
    return;
  }

  const result = await game.engine.activateHeroDefense(game.player.playerId);
  if (!result.success) {
    await ctx.answerCallbackQuery({ text: `❌ ${result.reason}`, show_alert: true }).catch(() => {});
    return;
  }

  await ctx.answerCallbackQuery({ text: `🛡 Himoya faol! Qalqon: ${result.protection}`, show_alert: true }).catch(() => {});
  await openHeroPage(ctx);
});

// Noop tugma
profileCommand.callbackQuery("hero:noop", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "🛡 Allaqachon himoyalanyapsiz" }).catch(() => {});
});

// Hujum qilish — nishon tanlash
profileCommand.callbackQuery("hero:attack", async (ctx) => {
  if (!ctx.dbUser) return;

  const game = findUserGame(ctx.dbUser.telegramId);
  if (!game || game.engine.status !== "DAY") {
    await ctx.answerCallbackQuery({ text: "Hujum faqat kunduzda!", show_alert: true }).catch(() => {});
    return;
  }
  if (!game.player.isAlive) {
    await ctx.answerCallbackQuery({ text: "Siz o'lik ekansiz!", show_alert: true }).catch(() => {});
    return;
  }
  const { HERO_ATTACK_ROLES } = await import("../../utils/constants");
  if (!HERO_ATTACK_ROLES.includes(game.player.role)) {
    await ctx.answerCallbackQuery({ text: "Sizning rolingiz Geroy bilan ishlamaydi!", show_alert: true }).catch(() => {});
    return;
  }

  const info = await heroService.getAttackInfo(ctx.dbUser.id);
  if (!info.canAttack) {
    await ctx.answerCallbackQuery({ text: `❌ ${info.error}`, show_alert: true }).catch(() => {});
    return;
  }

  const targets = game.engine.getAlivePlayers()
    .filter((p) => p.playerId !== game.player.playerId)
    .map((p) => ({ playerId: p.playerId, firstName: p.firstName }));

  if (targets.length === 0) {
    await ctx.answerCallbackQuery({ text: "Nishon yo'q!", show_alert: true }).catch(() => {});
    return;
  }

  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    `🥷 <b>Kimga hujum qilasiz?</b>\n\nKuch: <b>${info.power}</b> | Zaryad: <b>${info.charges}</b>`,
    { parse_mode: "HTML", reply_markup: heroAttackTargetsKeyboard(targets) }
  ).catch(() => {});
});

// Nishon tanlangach hujum
profileCommand.callbackQuery(/^hero:atk:(\d+)$/, async (ctx) => {
  if (!ctx.dbUser) return;
  const targetPlayerId = parseInt(ctx.match[1]);

  const game = findUserGame(ctx.dbUser.telegramId);
  if (!game || game.engine.status !== "DAY") {
    await ctx.answerCallbackQuery({ text: "Hujum faqat kunduzda!", show_alert: true }).catch(() => {});
    return;
  }

  const info = await heroService.getAttackInfo(ctx.dbUser.id);
  if (!info.canAttack) {
    await ctx.answerCallbackQuery({ text: `❌ ${info.error}`, show_alert: true }).catch(() => {});
    return;
  }

  const target = game.engine.getPlayer(targetPlayerId);
  if (!target || !target.isAlive) {
    await ctx.answerCallbackQuery({ text: "Nishon o'lik!", show_alert: true }).catch(() => {});
    return;
  }

  // Hujum — HP tizimi bilan
  const result = await game.engine.performHeroDayAttack(game.player.playerId, targetPlayerId);
  if (!result) {
    await ctx.answerCallbackQuery({ text: "Hujum amalga oshmadi!", show_alert: true }).catch(() => {});
    return;
  }

  // Zaryadni kamaytirish
  await heroService.consumeCharge(ctx.dbUser.id);

  await ctx.answerCallbackQuery({ text: "🥷 Hujum amalga oshirildi!" }).catch(() => {});

  // Hujumchi uchun tafsilotli xabar
  let attackerText = `🥷 <b>Hujum amalga oshirildi!</b>\n\n` +
    `💪 Hujum kuchi: <b>${result.damage}</b>\n`;
  if (result.targetHasHero) {
    attackerText += `🛡 Himoya yutdi: <b>${result.absorbedByProtection}</b>\n`;
    attackerText += `❤️ HP'ga zarar: <b>${result.hpDamage}</b>\n\n`;
    if (result.killed) {
      attackerText += `💀 <b>${target.firstName}</b> halok bo'ldi!`;
    } else {
      attackerText += `🩸 <b>${target.firstName}</b> tirik qoldi:\n` +
        `   ❤️ HP: <b>${result.remainingHP}/100</b>\n` +
        `   🛡 Himoya: <b>${result.remainingProtection}</b>`;
    }
  } else {
    attackerText += `\n💀 <b>${target.firstName}</b> halok bo'ldi! (Geroy himoyasi yo'q edi)`;
  }
  await ctx.editMessageText(attackerText, { parse_mode: "HTML" }).catch(() => {});

  // Nishonga ham PM (agar geroy egasi bo'lsa va tirik qolsa)
  if (!result.killed && result.targetHasHero) {
    try {
      await ctx.api.sendMessage(
        target.telegramId.toString(),
        `🥷 <b>Sizga kimdir hujum qildi!</b>\n\n` +
        `💪 Hujum kuchi: <b>${result.damage}</b>\n` +
        `🛡 Himoya yutdi: <b>${result.absorbedByProtection}</b>\n` +
        `❤️ HP zarar: <b>${result.hpDamage}</b>\n\n` +
        `❤️ Qolgan HP: <b>${result.remainingHP}/100</b>\n` +
        `🛡 Qolgan himoya: <b>${result.remainingProtection}</b>`,
        { parse_mode: "HTML" }
      );
    } catch { /* ignore */ }
  }

  // Guruhga anonim xabar
  try {
    if (result.killed) {
      await ctx.api.sendMessage(
        game.engine.chatTelegramId.toString(),
        `🥷 <b>Kimdir hujum qildi!</b>\n💀 <b>${target.firstName}</b> halok bo'ldi! Roli: ${ROLE_EMOJI[target.role]} <b>${ROLE_NAME[target.role]}</b>`,
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.api.sendMessage(
        game.engine.chatTelegramId.toString(),
        `🥷 <b>Kimdir hujum qildi!</b>\n🛡 Kimdir geroy bilan omon qoldi.`,
        { parse_mode: "HTML" }
      );
    }
  } catch { /* ignore */ }

  // G'olib tekshirish
  if (result.killed) {
    const winner = game.engine.checkWin();
    if (winner) {
      // Controller orqali end qilish — ammo controller'ga to'g'ridan-to'g'ri kirolmaymiz
      // Best effort: g'olib aniqlandi, controller timer orqali handle qiladi
    }
  }
});

profileCommand.callbackQuery("hero:rename", async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Yangi nom yozish uchun: /heroname YangiIsm",
    show_alert: true,
  }).catch(() => {});
});

profileCommand.command("heroname", privateOnly, async (ctx) => {
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
