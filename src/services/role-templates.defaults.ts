import { Role } from "@prisma/client";

// Bir rol + necha marta tarqatiladi
export interface RoleFixed {
  role: Role;
  count: number;
}

// O'yinchi soniga mos bracket
export interface RoleBracket {
  id: string;          // "4-5", "6-7", ...
  minP: number;        // minimum o'yinchi
  maxP: number;        // maximum o'yinchi
  fixed: RoleFixed[];  // majburiy rollar
  randomSlots: number; // qo'shimcha random slot (enableXxx'dan tanlanadi)
}

// UNIQUE rollar — har o'yinda faqat 1 tadan bo'lishi kerak
export const UNIQUE_ROLES: Role[] = [
  "DON", "SHERIFF", "DOCTOR", "KAMIKAZE", "HOOKER", "SERGEANT",
  "WARLOCK", "SANTA", "SNOWBOY", "LAWYER", "SPY", "LAB",
  "KILLER", "MINER", "SNIPER", "ARCHER", "TRAITOR", "ROBBER", "PROFESSOR",
];

// Ko'p marta tarqatish mumkin bo'lgan rollar
export const MULTI_ROLES: Role[] = ["MAFIA", "CIVILIAN"];

// Default bracketlar — hozirgi hardcoded jadvalga mos
export const ROLE_TEMPLATE_DEFAULTS: RoleBracket[] = [
  {
    id: "4-5", minP: 4, maxP: 5,
    fixed: [
      { role: "MAFIA", count: 1 },
      { role: "SHERIFF", count: 1 },
    ],
    randomSlots: 0,
  },
  {
    id: "6-7", minP: 6, maxP: 7,
    fixed: [
      { role: "DON", count: 1 },
      { role: "MAFIA", count: 1 },
      { role: "SHERIFF", count: 1 },
      { role: "DOCTOR", count: 1 },
    ],
    randomSlots: 1,
  },
  {
    id: "8-9", minP: 8, maxP: 9,
    fixed: [
      { role: "DON", count: 1 },
      { role: "MAFIA", count: 2 },
      { role: "SHERIFF", count: 1 },
      { role: "DOCTOR", count: 1 },
    ],
    randomSlots: 2,
  },
  {
    id: "10-12", minP: 10, maxP: 12,
    fixed: [
      { role: "DON", count: 1 },
      { role: "MAFIA", count: 2 },
      { role: "SHERIFF", count: 1 },
      { role: "DOCTOR", count: 1 },
    ],
    randomSlots: 4,
  },
  {
    id: "13-16", minP: 13, maxP: 16,
    fixed: [
      { role: "DON", count: 1 },
      { role: "MAFIA", count: 3 },
      { role: "SHERIFF", count: 1 },
      { role: "DOCTOR", count: 1 },
    ],
    randomSlots: 5,
  },
  {
    id: "17-20", minP: 17, maxP: 20,
    fixed: [
      { role: "DON", count: 1 },
      { role: "MAFIA", count: 4 },
      { role: "SHERIFF", count: 1 },
      { role: "DOCTOR", count: 1 },
    ],
    randomSlots: 7,
  },
  {
    id: "21-25", minP: 21, maxP: 25,
    fixed: [
      { role: "DON", count: 1 },
      { role: "MAFIA", count: 5 },
      { role: "SHERIFF", count: 1 },
      { role: "DOCTOR", count: 1 },
    ],
    randomSlots: 9,
  },
  {
    id: "26-30", minP: 26, maxP: 30,
    fixed: [
      { role: "DON", count: 1 },
      { role: "MAFIA", count: 6 },
      { role: "SHERIFF", count: 1 },
      { role: "DOCTOR", count: 1 },
    ],
    randomSlots: 11,
  },
];

export function findBracketForCount(playerCount: number, brackets: RoleBracket[]): RoleBracket {
  for (const b of brackets) {
    if (playerCount >= b.minP && playerCount <= b.maxP) return b;
  }
  // Eng yaqini — maxP ga ko'ra
  if (playerCount < brackets[0].minP) return brackets[0];
  return brackets[brackets.length - 1];
}
