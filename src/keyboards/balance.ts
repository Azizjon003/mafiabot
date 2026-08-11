import { InlineKeyboard } from "grammy";

// Balans va sotib olish ekrani
export function balanceKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("💱 Pulni olmosga", "bal:m2d")
    .text("💱 Olmosni pulga", "bal:d2m")
    .row()
    .text("💎 Olmos sotib olish", "bal:buy:DIAMOND")
    .row()
    .text("💰 Pul sotib olish", "bal:buy:MONEY")
    .row()
    .text("🔙 Profil", "prof:back");
}

// Tayyor summalar + qo'lda kiritish
export function topUpAmountsKeyboard(kind: "DIAMOND" | "MONEY"): InlineKeyboard {
  const presets = kind === "DIAMOND" ? [10, 25, 50, 100] : [10000, 25000, 50000, 100000];
  const kb = new InlineKeyboard();
  presets.forEach((p, i) => {
    kb.text(`${p.toLocaleString()}${kind === "DIAMOND" ? "💎" : "💰"}`, `bal:amt:${kind}:${p}`);
    if (i % 2 === 1) kb.row();
  });
  kb.row().text("✏️ Boshqa miqdor", `bal:custom:${kind}`);
  kb.row().text("🔙 Ortga", "bal:back");
  return kb;
}

export function cancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("🔙 Bekor qilish", "bal:back");
}

// Admin ko'radigan chek ostidagi tugmalar
export function reviewKeyboard(requestId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Tasdiqlash", `tu:ok:${requestId}`)
    .text("❌ Rad etish", `tu:no:${requestId}`);
}

// Rad etish sabablari — tez tanlash yoki qo'lda yozish
export const REJECT_REASONS: { key: string; label: string; text: string }[] = [
  { key: "nopay", label: "To'lov kelmadi", text: "To'lov kartaga tushmadi" },
  { key: "amount", label: "Summa mos emas", text: "To'langan summa so'rovga mos kelmadi" },
  { key: "fake", label: "Chek soxta", text: "Chek haqiqiy emas yoki o'qib bo'lmadi" },
  { key: "dup", label: "Takroriy chek", text: "Bu chek allaqachon ishlatilgan" },
];

export function rejectReasonKeyboard(requestId: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  REJECT_REASONS.forEach((r, i) => {
    kb.text(r.label, `tu:rsn:${requestId}:${r.key}`);
    if (i % 2 === 1) kb.row();
  });
  kb.row().text("✏️ Boshqa sabab", `tu:rsn:${requestId}:custom`);
  return kb;
}
