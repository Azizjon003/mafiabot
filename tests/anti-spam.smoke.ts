// Spamga qarshi himoya: chastota cheklovi, admin keshi, /extend chegarasi.
// Ishga tushirish: npx tsx tests/anti-spam.smoke.ts
process.env.LOG_LEVEL = "silent";

import { tryHit, _clear, _size } from "../src/utils/rate-limiter";
import { isChatAdminCached, _clearAdminCache, invalidateAdminCache } from "../src/utils/admin-cache";
import { antiSpam } from "../src/handlers/middleware/anti-spam";

const out: { ok: boolean; name: string; detail?: string }[] = [];
const check = (n: string, ok: boolean, d?: string) => out.push({ ok, name: n, detail: ok ? undefined : d });

async function main() {
  // ==================== RATE LIMITER ====================
  _clear();
  const allowed = [1, 2, 3].map(() => tryHit("k", 3, 10_000));
  const blocked = tryHit("k", 3, 10_000);
  check("3 tagacha ruxsat, 4-chisi bloklanadi",
    allowed.every(Boolean) && blocked === false, `${allowed} / ${blocked}`);

  _clear();
  tryHit("a", 1, 10_000);
  check("Turli kalitlar bir-biriga xalaqit bermaydi", tryHit("b", 1, 10_000) === true);

  // Oyna surilganda qayta ruxsat berilishi
  _clear();
  tryHit("w", 1, 30); // 30ms oyna
  const blockedNow = tryHit("w", 1, 30);
  await new Promise((r) => setTimeout(r, 45));
  const allowedLater = tryHit("w", 1, 30);
  check("Oyna o'tgach qayta ruxsat beriladi",
    blockedNow === false && allowedLater === true, `${blockedNow}/${allowedLater}`);

  // ==================== ADMIN KESHI ====================
  _clearAdminCache();
  let apiCalls = 0;
  const ctxAdmin: any = {
    chat: { id: -100, type: "supergroup" },
    from: { id: 5 },
    getChatMember: async () => { apiCalls++; return { status: "administrator" }; },
  };
  const a1 = await isChatAdminCached(ctxAdmin);
  const a2 = await isChatAdminCached(ctxAdmin);
  const a3 = await isChatAdminCached(ctxAdmin);
  check("Admin tekshiruvi keshlanadi — 3 ta chaqiruvga 1 ta API so'rovi",
    a1 && a2 && a3 && apiCalls === 1, `admin=${a1}/${a2}/${a3} apiCalls=${apiCalls}`);

  invalidateAdminCache(-100, 5);
  await isChatAdminCached(ctxAdmin);
  check("invalidate keshni tozalaydi (yangi so'rov ketadi)", apiCalls === 2, `apiCalls=${apiCalls}`);

  _clearAdminCache();
  let failCalls = 0;
  const ctxFail: any = {
    chat: { id: -100, type: "supergroup" },
    from: { id: 6 },
    getChatMember: async () => { failCalls++; throw new Error("network"); },
  };
  const failRes = await isChatAdminCached(ctxFail);
  check("API yiqilsa false qaytadi va keshlanmaydi",
    failRes === false && failCalls === 1, `${failRes} calls=${failCalls}`);
  await isChatAdminCached(ctxFail);
  check("Xato keshlanmagani uchun qayta urinadi", failCalls === 2, `calls=${failCalls}`);

  // ==================== antiSpam MIDDLEWARE ====================
  _clear();
  let passed = 0, deleted = 0, replies = 0;
  const mkCtx = (userId: number) => ({
    chat: { id: -777, type: "supergroup" },
    from: { id: userId },
    deleteMessage: async () => { deleted++; },
    reply: async () => { replies++; return { message_id: 1 }; },
    api: { deleteMessage: async () => {} },
  }) as any;
  const next = async () => { passed++; };

  for (let i = 0; i < 6; i++) await antiSpam(mkCtx(1), next);
  check("Bitta odam 6 marta bossa — faqat 3 tasi o'tadi", passed === 3, `passed=${passed}`);
  check("Bloklangan buyruq xabari o'chiriladi", deleted === 3, `deleted=${deleted}`);
  check("Ogohlantirish FAQAT 1 marta yoziladi (spam kuchaymaydi)", replies === 1, `replies=${replies}`);

  // Chat bo'yicha umumiy chegara — turli odamlar
  _clear();
  passed = 0; deleted = 0; replies = 0;
  for (let u = 1; u <= 5; u++) {
    for (let i = 0; i < 3; i++) await antiSpam(mkCtx(u), next);
  }
  check("Chat chegarasi ishlaydi — 15 urinishdan 8 tasi o'tadi",
    passed === 8, `passed=${passed}`);
  check("Har bir bloklangan odamga 1 tadan ogohlantirish", replies <= 5, `replies=${replies}`);

  // Shaxsiy chat cheklanmaydi
  _clear();
  passed = 0;
  const pmCtx: any = { chat: { id: 7, type: "private" }, from: { id: 7 } };
  for (let i = 0; i < 10; i++) await antiSpam(pmCtx, next);
  check("Shaxsiy chatda cheklov yo'q", passed === 10, `passed=${passed}`);

  // Xotira o'smasin
  _clear();
  for (let i = 0; i < 100; i++) tryHit(`key${i}`, 1, 10_000);
  check("Har kalit alohida saqlanadi", _size() === 100, `size=${_size()}`);

  let bad = 0;
  for (const r of out) {
    if (!r.ok) bad++;
    console.log(`${r.ok ? "OK " : "XXX"} ${r.name}${r.detail ? "\n      <- " + r.detail : ""}`);
  }
  console.log(`\n${out.length - bad}/${out.length} o'tdi`);
  if (bad > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
