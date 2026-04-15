import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { vipService } from "../../services/vip.service";
import { pricingService, PRICE_KEYS } from "../../services/pricing.service";
import { privateOnly } from "../middleware/chat-type";

export const vipCommand = new Composer<BotContext>();

// /vip — VIP ma'lumot
vipCommand.command("vip", async (ctx) => {
  if (!ctx.dbUser) return;

  const info = await vipService.getVipInfo(ctx.dbUser.id);
  const isVip = await vipService.isVip(ctx.dbUser.id);

  if (isVip && info?.vipExpiresAt) {
    const expDate = info.vipExpiresAt.toLocaleDateString("uz-UZ");
    await ctx.reply(
      `⭐️ <b>VIP Status: Faol</b>\n` +
      `📅 Muddati: <b>${expDate}</b> gacha\n\n` +
      `<b>Imtiyozlar:</b>\n` +
      `✅ Sandiqni cheksiz ochish\n` +
      `✅ Maxsus badge profilda\n` +
      `✅ Premium funksiyalar`,
      { parse_mode: "HTML" }
    );
  } else {
    const price = await pricingService.get(PRICE_KEYS.VIP_MONTH);
    const currency = await pricingService.getCurrency(PRICE_KEYS.VIP_MONTH);
    const sym = currency === "diamond" ? "💎" : "💰";
    await ctx.reply(
      `⭐️ <b>VIP Status: Faol emas</b>\n\n` +
      `VIP narxi: <b>${price.toLocaleString()}${sym}</b> / oy\n\n` +
      `<b>Imtiyozlar:</b>\n` +
      `✅ Sandiqni cheksiz ochish\n` +
      `✅ Maxsus badge profilda\n` +
      `✅ Premium funksiyalar\n\n` +
      `/buyvip — VIP sotib olish`,
      { parse_mode: "HTML" }
    );
  }
});

// /buyvip — VIP sotib olish
vipCommand.command("buyvip", privateOnly, async (ctx) => {
  if (!ctx.dbUser) return;

  const result = await vipService.buyVip(ctx.dbUser.id);
  if (!result.success) {
    await ctx.reply(`❌ ${result.error}`, { parse_mode: "HTML" });
    return;
  }

  const expDate = result.expiresAt!.toLocaleDateString("uz-UZ");
  await ctx.reply(
    `🎉 <b>VIP muvaffaqiyatli faollashtirildi!</b>\n` +
    `📅 Muddati: <b>${expDate}</b> gacha`,
    { parse_mode: "HTML" }
  );
});

// VIP callback from profile
vipCommand.callbackQuery("open_vip", async (ctx) => {
  if (!ctx.dbUser) return;

  const isVip = await vipService.isVip(ctx.dbUser.id);
  await ctx.answerCallbackQuery({ text: isVip ? "⭐️ VIP faol!" : "⭐️ /buyvip yozing", show_alert: true });
});
