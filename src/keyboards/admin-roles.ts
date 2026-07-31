import { InlineKeyboard } from "grammy";
import { Role } from "@prisma/client";
import { RoleBracket } from "../services/role-templates.defaults";
import { ROLE_EMOJI, ROLE_NAME } from "../utils/constants";

const ALL_ROLES: Role[] = [
  "DON", "MAFIA", "LAWYER", "SPY", "LAB",
  "SHERIFF", "DOCTOR", "TRAMP", "HOOKER", "SERGEANT",
  "WARLOCK", "KAMIKAZE", "SANTA", "SNOWBOY", "CUPID", "BARMEN",
  "BODYGUARD", "HUNTER", "ORACLE", "FRAMER",
  "KILLER", "MINER", "SNIPER", "ARCHER",
  "TRAITOR", "ROBBER", "PROFESSOR", "CIVILIAN",
];

// Bracketlar ro'yxati
export function roleTemplatesKeyboard(brackets: RoleBracket[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const b of brackets) {
    const fixedTotal = b.fixed.reduce((s, f) => s + f.count, 0);
    const label = `${b.id}  (📌${fixedTotal} + 🎲${b.randomSlots})`;
    kb.text(label, `ap:roles:b:${b.id}`).row();
  }
  kb.text("🔄 Hammasini default'ga", "ap:roles:reset:all").row();
  kb.text("🔙 Asosiy", "ap:main");
  return kb;
}

// Bitta bracket tafsiloti — har rolni tahrirlash uchun tugma qatori
export function bracketEditKeyboard(b: RoleBracket): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Fixed rollar — har biriga [−] [count] [+] qator
  for (const f of b.fixed) {
    const emoji = ROLE_EMOJI[f.role] || "❓";
    const name = ROLE_NAME[f.role] || f.role;
    kb.text(`➖`, `ap:roles:adj:${b.id}:${f.role}:-1`);
    kb.text(`${emoji} ${name}: ${f.count}`, `ap:roles:noop`);
    kb.text(`➕`, `ap:roles:adj:${b.id}:${f.role}:1`);
    kb.text(`🗑`, `ap:roles:del:${b.id}:${f.role}`);
    kb.row();
  }

  // Yangi rol qo'shish
  kb.text("➕ Rol qo'shish", `ap:roles:pick:${b.id}`).row();

  // Random slot
  kb.text(`➖`, `ap:roles:rnd:${b.id}:-1`);
  kb.text(`🎲 Random slot: ${b.randomSlots}`, `ap:roles:noop`);
  kb.text(`➕`, `ap:roles:rnd:${b.id}:1`).row();

  // Reset + orqaga
  kb.text("🔄 Bracket default'ga", `ap:roles:reset:${b.id}`).row();
  kb.text("🔙 Bracketlar", "ap:roles");
  return kb;
}

// Rol picker — fixed'ga yangi rol qo'shish uchun grid
export function rolePickerKeyboard(bracketId: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let i = 0; i < ALL_ROLES.length; i++) {
    const r = ALL_ROLES[i];
    const emoji = ROLE_EMOJI[r] || "❓";
    const name = ROLE_NAME[r] || r;
    // Qisqa nom (cheklangan callback data) — label ichida to'liq
    kb.text(`${emoji} ${name}`, `ap:roles:add:${bracketId}:${r}`);
    if (i % 2 === 1) kb.row();
  }
  if (ALL_ROLES.length % 2 === 1) kb.row();
  kb.text("🔙 Bracket", `ap:roles:b:${bracketId}`);
  return kb;
}

// Bracket body matni (ekranda ko'rsatiladi)
export function bracketBody(b: RoleBracket): string {
  const fixedTotal = b.fixed.reduce((s, f) => s + f.count, 0);
  const total = fixedTotal + b.randomSlots;
  const fillMin = Math.max(0, b.minP - total);
  const fillMax = Math.max(0, b.maxP - total);

  let body = `🎭 <b>${b.id} o'yinchilik bracket</b>\n\n`;
  if (b.fixed.length === 0) {
    body += `<i>Majburiy rol yo'q — hamma random/civilian bo'ladi.</i>\n\n`;
  } else {
    body += `<b>📌 Majburiy rollar:</b>\n`;
    for (const f of b.fixed) {
      const emoji = ROLE_EMOJI[f.role] || "❓";
      const name = ROLE_NAME[f.role] || f.role;
      body += `   ${emoji} ${name} × ${f.count}\n`;
    }
    body += `\n`;
  }
  body += `<b>🎲 Random slot:</b> ${b.randomSlots} ta\n`;
  body += `<b>👥 Majburiy jami:</b> ${fixedTotal}\n`;
  body += `<b>📐 Jami slotlar:</b> ${total} / max ${b.maxP}\n`;
  if (fillMin === fillMax) {
    body += `<b>👨🏼 Tinch aholi:</b> ${fillMin} ta\n`;
  } else {
    body += `<b>👨🏼 Tinch aholi:</b> ${fillMin}–${fillMax} ta (o'yinchi soniga qarab)\n`;
  }

  if (total > b.maxP) {
    body += `\n⚠️ <b>OGOHLANTIRISH:</b> jami slot max'dan oshib ketgan!`;
  }

  return body;
}
