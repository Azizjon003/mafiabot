import { InlineKeyboard } from "grammy";
import { Role } from "@prisma/client";
import { ROLE_EMOJI, ROLE_NAME } from "../utils/constants";

// 1-ekran: Asosiy profil
export function profileMainKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🏪 Do'kon", "prof:shop")
    .text("🛒 Sotib olish", "prof:buy")
    .row()
    .text("🥷 Mening Geroyim", "prof:hero")
    .row()
    .text("🎁 Foydalanish", "prof:use")
    .text("⭐️ Premium guruhlar", "prof:premium")
    .row()
    .text("📊 Statistika", "prof:stats");
}

// 2-ekran: Do'kon kategoriyalari
export function shopCategoriesKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🛡 Himoya", "shop:cat:shield")
    .text("🎯 Snayper o'qi", "shop:cat:bullet")
    .row()
    .text("📜 Hujjat", "shop:cat:document")
    .text("🥷 Geroy", "shop:cat:hero")
    .row()
    .text("🗃 Sandiq", "shop:cat:chest")
    .text("🎭 Aktiv rol", "shop:cat:role")
    .row()
    .text("⭐️ VIP", "shop:cat:vip")
    .row()
    .text("🔙 Profil", "prof:back");
}

// Shield/Document sotib olish ekrani
export function buyItemKeyboard(itemKey: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Sotib olish", `shop:buy:${itemKey}`)
    .row()
    .text("🔙 Ortga", "prof:shop");
}

// 3-ekran: Aktiv rol sotib olish — barcha rollar
export const ALL_ROLES: Role[] = [
  "SNIPER", "MINER", "SHERIFF", "DON",
  "LAB", "WARLOCK", "ARCHER", "KAMIKAZE",
  "ROBBER", "PROFESSOR", "MAFIA", "KILLER",
  "SERGEANT", "HOOKER", "TRAMP", "LAWYER",
  "DOCTOR", "SPY", "TRAITOR", "SANTA", "SNOWBOY",
  "CUPID", "BARMEN", "BODYGUARD", "HUNTER", "ORACLE", "FRAMER", "CIVILIAN",
];

export function activeRoleListKeyboard(
  prices: Record<string, number>,
  currencies?: Record<string, "diamond" | "money">,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const r of ALL_ROLES) {
    const price = prices[`price_role_${r}`] || 300;
    const curr = currencies?.[`price_role_${r}`] ?? "money";
    const sym = curr === "diamond" ? "💎" : "💰";
    kb.text(`${ROLE_EMOJI[r]} ${ROLE_NAME[r]} — ${price}${sym}`, `shop:role:${r}`).row();
  }
  kb.text("❌ Hozirgi aktiv rolni o'chirish", "shop:role:clear").row();
  kb.text("🔙 Ortga", "prof:shop");
  return kb;
}

// 4-ekran: Geroy sahifasi
export interface HeroDayActions {
  canAttack?: boolean;       // Otish mumkinmi (zaryad bor + tirik + kunduz)
  canDefend?: boolean;       // Himoyalanish mumkinmi (himoya hali ishlatilmagan + tirik + kunduz)
  alreadyDefending?: boolean; // Allaqachon himoyalanyapti
}

export function heroKeyboard(hasHero: boolean, dayActions: HeroDayActions = {}): InlineKeyboard {
  if (!hasHero) {
    return new InlineKeyboard()
      .text("✨ Geroy yaratish", "hero:create")
      .row()
      .text("🔙 Profil", "prof:back");
  }
  const kb = new InlineKeyboard();

  // Kunduzdagi tanlovlar
  if (dayActions.canAttack || dayActions.canDefend) {
    if (dayActions.canAttack) kb.text("🥷 Otish", "hero:attack");
    if (dayActions.canDefend) kb.text("⚜️ Himoyalanish", "hero:defend");
    else if (dayActions.alreadyDefending) kb.text("🛡 Himoyalanyapsiz ✅", "hero:noop");
    kb.row();
  }

  kb.text("💰 Ball sotib olish", "hero:buypoints").row()
    .text("🛡 Himoyani yangilash", "hero:protection")
    .text("⚡ Zaryadlash", "hero:charge").row()
    .text("✏️ Nomini o'zgartirish", "hero:rename").row()
    .text("🔙 Profil", "prof:back");
  return kb;
}

// Geroy hujumi — nishon tanlash
export function heroAttackTargetsKeyboard(targets: { playerId: number; firstName: string }[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const t of targets) {
    kb.text(`👤 ${t.firstName}`, `hero:atk:${t.playerId}`).row();
  }
  kb.text("🔙 Bekor qilish", "prof:hero");
  return kb;
}

// 5-ekran: Foydalanish menyusi
export function useItemsKeyboard(flags: {
  shield: boolean;
  document: boolean;
  bullet: boolean;
  activeRole: boolean;
  hero: boolean;
  premiumEmoji: boolean;
}): InlineKeyboard {
  const m = (b: boolean) => (b ? "✅" : "⬜️");
  return new InlineKeyboard()
    .text(`${m(flags.shield)} 🛡 Himoyadan foydalanish`, "use:shield").row()
    .text(`${m(flags.document)} 📜 Hujjatdan foydalanish`, "use:document").row()
    .text(`${m(flags.bullet)} 🎯 Snayper o'qidan foydalanish`, "use:bullet").row()
    .text(`${m(flags.activeRole)} 🎭 Aktiv roldan foydalanish`, "use:activeRole").row()
    .text(`${m(flags.hero)} 🥷 Geroydan foydalanish`, "use:hero").row()
    .text(`${m(flags.premiumEmoji)} ⭐️ Premium emoji`, "use:premiumEmoji").row()
    .text("🔙 Profil", "prof:back");
}

// 6-ekran: Premium guruhlar
export function premiumGroupsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔙 Profil", "prof:back");
}
