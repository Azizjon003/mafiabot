import { InlineKeyboard } from "grammy";
import { ShopItem } from "@prisma/client";

export function shopKeyboard(items: ShopItem[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const item of items) {
    const priceLabel = item.priceType === "DIAMOND" ? `${item.price}💎` : `${item.price.toLocaleString()}💰`;
    kb.text(`${item.emoji} ${item.name} — ${priceLabel}`, `shop_buy:${item.id}`).row();
  }
  kb.text("❌ Yopish", "shop_close");
  return kb;
}

export function chestOpenKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🗃 Sandiq ochish (2,000💰)", "chest_open")
    .row()
    .text("❌ Yopish", "shop_close");
}

export function profileKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🏪 Do'kon", "open_shop")
    .text("🗃 Sandiq", "open_chest")
    .row()
    .text("⭐️ VIP", "open_vip")
    .text("📊 Statistika", "open_stats");
}
