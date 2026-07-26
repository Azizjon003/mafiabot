import { Role } from "@prisma/client";
import { ChatSettings } from "@prisma/client";

// ============================================
// FORMULA-BASED ROLE DISTRIBUTION (PRD v2)
// ============================================

// Rol -> ChatSettings kaliti. null = doim yoqilgan (sozlamada toggle yo'q).
// DIQQAT: `enable${role}` shaklida yasab bo'lmaydi — Role enum'i UPPERCASE,
// ChatSettings maydonlari esa camelCase (enableSheriff emas, enableWarlock kabi).
const ROLE_SETTINGS_KEY: Partial<Record<Role, keyof ChatSettings | null>> = {
  // Tinch axoli
  SHERIFF: null, // Komissar — har doim bo'ladi
  DOCTOR: null,  // Shifokor — toggle yo'q, har doim mumkin
  HOOKER: "enableHooker",
  TRAMP: "enableTramp",
  SERGEANT: "enableSergeant",
  WARLOCK: "enableWarlock",
  SANTA: "enableSanta",
  SNOWBOY: "enableSnowboy",
  KAMIKAZE: "enableKamikaze",
  // Mafiya
  LAWYER: "enableLawyer",
  SPY: "enableSpy",
  LAB: "enableLab",
  // Yakka
  KILLER: "enableKiller",
  SNIPER: "enableSniper",
  ARCHER: "enableArcher",
  MINER: "enableMiner",
  TRAITOR: "enableTraitor",
  ROBBER: "enableRobber",
  PROFESSOR: "enableProfessor",
};

function isRoleEnabled(role: Role, settings: ChatSettings): boolean {
  const key = ROLE_SETTINGS_KEY[role];
  if (key === null) return true;      // toggle yo'q — doim yoqilgan
  if (key === undefined) return false; // xaritada yo'q — pool'ga tushmaydi
  return Boolean(settings[key]);
}

// Priority order for optional roles when pool slots available
const TOWN_POWER_PRIORITY: Role[] = [
  "SHERIFF",    // 1. Always first
  "DOCTOR",     // 2.
  "HOOKER",     // 3.
  "TRAMP",      // 4.
  "SERGEANT",   // 5.
  "WARLOCK",    // 6.
  "SANTA",      // 7.
  "SNOWBOY",    // 8.
  "KAMIKAZE",   // 9.
];

const MAFIA_POWER_PRIORITY: Role[] = [
  "LAWYER",     // 1.
  "SPY",        // 2.
  "LAB",        // 3.
];

const SOLO_PRIORITY: Role[] = [
  "KILLER",     // 1.
  "SNIPER",     // 2.
  "ARCHER",     // 3.
  "MINER",      // 4.
  "TRAITOR",    // 5.
  "ROBBER",     // 6.
  "PROFESSOR",  // 7.
];

// Maffia kunlari - soatga mos role
const MAFIA_KILL_VOTERS: Role[] = ["DON", "MAFIA"];

export interface RoleDistributionResult {
  roles: Role[];
  breakdown: {
    mafia: number;
    solo: number;
    townPower: number;
    civilians: number;
    total: number;
  };
  settings: ChatSettings;
}

/**
 * Formula-based role distribution per PRD v2:
 * - mafiaCount = max(1, round(n * 0.28))
 * - soloCount = n < 10 ? 0 : n < 18 ? 1 : n < 26 ? 2 : 3
 * - civilianFloor = ceil(n * 0.20)
 * - townPowerSlots = n - mafiaCount - soloCount - civilianFloor
 * 
 * Distribution:
 * - Mafia side: DON (1) + MAFIA (mafiaCount - 1) + mafia power roles (from pool)
 * - Solo: soloCount from solo pool
 * - Town power: townPowerSlots from pool (priority order)
 * - Remaining = civilians
 */
export function calculateRoleDistribution(
  playerCount: number,
  settings: ChatSettings
): RoleDistributionResult {
  // 1. Calculate base counts per formula
  // mafiaCount = BUTUN mafiya jamoasi (DON + MAFIA + advokat/ayg'oqchi/labarant)
  const mafiaCount = Math.max(1, Math.round(playerCount * 0.28));
  const soloCount = playerCount < 10 ? 0 : playerCount < 18 ? 1 : playerCount < 26 ? 2 : 3;
  const civilianFloor = Math.ceil(playerCount * 0.20);
  // Komissar uchun kamida 1 slot kafolatlanadi
  const townPowerSlots = Math.max(
    1,
    playerCount - mafiaCount - soloCount - civilianFloor
  );

  // 2. Build available pools based on enabled settings
  const enabledMafiaPower: Role[] = MAFIA_POWER_PRIORITY.filter(r => isRoleEnabled(r, settings));
  const enabledTownPower: Role[] = TOWN_POWER_PRIORITY.filter(r => isRoleEnabled(r, settings));
  const enabledSolo: Role[] = SOLO_PRIORITY.filter(r => isRoleEnabled(r, settings));

  // 3. Build roles array
  const roles: Role[] = [];

  // 3a. MAFIA SIDE — power rollar mafiya budjetidan olinadi (shahar budjetidan EMAS),
  // kamida DON + 1 oddiy mafiya o'ldiruvchi bo'lib qoladi.
  const mafiaPowerSlots = Math.min(enabledMafiaPower.length, Math.max(0, mafiaCount - 2));
  const plainMafiaCount = mafiaCount - mafiaPowerSlots; // DON shu ichida

  roles.push("DON");                                 // 1 Don always
  for (let i = 0; i < plainMafiaCount - 1; i++) {     // Remaining mafia
    roles.push("MAFIA");
  }
  for (let i = 0; i < mafiaPowerSlots; i++) {
    roles.push(enabledMafiaPower[i]);
  }

  // 3b. SOLO ROLES
  const soloSlots = Math.min(enabledSolo.length, soloCount);
  for (let i = 0; i < soloSlots; i++) {
    roles.push(enabledSolo[i]);
  }

  // 3c. TOWN POWER ROLES — to'liq budjet shaharga tegishli
  const freeSlots = Math.max(0, playerCount - roles.length);
  const townPowerSlotsUsed = Math.min(enabledTownPower.length, townPowerSlots, freeSlots);
  for (let i = 0; i < townPowerSlotsUsed; i++) {
    roles.push(enabledTownPower[i]);
  }

  // 3d. CIVILIANS (fill remaining)
  while (roles.length < playerCount) {
    roles.push("CIVILIAN");
  }

  // 4. Ensure we don't exceed (safety)
  if (roles.length > playerCount) {
    roles.length = playerCount;
  }

  // 5. Shuffle for randomness
  const shuffled = shuffle([...roles]);

  return {
    roles: shuffled,
    breakdown: {
      mafia: mafiaCount,
      solo: soloCount,
      townPower: townPowerSlotsUsed + mafiaPowerSlots,
      civilians: shuffled.filter(r => r === "CIVILIAN").length,
      total: playerCount,
    },
    settings,
  };
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get role distribution preview for admin panel (without shuffling)
 */
export function getRoleDistributionPreview(
  playerCount: number,
  settings: ChatSettings
): RoleDistributionResult {
  return calculateRoleDistribution(playerCount, settings);
}

/**
 * Validate settings have minimum required roles enabled
 */
export function validateSettings(settings: ChatSettings): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  // SHERIFF is always enabled in formula
  // At least one protective role
  if (!settings.enableWarlock) {
    errors.push("Kamida bitta himoya roli (WARLOCK) yoqilgan bo'lishi kerak");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export for backward compatibility with existing code
export function findBracketForCount(playerCount: number, brackets: any[]): any {
  // Legacy support - returns formula-based distribution
  const settings = {
    chatId: 0,
    updatedAt: new Date(),
    id: 0,
    maxRounds: 15,
    registrationTimeout: 60,
    nightTimeout: 30,
    dayDiscussionTimeout: 30,
    votingTimeout: 30,
    minPlayers: 4,
    maxPlayers: 30,
    showRoleOnDeath: true,
    allowSelfVote: false,
    muteOnNight: true,
    enableTramp: true,
    enableKamikaze: true,
    enableHooker: true,
    enableSergeant: true,
    enableWarlock: true,
    enableSanta: false,
    enableSnowboy: false,
    enableLawyer: true,
    enableSpy: true,
    enableLab: true,
    enableKiller: true,
    enableMiner: true,
    enableSniper: true,
    enableArcher: true,
    enableTraitor: true,
    enableRobber: false,
    enableProfessor: false,
  };
  return getRoleDistributionPreview(playerCount, settings);
}