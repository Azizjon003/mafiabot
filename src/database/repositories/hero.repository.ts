import { prisma } from "../prisma";

export const heroRepo = {
  async findByUser(userId: number) {
    return prisma.hero.findUnique({ where: { userId } });
  },

  async create(userId: number, name: string = "Qahramon") {
    return prisma.hero.create({ data: { userId, name } });
  },

  async addPoints(userId: number, amount: number) {
    return prisma.hero.update({
      where: { userId },
      data: { points: { increment: amount } },
    });
  },

  // Daraja oshirish — keraksiz ballarni ayirib oladi (eski versiya)
  async levelUp(userId: number, pointsToConsume: number) {
    return prisma.hero.update({
      where: { userId },
      data: {
        level: { increment: 1 },
        powerMin: { increment: 5 },
        powerMax: { increment: 5 },
        points: { decrement: pointsToConsume },
      },
    });
  },

  // Daraja oshirish + scaling formulalari bilan
  async applyLevelUp(userId: number, pointsToConsume: number, powerMin: number, powerMax: number, maxProtection: number) {
    // Hozirgi himoya max'dan oshmasligi uchun
    const hero = await prisma.hero.findUnique({ where: { userId } });
    const currentProt = hero?.protection ?? 0;
    const newProtection = Math.min(currentProt, maxProtection);
    return prisma.hero.update({
      where: { userId },
      data: {
        level: { increment: 1 },
        powerMin,
        powerMax,
        protection: newProtection,
        points: { decrement: pointsToConsume },
      },
    });
  },

  async decrementCharge(userId: number, amount: number = 1) {
    return prisma.hero.update({
      where: { userId },
      data: { charge: { decrement: amount } },
    });
  },

  async decrementProtection(userId: number, amount: number) {
    const hero = await prisma.hero.findUnique({ where: { userId } });
    if (!hero) return null;
    const newProt = Math.max(0, hero.protection - amount);
    return prisma.hero.update({
      where: { userId },
      data: { protection: newProt },
    });
  },

  async rename(userId: number, name: string) {
    return prisma.hero.update({
      where: { userId },
      data: { name },
    });
  },

  async refreshProtection(userId: number, maxProtection: number) {
    return prisma.hero.update({
      where: { userId },
      data: { protection: maxProtection },
    });
  },

  async updateProtection(userId: number, protection: number) {
    return prisma.hero.update({
      where: { userId },
      data: { protection: Math.max(0, protection) },
    });
  },

  async addCharge(userId: number, amount: number) {
    return prisma.hero.update({
      where: { userId },
      data: { charge: { increment: amount } },
    });
  },
};
