import { Role, ChatSettings } from "@prisma/client";
import { shuffle } from "../utils/helpers";
import { roleTemplatesService } from "../services/role-templates.service";
import { UNIQUE_ROLES } from "../services/role-templates.defaults";

interface RoleConfig {
  role: Role;
  settingsKey: keyof ChatSettings | null;
}

// Random pool uchun optional rollar (enableXxx flag'iga bog'liq)
const OPTIONAL_ROLES: RoleConfig[] = [
  { role: "LAWYER", settingsKey: "enableLawyer" },
  { role: "SPY", settingsKey: "enableSpy" },
  { role: "LAB", settingsKey: "enableLab" },
  { role: "TRAMP", settingsKey: "enableTramp" },
  { role: "KAMIKAZE", settingsKey: "enableKamikaze" },
  { role: "HOOKER", settingsKey: "enableHooker" },
  { role: "SERGEANT", settingsKey: "enableSergeant" },
  { role: "WARLOCK", settingsKey: "enableWarlock" },
  { role: "SANTA", settingsKey: "enableSanta" },
  { role: "SNOWBOY", settingsKey: "enableSnowboy" },
  { role: "KILLER", settingsKey: "enableKiller" },
  { role: "MINER", settingsKey: "enableMiner" },
  { role: "SNIPER", settingsKey: "enableSniper" },
  { role: "ARCHER", settingsKey: "enableArcher" },
  { role: "TRAITOR", settingsKey: "enableTraitor" },
  { role: "ROBBER", settingsKey: "enableRobber" },
  { role: "PROFESSOR", settingsKey: "enableProfessor" },
];

// Rol tarqatish — admin paneldan sozlanadigan template asosida
// 1. Bracket topiladi (o'yinchilar soniga qarab)
// 2. fixed[] rollarni qo'shamiz
// 3. randomSlots ni enableXxx yoqilgan rollardan tanlaymiz (fixed'da yo'qlaridan)
// 4. Qolganini CIVILIAN bilan to'ldiramiz
export async function assignRoles(playerCount: number, settings: ChatSettings): Promise<Role[]> {
  const bracket = await roleTemplatesService.getForCount(playerCount);
  const roles: Role[] = [];

  // 1. Fixed rollar
  for (const f of bracket.fixed) {
    for (let i = 0; i < f.count; i++) roles.push(f.role);
  }

  // 2. Random pool — fixed'da bo'lgan UNIQUE rollarni chiqarib tashlaymiz
  const fixedRoles = new Set<Role>(bracket.fixed.map((f) => f.role));
  const pool: Role[] = [];
  for (const config of OPTIONAL_ROLES) {
    if (config.settingsKey === null) continue;
    if (!settings[config.settingsKey]) continue;
    if (UNIQUE_ROLES.includes(config.role) && fixedRoles.has(config.role)) continue;
    pool.push(config.role);
  }

  const shuffledPool = shuffle(pool);
  const slotsToFill = Math.min(
    bracket.randomSlots,
    Math.max(0, playerCount - roles.length),
    shuffledPool.length,
  );
  for (let i = 0; i < slotsToFill; i++) {
    roles.push(shuffledPool[i]);
  }

  // 3. Qolganlari — Tinch aholi
  while (roles.length < playerCount) {
    roles.push("CIVILIAN");
  }

  // Ortiqchasi kesiladi (agar fixed + random > playerCount bo'lsa)
  if (roles.length > playerCount) {
    roles.length = playerCount;
  }

  // 4. UNIQUE validatsiya — backward safety
  const counts = new Map<Role, number>();
  for (const r of roles) counts.set(r, (counts.get(r) || 0) + 1);
  for (const r of UNIQUE_ROLES) {
    while ((counts.get(r) || 0) > 1) {
      const idx = roles.lastIndexOf(r);
      if (idx >= 0) {
        roles[idx] = "CIVILIAN";
        counts.set(r, (counts.get(r) || 0) - 1);
        counts.set("CIVILIAN", (counts.get("CIVILIAN") || 0) + 1);
      } else break;
    }
  }

  return shuffle(roles);
}
