import { Composer, NextFunction, InlineKeyboard } from "grammy";
import { BotContext } from "../../types/context";
import { isOwner } from "../../config";
import { pricingService } from "../../services/pricing.service";
import { economyService } from "../../services/economy.service";
import { vipService } from "../../services/vip.service";
import { heroRepo } from "../../database/repositories/hero.repository";
import { inventoryRepo } from "../../database/repositories/inventory.repository";
import { userRepo } from "../../database/repositories/user.repository";
import { prisma } from "../../database/prisma";
import { mention } from "../../utils/helpers";
import {
  adminPanelKeyboard,
  pricesCategoriesKeyboard,
  rolePricesKeyboard,
  priceEditKeyboard,
  giftCategoriesKeyboard,
  configCategoriesKeyboard,
} from "../../keyboards/admin-panel";

// Pending state — admin "aniq qiymat" yoki "sovg'a miqdori" yozishini kutamiz
// Map<ownerTelegramId, {type: "price"|"gift", key: string, targetUserId?: number}>
const pendingInputs = new Map<
  string,
  | { type: "price"; key: string }
  | { type: "gift"; giftType: string; targetUserId?: number; targetName?: string; targetTgId?: bigint }
  | { type: "search" }
>();

// Faqat bosh admin uchun middleware
async function ownerOnly(ctx: BotContext, next: NextFunction): Promise<void> {
  if (!ctx.from || !isOwner(BigInt(ctx.from.id))) {
    await ctx.reply("⚠️ Bu buyruq faqat bosh admin uchun!");
    return;
  }
  await next();
}

// Reply yoki ID orqali user topish
async function getTargetUser(ctx: BotContext): Promise<{ telegramId: bigint; firstName: string; id: number } | null> {
  if (!ctx.message) return null;
  if (ctx.message.reply_to_message?.from) {
    const f = ctx.message.reply_to_message.from;
    const u = await userRepo.findOrCreate(BigInt(f.id), f.first_name, f.username);
    return { telegramId: BigInt(f.id), firstName: f.first_name, id: u.id };
  }
  const args = ctx.message.text?.split(" ") || [];
  if (args[1]) {
    const id = parseInt(args[1]);
    if (!isNaN(id)) {
      const u = await userRepo.findByTelegramId(BigInt(id));
      if (u) return { telegramId: u.telegramId, firstName: u.firstName, id: u.id };
    }
  }
  return null;
}

export const ownerCommand = new Composer<BotContext>();

// /setprice <key> <value>
ownerCommand.command("setprice", ownerOnly, async (ctx) => {
  const args = ctx.message?.text?.split(" ") || [];
  if (args.length < 3) {
    await ctx.reply(
      "⚠️ Foydalanish: /setprice <key> <value>\n\n" +
      "Misollar:\n" +
      "/setprice price_shield 60\n" +
      "/setprice price_role_SNIPER 500\n" +
      "/setprice price_chest_basic 12000",
    );
    return;
  }
  const key = args[1];
  const value = parseInt(args[2]);
  if (isNaN(value) || value < 0) {
    await ctx.reply("⚠️ Narx noto'g'ri!");
    return;
  }
  await pricingService.set(key, value);
  await ctx.reply(`✅ <b>${key}</b> = <b>${value}</b>`, { parse_mode: "HTML" });
});

// /listprices — barcha narxlarni ko'rsatish
ownerCommand.command("listprices", ownerOnly, async (ctx) => {
  const all = await pricingService.getAll();
  const lines = Object.entries(all)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `<code>${k}</code> = <b>${v}</b>`);
  // 4096 character cheklovi
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (current.length + line.length > 3500) {
      chunks.push(current);
      current = "";
    }
    current += line + "\n";
  }
  if (current) chunks.push(current);

  for (const chunk of chunks) {
    await ctx.reply(`💰 <b>Narxlar:</b>\n${chunk}`, { parse_mode: "HTML" });
  }
});

// /givemoney <amount> (reply or id)
ownerCommand.command("givemoney", ownerOnly, async (ctx) => {
  const target = await getTargetUser(ctx);
  if (!target) {
    await ctx.reply("⚠️ Reply qiling yoki ID kiriting: /givemoney 5000 [id]");
    return;
  }
  const args = ctx.message?.text?.split(" ") || [];
  const amountIdx = ctx.message?.reply_to_message ? 1 : 2;
  const amount = parseInt(args[amountIdx] || "");
  if (isNaN(amount) || amount === 0) {
    await ctx.reply("⚠️ Miqdor noto'g'ri!");
    return;
  }
  if (amount > 0) {
    await economyService.addMoney(target.id, amount, "owner_gift");
  } else {
    await economyService.spendMoney(target.id, -amount, "owner_take");
  }
  await ctx.reply(
    `✅ ${mention(target.firstName, target.telegramId)}ga <b>${amount.toLocaleString()}</b>💰`,
    { parse_mode: "HTML" }
  );
});

// /givediamond <amount> (reply or id)
ownerCommand.command("givediamond", ownerOnly, async (ctx) => {
  const target = await getTargetUser(ctx);
  if (!target) {
    await ctx.reply("⚠️ Reply qiling yoki ID kiriting: /givediamond 50 [id]");
    return;
  }
  const args = ctx.message?.text?.split(" ") || [];
  const amountIdx = ctx.message?.reply_to_message ? 1 : 2;
  const amount = parseInt(args[amountIdx] || "");
  if (isNaN(amount) || amount === 0) {
    await ctx.reply("⚠️ Miqdor noto'g'ri!");
    return;
  }
  if (amount > 0) {
    await economyService.addDiamonds(target.id, amount, "owner_gift");
  } else {
    await economyService.spendDiamonds(target.id, -amount, "owner_take");
  }
  await ctx.reply(
    `✅ ${mention(target.firstName, target.telegramId)}ga <b>${amount}</b>💎`,
    { parse_mode: "HTML" }
  );
});

// /givepoints <amount> (reply or id) — geroy ballari
ownerCommand.command("givepoints", ownerOnly, async (ctx) => {
  const target = await getTargetUser(ctx);
  if (!target) {
    await ctx.reply("⚠️ Reply qiling yoki ID kiriting");
    return;
  }
  const args = ctx.message?.text?.split(" ") || [];
  const amountIdx = ctx.message?.reply_to_message ? 1 : 2;
  const amount = parseInt(args[amountIdx] || "");
  if (isNaN(amount)) {
    await ctx.reply("⚠️ Miqdor noto'g'ri!");
    return;
  }

  const hero = await heroRepo.findByUser(target.id);
  if (!hero) {
    await ctx.reply("⚠️ Bu o'yinchida Geroy yo'q!");
    return;
  }
  await heroRepo.addPoints(target.id, amount);
  await ctx.reply(
    `✅ ${mention(target.firstName, target.telegramId)}ning Geroyiga <b>${amount}</b> ball`,
    { parse_mode: "HTML" }
  );
});

// /giveshield (reply or id) — shield berish
ownerCommand.command("giveshield", ownerOnly, async (ctx) => {
  const target = await getTargetUser(ctx);
  if (!target) {
    await ctx.reply("⚠️ Reply qiling yoki ID kiriting");
    return;
  }
  await inventoryRepo.addShield(target.id, 1);
  await ctx.reply(
    `✅ ${mention(target.firstName, target.telegramId)}ga 🛡 Shield berildi`,
    { parse_mode: "HTML" }
  );
});

// /givedoc (reply or id) — hujjat berish
ownerCommand.command("givedoc", ownerOnly, async (ctx) => {
  const target = await getTargetUser(ctx);
  if (!target) {
    await ctx.reply("⚠️ Reply qiling yoki ID kiriting");
    return;
  }
  await inventoryRepo.addDocument(target.id, 1);
  await ctx.reply(
    `✅ ${mention(target.firstName, target.telegramId)}ga 📜 Hujjat berildi`,
    { parse_mode: "HTML" }
  );
});

// /myid — o'zining Telegram ID sini ko'rish (debug uchun)
ownerCommand.command("myid", async (ctx) => {
  if (!ctx.from) return;
  await ctx.reply(`🆔 Sizning Telegram ID: <code>${ctx.from.id}</code>`, { parse_mode: "HTML" });
});

// ==================== ADMIN PANEL ====================

// /admin — Inline tugmalar bilan panel
ownerCommand.command("admin", ownerOnly, async (ctx) => {
  await ctx.reply("🔧 <b>Bosh Admin Paneli</b>\n\nKategoriyani tanlang:", {
    parse_mode: "HTML",
    reply_markup: adminPanelKeyboard(),
  });
});

// Asosiy panelga qaytish
ownerCommand.callbackQuery("ap:main", ownerOnly, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText("🔧 <b>Bosh Admin Paneli</b>\n\nKategoriyani tanlang:", {
    parse_mode: "HTML",
    reply_markup: adminPanelKeyboard(),
  }).catch(() => {});
});

// Yopish
ownerCommand.callbackQuery("ap:close", ownerOnly, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});
});

// ==================== NARXLAR ====================

ownerCommand.callbackQuery("ap:prices", ownerOnly, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    "💰 <b>Narxlar boshqaruvi</b>\n\nQaysi narxni o'zgartirmoqchisiz?",
    { parse_mode: "HTML", reply_markup: pricesCategoriesKeyboard() }
  ).catch(() => {});
});

ownerCommand.callbackQuery("ap:roleprices", ownerOnly, async (ctx) => {
  const all = await pricingService.getAll();
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    "🎭 <b>Aktiv rollar narxi</b> (💰 pulda)\n\nO'zgartirish uchun rolni tanlang:",
    { parse_mode: "HTML", reply_markup: rolePricesKeyboard(all) }
  ).catch(() => {});
});

// Bitta narx ekrani — +/- tugmalar
ownerCommand.callbackQuery(/^ap:price:(.+)$/, ownerOnly, async (ctx) => {
  const key = ctx.match[1];
  const value = await pricingService.get(key);
  const isMoney = key.includes("money") || key.startsWith("price_role_") || key.startsWith("price_chest");
  const symbol = isMoney ? "💰" : "💎";

  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    `💰 <b>${key}</b>\n\nHozirgi qiymat: <b>${value.toLocaleString()}</b>${symbol}\n\nO'zgartiring:`,
    { parse_mode: "HTML", reply_markup: priceEditKeyboard(key, value) }
  ).catch(() => {});
});

// +/- tugmalar
ownerCommand.callbackQuery(/^ap:padj:(.+):(-?\d+)$/, ownerOnly, async (ctx) => {
  const key = ctx.match[1];
  const delta = parseInt(ctx.match[2]);
  const current = await pricingService.get(key);
  const newValue = Math.max(0, current + delta);
  await pricingService.set(key, newValue);

  const isMoney = key.includes("money") || key.startsWith("price_role_") || key.startsWith("price_chest");
  const symbol = isMoney ? "💰" : "💎";

  await ctx.answerCallbackQuery({ text: `✅ ${newValue.toLocaleString()}${symbol}` }).catch(() => {});
  await ctx.editMessageText(
    `💰 <b>${key}</b>\n\nHozirgi qiymat: <b>${newValue.toLocaleString()}</b>${symbol}\n\nO'zgartiring:`,
    { parse_mode: "HTML", reply_markup: priceEditKeyboard(key, newValue) }
  ).catch(() => {});
});

// Aniq qiymat kiritish — keyingi xabarni kutamiz
ownerCommand.callbackQuery(/^ap:psetexact:(.+)$/, ownerOnly, async (ctx) => {
  if (!ctx.from) return;
  const key = ctx.match[1];
  pendingInputs.set(ctx.from.id.toString(), { type: "price", key });
  await ctx.answerCallbackQuery({
    text: `Yangi qiymatni yozing (faqat raqam)`,
    show_alert: true,
  }).catch(() => {});
});

// ==================== SOVG'A ====================

ownerCommand.callbackQuery("ap:gift", ownerOnly, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    "🎁 <b>Sovg'a berish</b>\n\n" +
    "1️⃣ Avval kategoriyani tanlang\n" +
    "2️⃣ Keyin foydalanuvchiga reply qilib miqdorini yozing\n\n" +
    "Misol: ushbu xabarga reply qilmasdan, panelda kategoriya tanlanagandan keyin botga: <code>123456789 1000</code> deb yozing\n" +
    "Yoki o'sha foydalanuvchi xabariga reply qilib: <code>1000</code>",
    { parse_mode: "HTML", reply_markup: giftCategoriesKeyboard() }
  ).catch(() => {});
});

ownerCommand.callbackQuery(/^ap:gift:(money|diamond|shield|document|points|vip)$/, ownerOnly, async (ctx) => {
  if (!ctx.from) return;
  const giftType = ctx.match[1];
  pendingInputs.set(ctx.from.id.toString(), { type: "gift", giftType });

  const labels: Record<string, string> = {
    money: "💰 Pul",
    diamond: "💎 Olmos",
    shield: "🛡 Shield (1 dona)",
    document: "📜 Hujjat (1 dona)",
    points: "⭐ Geroy ball",
    vip: "⭐️ VIP (30 kun)",
  };

  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    `🎁 <b>Sovg'a: ${labels[giftType]}</b>\n\n` +
    `Endi quyidagi formatlardan birida yozing:\n\n` +
    `📌 <b>ID + miqdor:</b>\n<code>123456789 100</code>\n\n` +
    `📌 <b>Faqat ID</b> (shield/document/vip uchun):\n<code>123456789</code>\n\n` +
    `📌 Yoki shu chatda foydalanuvchi xabariga reply qilib miqdor yozing.`,
    { parse_mode: "HTML", reply_markup: giftCategoriesKeyboard() }
  ).catch(() => {});
});

// ==================== SOZLAMALAR ====================

ownerCommand.callbackQuery("ap:config", ownerOnly, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    "⚙️ <b>Sozlamalar</b>\n\nNimani bajarmoqchisiz?",
    { parse_mode: "HTML", reply_markup: configCategoriesKeyboard() }
  ).catch(() => {});
});

ownerCommand.callbackQuery("ap:cfg:clearcache", ownerOnly, async (ctx) => {
  pricingService.clearCache();
  await ctx.answerCallbackQuery({ text: "✅ Cache tozalandi", show_alert: true }).catch(() => {});
});

ownerCommand.callbackQuery("ap:cfg:listprices", ownerOnly, async (ctx) => {
  const all = await pricingService.getAll();
  const lines = Object.entries(all)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `<code>${k}</code> = <b>${v.toLocaleString()}</b>`)
    .join("\n");
  await ctx.answerCallbackQuery().catch(() => {});
  // Yangi xabar (panel ekranini buzmaslik uchun)
  const text = `📋 <b>Barcha narxlar:</b>\n\n${lines}`;
  if (text.length <= 4000) {
    await ctx.reply(text, { parse_mode: "HTML" });
  } else {
    await ctx.reply("📋 Narxlar juda ko'p — terminalda /listprices ishlating");
  }
});

// ==================== BOT STATISTIKASI ====================

ownerCommand.callbackQuery("ap:botstats", ownerOnly, async (ctx) => {
  const usersCount = await prisma.user.count();
  const gamesTotal = await prisma.game.count();
  const gamesActive = await prisma.game.count({
    where: { status: { notIn: ["FINISHED", "CANCELLED"] } },
  });
  const heroesCount = await prisma.hero.count();
  const vipCount = await prisma.user.count({ where: { isVip: true } });

  const text =
    `📊 <b>Bot statistikasi</b>\n\n` +
    `👥 Foydalanuvchilar: <b>${usersCount}</b>\n` +
    `🎮 Jami o'yinlar: <b>${gamesTotal}</b>\n` +
    `▶️ Aktiv o'yinlar: <b>${gamesActive}</b>\n` +
    `🥷 Geroyga ega: <b>${heroesCount}</b>\n` +
    `⭐️ VIP foydalanuvchilar: <b>${vipCount}</b>`;

  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: adminPanelKeyboard(),
  }).catch(() => {});
});

// ==================== FOYDALANUVCHILAR ====================

// Sahifa hajmi
const USERS_PER_PAGE = 10;

type UserSortBy = "diamonds" | "money" | "rating" | "games" | "new";

function buildUsersListKeyboard(page: number, totalPages: number, sortBy: UserSortBy): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Saralash tugmalari
  const sortLabel = (s: UserSortBy, label: string) => (s === sortBy ? `✅ ${label}` : label);
  kb.text(sortLabel("diamonds", "💎"), `ap:users:diamonds:0`);
  kb.text(sortLabel("money", "💰"), `ap:users:money:0`);
  kb.text(sortLabel("rating", "⭐"), `ap:users:rating:0`);
  kb.text(sortLabel("games", "🎮"), `ap:users:games:0`);
  kb.text(sortLabel("new", "🆕"), `ap:users:new:0`);
  kb.row();

  // Pagination
  if (totalPages > 1) {
    if (page > 0) kb.text("⬅️", `ap:users:${sortBy}:${page - 1}`);
    kb.text(`${page + 1}/${totalPages}`, `ap:users:nope`);
    if (page < totalPages - 1) kb.text("➡️", `ap:users:${sortBy}:${page + 1}`);
    kb.row();
  }

  // Qidirish va asosiy
  kb.text("🔍 Qidirish (ID/ism)", `ap:users:search`);
  kb.row();
  kb.text("🔙 Asosiy", "ap:main");
  return kb;
}

async function showUsersPage(ctx: BotContext, sortBy: UserSortBy, page: number): Promise<void> {
  const total = await prisma.user.count();
  const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));

  let orderBy: any;
  let extraInclude: any = {};
  switch (sortBy) {
    case "diamonds":
      orderBy = { diamonds: "desc" };
      break;
    case "money":
      orderBy = { money: "desc" };
      break;
    case "new":
      orderBy = { createdAt: "desc" };
      break;
    case "rating":
      orderBy = { stats: { rating: "desc" } };
      extraInclude = { stats: true };
      break;
    case "games":
      orderBy = { stats: { gamesPlayed: "desc" } };
      extraInclude = { stats: true };
      break;
  }

  const users = await prisma.user.findMany({
    orderBy,
    take: USERS_PER_PAGE,
    skip: safePage * USERS_PER_PAGE,
    include: extraInclude,
  });

  const sortNames: Record<UserSortBy, string> = {
    diamonds: "💎 Olmos bo'yicha",
    money: "💰 Pul bo'yicha",
    rating: "⭐ Reyting bo'yicha",
    games: "🎮 O'yinlar bo'yicha",
    new: "🆕 Yangilar bo'yicha",
  };

  let text = `👥 <b>Foydalanuvchilar — ${sortNames[sortBy]}</b>\n`;
  text += `Jami: <b>${total}</b>\n\n`;

  users.forEach((u: any, i: number) => {
    const num = safePage * USERS_PER_PAGE + i + 1;
    const r = u.stats?.rating ?? 1000;
    const g = u.stats?.gamesPlayed ?? 0;
    text += `${num}. <b>${escapeHtml(u.firstName)}</b> <code>${u.telegramId}</code>\n`;
    text += `   ${u.diamonds}💎 ${u.money.toLocaleString()}💰 ⭐${r} 🎮${g}\n`;
  });

  await ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: buildUsersListKeyboard(safePage, totalPages, sortBy),
  }).catch(() => {});
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

ownerCommand.callbackQuery("ap:users", ownerOnly, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await showUsersPage(ctx, "diamonds", 0);
});

// Saralash + sahifalash
ownerCommand.callbackQuery(/^ap:users:(diamonds|money|rating|games|new):(\d+)$/, ownerOnly, async (ctx) => {
  const sortBy = ctx.match[1] as UserSortBy;
  const page = parseInt(ctx.match[2]);
  await ctx.answerCallbackQuery().catch(() => {});
  await showUsersPage(ctx, sortBy, page);
});

// "Nope" — shunchaki bossa hech narsa
ownerCommand.callbackQuery("ap:users:nope", ownerOnly, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
});

// Qidirish — keyingi xabarda ism yoki ID kutamiz
ownerCommand.callbackQuery("ap:users:search", ownerOnly, async (ctx) => {
  if (!ctx.from) return;
  pendingInputs.set(ctx.from.id.toString(), { type: "search" } as any);
  await ctx.answerCallbackQuery({
    text: "ID yoki ism qismini yozing",
    show_alert: true,
  }).catch(() => {});
});

// ==================== TEXT INPUT (pending state'ni hal qilish) ====================

// Hozirgi text middleware — admin panel state'ini handle qiladi
ownerCommand.on("message:text", async (ctx, next) => {
  if (!ctx.from) {
    return next();
  }
  const ownerId = ctx.from.id.toString();
  const pending = pendingInputs.get(ownerId);
  if (!pending) {
    return next();
  }

  // Ownermi
  if (!isOwner(BigInt(ctx.from.id))) {
    pendingInputs.delete(ownerId);
    return next();
  }

  const text = ctx.message.text.trim();

  // Buyruq bo'lsa — bekor qilish
  if (text.startsWith("/")) {
    pendingInputs.delete(ownerId);
    return next();
  }

  // PRICE input
  if (pending.type === "price") {
    const value = parseInt(text);
    if (isNaN(value) || value < 0) {
      await ctx.reply("⚠️ Faqat musbat raqam kiriting!");
      return;
    }
    await pricingService.set(pending.key, value);
    pendingInputs.delete(ownerId);
    await ctx.reply(`✅ <b>${pending.key}</b> = <b>${value.toLocaleString()}</b>`, { parse_mode: "HTML" });
    return;
  }

  // SEARCH input
  if (pending.type === "search") {
    pendingInputs.delete(ownerId);
    const q = text.trim();

    // ID bo'lsa
    const id = parseInt(q);
    let users;
    if (!isNaN(id) && q.length > 5) {
      users = await prisma.user.findMany({
        where: { telegramId: BigInt(id) },
        include: { stats: true },
        take: 10,
      });
    } else {
      // Ism bo'yicha qidirish
      users = await prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { stats: true },
        take: 20,
      });
    }

    if (users.length === 0) {
      await ctx.reply(`🔍 "<b>${q}</b>" bo'yicha hech kim topilmadi.`, { parse_mode: "HTML" });
      return;
    }

    let resultText = `🔍 <b>Qidiruv natijalari (${users.length}):</b>\n\n`;
    users.forEach((u: any, i: number) => {
      const r = u.stats?.rating ?? 1000;
      const g = u.stats?.gamesPlayed ?? 0;
      resultText += `${i + 1}. <b>${u.firstName}</b> <code>${u.telegramId}</code>\n`;
      resultText += `   ${u.diamonds}💎 ${u.money.toLocaleString()}💰 ⭐${r} 🎮${g}\n`;
    });

    await ctx.reply(resultText, { parse_mode: "HTML" });
    return;
  }

  // GIFT input
  if (pending.type === "gift") {
    let targetTgId: bigint | null = null;
    let amount: number = 1;
    let targetName: string = "";

    // Reply orqali
    if (ctx.message.reply_to_message?.from) {
      const f = ctx.message.reply_to_message.from;
      targetTgId = BigInt(f.id);
      targetName = f.first_name;
      const a = parseInt(text);
      if (!isNaN(a)) amount = a;
    } else {
      // ID + miqdor formatda
      const parts = text.split(/\s+/);
      const id = parseInt(parts[0]);
      if (isNaN(id)) {
        await ctx.reply("⚠️ Format: <code>123456789 100</code> yoki user xabariga reply", { parse_mode: "HTML" });
        return;
      }
      targetTgId = BigInt(id);
      if (parts[1]) {
        const a = parseInt(parts[1]);
        if (!isNaN(a)) amount = a;
      }
      // User'ni topish
      const u = await userRepo.findByTelegramId(targetTgId);
      if (!u) {
        await ctx.reply("⚠️ Bunday foydalanuvchi topilmadi!");
        return;
      }
      targetName = u.firstName;
    }

    // User'ni DB'dan olamiz
    const user = await userRepo.findByTelegramId(targetTgId);
    if (!user) {
      await ctx.reply("⚠️ User topilmadi!");
      return;
    }

    // Sovg'a berish
    let resultText = "";
    switch (pending.giftType) {
      case "money":
        if (amount > 0) await economyService.addMoney(user.id, amount, "owner_gift");
        else if (amount < 0) await economyService.spendMoney(user.id, -amount, "owner_take");
        resultText = `💰 ${amount.toLocaleString()} pul`;
        break;
      case "diamond":
        if (amount > 0) await economyService.addDiamonds(user.id, amount, "owner_gift");
        else if (amount < 0) await economyService.spendDiamonds(user.id, -amount, "owner_take");
        resultText = `💎 ${amount} olmos`;
        break;
      case "shield":
        await inventoryRepo.addShield(user.id, amount);
        resultText = `🛡 ${amount} ta Shield`;
        break;
      case "document":
        await inventoryRepo.addDocument(user.id, amount);
        resultText = `📜 ${amount} ta Hujjat`;
        break;
      case "points":
        const hero = await heroRepo.findByUser(user.id);
        if (!hero) {
          await ctx.reply("⚠️ Bu foydalanuvchida Geroy yo'q!");
          pendingInputs.delete(ownerId);
          return;
        }
        await heroRepo.addPoints(user.id, amount);
        resultText = `⭐ ${amount} ball`;
        break;
      case "vip":
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await prisma.user.update({
          where: { id: user.id },
          data: { isVip: true, vipExpiresAt: expiresAt },
        });
        resultText = `⭐️ VIP 30 kun`;
        break;
    }

    pendingInputs.delete(ownerId);
    await ctx.reply(
      `✅ ${mention(targetName, targetTgId)}ga <b>${resultText}</b> berildi`,
      { parse_mode: "HTML" }
    );
    return;
  }

  return next();
});
