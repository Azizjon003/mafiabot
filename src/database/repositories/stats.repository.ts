import { Role } from "@prisma/client";
import { prisma } from "../prisma";

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

  // Date range top (kunlik, haftalik, oylik)
  async getTopByDateRange(days: number, limit: number = 10) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // O'sha davrda o'yin o'ynagan o'yinchilarni topish
    const result = await prisma.player.groupBy({
      by: ["userId"],
      where: {
        game: {
          status: "FINISHED",
          endedAt: { gte: since },
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
