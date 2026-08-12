// /extend cheksiz rejimi va bo'shlik qo'riqchisi — haqiqiy GameController bilan.
// Ishga tushirish: npx tsx tests/extend-unlimited.smoke.ts
process.env.LOG_LEVEL = "silent";

import { gameRepo } from "../src/database/repositories/game.repository";
import { playerRepo } from "../src/database/repositories/player.repository";
import { chatRepo } from "../src/database/repositories/chat.repository";
const asyncNoop = async (): Promise<any> => undefined;
for (const k of Object.keys(gameRepo) as any[]) (gameRepo as any)[k] = asyncNoop;
for (const k of Object.keys(playerRepo) as any[]) (playerRepo as any)[k] = asyncNoop;

import { GameEngine } from "../src/game/engine";
import { gameManager } from "../src/game/manager";
import { GameController } from "../src/game/controller";
import { getRegistrationText } from "../src/game/phases/registration";
import { PlayerState } from "../src/types";

const out: { ok: boolean; name: string; detail?: string }[] = [];
const check = (n: string, ok: boolean, d?: string) => out.push({ ok, name: n, detail: ok ? undefined : d });

// ==================== SOXTA NOTIFIER ====================
const sent: string[] = [];
let edits = 0, deletes = 0;
const notifier: any = {
  sendToGroup: async (_c: any, text: string) => { sent.push(text); return 1; },
  editGroupMessage: async () => { edits++; },
  deleteMessage: async () => { deletes++; },
  unpinMessage: async () => {},
  pinMessage: async () => {},
  sendToPlayer: async () => 1,
};

const CHAT = BigInt(-500);
const settings: any = { registrationTimeout: 60, minPlayers: 4, maxPlayers: 30 };

function P(id: number): PlayerState {
  return {
    playerId: id, userId: id, telegramId: BigInt(1000 + id), firstName: "P" + id,
    role: "CIVILIAN", isAlive: true, isBlocked: false, isProtectedByLawyer: false,
    isProtectedByWarlock: false, isHealedByDoctor: false, doctorSelfHealUsed: false,
    hasHeroActive: false, heroProtectionAvailable: false, heroDefendUsed: false,
    heroHP: 100, heroProtection: 0, hasShieldActive: false, shieldCharges: 0,
    reservedShield: false, reservedDocument: false, inactiveNights: 0,
  } as PlayerState;
}

// Controller ichidagi private holatga test uchun murojaat
const priv = (c: GameController) => c as any;

function freshGame(): GameEngine {
  const engine = new GameEngine(1, 1, CHAT, settings);
  engine.status = "WAITING";
  gameManager.registerEngine(engine);
  return engine;
}

async function main() {
  // ==================== MATN ====================
  const eng0 = new GameEngine(1, 1, CHAT, settings);
  const unlimitedText = getRegistrationText(eng0, -1);
  check("Cheksiz rejimda matn 'cheksiz' va /begingame ni ko'rsatadi",
    unlimitedText.includes("cheksiz") && unlimitedText.includes("/begingame"), unlimitedText);
  check("Oddiy rejimda sanoq ko'rinadi", getRegistrationText(eng0, 45).includes("45s"));

  // ==================== CHEKSIZ REJIMGA O'TISH ====================
  const c = new GameController(notifier);
  const engine = freshGame();
  // handleStartGame o'rniga qo'lda: timer va xabar id sini o'rnatamiz
  priv(c).registrationTimers.set(CHAT.toString(), setInterval(() => {}, 100000));
  priv(c).registrationMessageId.set(CHAT.toString(), 1);
  priv(c).registrationTimeLeft.set(CHAT.toString(), 30);

  edits = 0;
  const r1 = await c.handleExtend(CHAT);
  check("1-marta /extend -> 'unlimited'", r1 === "unlimited", String(r1));
  check("Cheksiz rejim yoqildi", priv(c).registrationUnlimited.has(CHAT.toString()));
  check("Xabar bir marta yangilandi", edits === 1, `edits=${edits}`);

  const r2 = await c.handleExtend(CHAT);
  check("2-marta /extend -> 'already' (xabar qayta yozilmaydi)", r2 === "already", String(r2));
  check("Ortiqcha edit bo'lmadi", edits === 1, `edits=${edits}`);

  const r3 = await c.handleExtend(CHAT);
  check("3-marta ham 'already' — chegara YO'Q", r3 === "already", String(r3));

  // ==================== BO'SHLIK QO'RIQCHISI ====================
  // IDLE_CANCEL_MS ni testga moslab kichraytiramiz
  const origIdle = (GameController as any).IDLE_CANCEL_MS;
  (GameController as any).IDLE_CANCEL_MS = 50;

  const c2 = new GameController(notifier);
  const eng2 = freshGame();
  eng2.addPlayer(P(1));
  const key = CHAT.toString();
  priv(c2).registrationMessageId.set(key, 1);
  // Haqiqiy interval bilan ishlashi uchun tez tiklik: 20ms
  const iv = setInterval(async () => {
    const fn = priv(c2);
    if (!fn.registrationUnlimited.has(key)) return;
    const count = eng2.getPlayerCount();
    if (fn.registrationLastCount.get(key) !== count) {
      fn.registrationLastCount.set(key, count);
      fn.registrationIdleSince.set(key, Date.now());
    }
  }, 20);
  priv(c2).registrationTimers.set(key, iv);
  await c2.handleExtend(CHAT);

  // Yangi odam qo'shilsa bo'shlik hisobi yangilanadi
  const before = priv(c2).registrationIdleSince.get(key);
  await new Promise((r) => setTimeout(r, 30));
  eng2.addPlayer(P(2));
  await new Promise((r) => setTimeout(r, 40));
  const after = priv(c2).registrationIdleSince.get(key);
  check("Yangi o'yinchi qo'shilsa bo'shlik hisobi qayta boshlanadi",
    after > before, `${before} -> ${after}`);
  clearInterval(iv);
  (GameController as any).IDLE_CANCEL_MS = origIdle;

  // ==================== HOLAT KEYINGI O'YINGA SIZIB O'TMASIN ====================
  const c3 = new GameController(notifier);
  const k3 = CHAT.toString();
  priv(c3).registrationTimers.set(k3, setInterval(() => {}, 100000));
  priv(c3).registrationMessageId.set(k3, 1);
  freshGame();
  await c3.handleExtend(CHAT);
  check("Cheksiz rejim yoqilgan", priv(c3).registrationUnlimited.has(k3));
  priv(c3).clearRegistrationState(k3);
  check("clearRegistrationState cheksiz rejimni tozalaydi",
    !priv(c3).registrationUnlimited.has(k3) &&
    !priv(c3).registrationIdleSince.has(k3) &&
    !priv(c3).registrationTimers.has(k3));

  // ==================== O'YIN ICHIDAGI FAZA — CHEGARA SAQLANADI ====================
  const c4 = new GameController(notifier);
  const eng4 = freshGame();
  eng4.status = "NIGHT";
  eng4.setTimer(60000, () => {}, "NIGHT_END");
  const res = [await c4.handleExtend(CHAT), await c4.handleExtend(CHAT), await c4.handleExtend(CHAT), await c4.handleExtend(CHAT)];
  check("Tun/kun fazasi 3 martagacha uzayadi, 4-chisi rad etiladi",
    res[0] === "phase" && res[1] === "phase" && res[2] === "phase" && res[3] === "limit",
    res.join(","));
  eng4.clearTimer();

  let bad = 0;
  for (const r of out) {
    if (!r.ok) bad++;
    console.log(`${r.ok ? "OK " : "XXX"} ${r.name}${r.detail ? "\n      <- " + r.detail : ""}`);
  }
  console.log(`\n${out.length - bad}/${out.length} o'tdi`);
  if (bad > 0) process.exitCode = 1;
  process.exit(bad > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
