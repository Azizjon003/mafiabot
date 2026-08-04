// Tugma -> handler ulanishi.
// Ishga tushirish: npx tsx tests/callback-wiring.smoke.ts
// Tugma -> handler ulanishi: klaviaturalar chiqargan callback_data larni
// haqiqiy handler shablonlariga solishtiramiz (kod matnidan o'qib).
process.env.LOG_LEVEL = "silent";
import { readFileSync } from "fs";
import { join } from "path";
import { shopCategoriesKeyboard, useItemsKeyboard, buyItemKeyboard } from "../src/keyboards/profile";
import { giftCategoriesKeyboard, pricesCategoriesKeyboard } from "../src/keyboards/admin-panel";

const out: { ok: boolean; name: string; detail?: string }[] = [];
const check = (n: string, ok: boolean, d?: string) => out.push({ ok, name: n, detail: ok ? undefined : d });

function datas(kb: any): string[] {
  return (kb.inline_keyboard as any[][]).flat().map((b) => b.callback_data).filter(Boolean);
}

// Handler fayllaridan ro'yxatga olingan callback shablonlarini yig'amiz
const files = [
  "src/handlers/commands/profile.ts",
  "src/handlers/commands/owner.ts",
  "src/handlers/callbacks/vote.ts",
];
const patterns: (RegExp | string)[] = [];
for (const f of files) {
  const src = readFileSync(join(process.cwd(), f), "utf-8");
  for (const m of src.matchAll(/callbackQuery\(\s*\/([^\n]+?)\/\s*,/g)) {
    try { patterns.push(new RegExp(m[1])); } catch { /* skip */ }
  }
  for (const m of src.matchAll(/callbackQuery\(\s*"([^"]+)"\s*,/g)) patterns.push(m[1]);
}

function handled(data: string): boolean {
  return patterns.some((p) => (typeof p === "string" ? p === data : p.test(data)));
}

const kbs: [string, string[]][] = [
  ["Do'kon kategoriyalari", datas(shopCategoriesKeyboard())],
  ["Foydalanish menyusi", datas(useItemsKeyboard({ shield: true, document: true, bullet: true, activeRole: false, hero: false, premiumEmoji: false }))],
  ["Sotib olish (bullet)", datas(buyItemKeyboard("bullet"))],
  ["Admin sovg'a", datas(giftCategoriesKeyboard())],
  ["Admin narxlar", datas(pricesCategoriesKeyboard())],
];

for (const [label, list] of kbs) {
  const orphan = list.filter((d) => !handled(d));
  check(`${label}: hamma tugmaning handleri bor`, orphan.length === 0, "handlersiz: " + orphan.join(", "));
}

// Aniq yangi tugmalar
for (const d of ["shop:cat:bullet", "shop:buy:bullet", "use:bullet", "ap:gift:bullet", "ap:price:price_bullet"]) {
  check(`"${d}" handlerga tushadi`, handled(d));
}

// Telegram cheklovi: callback_data <= 64 bayt
const tooLong = kbs.flatMap(([, l]) => l).filter((d) => Buffer.byteLength(d, "utf-8") > 64);
check("callback_data 64 baytdan oshmadi", tooLong.length === 0, tooLong.join(", "));

// Kamikaze tugmasi ham tekshirilsin
check('"kamikaze:5" handlerga tushadi', handled("kamikaze:5"));
check('"kamikaze:skip" handlerga tushadi', handled("kamikaze:skip"));

// Do'konda eski tugmalar yo'qolmadi
const shop = datas(shopCategoriesKeyboard());
for (const d of ["shop:cat:shield", "shop:cat:document", "shop:cat:hero", "shop:cat:chest", "shop:cat:role", "shop:cat:vip", "shop:cat:bullet"]) {
  check(`Do'konda "${d}" bor`, shop.includes(d), shop.join(", "));
}

let bad = 0;
for (const r of out) {
  if (!r.ok) bad++;
  console.log(`${r.ok ? "OK " : "XXX"} ${r.name}${r.detail ? "\n      <- " + r.detail : ""}`);
}
console.log(`\n${out.length - bad}/${out.length} o'tdi`);
