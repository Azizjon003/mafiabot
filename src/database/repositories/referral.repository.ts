import { prisma } from "../prisma";

export const referralRepo = {
  // invitedId @unique — bir odam faqat bir marta taklif qilinadi.
  // Poyga bo'lsa (ikki /start bir vaqtda) — ikkinchisi xatolik beradi, uni yutamiz.
  async create(referrerId: number, invitedId: number) {
    try {
      return await prisma.referral.create({ data: { referrerId, invitedId } });
    } catch {
      return null;
    }
  },

  async findByInvited(invitedId: number) {
    return prisma.referral.findUnique({ where: { invitedId } });
  },

  // Taklif qilingan odamning maqsadli guruhdagi o'yinini sanaymiz.
  // FAQAT PENDING holatdagini oshiradi — mukofot berilgach boshqa oshmaydi.
  async countGame(invitedId: number): Promise<{ id: number; referrerId: number; gamesPlayed: number } | null> {
    const res = await prisma.referral.updateMany({
      where: { invitedId, status: "PENDING" },
      data: { gamesPlayed: { increment: 1 } },
    });
    if (res.count === 0) return null;
    const row = await prisma.referral.findUnique({ where: { invitedId } });
    return row ? { id: row.id, referrerId: row.referrerId, gamesPlayed: row.gamesPlayed } : null;
  },

  // Mukofotni "band qilish" — shartli update, ikki marta to'lanmaydi
  async claimReward(id: number, amount: number, currency: string): Promise<boolean> {
    const res = await prisma.referral.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "REWARDED", rewardAmount: amount, rewardCurrency: currency, rewardedAt: new Date() },
    });
    return res.count === 1;
  },

  async countRewarded(referrerId: number): Promise<number> {
    return prisma.referral.count({ where: { referrerId, status: "REWARDED" } });
  },

  async statsFor(referrerId: number) {
    const [pending, rewarded] = await Promise.all([
      prisma.referral.count({ where: { referrerId, status: "PENDING" } }),
      prisma.referral.count({ where: { referrerId, status: "REWARDED" } }),
    ]);
    return { pending, rewarded };
  },

  async topReferrers(limit = 10) {
    const rows = await prisma.referral.groupBy({
      by: ["referrerId"],
      where: { status: "REWARDED" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.referrerId) } },
      select: { id: true, firstName: true, telegramId: true },
    });
    return rows
      .map((r) => ({ user: users.find((u) => u.id === r.referrerId), count: r._count.id }))
      .filter((r): r is { user: NonNullable<typeof users[number]>; count: number } => !!r.user);
  },

  async totalStats() {
    const [pending, rewarded] = await Promise.all([
      prisma.referral.count({ where: { status: "PENDING" } }),
      prisma.referral.count({ where: { status: "REWARDED" } }),
    ]);
    return { pending, rewarded };
  },
};

export const referralChatRepo = {
  async listTargets() {
    return prisma.chat.findMany({
      where: { isReferralTarget: true },
      select: { id: true, telegramId: true, title: true, inviteLink: true },
    });
  },

  async setInviteLink(chatId: number, link: string | null) {
    return prisma.chat.update({ where: { id: chatId }, data: { inviteLink: link } });
  },

  async byId(chatId: number) {
    return prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, telegramId: true, title: true, inviteLink: true, isReferralTarget: true },
    });
  },

  async isTarget(telegramId: bigint): Promise<boolean> {
    const chat = await prisma.chat.findUnique({
      where: { telegramId },
      select: { isReferralTarget: true },
    });
    return chat?.isReferralTarget ?? false;
  },

  async toggle(chatId: number): Promise<boolean> {
    const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { isReferralTarget: true } });
    if (!chat) return false;
    const next = !chat.isReferralTarget;
    await prisma.chat.update({ where: { id: chatId }, data: { isReferralTarget: next } });
    return next;
  },
};
