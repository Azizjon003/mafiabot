import { Composer, InlineKeyboard } from "grammy";
import { TopUpKind } from "@prisma/client";
import { BotContext } from "../../types/context";
import { topUpService } from "../../services/topup.service";
import { topUpRepo } from "../../database/repositories/topup.repository";
import { t } from "../../services/text.service";
import { balanceKeyboard, topUpAmountsKeyboard, cancelKeyboard, reviewKeyboard, rejectReasonKeyboard, REJECT_REASONS } from "../../keyboards/balance";
import { config, isOwner } from "../../config";
import { escapeHtml, mention } from "../../utils/helpers";
import { logger } from "../../utils/logger";

export const balanceCommand = new Composer<BotContext>();

// Foydalanuvchidan matn kutish holati (shaxsiy chat, bitta foydalanuvchi = bitta holat)
type Pending =
  | { type: "exchange"; dir: "m2d" | "d2m" }
  | { type: "topup"; kind: TopUpKind }
  | { type: "reject"; requestId: number };
const pending = new Map<string, Pending>();

const unitOf = (kind: TopUpKind) => (kind === "DIAMOND" ? "💎" : "💰");

// ==================== BALANS EKRANI ====================
async function renderBalance(ctx: BotContext, edit: boolean) {
  if (!ctx.dbUser) return;
  pending.delete(String(ctx.from!.id));
  const [bal, rates] = await Promise.all([
    topUpService.getBalance(ctx.dbUser.id),
    topUpService.getRates(),
  ]);
  const text = t("balance.title", {
    money: bal.money.toLocaleString(),
    diamonds: bal.diamonds.toLocaleString(),
    rate: rates.diamondToMoney.toLocaleString(),
    diamondSom: rates.diamondSom.toLocaleString(),
    moneySom: rates.moneySom.toLocaleString(),
  });
  const opts = { parse_mode: "HTML" as const, reply_markup: balanceKeyboard() };
  if (edit) await ctx.editMessageText(text, opts).catch(() => {});
  else await ctx.reply(text, opts);
}

// /balance va /balans — ikkalasi ham shu ekranni ochadi.
// economyCommand dagi eski matnli /balance o'rniga bu ishlaydi (index.ts da oldinroq).
balanceCommand.command(["balance", "balans"], async (ctx) => {
  if (ctx.chat.type !== "private") return;
  await renderBalance(ctx, false);
});

// Profil ekranidagi "🛒 Sotib olish" tugmasi
balanceCommand.callbackQuery("prof:buy", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await renderBalance(ctx, true);
});
balanceCommand.callbackQuery("bal:back", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await renderBalance(ctx, true);
});

// ==================== AYIRBOSHLASH ====================
balanceCommand.callbackQuery(/^bal:(m2d|d2m)$/, async (ctx) => {
  if (!ctx.dbUser || !ctx.from) return;
  const dir = ctx.match[1] as "m2d" | "d2m";
  const [bal, rates] = await Promise.all([
    topUpService.getBalance(ctx.dbUser.id),
    topUpService.getRates(),
  ]);
  pending.set(String(ctx.from.id), { type: "exchange", dir });
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    t(dir === "m2d" ? "balance.askDiamondToBuy" : "balance.askDiamondToSell", {
      rate: rates.diamondToMoney.toLocaleString(),
      money: bal.money.toLocaleString(),
      diamonds: bal.diamonds.toLocaleString(),
    }),
    { parse_mode: "HTML", reply_markup: cancelKeyboard() }
  ).catch(() => {});
});

// ==================== REAL PULGA SOTIB OLISH ====================
balanceCommand.callbackQuery(/^bal:buy:(DIAMOND|MONEY)$/, async (ctx) => {
  const kind = ctx.match[1] as TopUpKind;
  const rates = await topUpService.getRates();
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageText(
    t(kind === "DIAMOND" ? "balance.askTopUpDiamond" : "balance.askTopUpMoney", {
      price: (kind === "DIAMOND" ? rates.diamondSom : rates.moneySom).toLocaleString(),
      min: rates.minSom.toLocaleString(),
    }),
    { parse_mode: "HTML", reply_markup: topUpAmountsKeyboard(kind) }
  ).catch(() => {});
});

balanceCommand.callbackQuery(/^bal:custom:(DIAMOND|MONEY)$/, async (ctx) => {
  if (!ctx.from) return;
  const kind = ctx.match[1] as TopUpKind;
  pending.set(String(ctx.from.id), { type: "topup", kind });
  await ctx.answerCallbackQuery({ text: "Miqdorni yozing" }).catch(() => {});
});

balanceCommand.callbackQuery(/^bal:amt:(DIAMOND|MONEY):(\d+)$/, async (ctx) => {
  if (!ctx.dbUser || !ctx.from) return;
  const kind = ctx.match[1] as TopUpKind;
  const amount = parseInt(ctx.match[2]);
  await ctx.answerCallbackQuery().catch(() => {});
  await startTopUp(ctx, kind, amount, true);
});

// So'rov yaratish + karta rekvizitlarini ko'rsatish
async function startTopUp(ctx: BotContext, kind: TopUpKind, amount: number, edit: boolean) {
  if (!ctx.dbUser || !ctx.from) return;
  pending.delete(String(ctx.from.id));

  if (!Number.isFinite(amount) || amount <= 0) {
    await ctx.reply(t("balance.badNumber"), { parse_mode: "HTML" });
    return;
  }

  const card = topUpService.getCard();
  if (!card.filled) {
    const txt = t("balance.cardNotSet");
    if (edit) await ctx.editMessageText(txt, { parse_mode: "HTML", reply_markup: cancelKeyboard() }).catch(() => {});
    else await ctx.reply(txt, { parse_mode: "HTML" });
    return;
  }

  const rates = await topUpService.getRates();
  const som = await topUpService.priceFor(kind, amount);
  if (som < rates.minSom) {
    const txt = t("balance.minSom", { min: rates.minSom.toLocaleString(), som: som.toLocaleString() });
    if (edit) await ctx.editMessageText(txt, { parse_mode: "HTML", reply_markup: topUpAmountsKeyboard(kind) }).catch(() => {});
    else await ctx.reply(txt, { parse_mode: "HTML" });
    return;
  }

  const req = await topUpService.createRequest(ctx.dbUser.id, kind, amount);
  const text = t("balance.invoice", {
    amount: amount.toLocaleString(),
    unit: unitOf(kind),
    som: som.toLocaleString(),
    card: escapeHtml(card.number),
    holder: escapeHtml(card.holder),
  });
  logger.info({ requestId: req.id, userId: ctx.dbUser.id, kind, amount, som }, "To'lov so'rovi yaratildi");

  const opts = { parse_mode: "HTML" as const, reply_markup: cancelKeyboard() };
  if (edit) await ctx.editMessageText(text, opts).catch(() => {});
  else await ctx.reply(text, opts);
}

// ==================== MATN KIRITISH (miqdor / rad sababi) ====================
balanceCommand.on("message:text", async (ctx, next) => {
  if (ctx.chat.type !== "private" || !ctx.from || !ctx.dbUser) return next();
  const key = String(ctx.from.id);
  const state = pending.get(key);
  if (!state) return next();
  const raw = ctx.message.text.trim();
  if (raw.startsWith("/")) return next();

  // Rad etish sababi (admin)
  if (state.type === "reject") {
    pending.delete(key);
    await finishReject(ctx, state.requestId, raw);
    return;
  }

  const amount = parseInt(raw.replace(/[\s,]/g, ""), 10);
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply(t("balance.badNumber"), { parse_mode: "HTML" });
    return;
  }

  if (state.type === "topup") {
    await startTopUp(ctx, state.kind, amount, false);
    return;
  }

  // Ayirboshlash
  pending.delete(key);
  if (state.dir === "m2d") {
    const res = await topUpService.moneyToDiamond(ctx.dbUser.id, amount);
    if (!res.ok) { await ctx.reply(`❌ ${res.error}`); return; }
    await ctx.reply(
      t("balance.exchangedToDiamond", { diamonds: amount.toLocaleString(), cost: (res.cost ?? 0).toLocaleString() }),
      { parse_mode: "HTML", reply_markup: balanceKeyboard() }
    );
  } else {
    const res = await topUpService.diamondToMoney(ctx.dbUser.id, amount);
    if (!res.ok) { await ctx.reply(`❌ ${res.error}`); return; }
    await ctx.reply(
      t("balance.exchangedToMoney", { gain: (res.gain ?? 0).toLocaleString(), diamonds: amount.toLocaleString() }),
      { parse_mode: "HTML", reply_markup: balanceKeyboard() }
    );
  }
});

// ==================== CHEK (rasm yoki fayl) ====================
balanceCommand.on(["message:photo", "message:document"], async (ctx, next) => {
  if (ctx.chat.type !== "private" || !ctx.dbUser || !ctx.from) return next();

  const req = await topUpRepo.findAwaitingReceipt(ctx.dbUser.id);
  if (!req) return next(); // chek kutilmayapti — boshqa handlerlar ko'rsin

  const fileId = ctx.message.photo
    ? ctx.message.photo[ctx.message.photo.length - 1].file_id
    : ctx.message.document?.file_id;
  if (!fileId) return next();

  await topUpService.attachReceipt(req.id, fileId);
  await ctx.reply(t("balance.receiptSent", { id: req.id }), { parse_mode: "HTML" });

  // Adminlarga yuborish
  const admins = config.ownerIds;
  if (admins.length === 0) {
    logger.error("OWNER_IDS bo'sh — to'lov cheki hech kimga yuborilmadi");
    await ctx.reply(t("balance.adminNoAdmins"), { parse_mode: "HTML" });
    return;
  }
  const caption = t("balance.adminNew", {
    id: req.id,
    user: mention(ctx.from.first_name, BigInt(ctx.from.id)),
    telegramId: String(ctx.from.id),
    amount: req.amount.toLocaleString(),
    unit: unitOf(req.kind),
    som: req.priceSom.toLocaleString(),
  });
  for (const adminId of admins) {
    try {
      if (ctx.message.photo) {
        await ctx.api.sendPhoto(adminId.toString(), fileId, {
          caption, parse_mode: "HTML", reply_markup: reviewKeyboard(req.id),
        });
      } else {
        await ctx.api.sendDocument(adminId.toString(), fileId, {
          caption, parse_mode: "HTML", reply_markup: reviewKeyboard(req.id),
        });
      }
    } catch (e) {
      logger.error(e, `Chekni adminga yuborib bo'lmadi (adminId=${adminId})`);
    }
  }
});

// ==================== ADMIN: TASDIQLASH / RAD ETISH ====================
balanceCommand.callbackQuery(/^tu:ok:(\d+)$/, async (ctx) => {
  if (!ctx.from || !isOwner(BigInt(ctx.from.id))) {
    await ctx.answerCallbackQuery({ text: "Bu tugma faqat adminlar uchun!", show_alert: true }).catch(() => {});
    return;
  }
  const id = parseInt(ctx.match[1]);
  const req = await topUpRepo.findById(id);
  const res = await topUpService.approve(id, BigInt(ctx.from.id));
  if (!res.ok) {
    await ctx.answerCallbackQuery({ text: `❌ ${res.error}`, show_alert: true }).catch(() => {});
    return;
  }
  await ctx.answerCallbackQuery({ text: "✅ Tasdiqlandi" }).catch(() => {});
  await ctx.editMessageReplyMarkup({
    reply_markup: new InlineKeyboard().text(`✅ Tasdiqlangan (#${id})`, "tu:done"),
  }).catch(() => {});

  if (req) {
    await ctx.api.sendMessage(
      req.user.telegramId.toString(),
      t("balance.approved", { id, amount: req.amount.toLocaleString(), unit: unitOf(req.kind) }),
      { parse_mode: "HTML" }
    ).catch((e) => logger.error(e, "Tasdiq xabari yuborilmadi"));
  }
});

balanceCommand.callbackQuery(/^tu:no:(\d+)$/, async (ctx) => {
  if (!ctx.from || !isOwner(BigInt(ctx.from.id))) {
    await ctx.answerCallbackQuery({ text: "Bu tugma faqat adminlar uchun!", show_alert: true }).catch(() => {});
    return;
  }
  const id = parseInt(ctx.match[1]);
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.editMessageReplyMarkup({ reply_markup: rejectReasonKeyboard(id) }).catch(() => {});
});

balanceCommand.callbackQuery(/^tu:rsn:(\d+):(\w+)$/, async (ctx) => {
  if (!ctx.from || !isOwner(BigInt(ctx.from.id))) {
    await ctx.answerCallbackQuery({ text: "Bu tugma faqat adminlar uchun!", show_alert: true }).catch(() => {});
    return;
  }
  const id = parseInt(ctx.match[1]);
  const key = ctx.match[2];

  if (key === "custom") {
    pending.set(String(ctx.from.id), { type: "reject", requestId: id });
    await ctx.answerCallbackQuery({ text: "Sababni yozing" }).catch(() => {});
    await ctx.reply(`✏️ <b>#${id}</b> uchun rad etish sababini yozing:`, { parse_mode: "HTML" });
    return;
  }

  const reason = REJECT_REASONS.find((r) => r.key === key)?.text ?? "Sabab ko'rsatilmadi";
  await ctx.answerCallbackQuery().catch(() => {});
  await finishReject(ctx, id, reason);
});

balanceCommand.callbackQuery("tu:done", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Bu so'rov yopilgan" }).catch(() => {});
});

async function finishReject(ctx: BotContext, id: number, reason: string) {
  if (!ctx.from) return;
  const req = await topUpRepo.findById(id);
  const res = await topUpService.reject(id, BigInt(ctx.from.id), reason);
  if (!res.ok) {
    await ctx.reply(`❌ ${res.error}`);
    return;
  }
  await ctx.editMessageReplyMarkup({
    reply_markup: new InlineKeyboard().text(`❌ Rad etilgan (#${id})`, "tu:done"),
  }).catch(() => {});
  await ctx.reply(`❌ <b>#${id}</b> rad etildi.\nSabab: <i>${escapeHtml(reason)}</i>`, { parse_mode: "HTML" });

  if (req) {
    await ctx.api.sendMessage(
      req.user.telegramId.toString(),
      t("balance.rejected", { id, reason: escapeHtml(reason) }),
      { parse_mode: "HTML" }
    ).catch((e) => logger.error(e, "Rad etish xabari yuborilmadi"));
  }
}
