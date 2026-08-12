// Referral tizimi — Prisma stub bilan. Asosiy e'tibor: suiiste'molga qarshi qulflar.
// Ishga tushirish: npx tsx tests/referral.smoke.ts
process.env.LOG_LEVEL = "silent";
import { prisma } from "../src/database/prisma";

// ==================== STUB ====================
let users: any[] = [];
let refs: any[] = [];
let chats: any[] = [];
let players: any[] = [];
let seq = 0;
const cfg = new Map<string, string>();

function apply(o: any, data: any) {
  for (const [k, v] of Object.entries<any>(data ?? {})) {
    o[k] = v && typeof v === "object" && "increment" in v ? o[k] + v.increment
      : v && typeof v === "object" && "decrement" in v ? o[k] - v.decrement : v;
  }
}
const match = (r: any, w: any) => Object.entries(w ?? {}).every(([k, v]) => r[k] === v);

(prisma as any).user = {
  findUnique: async ({ where }: any) =>
    users.find((u) => (where.id !== undefined ? u.id === where.id : u.telegramId === where.telegramId)) ?? null,
  findMany: async ({ where }: any) => users.filter((u) => (where?.id?.in ? where.id.in.includes(u.id) : true)),
  update: async ({ where, data }: any) => { const u = users.find((x) => x.id === where.id); apply(u, data); return u; },
  updateMany: async ({ where, data }: any) => {
    const hit = users.filter((u) => match(u, where)); hit.forEach((u) => apply(u, data)); return { count: hit.length };
  },
};
(prisma as any).player = { count: async ({ where }: any) => players.filter((p) => match(p, where)).length };
(prisma as any).chat = {
  findUnique: async ({ where }: any) => chats.find((c) => c.telegramId === where.telegramId || c.id === where.id) ?? null,
  findMany: async ({ where }: any) => chats.filter((c) => match(c, where ?? {})),
  update: async ({ where, data }: any) => { const c = chats.find((x) => x.id === where.id); apply(c, data); return c; },
  count: async () => chats.length,
};
(prisma as any).referral = {
  create: async ({ data }: any) => {
    if (refs.some((r) => r.invitedId === data.invitedId)) throw new Error("unique");
    const r = { id: ++seq, status: "PENDING", gamesPlayed: 0, rewardAmount: null, rewardCurrency: null, rewardedAt: null, ...data };
    refs.push(r); return r;
  },
  findUnique: async ({ where }: any) => refs.find((r) => r.invitedId === where.invitedId) ?? null,
  count: async ({ where }: any) => refs.filter((r) => match(r, where)).length,
  updateMany: async ({ where, data }: any) => {
    const hit = refs.filter((r) => match(r, where)); hit.forEach((r) => apply(r, data)); return { count: hit.length };
  },
  groupBy: async () => [],
};
(prisma as any).config = {
  findUnique: async ({ where }: any) => (cfg.has(where.key) ? { key: where.key, value: cfg.get(where.key) } : null),
  findMany: async () => [], upsert: async () => ({}), deleteMany: async () => ({ count: 0 }),
};
(prisma as any).transaction = { create: async () => ({}) };

import { referralService } from "../src/services/referral.service";
import { pricingService } from "../src/services/pricing.service";

const out: { ok: boolean; name: string; detail?: string }[] = [];
const check = (n: string, ok: boolean, d?: string) => out.push({ ok, name: n, detail: ok ? undefined : d });
const J = (v: any) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? String(x) : x));

const TG = (n: number) => BigInt(1000 + n);
function reset() {
  // pricingService qiymatlarni keshlaydi — cfg o'zgarishi ko'rinishi uchun tozalaymiz
  pricingService.clearCache();
  users = [1, 2, 3, 4].map((i) => ({ id: i, telegramId: TG(i), firstName: "U" + i, money: 0, diamonds: 0 }));
  refs = []; players = []; seq = 0;
  chats = [
    { id: 1, telegramId: BigInt(-100), title: "Maqsadli", isReferralTarget: true },
    { id: 2, telegramId: BigInt(-200), title: "Oddiy", isReferralTarget: false },
  ];
}

async function main() {
  // ============ SOZLAMALAR ============
  reset();
  const s = await referralService.getSettings();
  check("Default: 2000 pul, 2 ta o'yin, 20 shift (olmos EMAS)",
    s.reward === 2000 && s.currency === "money" && s.minGames === 2 && s.maxRewards === 20, J(s));

  // ============ RO'YXATGA OLISH ============
  reset();
  const r1 = await referralService.register(2, TG(2), TG(1));
  check("Oddiy holat: ro'yxatga olinadi", r1.ok, J(r1));

  const r2 = await referralService.register(2, TG(2), TG(3));
  check("Ikkinchi marta taklif qilib bo'lmaydi", !r2.ok && r2.reason === "already", J(r2));

  reset();
  const rSelf = await referralService.register(1, TG(1), TG(1));
  check("O'ziga o'zi — rad etiladi", !rSelf.ok && rSelf.reason === "self", J(rSelf));

  reset();
  const rNo = await referralService.register(2, TG(2), BigInt(999999));
  check("Mavjud bo'lmagan taklif qiluvchi — rad", !rNo.ok && rNo.reason === "no_referrer", J(rNo));

  reset();
  players.push({ userId: 2 });
  const rOld = await referralService.register(2, TG(2), TG(1));
  check("Allaqachon o'ynagan odam — 'yangi do'st' emas", !rOld.ok && rOld.reason === "not_new", J(rOld));

  reset();
  await referralService.register(2, TG(2), TG(1)); // 1 -> 2
  const rCycle = await referralService.register(1, TG(1), TG(2)); // 2 -> 1 (halqa)
  check("Halqa (A→B→A) bloklanadi", !rCycle.ok && rCycle.reason === "cycle", J(rCycle));

  // ============ O'YIN SANASH ============
  reset();
  await referralService.register(2, TG(2), TG(1));

  const notTarget = await referralService.onGameFinished(BigInt(-200), 2);
  check("Maqsadli BO'LMAGAN guruhdagi o'yin sanalmaydi", notTarget === null);
  check("...va hisob oshmadi", refs[0].gamesPlayed === 0, `games=${refs[0].gamesPlayed}`);

  const first = await referralService.onGameFinished(BigInt(-100), 2);
  check("1-o'yin: sanaldi, lekin mukofot yo'q (2 ta kerak)",
    first === null && refs[0].gamesPlayed === 1, `games=${refs[0].gamesPlayed}`);
  check("Balans hali tegilmagan", users[0].money === 0);

  const second = await referralService.onGameFinished(BigInt(-100), 2);
  check("2-o'yin: mukofot berildi",
    second?.rewarded === true && second.amount === 2000, J(second));
  check("Taklif qilganning balansi to'ldi (2000 pul)", users[0].money === 2000, `money=${users[0].money}`);
  check("Holat REWARDED", refs[0].status === "REWARDED", refs[0].status);

  const third = await referralService.onGameFinished(BigInt(-100), 2);
  check("Keyingi o'yinlar QAYTA to'lamaydi", third === null && users[0].money === 2000, `money=${users[0].money}`);

  // ============ REFERALI YO'Q ODAM ============
  reset();
  const none = await referralService.onGameFinished(BigInt(-100), 3);
  check("Referali yo'q o'yinchi — hech narsa bo'lmaydi", none === null);

  // ============ SHIFT ============
  reset();
  cfg.set("referral_max_rewards", "1");
  cfg.set("referral_min_games", "1");
  pricingService.clearCache();
  await referralService.register(2, TG(2), TG(1));
  await referralService.onGameFinished(BigInt(-100), 2);
  await referralService.register(3, TG(3), TG(1));
  const capped = await referralService.onGameFinished(BigInt(-100), 3);
  check("Shift tugagach mukofot berilmaydi",
    capped === null && users[0].money === 2000, `money=${users[0].money}`);
  cfg.clear();

  // ============ MUKOFOT 0 BO'LSA ============
  reset();
  cfg.set("referral_reward", "0");
  cfg.set("referral_min_games", "1");
  pricingService.clearCache();
  await referralService.register(2, TG(2), TG(1));
  const zero = await referralService.onGameFinished(BigInt(-100), 2);
  check("Mukofot 0 bo'lsa — to'lov yo'q, holat PENDING qoladi",
    zero === null && refs[0].status === "PENDING", refs[0].status);
  cfg.clear();

  // ============ O'YIN YAKUNIDAGI PROMO BLOKI ============
  reset();
  const promoOff = await referralService.buildPromo(1, TG(1), "TestBot");
  check("Guruh tanlanmagan bo'lsa promo YO'Q (chats hammasi target)", promoOff !== null);

  reset();
  chats.forEach((c) => (c.isReferralTarget = false));
  const noGroups = await referralService.buildPromo(1, TG(1), "TestBot");
  check("Maqsadli guruh yo'q -> promo qo'shilmaydi", noGroups === null, J(noGroups));

  reset();
  cfg.set("referral_reward", "0");
  pricingService.clearCache();
  const noReward = await referralService.buildPromo(1, TG(1), "TestBot");
  check("Mukofot 0 -> promo qo'shilmaydi", noReward === null, J(noReward));
  cfg.clear();

  reset();
  const promo = await referralService.buildPromo(1, TG(1), "TestBot");
  check("Promo matnida SHAXSIY havola bor",
    !!promo && promo.link === "https://t.me/TestBot?start=ref_1001", J(promo?.link));
  // toLocaleString uzilmas probel qo'yadi, shuning uchun raqamni oddiy probel bilan qidirmaymiz
  check("Promo matnida placeholder qolmadi",
    !!promo && !promo.text.includes("{") && /2\D?000/.test(promo.text),
    promo?.text.replace(/\n/g, " | "));
  check("Promo havolani matnga ham qo'shadi",
    !!promo && promo.text.includes(promo.link), promo?.text);

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
