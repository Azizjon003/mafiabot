import { GameEngine } from "./engine";
import { PlayerState } from "../types";
import { gameRepo } from "../database/repositories/game.repository";
import { playerRepo } from "../database/repositories/player.repository";
import { chatRepo } from "../database/repositories/chat.repository";
import { userRepo } from "../database/repositories/user.repository";
import { inventoryService } from "../services/inventory.service";
import { logger } from "../utils/logger";

class GameManager {
  // chatTelegramId -> GameEngine
  private activeGames: Map<string, GameEngine> = new Map();

  getGame(chatTelegramId: bigint): GameEngine | undefined {
    return this.activeGames.get(chatTelegramId.toString());
  }

  hasGame(chatTelegramId: bigint): boolean {
    return this.activeGames.has(chatTelegramId.toString());
  }

  async createGame(chatTelegramId: bigint, chatTitle?: string): Promise<GameEngine> {
    if (this.hasGame(chatTelegramId)) {
      throw new Error("Bu guruhda allaqachon o'yin mavjud!");
    }

    // Chat va settings yaratish/olish
    const chat = await chatRepo.findOrCreate(
      chatTelegramId,
      chatTitle,
      "supergroup"
    );
    const settings = await chatRepo.getSettings(chat.id);

    // DB'da o'yin yaratish
    const game = await gameRepo.create(chat.id);

    // Engine yaratish
    const engine = new GameEngine(game.id, chat.id, chatTelegramId, settings);
    this.activeGames.set(chatTelegramId.toString(), engine);

    logger.info({ gameId: game.id, chatId: chatTelegramId.toString() }, "Yangi o'yin yaratildi");
    return engine;
  }

  async addPlayerToGame(
    chatTelegramId: bigint,
    telegramId: bigint,
    firstName: string,
    username?: string
  ): Promise<PlayerState | null> {
    const engine = this.getGame(chatTelegramId);
    if (!engine) return null;

    // User yaratish/olish
    const user = await userRepo.findOrCreate(telegramId, firstName, username);

    // Allaqachon SHU o'yindami
    if (engine.getPlayerByTelegramId(telegramId)) return null;

    // Boshqa guruhda o'yindami (cross-game tekshiruv)
    if (this.isPlayerInAnyGame(telegramId)) return null;

    // Max players tekshirish
    if (engine.getPlayerCount() >= engine.settings.maxPlayers) return null;

    // DB'ga qo'shish
    const player = await playerRepo.addToGame(engine.gameId, user.id);

    // Yangi inventory tizimi — flag bo'lsa shield/document/activeRole/hero ishlatiladi
    const used = await inventoryService.consumeForGame(user.id);

    if (used.activeRole || used.shieldUsed || used.documentUsed || used.heroUsed) {
      logger.info(
        {
          userId: user.id,
          firstName,
          used,
        },
        "Inventory consumed for game"
      );
    }

    if (used.shieldUsed) {
      await playerRepo.activateShield(player.id, 1); // 1 marta saqlaydi
    }

    const state: PlayerState = {
      playerId: player.id,
      userId: user.id,
      telegramId,
      firstName,
      username,
      role: "CIVILIAN",
      isAlive: true,
      isBlocked: false,
      isProtectedByLawyer: false,
      isProtectedByWarlock: false,
      isHealedByDoctor: false,
      doctorSelfHealUsed: false,
      hasHeroActive: used.heroUsed,
      hasShieldActive: used.shieldUsed,
      shieldCharges: used.shieldUsed ? 1 : 0,
      hasDocumentActive: used.documentUsed,
      preferredRole: used.activeRole ?? undefined,
    };

    engine.addPlayer(state);
    return state;
  }

  async removePlayerFromGame(
    chatTelegramId: bigint,
    telegramId: bigint
  ): Promise<boolean> {
    const engine = this.getGame(chatTelegramId);
    if (!engine) return false;

    const player = engine.getPlayerByTelegramId(telegramId);
    if (!player) return false;

    await playerRepo.removeFromGame(engine.gameId, player.userId);
    engine.removePlayer(player.playerId);
    return true;
  }

  async endGame(chatTelegramId: bigint): Promise<void> {
    const engine = this.getGame(chatTelegramId);
    if (engine) {
      engine.clearTimer();
      this.activeGames.delete(chatTelegramId.toString());
      logger.info({ chatId: chatTelegramId.toString() }, "O'yin tugadi");
    }
  }

  isPlayerInAnyGame(telegramId: bigint): boolean {
    for (const game of this.activeGames.values()) {
      if (game.getPlayerByTelegramId(telegramId)) return true;
    }
    return false;
  }

  getActiveGameCount(): number {
    return this.activeGames.size;
  }

  getAllGames(): IterableIterator<GameEngine> {
    return this.activeGames.values();
  }
}

// Singleton
export const gameManager = new GameManager();
