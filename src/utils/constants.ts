import { Role } from "@prisma/client";

// Jamoa turlari
export enum Team {
  TOWN = "TOWN",
  MAFIA = "MAFIA",
  SOLO = "SOLO",
  NEUTRAL = "NEUTRAL", // Sotqin boshlang'ich holati
}

// Rol -> Jamoa mapping
export const ROLE_TEAM: Record<Role, Team> = {
  CIVILIAN: Team.TOWN,
  DOCTOR: Team.TOWN,
  TRAMP: Team.TOWN,
  SHERIFF: Team.TOWN,
  KAMIKAZE: Team.TOWN,
  HOOKER: Team.TOWN,
  SERGEANT: Team.TOWN,
  WARLOCK: Team.TOWN,
  SANTA: Team.TOWN,
  SNOWBOY: Team.TOWN,
  DON: Team.MAFIA,
  MAFIA: Team.MAFIA,
  LAWYER: Team.MAFIA,
  SPY: Team.MAFIA,
  LAB: Team.MAFIA,
  KILLER: Team.SOLO,
  MINER: Team.SOLO,
  SNIPER: Team.SOLO,
  ARCHER: Team.SOLO,
  TRAITOR: Team.NEUTRAL,
  ROBBER: Team.SOLO,
  PROFESSOR: Team.SOLO,
};

// Rol emoji
export const ROLE_EMOJI: Record<Role, string> = {
  CIVILIAN: "👨🏼",
  DOCTOR: "👨🏼‍⚕️",
  TRAMP: "🧙🏼‍♂️",
  SHERIFF: "🕵🏻‍♂",
  KAMIKAZE: "💣",
  HOOKER: "💃",
  SERGEANT: "👮🏻‍♂",
  WARLOCK: "⚡️",
  SANTA: "🎅🏻",
  SNOWBOY: "⛄️",
  DON: "🤵🏻",
  MAFIA: "🤵🏼",
  LAWYER: "👨🏼‍💼",
  SPY: "🦇",
  LAB: "👨‍🔬",
  KILLER: "🔪",
  MINER: "☠️",
  SNIPER: "👨🏻‍🎤",
  ARCHER: "🏹",
  TRAITOR: "🦎",
  ROBBER: "👺",
  PROFESSOR: "🎩",
};

// Rol nomi (uz)
export const ROLE_NAME: Record<Role, string> = {
  CIVILIAN: "Tinch axoli",
  DOCTOR: "Shifokor",
  TRAMP: "Daydi",
  SHERIFF: "Komissar",
  KAMIKAZE: "Kamikaze",
  HOOKER: "Kezuvchi",
  SERGEANT: "Serjant",
  WARLOCK: "Koldun",
  SANTA: "Qorbobo",
  SNOWBOY: "Qorbola",
  DON: "Don",
  MAFIA: "Mafiya",
  LAWYER: "Advokat",
  SPY: "Ayg'oqchi",
  LAB: "Labarant",
  KILLER: "Qotil",
  MINER: "Minior",
  SNIPER: "Snayperchi",
  ARCHER: "Kamonchi",
  TRAITOR: "Sotqin",
  ROBBER: "Qaroqchi",
  PROFESSOR: "Professor",
};

// Tunda harakat qiladigan rollar
export const NIGHT_ACTIVE_ROLES: Role[] = [
  "HOOKER",
  "TRAITOR",
  "LAWYER",
  "SPY",
  "DON",
  "MAFIA",
  "LAB",
  "SHERIFF",
  "SERGEANT",
  "DOCTOR",
  "WARLOCK",
  "TRAMP",
  "KILLER",
  "SNIPER",
  "ARCHER",
  "MINER",
  "SNOWBOY",
  "SANTA",
  "ROBBER",
  "PROFESSOR",
];

// Mafiya jamoasi rollari
export const MAFIA_ROLES: Role[] = ["DON", "MAFIA", "LAWYER", "SPY", "LAB"];

// Mafiya ovoz beradigan rollar (o'ldirish uchun)
export const MAFIA_KILL_VOTERS: Role[] = ["DON", "MAFIA"];
