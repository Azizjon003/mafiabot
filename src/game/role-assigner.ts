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

// O'yinchilar soniga qarab mafiya soni
function getMafiaCount(playerCount: number): number {
  if (playerCount <= 5) return 1;
  if (playerCount <= 7) return 1;
  if (playerCount <= 9) return 2;
  if (playerCount <= 12) return 2;
  if (playerCount <= 16) return 3;
  if (playerCount <= 20) return 4;
  if (playerCount <= 25) return 5;
  return 6; // 26-30
}

// Don bormi
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

  // Aralashtirish
  return shuffle(roles);
}
