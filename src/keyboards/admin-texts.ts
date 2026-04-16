import { InlineKeyboard } from "grammy";
import { TEXT_CATEGORIES, TEXT_LABELS } from "../services/text-defaults";
import { textService } from "../services/text.service";

// Kalit uchun inson o'qiydigan label qaytaradi (TEXT_LABELS dan yoki fallback)
function labelForKey(key: string, stripPrefix?: string): string {
  const label = TEXT_LABELS[key];
  if (label) return label;
  // Fallback — kalit suffixini qaytaramiz
  return stripPrefix ? key.slice(stripPrefix.length) : key;
}

export const TEXTS_PER_PAGE = 8;

// Kategoriyalar ro'yxati
export function textCategoriesKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let i = 0; i < TEXT_CATEGORIES.length; i++) {
    const cat = TEXT_CATEGORIES[i];
    const count = textService.getKeysByPrefix(cat.prefix).length;
    kb.text(`${cat.label} (${count})`, `ap:texts:cat:${cat.id}:0`);
    if (i % 2 === 1) kb.row();
  }
  if (TEXT_CATEGORIES.length % 2 === 1) kb.row();
  kb.text("🔍 Qidirish", "ap:texts:search").row();
  kb.text("📤 Export", "ap:texts:export").text("📥 Import", "ap:texts:import").row();
  kb.text("🔙 Asosiy", "ap:main");
  return kb;
}

// Kategoriya ichidagi kalitlar — sahifalab
export function textListKeyboard(categoryId: string, page: number): InlineKeyboard {
  const cat = TEXT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return new InlineKeyboard().text("🔙 Matnlar", "ap:texts");

  const all = textService.getKeysByPrefix(cat.prefix);
  const totalPages = Math.max(1, Math.ceil(all.length / TEXTS_PER_PAGE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = all.slice(safePage * TEXTS_PER_PAGE, (safePage + 1) * TEXTS_PER_PAGE);

  const kb = new InlineKeyboard();
  for (const { key, isCustom } of slice) {
    const label = (isCustom ? "✏️ " : "") + truncate(labelForKey(key, cat.prefix), 38);
    kb.text(label, `ap:text:${encodeKey(key)}`).row();
  }

  if (totalPages > 1) {
    if (safePage > 0) kb.text("⬅️", `ap:texts:cat:${categoryId}:${safePage - 1}`);
    kb.text(`${safePage + 1}/${totalPages}`, "ap:texts:nope");
    if (safePage < totalPages - 1) kb.text("➡️", `ap:texts:cat:${categoryId}:${safePage + 1}`);
    kb.row();
  }
  kb.text("🔙 Kategoriyalar", "ap:texts");
  return kb;
}

// Bitta matnni tahrirlash ekrani
export function textEditKeyboard(key: string, isCustom: boolean): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("✏️ O'zgartirish", `ap:tsetexact:${encodeKey(key)}`).row();
  if (isCustom) {
    kb.text("🔄 Default holatga", `ap:treset:${encodeKey(key)}`).row();
  }
  kb.text("📜 Tarix", `ap:thist:${encodeKey(key)}`).row();
  kb.text("🔙 Matnlar", "ap:texts");
  return kb;
}

// Qidiruv natijalari
export function textSearchResultsKeyboard(keys: { key: string; isCustom: boolean }[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  const limited = keys.slice(0, 20);
  for (const { key, isCustom } of limited) {
    const label = (isCustom ? "✏️ " : "") + truncate(labelForKey(key), 38);
    kb.text(label, `ap:text:${encodeKey(key)}`).row();
  }
  kb.text("🔙 Matnlar", "ap:texts");
  return kb;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Callback data'da nuqta bor — xavfsiz kodlash
export function encodeKey(key: string): string {
  return Buffer.from(key).toString("base64").replace(/=+$/, "");
}

export function decodeKey(encoded: string): string {
  // Base64 padding qayta tiklash
  const pad = encoded.length % 4;
  const padded = pad ? encoded + "=".repeat(4 - pad) : encoded;
  return Buffer.from(padded, "base64").toString("utf8");
}
