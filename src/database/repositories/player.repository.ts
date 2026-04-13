import { DeathCause, Role } from "@prisma/client";
import { prisma } from "../prisma";

export const playerRepo = {
  async addToGame(gameId: number, userId: number) {
    return prisma.player.create({
      data: { gameId, userId },
      include: { user: true },
    });
  },

  async removeFromGame(gameId: number, userId: number) {
    return prisma.player.delete({
      where: { gameId_userId: { gameId, userId } },
    });
  },

  async assignRole(playerId: number, role: Role) {
    return prisma.player.update({
      where: { id: playerId },
      data: { role },
    });
  },

  async kill(playerId: number, roundNum: number, cause: DeathCause) {
    return prisma.player.update({
      where: { id: playerId },
      data: { isAlive: false, deathRound: roundNum, deathCause: cause },
    });
  },

  async activateShield(playerId: number, charges: number) {
    return prisma.player.update({
      where: { id: playerId },
      data: { hasShieldActive: true, shieldCharges: charges },
    });
  },

  async consumeShieldCharge(playerId: number, remaining: number) {
    return prisma.player.update({
      where: { id: playerId },
      data: {
        shieldCharges: remaining,
        hasShieldActive: remaining > 0,
      },
    });
  },

  async changeRole(playerId: number, newRole: Role) {
    return prisma.player.update({
      where: { id: playerId },
      data: { role: newRole },
    });
  },

  async getAlivePlayers(gameId: number) {
    return prisma.player.findMany({
      where: { gameId, isAlive: true },
      include: { user: true },
    });
  },

  async getPlayersByGame(gameId: number) {
    return prisma.player.findMany({
      where: { gameId },
      include: { user: true },
    });
  },

  async findByGameAndUser(gameId: number, userId: number) {
    return prisma.player.findUnique({
      where: { gameId_userId: { gameId, userId } },
      include: { user: true },
    });
  },
};
