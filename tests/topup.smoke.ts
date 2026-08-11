// Hisob to'ldirish va ayirboshlash oqimi — Prisma stub bilan.
// Ishga tushirish: npx tsx tests/topup.smoke.ts
process.env.LOG_LEVEL = "silent";
import { prisma } from "../src/database/prisma";

// ==================== PRISMA STUB ====================
let db: any;
const cfg = new Map<string, string>();
let rows: any[] = [];
let seq = 0;

function applyData(obj: any, data: any) {
  for (const [k, v] of Object.entries<any>(data ?? {})) {
    obj[k] = v && typeof v === "object" && "decrement" in v ? obj[k] - v.decrement
      : v && typeof v === "object" && "increment" in v ? obj[k] + v.increment
      : v;
  }
}
function matches(r: any, where: any): boolean {
  for (const [k, v] of Object.entries<any>(where ?? {})) {
    if (k === "OR") { if (!(v as any[]).some((w) => matches(r, w))) return false; continue; }
    if (v && typeof v === "object" && "gte" in v) { if (!(r[k] >= v.gte)) return false; continue; }
    if (v && typeof v === "object" && "lt" in v) { if (!(r[k] < v.lt)) return false; continue; }
    if (r[k] !== v) return false;
  }
  return true;
}

(prisma as any).user = {
  findUnique: async () => db,
  update: async ({ data }: any) => { applyData(db, data); return db; },
  updateMany: async ({ where, data }: any) => {
    if (!matches(db, { ...where, id: db.id })) return { count: 0 };
    applyData(db, data); return { count: 1 };
  },
};
(prisma as any).config = {
  findUnique: async ({ where }: any) => (cfg.has(where.key) ? { key: where.key, value: cfg.get(where.key) } : null),
  findMany: async () => [],
  upsert: async ({ where, create }: any) => { cfg.set(where.key, create.value); return create; },
  deleteMany: async () => ({ count: 0 }),
};
(prisma as any).configAudit = { create: async () => ({}) };
(prisma as any).transaction = { create: async () => ({}) };
(prisma as any).topUpRequest = {
  create: async ({ data }: any) => { const r = { id: ++seq, receiptFileId: null, reviewedBy: null, reviewNote: null, reviewedAt: null, createdAt: new Date(), ...data }; rows.push(r); return r; },
  findUnique: async ({ where }: any) => { const r = rows.find((x) => x.id === where.id); return r ? { ...r, user: db } : null; },
  findFirst: async ({ where }: any) => rows.filter((r) => matches(r, where)).slice(-1)[0] ?? null,
  findMany: async ({ where }: any) => rows.filter((r) => matches(r, where)).map((r) => ({ ...r, user: db })),
  update: async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id); applyData(r, data); return r; },
  updateMany: async ({ where, data }: any) => {
    const hit = rows.filter((r) => matches(r, where));
    hit.forEach((r) => applyData(r, data));
    return { count: hit.length };
  },
};

import { topUpService, CARD_KEYS } from "../src/services/topup.service";
import { textService } from "../src/services/text.service";
import { topUpRepo } from "../src/database/repositories/topup.repository";

const out: { ok: boolean; name: string; detail?: string }[] = [];
const check = (n: string, ok: boolean, d?: string) => out.push({ ok, name: n, detail: ok ? undefined : d });
// BigInt JSON.stringify'da yiqiladi — xavfsiz seriyalash
const J = (v: any) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? String(x) : x));

function reset(over: any = {}) {
  db = { id: 1, money: 0, diamonds: 0, ...over };
  rows = []; seq = 0;
}

async function main() {
  // ============ KURSLAR (default) ============
  reset();
  const rates = await topUpService.getRates();
  check("Default kurslar o'qildi (1💎=500💰, 1💎=1000so'm, 1💰=1so'm)",
    rates.diamondToMoney === 500 && rates.diamondSom === 1000 && rates.moneySom === 1 && rates.minSom === 5000,
    J(rates));

  // ============ KARTA ============
  check("Karta boshida to'ldirilmagan", topUpService.getCard().filled === false);
  await topUpService.setCard("8600 1111 2222 3333", "Aziz A.", BigInt(1));
  const card = topUpService.getCard();
  check("Karta saqlandi va o'qildi",
    card.filled && card.number === "8600 1111 2222 3333" && card.holder === "Aziz A.", J(card));
  check("Karta Config'ga text_ prefiksi bilan yozildi", textService.isCustom(CARD_KEYS.NUMBER));

  // ============ AYIRBOSHLASH: pul -> olmos ============
  reset({ money: 10000, diamonds: 0 });
  const r1 = await topUpService.moneyToDiamond(1, 10);
  check("Pul -> olmos: 10💎 uchun 5000💰 yechildi",
    r1.ok && db.diamonds === 10 && db.money === 5000, `${J(r1)} db=${J(db)}`);

  reset({ money: 100, diamonds: 0 });
  const r2 = await topUpService.moneyToDiamond(1, 10);
  check("Pul yetmasa ayirboshlanmaydi va balans tegilmaydi",
    !r2.ok && db.money === 100 && db.diamonds === 0, `${J(r2)} db=${J(db)}`);

  reset({ money: 0, diamonds: 5 });
  const r3 = await topUpService.moneyToDiamond(1, -3);
  check("Manfiy miqdor rad etiladi", !r3.ok && db.diamonds === 5);

  // ============ AYIRBOSHLASH: olmos -> pul ============
  reset({ money: 0, diamonds: 8 });
  const r4 = await topUpService.diamondToMoney(1, 3);
  check("Olmos -> pul: 3💎 -> 1500💰",
    r4.ok && db.diamonds === 5 && db.money === 1500, `${J(r4)} db=${J(db)}`);

  reset({ money: 0, diamonds: 1 });
  const r5 = await topUpService.diamondToMoney(1, 5);
  check("Olmos yetmasa ayirboshlanmaydi", !r5.ok && db.diamonds === 1 && db.money === 0);

  // ============ NARX ============
  reset();
  check("Narx: 25💎 = 25 000 so'm", (await topUpService.priceFor("DIAMOND", 25)) === 25000);
  check("Narx: 50 000💰 = 50 000 so'm", (await topUpService.priceFor("MONEY", 50000)) === 50000);

  // ============ TO'LIQ OQIM: so'rov -> chek -> tasdiq ============
  reset({ money: 0, diamonds: 0 });
  const req = await topUpService.createRequest(1, "DIAMOND", 25);
  check("So'rov yaratildi, chek kutilmoqda",
    req.status === "AWAITING_RECEIPT" && req.priceSom === 25000, J(req));
  check("Balans hali TEGILMAGAN", db.diamonds === 0);

  const awaiting = await topUpRepo.findAwaitingReceipt(1);
  check("Chek kutayotgan so'rov topildi", awaiting?.id === req.id);

  await topUpService.attachReceipt(req.id, "FILE_123");
  const afterReceipt = await topUpRepo.findById(req.id);
  check("Chek biriktirildi, holat PENDING",
    afterReceipt?.status === "PENDING" && afterReceipt?.receiptFileId === "FILE_123", J(afterReceipt));

  const ap = await topUpService.approve(req.id, BigInt(99));
  check("Admin tasdiqladi -> 25💎 qo'shildi", ap.ok && db.diamonds === 25, `${J(ap)} d=${db.diamonds}`);

  // ============ IKKI MARTA TASDIQLASH ============
  const ap2 = await topUpService.approve(req.id, BigInt(98));
  check("Ikkinchi tasdiq RAD etiladi (balans ikki marta to'lmaydi)",
    !ap2.ok && db.diamonds === 25, `${J(ap2)} d=${db.diamonds}`);

  // ============ RAD ETISH ============
  reset({ money: 0, diamonds: 0 });
  const req2 = await topUpService.createRequest(1, "MONEY", 50000);
  await topUpService.attachReceipt(req2.id, "FILE_X");
  const rj = await topUpService.reject(req2.id, BigInt(99), "To'lov kelmadi");
  check("Rad etildi va balans o'zgarmadi", rj.ok && db.money === 0, J(rj));
  const rejected = await topUpRepo.findById(req2.id);
  check("Rad sababi saqlandi",
    rejected?.status === "REJECTED" && rejected?.reviewNote === "To'lov kelmadi", J(rejected));
  const rj2 = await topUpService.reject(req2.id, BigInt(97), "yana");
  check("Rad etilganni qayta rad etib bo'lmaydi", !rj2.ok);

  // ============ CHEKSIZ SO'ROV YIG'ILMASIN ============
  reset({ money: 0, diamonds: 0 });
  await topUpService.createRequest(1, "DIAMOND", 10);
  await topUpService.createRequest(1, "DIAMOND", 20);
  const stillAwaiting = rows.filter((r) => r.status === "AWAITING_RECEIPT");
  check("Yangi so'rov eskisini bekor qiladi (faqat 1 ta faol)",
    stillAwaiting.length === 1 && stillAwaiting[0].amount === 20,
    J(rows.map((r) => [r.id, r.amount, r.status])));

  // ============ CHEKSIZ TASDIQ: chek yubormasdan tasdiqlab bo'lmaydi ============
  const noReceipt = rows.find((r) => r.status === "AWAITING_RECEIPT")!;
  const ap3 = await topUpService.approve(noReceipt.id, BigInt(99));
  check("Cheksiz so'rovni tasdiqlab bo'lmaydi", !ap3.ok && db.diamonds === 0, J(ap3));

  let bad = 0;
  for (const r of out) {
    if (!r.ok) bad++;
    console.log(`${r.ok ? "OK " : "XXX"} ${r.name}${r.detail ? "\n      <- " + r.detail : ""}`);
  }
  console.log(`\n${out.length - bad}/${out.length} o'tdi`);
  if (bad > 0) process.exitCode = 1;
  await prisma.$disconnect().catch(() => {});
}

main().catch((e) => { console.error(e); process.exit(1); });
