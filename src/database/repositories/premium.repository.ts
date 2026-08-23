import { prisma } from "../prisma";

// Premium guruhlar — admin /admin → ⭐️ Premium guruhlar bo'limida belgilaydi.
// Havola uchun Chat.inviteLink ishlatiladi (referral guruhlari bilan umumiy maydon).
export const premiumChatRepo = {
  // Foydalanuvchiga ko'rsatiladigan ro'yxat
  async listPremium() {
    return prisma.chat.findMany({
      where: { isPremium: true },
      orderBy: { title: "asc" },
      select: { id: true, telegramId: true, title: true, inviteLink: true },
    });
  },

  async byId(chatId: number) {
    return prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, telegramId: true, title: true, inviteLink: true, isPremium: true },
    });
  },

  async toggle(chatId: number): Promise<boolean> {
    const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { isPremium: true } });
    if (!chat) return false;
    const next = !chat.isPremium;
    await prisma.chat.update({ where: { id: chatId }, data: { isPremium: next } });
    return next;
  },

  async setInviteLink(chatId: number, link: string | null) {
    return prisma.chat.update({ where: { id: chatId }, data: { inviteLink: link } });
  },
};
