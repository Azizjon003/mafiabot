import { Role } from "@prisma/client";
import { prisma } from "../prisma";
import { MAFIA_ROLES, ROLE_TEAM, SOLO_ROLES, Team } from "../../utils/constants";

// Role -> UserStats field mapping
const roleFieldMap: Record<Role, string> = {
  CIVILIAN: "timesCivilian",
  DOCTOR: "timesDoctor",
  TRAMP: "timesTramp",
  SHERIFF: "timesSheriff",
  KAMIKAZE: "timesKamikaze",
  HOOKER: "timesHooker",
  SERGEANT: "timesSergeant",
  WARLOCK: "timesWarlock",
  SANTA: "timesSanta",
  SNOWBOY: "timesSnowboy",
  CUPID: "timesCupid",
  BARMEN: "timesBarmen",
  BODYGUARD: "timesBodyguard",
  HUNTER: "timesHunter",
  ORACLE: "timesOracle",
  FRAMER: "timesFramer",
  DON: "timesDon",
  MAFIA: "timesMafia",
  LAWYER: "timesLawyer",
  SPY: "timesSpy",
  LAB: "timesLab",
  KILLER: "timesKiller",
  MINER: "timesMiner",
  SNIPER: "timesSniper",
  ARCHER: "timesArcher",
  TRAITOR: "timesTraitor",
  ROBBER: "timesRobber",
  PROFESSOR: "timesProfessor",
};

// Race condition himoyasi — userId bo'yicha lock
const pendingEnsure = new Map<number, Promise<void>>();

async function ensureStats(userId: number): Promise<void> {
  // Agar shu userId uchun allaqachon yaratish jarayoni bo'lsa — kutamiz
  const existing = pendingEnsure.get(userId);
  if (existing) {
    await existing;
    return;
  }

  const promise = (async () => {
    const stats = await prisma.userStats.findUnique({ where: { userId } });
    if (!stats) {
      try {
        await prisma.userStats.create({ data: { userId } });
      } catch {
        // Unique constraint — boshqa process allaqachon yaratgan, OK
      }
    }
  })();

  pendingEnsure.set(userId, promise);
  try {
    await promise;
  } finally {
    pendingEnsure.delete(userId);
  }
}

export const statsRepo = {
  async getOrCreate(userId: number) {
    await ensureStats(userId);
    return prisma.userStats.findUnique({ where: { userId } }) as any;
  },

  async findByUserId(userId: number) {
    await ensureStats(userId);
    return prisma.userStats.findUnique({ where: { userId } }) as any;
  },

  // Foydalanuvchi yutishlar sonini olish
  async getWinCount(userId: number): Promise<number> {
    await ensureStats(userId);
    const stats = await prisma.userStats.findUnique({ where: { userId } });
    return stats?.gamesWon || 0;
  },

  // O'yin tugaganda — barcha stat yangilanishlarni bitta upsert bilan
  async recordGameAndRating(userId: number, role: Role, won: boolean, ratingChange: number) {
    await ensureStats(userId);
    const field = roleFieldMap[role];
    const stats = await prisma.userStats.findUnique({ where: { userId } });
    if (!stats) return;

    const newWinStreak = won ? stats.winStreak + 1 : 0;
    const newMaxWinStreak = Math.max(stats.maxWinStreak, newWinStreak);

    return prisma.userStats.update({
      where: { userId },
      data: {
        gamesPlayed: { increment: 1 },
        ...(won ? { gamesWon: { increment: 1 } } : { gamesLost: { increment: 1 } }),
        [field]: { increment: 1 },
        winStreak: newWinStreak,
        maxWinStreak: newMaxWinStreak,
        rating: { increment: ratingChange },
      },
    });
  },

  async addRating(userId: number, amount: number) {
    await ensureStats(userId);
    return prisma.userStats.update({
      where: { userId },
      data: { rating: { increment: amount } },
    });
  },

  async incrementKills(userId: number) {
    await ensureStats(userId);
    return prisma.userStats.update({
      where: { userId },
      data: { killCount: { increment: 1 } },
    });
  },

  async incrementSaves(userId: number) {
    await ensureStats(userId);
    return prisma.userStats.update({
      where: { userId },
      data: { savedCount: { increment: 1 } },
    });
  },

  async incrementChecks(userId: number) {
    await ensureStats(userId);
    return prisma.userStats.update({
      where: { userId },
      data: { correctChecks: { increment: 1 } },
    });
  },

  async getTopPlayers(limit: number = 10) {
    return prisma.userStats.findMany({
      orderBy: { rating: "desc" },
      take: limit,
      include: { user: true },
    });
  },

  // Date range top (kunlik, haftalik, oylik).
  // chatTelegramId berilsa — faqat SHU guruhda o'ynalgan o'yinlar hisoblanadi
  // (guruhda /top yozilganda global emas, guruhning o'z reytingi chiqishi uchun).
  async getTopByDateRange(days: number, limit: number = 10, chatTelegramId?: bigint) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // O'sha davrda o'yin o'ynagan o'yinchilarni topish
    const result = await prisma.player.groupBy({
      by: ["userId"],
      where: {
        game: {
          status: "FINISHED",
          endedAt: { gte: since },
          ...(chatTelegramId !== undefined ? { chat: { telegramId: chatTelegramId } } : {}),
        },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    // User ma'lumotlarini olish
    const userIds = result.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { stats: true },
    });

    return result.map((r) => {
      const user = users.find((u) => u.id === r.userId);
      return { user: user!, gamesInPeriod: r._count.id };
    });
  },

  // Guruhning UMUMIY (butun tarix) reytingi — faqat shu guruhdagi tugagan o'yinlar.
  // Player jadvalida "yutdi" belgisi yo'q, shuning uchun g'alaba Game.winner + rol jamoasi
  // bo'yicha hisoblanadi (SOLO g'olib — tirik qolgan yakka rol).
  async getTopAllTimeByChat(chatTelegramId: bigint, limit: number = 10) {
    const rows = await prisma.player.findMany({
      where: { game: { status: "FINISHED", chat: { telegramId: chatTelegramId } } },
      select: { userId: true, role: true, isAlive: true, game: { select: { winner: true } } },
    });
    if (rows.length === 0) return [];

    const agg = new Map<number, { games: number; wins: number }>();
    for (const r of rows) {
      const a = agg.get(r.userId) ?? { games: 0, wins: 0 };
      a.games++;
      if (r.role && r.game.winner) {
        const team = ROLE_TEAM[r.role];
        const won =
          (r.game.winner === "TOWN" && team === Team.TOWN) ||
          (r.game.winner === "MAFIA" && MAFIA_ROLES.includes(r.role)) ||
          (r.game.winner === "SOLO" && SOLO_ROLES.includes(r.role) && r.isAlive);
        if (won) a.wins++;
      }
      agg.set(r.userId, a);
    }

    const sorted = [...agg.entries()]
      .sort((x, y) => y[1].wins - x[1].wins || y[1].games - x[1].games)
      .slice(0, limit);
    const users = await prisma.user.findMany({
      where: { id: { in: sorted.map(([id]) => id) } },
      include: { stats: true },
    });
    return sorted
      .map(([userId, a]) => {
        const user = users.find((u) => u.id === userId);
        return user ? { user, gamesInChat: a.games, winsInChat: a.wins } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  },

  getRank(rating: number): string {
    if (rating >= 2000) return "Krestnyy otets";
    if (rating >= 1800) return "Don";
    if (rating >= 1600) return "Avtoritet";
    if (rating >= 1400) return "Katta aka";
    if (rating >= 1200) return "Tajribali fuqaro";
    if (rating >= 1000) return "Oddiy fuqaro";
    return "Yangi fuqaro";
  },
};
