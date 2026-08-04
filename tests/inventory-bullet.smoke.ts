// Inventar/iqtisod qatlami — Snayper o'qi va Shield hisob-kitobi.
// Ishga tushirish: npx tsx tests/inventory-bullet.smoke.ts
// Engine testlari qamrab olmaydigan qatlamlar: iqtisod (bulletCount), timer,
// snapshot round-trip va xabar yuborish. Prisma va Telegram API stub qilinadi.
process.env.LOG_LEVEL = "silent";
import { prisma } from "../src/database/prisma";

// ==================== PRISMA STUB ====================
let db: any = null;
let updates: any[] = [];
const cfg = new Map<string, string>();

(prisma as any).user = {
  findUnique: async () => db,
  update: async ({ data }: any) => { updates.push(data); apply(data); return db; },
  updateMany: async ({ where, data }: any) => {
    const need = where?.diamonds?.gte ?? 0;
    if (db.diamonds < need) return { count: 0 };
    db.diamonds -= data.diamonds.decrement;
    return { count: 1 };
  },
};
(prisma as any).hero = { findUnique: async () => null };
(prisma as any).config = {
  findUnique: async ({ where }: any) => (cfg.has(where.key) ? { key: where.key, value: cfg.get(where.key) } : null),
  findMany: async () => [],
  upsert: async () => ({}),
};
(prisma as any).transaction = { create: async () => ({}) };

function apply(data: any) {
  for (const [k, v] of Object.entries<any>(data ?? {})) {
    db[k] = v && typeof v === "object" && "decrement" in v ? db[k] - v.decrement
      : v && typeof v === "object" && "increment" in v ? db[k] + v.increment
      : v;
  }
}

import { inventoryService } from "../src/services/inventory.service";
import { GameEngine } from "../src/game/engine";
import { serializeEngine, applySerializedToEngine } from "../src/game/persistence";
import { PlayerState } from "../src/types";

const results: { ok: boolean; name: string; detail?: string }[] = [];
function check(name: string, ok: boolean, detail?: string) {
  results.push({ ok, name, detail: ok ? undefined : detail });
}

function freshUser(over: any = {}) {
  db = {
    id: 1, money: 0, diamonds: 100,
    shieldCount: 0, documentCount: 0, bulletCount: 0,
    useShieldNextGame: false, useDocumentNextGame: false, useBulletNextGame: false,
    useActiveRoleNextGame: false, useHeroNextGame: false, usePremiumEmoji: false,
    activeRole: null, hero: null, ...over,
  };
  updates = [];
}

function makePlayer(id: number, role: any, over: Partial<PlayerState> = {}): PlayerState {
  return {
    playerId: id, userId: id, telegramId: BigInt(1000 + id), firstName: "P" + id,
    role, isAlive: true, isBlocked: false, isProtectedByLawyer: false,
    isProtectedByWarlock: false, isHealedByDoctor: false, doctorSelfHealUsed: false,
    hasHeroActive: false, heroProtectionAvailable: false, heroDefendUsed: false,
    heroHP: 100, heroProtection: 0, hasShieldActive: false, shieldCharges: 0,
    reservedShield: false, reservedDocument: false, inactiveNights: 0, ...over,
  } as PlayerState;
}

async function main() {
  // ============ 1. SOTIB OLISH ============
  freshUser({ diamonds: 100 });
  const buy = await inventoryService.buyBullet(1);
  check("buyBullet: olmos yechildi, o'q qo'shildi, flag yoqildi",
    buy.success && db.bulletCount === 1 && db.useBulletNextGame === true && db.diamonds === 100 - (buy.price ?? 0),
    `success=${buy.success} count=${db.bulletCount} flag=${db.useBulletNextGame} diamonds=${db.diamonds} price=${buy.price}`);

  freshUser({ diamonds: 0 });
  const poor = await inventoryService.buyBullet(1);
  check("buyBullet: olmos yetmasa xato qaytadi, o'q berilmaydi",
    !poor.success && db.bulletCount === 0 && !!poor.error, `${JSON.stringify(poor)} count=${db.bulletCount}`);

  // ============ 2. TOGGLE ============
  freshUser({ bulletCount: 0 });
  const t1 = await inventoryService.toggleUseFlag(1, "bullet");
  check("toggle: o'q yo'q bo'lsa yoqilmaydi", !t1.enabled && !!t1.error, JSON.stringify(t1));

  freshUser({ bulletCount: 2, useBulletNextGame: false });
  const t2 = await inventoryService.toggleUseFlag(1, "bullet");
  check("toggle: o'q bor bo'lsa yoqiladi", t2.enabled === true, JSON.stringify(t2));

  // ============ 3. O'YINGA KIRISH ============
  freshUser({ bulletCount: 1, useBulletNextGame: true });
  const c1 = await inventoryService.consumeForGame(1);
  check("consumeForGame: o'q reserve qilinadi, DB'dan AYRILMAYDI",
    c1.bulletUsed === true && db.bulletCount === 1, `${JSON.stringify(c1)} count=${db.bulletCount}`);

  freshUser({ bulletCount: 0, useBulletNextGame: true });
  const c2 = await inventoryService.consumeForGame(1);
  check("consumeForGame: sanoq 0 bo'lsa reserve bo'lmaydi", c2.bulletUsed === false, JSON.stringify(c2));

  // ============ 4. O'YIN OXIRI ============
  freshUser({ bulletCount: 3, useBulletNextGame: true });
  await inventoryService.finalizeForGame(1, { shield: false, document: false, bullet: true }, { shield: false, document: false, bullet: true });
  check("finalize: o'q ishlatilsa -1, flag yoniq qoladi (yana bor)",
    db.bulletCount === 2 && db.useBulletNextGame === true, `count=${db.bulletCount} flag=${db.useBulletNextGame}`);

  freshUser({ bulletCount: 1, useBulletNextGame: true });
  await inventoryService.finalizeForGame(1, { shield: false, document: false, bullet: true }, { shield: false, document: false, bullet: true });
  check("finalize: oxirgi o'q sarflansa flag o'chadi",
    db.bulletCount === 0 && db.useBulletNextGame === false, `count=${db.bulletCount} flag=${db.useBulletNextGame}`);

  freshUser({ bulletCount: 2, useBulletNextGame: true });
  await inventoryService.finalizeForGame(1, { shield: false, document: false, bullet: true }, { shield: false, document: false, bullet: false });
  check("finalize: o'q ishlatilmasa hech narsa o'zgarmaydi (flag yoniq)",
    db.bulletCount === 2 && db.useBulletNextGame === true && updates.length === 0,
    `count=${db.bulletCount} flag=${db.useBulletNextGame} updates=${updates.length}`);

  freshUser({ shieldCount: 1, bulletCount: 1, useShieldNextGame: true, useBulletNextGame: true });
  await inventoryService.finalizeForGame(1, { shield: true, document: false, bullet: true }, { shield: true, document: false, bullet: true });
  check("finalize: Shield va o'q birga sarflanadi",
    db.shieldCount === 0 && db.bulletCount === 0, `shield=${db.shieldCount} bullet=${db.bulletCount}`);

  // ============ 5. TIMER (Kamikaze oynasi) ============
  const eng = new GameEngine(1, 1, BigInt(1), { registrationTimeout: 10 } as any);
  let fired = 0;
  eng.setTimer(60000, () => { fired++; }, "KAMIKAZE_DELAY");
  check("setTimer: pendingPhaseAction o'rnatildi", eng.pendingPhaseAction === "KAMIKAZE_DELAY");
  const r1 = eng.fireTimerNow();
  check("fireTimerNow: darhol ishga tushdi", r1 === true && fired === 1, `r1=${r1} fired=${fired}`);
  check("fireTimerNow: pendingPhaseAction tozalandi", eng.pendingPhaseAction === null);
  const r2 = eng.fireTimerNow();
  check("fireTimerNow: 2-marta ishlamaydi (double-resolution yo'q)", r2 === false && fired === 1, `r2=${r2} fired=${fired}`);
  const eng2 = new GameEngine(1, 1, BigInt(1), {} as any);
  check("fireTimerNow: timer yo'q bo'lsa false", eng2.fireTimerNow() === false);
  eng.clearTimer();

  // ============ 6. SNAPSHOT ROUND-TRIP ============
  const eng3 = new GameEngine(7, 1, BigInt(123), { maxPlayers: 30 } as any);
  eng3.addPlayer(makePlayer(1, "KILLER", { hasBulletActive: true, reservedBullet: true }));
  eng3.addPlayer(makePlayer(2, "CIVILIAN", { hasShieldActive: true, reservedShield: true, shieldCharges: 1 }));
  const snap = JSON.parse(JSON.stringify(serializeEngine(eng3)));
  const eng4 = new GameEngine(7, 1, BigInt(123), { maxPlayers: 30 } as any);
  applySerializedToEngine(eng4, snap);
  const p1 = eng4.getPlayer(1)!, p2 = eng4.getPlayer(2)!;
  check("snapshot: o'q holati restartdan keyin saqlanadi",
    p1.hasBulletActive === true && p1.reservedBullet === true, `${p1.hasBulletActive}/${p1.reservedBullet}`);
  check("snapshot: shield holati ham buzilmadi",
    p2.hasShieldActive === true && p2.reservedShield === true);

  // Eski snapshot (bullet maydonlarsiz) — yiqilmasligi kerak
  const legacy = JSON.parse(JSON.stringify(snap));
  for (const sp of legacy.players) { delete sp.hasBulletActive; delete sp.reservedBullet; }
  const eng5 = new GameEngine(7, 1, BigInt(123), { maxPlayers: 30 } as any);
  applySerializedToEngine(eng5, legacy);
  check("snapshot: ESKI snapshot (o'qsiz) ham yuklanadi",
    eng5.getPlayer(1)!.hasBulletActive === undefined || eng5.getPlayer(1)!.hasBulletActive === false,
    `${eng5.getPlayer(1)!.hasBulletActive}`);

  // ============ NATIJA ============
  let bad = 0;
  for (const r of results) {
    if (!r.ok) bad++;
    console.log(`${r.ok ? "OK " : "XXX"} ${r.name}${r.detail ? "  <- " + r.detail : ""}`);
  }
  console.log(`\n${results.length - bad}/${results.length} o'tdi`);
  await prisma.$disconnect().catch(() => {});
}

main().catch((e) => { console.error(e); process.exit(1); });
