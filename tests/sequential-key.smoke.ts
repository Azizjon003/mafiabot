// sequentialize kaliti — runner parallel ishlaganda bitta o'yinga tegishli
// update'lar bir navbatga tushishi SHART. Aks holda ikki o'yinchining tun
// harakati bitta engine'ni bir vaqtda o'zgartiradi.
// Ishga tushirish: npx tsx tests/sequential-key.smoke.ts
process.env.LOG_LEVEL = "silent";

import { gameRepo } from "../src/database/repositories/game.repository";
import { playerRepo } from "../src/database/repositories/player.repository";
const asyncNoop = async (): Promise<any> => undefined;
for (const k of Object.keys(gameRepo) as (keyof typeof gameRepo)[]) (gameRepo as any)[k] = asyncNoop;
for (const k of Object.keys(playerRepo) as (keyof typeof playerRepo)[]) (playerRepo as any)[k] = asyncNoop;

import { GameEngine } from "../src/game/engine";
import { gameManager } from "../src/game/manager";
import { sequentialKey } from "../src/handlers/middleware/sequential-key";
import { PlayerState } from "../src/types";

const out: { ok: boolean; name: string; detail?: string }[] = [];
const check = (n: string, ok: boolean, d?: string) => out.push({ ok, name: n, detail: ok ? undefined : d });

function P(id: number, tg: bigint, alive = true): PlayerState {
  return {
    playerId: id, userId: id, telegramId: tg, firstName: "P" + id, role: "CIVILIAN",
    isAlive: alive, isBlocked: false, isProtectedByLawyer: false, isProtectedByWarlock: false,
    isHealedByDoctor: false, doctorSelfHealUsed: false, hasHeroActive: false,
    heroProtectionAvailable: false, heroDefendUsed: false, heroHP: 100, heroProtection: 0,
    hasShieldActive: false, shieldCharges: 0, reservedShield: false, reservedDocument: false,
    inactiveNights: 0,
  } as PlayerState;
}

// ==================== Ikki o'yin, to'rt o'yinchi ====================
const GROUP_A = BigInt(-1001);
const GROUP_B = BigInt(-1002);

const gameA = new GameEngine(1, 1, GROUP_A, {} as any);
gameA.addPlayer(P(1, BigInt(111)));            // tirik
gameA.addPlayer(P(2, BigInt(222)));            // tirik
gameA.addPlayer(P(3, BigInt(333), false));     // O'LIK
gameManager.registerEngine(gameA);

const gameB = new GameEngine(2, 2, GROUP_B, {} as any);
gameB.addPlayer(P(4, BigInt(444)));
gameManager.registerEngine(gameB);

const ctx = (over: any): any => ({ chat: undefined, from: undefined, ...over });

// 1) Guruh chati — o'z id'si
check("Guruh chati -> chat kaliti",
  sequentialKey(ctx({ chat: { id: -1001, type: "supergroup" }, from: { id: 111 } })) === "c-1001",
  String(sequentialKey(ctx({ chat: { id: -1001, type: "supergroup" }, from: { id: 111 } }))));

// 2) ASOSIY: shaxsiy chatdagi o'yinchi -> O'YIN GURUHI kaliti (o'z id'si EMAS)
const k1 = sequentialKey(ctx({ chat: { id: 111, type: "private" }, from: { id: 111 } }));
check("Shaxsiy chat, o'yindagi o'yinchi -> o'yin guruhi kaliti",
  k1 === `c${GROUP_A}`, String(k1));

// 3) ENG MUHIMI: bir o'yindagi IKKI o'yinchi -> BIR XIL kalit
const k2 = sequentialKey(ctx({ chat: { id: 222, type: "private" }, from: { id: 222 } }));
check("Bir o'yindagi ikki o'yinchi BIR XIL navbatda (poyga yo'q)",
  k1 === k2 && k1 !== undefined, `${k1} vs ${k2}`);

// 4) O'lik o'yinchi ham o'sha navbatda (oxirgi so'z / o'liklar chati)
const k3 = sequentialKey(ctx({ chat: { id: 333, type: "private" }, from: { id: 333 } }));
check("O'lik o'yinchi ham o'yin navbatida", k3 === `c${GROUP_A}`, String(k3));

// 5) Boshqa o'yin -> BOSHQA kalit (parallel ishlashi kerak)
const k4 = sequentialKey(ctx({ chat: { id: 444, type: "private" }, from: { id: 444 } }));
check("Boshqa o'yin -> boshqa navbat (parallel ketadi)",
  k4 === `c${GROUP_B}` && k4 !== k1, `${k4} vs ${k1}`);

// 6) O'yinda bo'lmagan foydalanuvchi -> o'z kaliti
check("O'yinsiz foydalanuvchi -> o'z navbati",
  sequentialKey(ctx({ chat: { id: 999, type: "private" }, from: { id: 999 } })) === "u999");

// 7) from yo'q (masalan channel_post) -> undefined (cheklovsiz)
check("from yo'q -> undefined", sequentialKey(ctx({})) === undefined);

// 8) Guruh kaliti va shaxsiy chat kaliti MOS kelishi kerak —
//    guruhdagi ovoz va PMdagi tun harakati bitta navbatda bo'lsin
const groupKey = sequentialKey(ctx({ chat: { id: -1001, type: "supergroup" }, from: { id: 111 } }));
check("Guruhdagi va PMdagi update bitta navbatda", groupKey === k1, `${groupKey} vs ${k1}`);

// 9) callback_query da chat bo'lmasligi mumkin — from bo'yicha ishlashi kerak
check("chat'siz callback (faqat from) ham to'g'ri kalit oladi",
  sequentialKey(ctx({ from: { id: 222 } })) === `c${GROUP_A}`,
  String(sequentialKey(ctx({ from: { id: 222 } }))));

// 10) O'yin tugagach o'yinchi o'z navbatiga qaytadi
gameManager.registerEngine(gameA);
(gameManager as any).activeGames.delete(GROUP_A.toString());
check("O'yin tugagach -> o'z navbatiga qaytadi",
  sequentialKey(ctx({ chat: { id: 111, type: "private" }, from: { id: 111 } })) === "u111");

let bad = 0;
for (const r of out) {
  if (!r.ok) bad++;
  console.log(`${r.ok ? "OK " : "XXX"} ${r.name}${r.detail ? "\n      <- " + r.detail : ""}`);
}
console.log(`\n${out.length - bad}/${out.length} o'tdi`);
if (bad > 0) process.exitCode = 1;
