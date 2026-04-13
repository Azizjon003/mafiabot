import { InlineKeyboard } from "grammy";
import { Role } from "@prisma/client";
import { ROLE_EMOJI, ROLE_NAME } from "../utils/constants";

// Asosiy panel
export function adminPanelKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("💰 Narxlar", "ap:prices")
    .text("🎁 Sovg'a berish", "ap:gift")
    .row()
    .text("📊 Bot statistikasi", "ap:botstats")
    .text("👥 Foydalanuvchilar", "ap:users")
    .row()
    .text("⚙️ Sozlamalar", "ap:config")
    .text("❌ Yopish", "ap:close");
}

// Narxlar kategoriyasi
export function pricesCategoriesKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    // Do'kon (💎)
    .text("🛡 Himoya", "ap:price:price_shield")
    .text("📜 Hujjat", "ap:price:price_document").row()
    .text("🥷 Geroy yaratish", "ap:price:price_hero_create")
    .text("⭐️ VIP", "ap:price:price_vip_month").row()
    .text("⭐ Geroy ball (1k)", "ap:price:price_hero_points_1000")
    .text("🛡 Geroy himoya", "ap:price:price_hero_prot").row()
    // Pul bilan (💰)
    .text("⚡ Geroy zaryad", "ap:price:price_hero_charge")
    .text("✏️ Geroy rename", "ap:price:price_hero_rename").row()
    .text("🗃 Sandiq (Basic)", "ap:price:price_chest_basic")
    .text("🗃 Silver", "ap:price:price_chest_silver")
    .text("🗃 Gold", "ap:price:price_chest_gold").row()
    .text("💎 Olmos komissiyasi", "ap:price:fee_diamond")
    .text("💰 Pul komissiyasi", "ap:price:fee_money").row()
    // O'yin mukofotlari
    .text("🏆 Shahar mukofoti (pul)", "ap:price:reward_town_money")
    .text("💎 Shahar (olmos)", "ap:price:reward_town_diamond").row()
    .text("🏆 Mafiya mukofoti (pul)", "ap:price:reward_mafia_money")
    .text("💎 Mafiya (olmos)", "ap:price:reward_mafia_diamond").row()
    .text("🏆 Yakka (pul)", "ap:price:reward_solo_money")
    .text("💎 Yakka (olmos)", "ap:price:reward_solo_diamond").row()
    .text("✨ G'olib bonusi", "ap:price:reward_winner_bonus")
    .text("😢 Yutqazganga", "ap:price:reward_loser").row()
    .text("⭐ Geroy ball (shahar)", "ap:price:reward_hero_town")
    .text("⭐ Mafiya", "ap:price:reward_hero_mafia")
    .text("⭐ Yakka", "ap:price:reward_hero_solo").row()
    .text("🎭 Aktiv rollar", "ap:roleprices").row()
    .text("🔙 Asosiy", "ap:main");
}

// Aktiv rollar narxi
const ALL_ROLES: Role[] = [
  "SNIPER", "MINER", "SHERIFF", "DON",
  "LAB", "WARLOCK", "ARCHER", "KAMIKAZE",
  "ROBBER", "PROFESSOR", "MAFIA", "KILLER",
  "SERGEANT", "HOOKER", "TRAMP", "LAWYER",
  "DOCTOR", "SPY", "TRAITOR", "SANTA", "SNOWBOY", "CIVILIAN",
];

export function rolePricesKeyboard(prices: Record<string, number>): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const r of ALL_ROLES) {
    const price = prices[`price_role_${r}`] || 0;
    kb.text(`${ROLE_EMOJI[r]} ${ROLE_NAME[r]} — ${price}💰`, `ap:price:price_role_${r}`).row();
  }
  kb.text("🔙 Narxlar", "ap:prices");
  return kb;
}

// Bitta narxni o'zgartirish — +/- tugmalar
export function priceEditKeyboard(key: string, currentValue: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("➖100", `ap:padj:${key}:-100`)
    .text("➖10", `ap:padj:${key}:-10`)
    .text("➖1", `ap:padj:${key}:-1`)
    .text("➕1", `ap:padj:${key}:1`)
    .text("➕10", `ap:padj:${key}:10`)
    .text("➕100", `ap:padj:${key}:100`)
    .row()
    .text("✏️ Aniq qiymat", `ap:psetexact:${key}`)
    .row()
    .text("🔙 Narxlar", "ap:prices");
}

// Sovg'a kategoriyalari
export function giftCategoriesKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("💰 Pul", "ap:gift:money")
    .text("💎 Olmos", "ap:gift:diamond")
    .row()
    .text("🛡 Shield", "ap:gift:shield")
    .text("📜 Hujjat", "ap:gift:document")
    .row()
    .text("⭐ Geroy ball", "ap:gift:points")
    .text("⭐️ VIP berish", "ap:gift:vip")
    .row()
    .text("🔙 Asosiy", "ap:main");
}

// Sovg'a — qaysi kanaldan beriladi (reply yoki ID)
export function giftMethodKeyboard(giftType: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔙 Sovg'alar", "ap:gift");
}

// Sozlamalar kategoriyasi
export function configCategoriesKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔄 Cache tozalash", "ap:cfg:clearcache")
    .row()
    .text("📋 Barcha narxlar", "ap:cfg:listprices")
    .row()
    .text("🔙 Asosiy", "ap:main");
}
