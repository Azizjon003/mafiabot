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

  // Daraja oshirish — keraksiz ballarni ayirib oladi
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

  async rename(userId: number, name: string) {
    return prisma.hero.update({
      where: { userId },
      data: { name },
    });
  },

  async refreshProtection(userId: number) {
    return prisma.hero.update({
      where: { userId },
      data: { protection: 100 },
    });
  },

  async addCharge(userId: number, amount: number) {
    return prisma.hero.update({
      where: { userId },
      data: { charge: { increment: amount } },
    });
  },
};
