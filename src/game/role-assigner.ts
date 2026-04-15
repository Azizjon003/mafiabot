import { Role, ChatSettings } from "@prisma/client";
import { RoleDistribution } from "../types";
import { shuffle } from "../utils/helpers";

interface RoleConfig {
  role: Role;
  settingsKey: keyof ChatSettings | null; // null = har doim enabled
}

// Rollar va ularning enable flag'lari
const OPTIONAL_ROLES: RoleConfig[] = [
  // Mafiya jamoasi (Don va Mafia har doim bor)
  { role: "LAWYER", settingsKey: "enableLawyer" },
  { role: "SPY", settingsKey: "enableSpy" },
  { role: "LAB", settingsKey: "enableLab" },
  // Tinch axoli
  { role: "TRAMP", settingsKey: "enableTramp" },
  { role: "KAMIKAZE", settingsKey: "enableKamikaze" },
  { role: "HOOKER", settingsKey: "enableHooker" },
  { role: "SERGEANT", settingsKey: "enableSergeant" },
  { role: "WARLOCK", settingsKey: "enableWarlock" },
  { role: "SANTA", settingsKey: "enableSanta" },
  { role: "SNOWBOY", settingsKey: "enableSnowboy" },
  // Yakka
  { role: "KILLER", settingsKey: "enableKiller" },
  { role: "MINER", settingsKey: "enableMiner" },
  { role: "SNIPER", settingsKey: "enableSniper" },
  { role: "ARCHER", settingsKey: "enableArcher" },
  { role: "TRAITOR", settingsKey: "enableTraitor" },
  { role: "ROBBER", settingsKey: "enableRobber" },
  { role: "PROFESSOR", settingsKey: "enableProfessor" },
];

// O'yinchilar soniga qarab mafiya jamoasi UMUMIY soni (DON + MAFIA)
// PRD: 4-5:1 / 6-7:2 / 8-9:3 / 10-12:3 / 13-16:4 / 17-20:5 / 21-25:6 / 26-30:7
function getMafiaCount(playerCount: number): number {
  if (playerCount <= 5) return 1;    // 1 MAFIA (no DON)
  if (playerCount <= 7) return 2;    // 1 DON + 1 MAFIA
  if (playerCount <= 9) return 3;    // 1 DON + 2 MAFIA
  if (playerCount <= 12) return 3;   // 1 DON + 2 MAFIA
  if (playerCount <= 16) return 4;   // 1 DON + 3 MAFIA
  if (playerCount <= 20) return 5;   // 1 DON + 4 MAFIA
  if (playerCount <= 25) return 6;   // 1 DON + 5 MAFIA
  return 7;                           // 1 DON + 6 MAFIA (26-30)
}

// Don bormi — 6+ o'yinchi
function hasDon(playerCount: number): boolean {
  return playerCount >= 6;
}

// Tarqatiladigan maxsus rollar soni (o'yinchilar soniga qarab)
function getSpecialRoleSlots(playerCount: number): number {
  if (playerCount <= 5) return 1; // faqat Sheriff
  if (playerCount <= 7) return 3; // Sheriff + Doctor + 1
  if (playerCount <= 9) return 5;
  if (playerCount <= 12) return 7;
  if (playerCount <= 16) return 9;
  if (playerCount <= 20) return 12;
  if (playerCount <= 25) return 15;
  return 18; // 26-30
}

export function assignRoles(playerCount: number, settings: ChatSettings): Role[] {
  const roles: Role[] = [];

  // 1. Mafiya jamoasi
  const mafiaCount = getMafiaCount(playerCount);
  if (hasDon(playerCount)) {
    roles.push("DON");
    for (let i = 0; i < mafiaCount - 1; i++) roles.push("MAFIA");
  } else {
    for (let i = 0; i < mafiaCount; i++) roles.push("MAFIA");
  }

  // 2. Komissar har doim bor
  roles.push("SHERIFF");

  // 3. Shifokor (6+ o'yinchi)
  if (playerCount >= 6) {
    roles.push("DOCTOR");
  }

  // 4. Qolgan maxsus rollar
  const specialSlots = getSpecialRoleSlots(playerCount) - roles.length + mafiaCount + (hasDon(playerCount) ? 1 : 0);
  const availableRoles: Role[] = [];

  for (const config of OPTIONAL_ROLES) {
    if (config.settingsKey === null) continue;
    const enabled = settings[config.settingsKey];
    if (enabled) {
      availableRoles.push(config.role);
    }
  }

  // Shuffle va kerakli miqdorda olish
  const shuffledOptional = shuffle(availableRoles);
  const slotsForOptional = Math.max(0, getSpecialRoleSlots(playerCount) - roles.length);
  const selectedOptional = shuffledOptional.slice(0, slotsForOptional);

  // Mafiya rollari (Lawyer, Spy, Lab) alohida hisoblansin — ular mafiya slotiga kirmaydi
  for (const role of selectedOptional) {
    roles.push(role);
  }

  // 5. Qolganlari — Tinch axoli
  while (roles.length < playerCount) {
    roles.push("CIVILIAN");
  }

  // 6. Validatsiya — UNIQUE rollarda 1 tadan ortiq bo'lmasligi
  const UNIQUE_ROLES: Role[] = [
    "DON", "SHERIFF", "DOCTOR", "KAMIKAZE", "HOOKER", "SERGEANT",
    "WARLOCK", "SANTA", "SNOWBOY", "LAWYER", "SPY", "LAB",
    "KILLER", "MINER", "SNIPER", "ARCHER", "TRAITOR", "ROBBER", "PROFESSOR",
  ];
  const counts = new Map<Role, number>();
  for (const r of roles) counts.set(r, (counts.get(r) || 0) + 1);
  for (const r of UNIQUE_ROLES) {
    const count = counts.get(r) || 0;
    while ((counts.get(r) || 0) > 1) {
      // ortiqcha rolni olib tashlab, CIVILIAN qilamiz
      const idx = roles.lastIndexOf(r);
      if (idx >= 0) {
        roles[idx] = "CIVILIAN";
        counts.set(r, (counts.get(r) || 0) - 1);
        counts.set("CIVILIAN", (counts.get("CIVILIAN") || 0) + 1);
      } else break;
    }
  }

  // Aralashtirish
  return shuffle(roles);
}
