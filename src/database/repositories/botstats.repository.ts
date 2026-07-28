import { prisma } from "../prisma";

// Bosh admin paneli uchun umumiy bot statistikasi.
// "Aktiv" o'lchovi — DB'da faqat o'yin ishtiroki saqlanadi, shuning uchun aktivlik
// "shu davrda o'yinda qatnashgan" degani (guruh uchun — "shu davrda o'yin bo'lgan").

export interface BotOverview {
  users: {
    total: number;
    activeDay: number;   // oxirgi 24 soatda o'yin o'ynagan
    activeWeek: number;  // oxirgi 7 kun
    activeMonth: number; // oxirgi 30 kun
    newDay: number;      // oxirgi 24 soatda qo'shilgan
    newWeek: number;
    banned: number;
    vip: number;
    withHero: number;
  };
  chats: {
    total: number;       // bot qo'shilgan guruhlar
    withGames: number;   // kamida 1 ta o'yin bo'lgan
    activeDay: number;
    activeWeek: number;
    activeMonth: number;
  };
  games: {
    total: number;
    finished: number;
    running: number;     // hozir davom etayotgan
    day: number;
    week: number;
  };
}

export interface GroupRow {
  id: number;
  telegramId: bigint;
  title: string | null;
  isActive: boolean;
  createdAt: Date;
  games: number;         // jami o'yinlar
  gamesMonth: number;    // oxirgi 30 kundagi o'yinlar
  players: number;       // oxirgi 30 kunda o'ynagan noyob o'yinchilar
  lastGameAt: Date | null;
}

export type GroupSortBy = "games" | "recent" | "new";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// Postgres COUNT() bigint qaytaradi — JSON/format uchun number'ga o'tkazamiz
function num(v: unknown): number {
  return typeof v === "bigint" ? Number(v) : Number(v ?? 0);
}

export const botStatsRepo = {
  async overview(): Promise<BotOverview> {
    const day = daysAgo(1);
    const week = daysAgo(7);
    const month = daysAgo(30);

    // Noyob o'yinchilar soni — groupBy qatorlar sonini beradi
    const activeUsers = async (since: Date) =>
      (await prisma.player.groupBy({
        by: ["userId"],
        where: { game: { createdAt: { gte: since } } },
      })).length;

    const activeChats = async (since: Date) =>
      (await prisma.game.groupBy({
        by: ["chatId"],
        where: { createdAt: { gte: since } },
      })).length;

    const [
      usersTotal, newDay, newWeek, banned, vip, withHero,
      chatsTotal, gamesTotal, gamesFinished, gamesRunning, gamesDay, gamesWeek,
      activeDay, activeWeek, activeMonth,
      chatsDay, chatsWeek, chatsMonth, chatsWithGames,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: day } } }),
      prisma.user.count({ where: { createdAt: { gte: week } } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { isVip: true } }),
      prisma.hero.count(),
      prisma.chat.count(),
      prisma.game.count(),
      prisma.game.count({ where: { status: "FINISHED" } }),
      prisma.game.count({ where: { status: { notIn: ["FINISHED", "CANCELLED"] } } }),
      prisma.game.count({ where: { createdAt: { gte: day } } }),
      prisma.game.count({ where: { createdAt: { gte: week } } }),
      activeUsers(day),
      activeUsers(week),
      activeUsers(month),
      activeChats(day),
      activeChats(week),
      activeChats(month),
      prisma.game.groupBy({ by: ["chatId"] }).then((r) => r.length),
    ]);

    return {
      users: {
        total: usersTotal,
        activeDay, activeWeek, activeMonth,
        newDay, newWeek,
        banned, vip, withHero,
      },
      chats: {
        total: chatsTotal,
        withGames: chatsWithGames,
        activeDay: chatsDay,
        activeWeek: chatsWeek,
        activeMonth: chatsMonth,
      },
      games: {
        total: gamesTotal,
        finished: gamesFinished,
        running: gamesRunning,
        day: gamesDay,
        week: gamesWeek,
      },
    };
  },

  // Guruhlar ro'yxati (sahifalangan). Bitta so'rovda o'yin/o'yinchi statistikasi ham yig'iladi.
  async groups(
    page: number,
    perPage: number,
    sortBy: GroupSortBy = "games"
  ): Promise<{ total: number; rows: GroupRow[] }> {
    const total = await prisma.chat.count();
    const month = daysAgo(30);
    const skip = Math.max(0, page) * perPage;

    const orderSql =
      sortBy === "recent"
        ? `MAX(g."createdAt") DESC NULLS LAST`
        : sortBy === "new"
        ? `c."createdAt" DESC`
        : `COUNT(DISTINCT g.id) DESC, MAX(g."createdAt") DESC NULLS LAST`;

    // $queryRawUnsafe — faqat orderSql o'zgaruvchi, u yopiq ro'yxatdan (foydalanuvchi kiritmaydi).
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        c.id,
        c."telegramId",
        c.title,
        c."isActive",
        c."createdAt",
        COUNT(DISTINCT g.id) AS games,
        COUNT(DISTINCT g.id) FILTER (WHERE g."createdAt" >= $1) AS games_month,
        COUNT(DISTINCT p."userId") FILTER (WHERE g."createdAt" >= $1) AS players,
        MAX(g."createdAt") AS last_game_at
      FROM "Chat" c
      LEFT JOIN "Game" g ON g."chatId" = c.id
      LEFT JOIN "Player" p ON p."gameId" = g.id
      GROUP BY c.id
      ORDER BY ${orderSql}
      LIMIT $2 OFFSET $3
      `,
      month,
      perPage,
      skip
    );

    return {
      total,
      rows: rows.map((r) => ({
        id: num(r.id),
        telegramId: BigInt(r.telegramId),
        title: r.title,
        isActive: Boolean(r.isActive),
        createdAt: new Date(r.createdAt),
        games: num(r.games),
        gamesMonth: num(r.games_month),
        players: num(r.players),
        lastGameAt: r.last_game_at ? new Date(r.last_game_at) : null,
      })),
    };
  },
};
