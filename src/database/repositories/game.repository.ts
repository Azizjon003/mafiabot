import { GameStatus, Phase, Role, ActionType, DeathCause, Winner } from "@prisma/client";
import { prisma } from "../prisma";

export const gameRepo = {
  async create(chatId: number) {
    return prisma.game.create({
      data: { chatId },
      include: { players: { include: { user: true } } },
    });
  },

  async findActiveByChat(chatId: number) {
    return prisma.game.findFirst({
      where: {
        chatId,
        status: { notIn: ["FINISHED", "CANCELLED"] },
      },
      include: {
        players: { include: { user: true } },
        rounds: { include: { actions: true } },
      },
    });
  },

  async updateStatus(gameId: number, status: GameStatus) {
    return prisma.game.update({
      where: { id: gameId },
      data: {
        status,
        ...(status === "NIGHT" || status === "STARTING"
          ? { startedAt: new Date() }
          : {}),
        ...(status === "FINISHED" || status === "CANCELLED"
          ? { endedAt: new Date() }
          : {}),
      },
    });
  },

  async setWinner(gameId: number, winner: Winner) {
    return prisma.game.update({
      where: { id: gameId },
      data: { winner, status: "FINISHED", endedAt: new Date() },
    });
  },

  async incrementRound(gameId: number) {
    return prisma.game.update({
      where: { id: gameId },
      data: { roundCount: { increment: 1 } },
    });
  },
};
