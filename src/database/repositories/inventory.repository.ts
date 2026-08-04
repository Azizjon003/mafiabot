import { Role } from "@prisma/client";
import { prisma } from "../prisma";

export const inventoryRepo = {
  // Shield
  async addShield(userId: number, count: number = 1) {
    return prisma.user.update({
      where: { id: userId },
      data: { shieldCount: { increment: count } },
    });
  },

  async consumeShield(userId: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { shieldCount: { decrement: 1 } },
    });
  },

  // Snayper o'qi
  async addBullet(userId: number, count: number = 1) {
    return prisma.user.update({
      where: { id: userId },
      data: { bulletCount: { increment: count } },
    });
  },

  // Document
  async addDocument(userId: number, count: number = 1) {
    return prisma.user.update({
      where: { id: userId },
      data: { documentCount: { increment: count } },
    });
  },

  async consumeDocument(userId: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { documentCount: { decrement: 1 } },
    });
  },

  // Active role
  async setActiveRole(userId: number, role: Role | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { activeRole: role },
    });
  },

  // Use flags (keyingi o'yinda foydalanish)
  async setUseFlag(userId: number, flag: "shield" | "document" | "bullet" | "activeRole" | "hero" | "premiumEmoji", value: boolean) {
    const fieldMap = {
      shield: "useShieldNextGame",
      document: "useDocumentNextGame",
      bullet: "useBulletNextGame",
      activeRole: "useActiveRoleNextGame",
      hero: "useHeroNextGame",
      premiumEmoji: "usePremiumEmoji",
    };
    return prisma.user.update({
      where: { id: userId },
      data: { [fieldMap[flag]]: value },
    });
  },

  // O'yin boshlanganda barcha flag'larni false'ga qaytarish
  async resetUseFlags(userId: number) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        useShieldNextGame: false,
        useDocumentNextGame: false,
        useBulletNextGame: false,
        useActiveRoleNextGame: false,
        useHeroNextGame: false,
      },
    });
  },
};
