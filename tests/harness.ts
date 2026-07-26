// Engine-level scenario harness — Telegramni chetlab o'tib GameEngineni sinaydi.
// Barcha DB repolarini no-op stublar bilan almashtiradi.

// Logger'ni o'chirish (pino log'larini console'da ko'rmaslik uchun)
process.env.LOG_LEVEL = "silent";

import type { ChatSettings, Role, Winner } from "@prisma/client";

// ==================== REPO STUBS ====================
// Engine'ni import qilishdan AVVAL repo'lar metodlarini overwrite qilamiz.
// gameRepo/playerRepo — obyekt refer. oladi, shuning uchun bir marta patch qilsak — engine ham ko'radi.

import { gameRepo } from "../src/database/repositories/game.repository";
import { playerRepo } from "../src/database/repositories/player.repository";

const asyncNoop = async (..._args: any[]): Promise<any> => undefined;

for (const key of Object.keys(gameRepo) as (keyof typeof gameRepo)[]) {
  (gameRepo as any)[key] = asyncNoop;
}
for (const key of Object.keys(playerRepo) as (keyof typeof playerRepo)[]) {
  (playerRepo as any)[key] = asyncNoop;
}

// Endi engine'ni import qilamiz (repos allaqachon stubbed)
import { GameEngine } from "../src/game/engine";
import { PlayerState, NightResult } from "../src/types";
import { ROLE_EMOJI } from "../src/utils/constants";

// ==================== TYPES ====================

export type RoleMap = Record<string, Role>;

export interface NightInput {
  // Oddiy rollar — role → targetName
  // Mafiya/Don uchun: { MAFIA: { voter: "don", target: "p1" } } yoki massiv
  actions?: Partial<Record<Role, string | { target: string; [k: string]: any }>>;
  // Mafiya ovozlari (bir nechta voter)
  mafiaVotes?: { voter: string; target: string }[];
  // Komissar: "check" (default) yoki "shoot"
  sheriff?: { target: string; mode?: "check" | "shoot" };
  // Professor: { target, choice: 0|1|2 | "random" }
  professor?: { target: string; choice?: number };
  // Qaroqchi javobi
  robber?: { target: string; response?: "pay" | "refuse" };
}

export interface VoteInput {
  // { voter: target | "skip" }
  votes: Record<string, string>;
  // 👍/👎 bosqichi — osishni tasdiqlash
  confirm?: Record<string, boolean>;
  // Kamikaze o'ldirgan target
  kamikaze?: string;
}

export interface ExpectedState {
  dead?: string[];     // shu rounddan keyin o'liklar (kumulyativ)
  alive?: string[];    // shu rounddan keyin tiriklar (kumulyativ)
  winner?: Winner | null;
  // Inventory tekshiruvi: { playerName: { shield?: true, ... } }
  inventory?: Record<string, PlayerInventory>;
  // Rol tekshiruvi: { playerName: "MAFIA" }
  roles?: Record<string, Role>;
  // Tun event'i tekshiruvi: { TRAMP_VISIT: ["Qaroqchi"] } —
  // shu turdagi event'ning shaxsiy xabarlarida berilgan matnlar borligini tekshiradi
  eventContains?: Record<string, string[]>;
  // Bu turdagi event UMUMAN bo'lmasligi kerak
  noEvents?: string[];
}

export interface PlayerInventory {
  shield?: boolean;
  hero?: boolean;
  document?: boolean;
  preferredRole?: Role;
}

export interface Scenario {
  name: string;
  players: string[];
  roles: RoleMap;
  nights?: NightInput[];
  votes?: VoteInput[];
  // O'yin boshida har o'yinchi uchun inventarizatsiya (Shield, Hujjat, Geroy, preferredRole)
  inventory?: Record<string, PlayerInventory>;
  // Har bosqichdan keyin tekshiruv; index = round
  afterNight?: ExpectedState[];
  afterVote?: ExpectedState[];
  finalWinner?: Winner | null;
  finalAlive?: string[];
}

// ==================== FACTORY ====================

function defaultSettings(): ChatSettings {
  return {
    id: 1, chatId: 1, registrationTimeout: 90, nightTimeout: 60,
    dayDiscussionTimeout: 90, votingTimeout: 60, minPlayers: 4, maxPlayers: 30,
    showRoleOnDeath: true, allowSelfVote: false, muteOnNight: false,
    enableTramp: true, enableKamikaze: true, enableHooker: true, enableSergeant: true,
    enableWarlock: true, enableSanta: true, enableSnowboy: true,
    enableLawyer: true, enableSpy: true, enableLab: true,
    enableKiller: true, enableMiner: true, enableSniper: true, enableArcher: true,
    enableTraitor: true, enableRobber: true, enableProfessor: true,
    updatedAt: new Date(),
  } as unknown as ChatSettings;
}

function makePlayer(id: number, name: string, role: Role): PlayerState {
  return {
    playerId: id,
    userId: id,
    telegramId: BigInt(1000 + id),
    firstName: name,
    username: name,
    role,
    isAlive: true,
    isBlocked: false,
    isProtectedByLawyer: false,
    isProtectedByWarlock: false,
    isHealedByDoctor: false,
    doctorSelfHealUsed: false,
    hasHeroActive: false,
    hasShieldActive: false,
  };
}

export function createEngine(scenario: Scenario) {
  const engine = new GameEngine(1, 1, BigInt(1), defaultSettings());
  const nameToId = new Map<string, number>();
  scenario.players.forEach((name, i) => {
    const id = i + 1;
    nameToId.set(name, id);
    const role = scenario.roles[name];
    if (!role) throw new Error(`Scenariyda '${name}' uchun rol belgilanmagan`);
    const p = makePlayer(id, name, role);
    const inv = scenario.inventory?.[name];
    if (inv) {
      if (inv.shield) p.hasShieldActive = true;
      if (inv.hero) p.hasHeroActive = true;
      if (inv.document) p.hasDocumentActive = true;
      if (inv.preferredRole) p.preferredRole = inv.preferredRole;
    }
    engine.addPlayer(p);
  });
  engine.status = "STARTING";
  return { engine, id: (n: string) => {
    const v = nameToId.get(n);
    if (!v) throw new Error(`Noma'lum o'yinchi: ${n}`);
    return v;
  }};
}

// ==================== NIGHT RUNNER ====================

async function runNight(engine: GameEngine, id: (n: string) => number, input: NightInput): Promise<NightResult> {
  await engine.startNight();

  // Mafiya ovozlari
  if (input.mafiaVotes) {
    for (const v of input.mafiaVotes) {
      const voter = engine.getPlayer(id(v.voter));
      if (!voter) continue;
      engine.submitNightAction(voter.playerId, id(v.target), voter.role);
    }
  }

  // Oddiy rollar
  if (input.actions) {
    for (const [roleKey, val] of Object.entries(input.actions)) {
      const role = roleKey as Role;
      const actor = engine.getAlivePlayers().find((p) => p.role === role);
      if (!actor) continue;
      const targetName = typeof val === "string" ? val : (val as any).target;
      engine.submitNightAction(actor.playerId, id(targetName), role);
    }
  }

  // Komissar
  if (input.sheriff) {
    const sheriff = engine.getAlivePlayers().find((p) => p.role === "SHERIFF");
    if (sheriff) {
      engine.submitNightAction(sheriff.playerId, id(input.sheriff.target), "SHERIFF");
      if (input.sheriff.mode === "shoot") engine.setSheriffShoot(id(input.sheriff.target));
    }
  }

  // Professor: action + quti tanlash
  if (input.professor) {
    const prof = engine.getAlivePlayers().find((p) => p.role === "PROFESSOR");
    if (prof) {
      const tid = id(input.professor.target);
      engine.submitNightAction(prof.playerId, tid, "PROFESSOR");
      engine.prepareProfessorBoxes(tid);
      if (input.professor.choice !== undefined) {
        engine.resolveProfessorChoice(tid, input.professor.choice);
      }
    }
  }

  // Qaroqchi javobi
  if (input.robber) {
    const robber = engine.getAlivePlayers().find((p) => p.role === "ROBBER");
    if (robber) {
      engine.submitNightAction(robber.playerId, id(input.robber.target), "ROBBER");
      if (input.robber.response) {
        engine.setRobberResponse(input.robber.response === "pay" ? "PAY" : "REFUSE");
      }
    }
  }

  return engine.processNightActions();
}

// ==================== VOTE RUNNER ====================

async function runVote(engine: GameEngine, id: (n: string) => number, input: VoteInput) {
  await engine.startVoting();
  for (const [voter, target] of Object.entries(input.votes)) {
    const v = engine.getPlayer(id(voter));
    if (!v || !v.isAlive) continue;
    if (target === "skip") continue;
    engine.submitVote(v.playerId, id(target));
  }
  const result = engine.processVotes();

  // Osishni tasdiqlash (confirm)
  if (result.votedOut && input.confirm) {
    await engine.startConfirming();
    for (const [voter, approve] of Object.entries(input.confirm)) {
      const v = engine.getPlayer(id(voter));
      if (v && v.isAlive) engine.submitConfirmVote(v.playerId, approve);
    }
    const counts = engine.getConfirmCounts();
    if (counts.yes > counts.no) {
      // Osish — kill manually (engine'da alohida method yo'q; processVotes ichida emas)
      result.votedOut.isAlive = false;
      // Kamikaze?
      if (result.votedOut.role === "KAMIKAZE" && input.kamikaze) {
        const k = engine.getPlayer(id(input.kamikaze));
        if (k) k.isAlive = false;
      }
    }
  } else if (result.votedOut && !input.confirm) {
    // Confirm fazasi belgilanmagan — avtomatik osish
    result.votedOut.isAlive = false;
    if (result.votedOut.role === "KAMIKAZE" && input.kamikaze) {
      const k = engine.getPlayer(id(input.kamikaze));
      if (k) k.isAlive = false;
    }
  }

  return result;
}

// ==================== ASSERT ====================

function assertState(
  engine: GameEngine,
  expected: ExpectedState,
  label: string,
  errors: string[],
  nightResult?: NightResult,
) {
  const alive = engine.getAlivePlayers().map((p) => p.firstName).sort();
  const dead = [...engine.players.values()].filter((p) => !p.isAlive).map((p) => p.firstName).sort();
  if (expected.alive) {
    const exp = [...expected.alive].sort();
    if (JSON.stringify(alive) !== JSON.stringify(exp)) {
      errors.push(`[${label}] alive kutilgan: [${exp.join(",")}], bo'ldi: [${alive.join(",")}]`);
    }
  }
  if (expected.dead) {
    const exp = [...expected.dead].sort();
    const actualDead = dead.filter((n) => exp.includes(n)).sort();
    for (const d of exp) {
      if (!dead.includes(d)) errors.push(`[${label}] ${d} o'lishi kerak edi, lekin tirik`);
    }
  }
  if (expected.winner !== undefined) {
    const winner = engine.checkWin();
    if (winner !== expected.winner) {
      errors.push(`[${label}] winner kutilgan: ${expected.winner}, bo'ldi: ${winner}`);
    }
  }
  if (expected.inventory) {
    for (const [name, inv] of Object.entries(expected.inventory)) {
      const p = [...engine.players.values()].find((x) => x.firstName === name);
      if (!p) { errors.push(`[${label}] ${name} topilmadi`); continue; }
      if (inv.shield !== undefined && p.hasShieldActive !== inv.shield)
        errors.push(`[${label}] ${name}.shield kutilgan: ${inv.shield}, bo'ldi: ${p.hasShieldActive}`);
      if (inv.hero !== undefined && p.hasHeroActive !== inv.hero)
        errors.push(`[${label}] ${name}.hero kutilgan: ${inv.hero}, bo'ldi: ${p.hasHeroActive}`);
      if (inv.document !== undefined && !!p.hasDocumentActive !== inv.document)
        errors.push(`[${label}] ${name}.document kutilgan: ${inv.document}, bo'ldi: ${!!p.hasDocumentActive}`);
    }
  }
  if (expected.roles) {
    for (const [name, role] of Object.entries(expected.roles)) {
      const p = [...engine.players.values()].find((x) => x.firstName === name);
      if (!p) { errors.push(`[${label}] ${name} topilmadi`); continue; }
      if (p.role !== role)
        errors.push(`[${label}] ${name}.role kutilgan: ${role}, bo'ldi: ${p.role}`);
    }
  }
  if (expected.eventContains) {
    for (const [type, needles] of Object.entries(expected.eventContains)) {
      const matched = nightResult?.events.filter((e) => e.type === type) ?? [];
      if (matched.length === 0) {
        errors.push(`[${label}] "${type}" event topilmadi`);
        continue;
      }
      const text = matched
        .map((e) => `${e.privateMessage ?? ""}\n${e.targetPrivateMessage ?? ""}`)
        .join("\n");
      for (const needle of needles) {
        if (!text.includes(needle)) {
          errors.push(`[${label}] "${type}" xabarida "${needle}" yo'q. Xabar: ${text.replace(/\n/g, " | ")}`);
        }
      }
    }
  }
  if (expected.noEvents) {
    for (const type of expected.noEvents) {
      if (nightResult?.events.some((e) => e.type === type)) {
        errors.push(`[${label}] "${type}" event bo'lmasligi kerak edi`);
      }
    }
  }
}

// ==================== SCENARIO RUNNER ====================

export async function runScenario(s: Scenario): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const { engine, id } = createEngine(s);

  const maxRounds = Math.max(s.nights?.length ?? 0, s.votes?.length ?? 0);
  for (let r = 0; r < maxRounds; r++) {
    if (s.nights?.[r]) {
      const nightResult = await runNight(engine, id, s.nights[r]);
      if (s.afterNight?.[r]) assertState(engine, s.afterNight[r], `night ${r + 1}`, errors, nightResult);
    }
    if (s.votes?.[r]) {
      await runVote(engine, id, s.votes[r]);
      if (s.afterVote?.[r]) assertState(engine, s.afterVote[r], `vote ${r + 1}`, errors);
    }
  }

  if (s.finalWinner !== undefined) {
    const w = engine.checkWin();
    if (w !== s.finalWinner) errors.push(`final winner kutilgan: ${s.finalWinner}, bo'ldi: ${w}`);
  }
  if (s.finalAlive) {
    const alive = engine.getAlivePlayers().map((p) => p.firstName).sort();
    const exp = [...s.finalAlive].sort();
    if (JSON.stringify(alive) !== JSON.stringify(exp)) {
      errors.push(`final alive kutilgan: [${exp.join(",")}], bo'ldi: [${alive.join(",")}]`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export { ROLE_EMOJI };

// ==================== ASSIGNMENT TEST ====================
// preferredRole/aktiv rol mantig'ini chuqur sinash uchun

export interface AssignmentScenario {
  name: string;
  players: string[];
  // O'yinchilar aktiv rolini oldindan tanlagan: { playerName: Role }
  preferredRoles?: Record<string, Role>;
  // ChatSettings'ni qisman o'zgartirish
  settings?: Partial<ChatSettings>;
  // Har bir o'yinchi uchun KUTILGAN rol (agar determinatik bo'lsa)
  expectRoles?: Record<string, Role>;
  // KUTILGAN pul qaytarilganlar ro'yxati (hozirgi engine'da refund o'chirilgan)
  expectRefunded?: string[];
  // KUTILGAN pul qaytarilMAGANlar (aktiv rol olganlar)
  expectNotRefunded?: string[];
  // Aktiv rol berilmagan bo'lishi kerak (pool'da mavjud emas edi)
  expectPreferredNotGranted?: string[];
  // Har holda rol berilishi kerak (hech kim "CIVILIAN" default bo'lmay qolmasin)
  expectAllAssigned?: boolean;
  // O'yinchilar soni bo'yicha: rol pool'ida DON bo'lishi
  expectDonExists?: boolean;
  // Stokhastik: N marta takroriy sinash, bir xil natija chiqishi kerak?
  repeat?: number;
}

export async function runAssignmentScenario(s: AssignmentScenario): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const repeats = s.repeat ?? 1;

  for (let iter = 0; iter < repeats; iter++) {
    const settings = { ...defaultSettings(), ...(s.settings ?? {}) };
    const engine = new GameEngine(1, 1, BigInt(1), settings);
    s.players.forEach((name, i) => {
      const id = i + 1;
      const p = makePlayer(id, name, "CIVILIAN"); // placeholder
      const preferred = s.preferredRoles?.[name];
      if (preferred) p.preferredRole = preferred;
      engine.addPlayer(p);
    });

    const result = await engine.assignRoles();
    const refundedNames = new Set<string>();
    for (const r of result.refundUserIds) {
      const p = [...engine.players.values()].find((x) => x.userId === r.userId);
      if (p) refundedNames.add(p.firstName);
    }
    const label = repeats > 1 ? `iter ${iter + 1}` : "assign";

    if (s.expectRoles) {
      for (const [name, role] of Object.entries(s.expectRoles)) {
        const p = [...engine.players.values()].find((x) => x.firstName === name);
        if (!p) errors.push(`[${label}] ${name} topilmadi`);
        else if (p.role !== role) errors.push(`[${label}] ${name} kutilgan: ${role}, bo'ldi: ${p.role}`);
      }
    }
    if (s.expectRefunded) {
      for (const name of s.expectRefunded) {
        if (!refundedNames.has(name))
          errors.push(`[${label}] ${name} refund bo'lishi kerak edi, bo'lmadi`);
      }
    }
    if (s.expectNotRefunded) {
      for (const name of s.expectNotRefunded) {
        if (refundedNames.has(name))
          errors.push(`[${label}] ${name} refund BO'LMASLIGI kerak edi, bo'ldi`);
      }
    }
    if (s.expectPreferredNotGranted) {
      for (const name of s.expectPreferredNotGranted) {
        const p = [...engine.players.values()].find((x) => x.firstName === name);
        if (!p) { errors.push(`[${label}] ${name} topilmadi`); continue; }
        if (p.role === p.preferredRole)
          errors.push(`[${label}] ${name} aktiv rolini olgan (olmasligi kerak edi): ${p.role}`);
      }
    }
    if (s.expectAllAssigned) {
      for (const p of engine.players.values()) {
        if (!p.role) errors.push(`[${label}] ${p.firstName} rolsiz qoldi`);
      }
    }
    if (s.expectDonExists !== undefined) {
      const hasDon = [...engine.players.values()].some((p) => p.role === "DON");
      if (hasDon !== s.expectDonExists)
        errors.push(`[${label}] DON kutilgan: ${s.expectDonExists}, bo'ldi: ${hasDon}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// defaultSettings-ni eksport qilish kerak emas, lekin yuqorida ishlatildi

function exportedDefaultSettings() { return defaultSettings(); }
export { exportedDefaultSettings };
