import "dotenv/config";
import fs from "fs";
import path from "path";

// Bosh admin ID lari (.env: OWNER_IDS="12345,67890")
const ownerIdsRaw = process.env.OWNER_IDS || "";
const OWNER_IDS = ownerIdsRaw.split(",").map((s) => s.trim()).filter(Boolean).map((s) => BigInt(s));

export function isOwner(telegramId: bigint): boolean {
  return OWNER_IDS.includes(telegramId);
}

export const config = {
  botToken: process.env.BOT_TOKEN!,
  databaseUrl: process.env.DATABASE_URL!,
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  ownerIds: OWNER_IDS,

  // O'yin default vaqtlari (sekundlarda)
  defaults: {
    registrationTimeout: 60,
    nightTimeout: 30,
    dayDiscussionTimeout: 30,
    votingTimeout: 30,
    minPlayers: 4,
    maxPlayers: 30,
  },
} as const;

// Bot username (runtime da o'rnatiladi)
export let botUsername = "";
export function setBotUsername(username: string) {
  botUsername = username;
}

if (!config.botToken) {
  throw new Error("BOT_TOKEN muhit o'zgaruvchisi topilmadi!");
}

// Faza rasmlari file_id lari
const PHOTO_CONFIG_PATH = path.join(process.cwd(), "assets", "photos.json");

export interface PhasePhotos {
  night?: string;
  day?: string;
}

export function getPhasePhotos(): PhasePhotos {
  try {
    const data = fs.readFileSync(PHOTO_CONFIG_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function setPhasePhoto(phase: "night" | "day", fileId: string): void {
  const photos = getPhasePhotos();
  photos[phase] = fileId;
  fs.mkdirSync(path.dirname(PHOTO_CONFIG_PATH), { recursive: true });
  fs.writeFileSync(PHOTO_CONFIG_PATH, JSON.stringify(photos, null, 2));
}
