// Dinamik rol tarqatish — smoke test
// Ishga tushirish: npx tsx tests/role-templates.smoke.ts

import { roleTemplatesService } from "../src/services/role-templates.service";
import { ROLE_TEMPLATE_DEFAULTS } from "../src/services/role-templates.defaults";
import { assignRoles } from "../src/game/role-assigner";
import { prisma } from "../src/database/prisma";

type R = { name: string; ok: boolean; detail?: string };
const results: R[] = [];
function assert(name: string, cond: boolean, detail?: string) {
  results.push({ name, ok: cond, detail: cond ? undefined : detail });
}

async function main() {
  console.log("🧪 Rol template smoke testi\n");

  // 1. Default'ga qaytarish (toza start)
  await roleTemplatesService.resetAllToDefaults();

  // 2. 8 ta bracket bor
  const brackets = await roleTemplatesService.getTemplates();
  assert("8 ta bracket yuklangan", brackets.length === 8, `Olindi: ${brackets.length}`);

  // 3. 8 kishi uchun mos bracket — "8-9"
  const b8 = await roleTemplatesService.getForCount(8);
  assert("8 kishi → bracket '8-9'", b8.id === "8-9", `Olindi: ${b8.id}`);

  // 4. Default 8 kishi uchun Don bor, Komissar bor
  const hasDefault8Don = b8.fixed.some((f) => f.role === "DON" && f.count === 1);
  const hasDefault8Sheriff = b8.fixed.some((f) => f.role === "SHERIFF" && f.count === 1);
  assert("8-9 bracket'da Don bor", hasDefault8Don);
  assert("8-9 bracket'da Komissar bor", hasDefault8Sheriff);

  // 5. Validatsiya: UNIQUE rolga count=2 → xato
  const badRes = await roleTemplatesService.setRoleCount("8-9", "SHERIFF", 2);
  assert("UNIQUE rolga count=2 rad etiladi", !badRes.ok, badRes.error);

  // 6. Majburiy rolga Kamikaze qo'shish
  const addRes = await roleTemplatesService.addRole("8-9", "KAMIKAZE");
  assert("Kamikaze fixed'ga qo'shildi", addRes.ok, addRes.error);

  // 7. Kamikaze allaqachon bor — qayta qo'shishga urinish (UNIQUE)
  const dupRes = await roleTemplatesService.addRole("8-9", "KAMIKAZE");
  assert("UNIQUE rol ikki marta qo'shilmaydi", !dupRes.ok);

  // 8. Role pool overflow — 8-9 bracket'ga juda ko'p rol
  // Hozir 5 fixed + 2 random = 7. 10 ta yana random qo'shsak → overflow
  const overflowRes = await roleTemplatesService.setRandomSlots("8-9", 10);
  assert("Overflow rad etiladi (totalSlots > maxP)", !overflowRes.ok);

  // 9. Mock ChatSettings — enable bo'lganlar
  const mockSettings = {
    chatId: 1,
    enableLawyer: false, enableSpy: false, enableLab: false,
    enableTramp: true, enableKamikaze: true, enableHooker: true,
    enableSergeant: true, enableWarlock: true, enableSanta: false, enableSnowboy: false,
    enableKiller: false, enableMiner: false, enableSniper: true, enableArcher: false,
    enableTraitor: false, enableRobber: false, enableProfessor: false,
  } as any;

  // 10. assignRoles 8 kishi uchun — natija uzunligi 8 bo'lishi kerak
  await roleTemplatesService.resetAllToDefaults();
  const roles8 = await assignRoles(8, mockSettings);
  assert("8 kishi → 8 rol", roles8.length === 8, `Olindi: ${roles8.length}`);

  // 11. 8 kishida 1 Don + 2 Mafia bo'lishi kerak (default)
  const donCount = roles8.filter((r) => r === "DON").length;
  const mafiaCount = roles8.filter((r) => r === "MAFIA").length;
  assert("8 kishida 1 Don", donCount === 1, `Olindi: ${donCount}`);
  assert("8 kishida 2 Mafia", mafiaCount === 2, `Olindi: ${mafiaCount}`);
  assert("8 kishida 1 Komissar", roles8.filter((r) => r === "SHERIFF").length === 1);
  assert("8 kishida 1 Shifokor", roles8.filter((r) => r === "DOCTOR").length === 1);

  // 12. 4 kishi → 1 Mafia, 1 Sheriff, 2 Civilian
  const roles4 = await assignRoles(4, mockSettings);
  assert("4 kishi → 4 rol", roles4.length === 4);
  assert("4 kishida 1 Mafia", roles4.filter((r) => r === "MAFIA").length === 1);
  assert("4 kishida Don yo'q", !roles4.includes("DON"));
  assert("4 kishida 1 Komissar", roles4.filter((r) => r === "SHERIFF").length === 1);

  // 13. Kamikaze admin tomonidan fixed qilindi — o'yinda paydo bo'ladimi?
  await roleTemplatesService.addRole("8-9", "KAMIKAZE");
  const rolesKamikaze = await assignRoles(8, { ...mockSettings, enableKamikaze: false });
  const hasKamikaze = rolesKamikaze.includes("KAMIKAZE");
  assert("Admin Kamikaze fixed qilsa, enableKamikaze=false bo'lsa ham paydo bo'ladi", hasKamikaze);

  // 14. UNIQUE validatsiya — har UNIQUE rol max 1 marta
  const uniqueCounts: Record<string, number> = {};
  for (const r of rolesKamikaze) {
    if (["DON", "SHERIFF", "DOCTOR", "KAMIKAZE", "HOOKER", "SNIPER"].includes(r)) {
      uniqueCounts[r] = (uniqueCounts[r] || 0) + 1;
    }
  }
  const allUnique = Object.values(uniqueCounts).every((c) => c <= 1);
  assert("Barcha UNIQUE rollar 1 marta", allUnique, JSON.stringify(uniqueCounts));

  // Cleanup
  await roleTemplatesService.resetAllToDefaults();

  // ===== Natija =====
  console.log("\n📊 Natijalar:\n");
  let passed = 0;
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
    if (r.ok) passed++;
  }
  console.log(`\n${passed}/${results.length} test o'tdi.\n`);
  await prisma.$disconnect();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error("💥 Smoke test xatosi:", e);
  process.exit(1);
});
