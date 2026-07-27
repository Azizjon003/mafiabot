// Ketma-ket o'yinlarda rol takrorlanmasligini tekshiruvchi smoke test.
// Ishga tushirish: npx tsx tests/role-repeat.smoke.ts

import type { Role } from "@prisma/client";
import { matchRolesAvoidingRepeat, repeatPenalty } from "../src/game/role-assigner";
import { calculateRoleDistribution } from "../src/services/role-distribution.formula";
import { exportedDefaultSettings } from "./harness";

const errors: string[] = [];
function check(cond: boolean, msg: string) {
  if (!cond) errors.push(msg);
}

// ==================== 1) Sof funksiya: takror bo'lmasligi ====================
{
  const players = [1, 2, 3, 4].map((id) => ({ playerId: id, userId: id }));
  const roles: Role[] = ["DON", "SHERIFF", "DOCTOR", "CIVILIAN"];
  const last = new Map<number, Role>([
    [1, "DON"],
    [2, "SHERIFF"],
    [3, "DOCTOR"],
    [4, "CIVILIAN"],
  ]);

  for (let i = 0; i < 500; i++) {
    const pairs = matchRolesAvoidingRepeat(players, roles, last);
    check(pairs.length === 4, "hamma o'yinchiga rol berilishi kerak");
    check(
      new Set(pairs.map((p) => p.role)).size === 4,
      "har bir rol faqat bir marta berilishi kerak"
    );
    for (const p of pairs) {
      if (last.get(p.player.userId) === p.role) {
        errors.push(`takror rol: userId=${p.player.userId} yana ${p.role}`);
        break;
      }
    }
  }
}

// ==================== 2) Ketma-ket 20 o'yin, 7 doimiy o'yinchi ====================
{
  const settings = exportedDefaultSettings();
  const n = 7;
  const players = Array.from({ length: n }, (_, i) => ({ playerId: i + 1, userId: i + 1 }));
  let last = new Map<number, Role>();
  const history: Record<number, Role[]> = {};
  let repeats = 0;
  let mafiaRepeats = 0;

  for (let game = 0; game < 20; game++) {
    const roles = calculateRoleDistribution(n, settings).roles;
    const pairs = matchRolesAvoidingRepeat(players, roles, last);
    const next = new Map<number, Role>();
    for (const { player, role } of pairs) {
      if (last.get(player.userId) === role) repeats++;
      const prev = last.get(player.userId);
      if (prev && ["DON", "MAFIA", "LAWYER", "SPY", "LAB"].includes(prev) &&
          ["DON", "MAFIA", "LAWYER", "SPY", "LAB"].includes(role)) mafiaRepeats++;
      next.set(player.userId, role);
      (history[player.userId] ??= []).push(role);
    }
    last = next;
  }

  console.log("7 kishilik 20 ta ketma-ket o'yin (har o'yinchining rol tarixi):");
  for (const [uid, arr] of Object.entries(history)) {
    console.log(`  #${uid}: ${arr.join(" → ")}`);
  }
  check(repeats === 0, `ketma-ket bir xil rol ${repeats} marta uchradi (0 bo'lishi kerak)`);
  check(mafiaRepeats === 0, `ketma-ket mafiya jamoasi ${mafiaRepeats} marta uchradi`);
}

// ==================== 3) Imkonsiz holat — o'yin baribir boshlanadi ====================
{
  // 3 o'yinchi ham CIVILIAN edi, pool'da esa faqat CIVILIAN bor — takror muqarrar,
  // lekin funksiya xato bermasdan hammaga rol berishi shart.
  const players = [1, 2, 3].map((id) => ({ playerId: id, userId: id }));
  const roles: Role[] = ["CIVILIAN", "CIVILIAN", "CIVILIAN"];
  const last = new Map<number, Role>([[1, "CIVILIAN"], [2, "CIVILIAN"], [3, "CIVILIAN"]]);
  const pairs = matchRolesAvoidingRepeat(players, roles, last);
  check(pairs.length === 3, "imkonsiz holatda ham hamma rol olishi kerak");
}

// ==================== 4) Jarima funksiyasi ====================
{
  check(repeatPenalty(undefined, "DON") === 0, "birinchi o'yin — jarima yo'q");
  check(repeatPenalty("SHERIFF", "SHERIFF") > repeatPenalty("DON", "MAFIA"),
    "aynan takror jamoa takroridan og'irroq bo'lishi kerak");
  check(repeatPenalty("CIVILIAN", "SHERIFF") === 0, "TOWN → TOWN jarimalanmaydi");
  check(repeatPenalty("DON", "MAFIA") > 0, "mafiya → mafiya jarimalanadi");
}

// ==================== NATIJA ====================
if (errors.length === 0) {
  console.log("\n✅ Barcha tekshiruvlar o'tdi");
  process.exit(0);
} else {
  console.log(`\n❌ ${errors.length} ta xato:`);
  for (const e of errors.slice(0, 20)) console.log(`   • ${e}`);
  process.exit(1);
}
