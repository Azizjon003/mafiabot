import { Winner, Role } from "@prisma/client";
import { GameEngine } from "./engine";
import { PlayerState } from "../types";
import { gameManager } from "./manager";
import { NotificationService } from "../services/notification.service";
import { startRegistration, getRegistrationText } from "./phases/registration";
import { sendNightPrompts, sendNightStories } from "./phases/night";
import { startDayPhase } from "./phases/day";
import { startVotingPhase } from "./phases/voting";
import { joinGameKeyboard, kamikazeTargetKeyboard, confirmHangKeyboard } from "../keyboards/game";
import { uz } from "../locales/uz";
import { ROLE_EMOJI, ROLE_NAME } from "../utils/constants";
import { mention } from "../utils/helpers";
import { statsRepo } from "../database/repositories/stats.repository";
import { economyService } from "../services/economy.service";
import { heroService } from "../services/hero.service";
import { pricingService, rolePriceKey } from "../services/pricing.service";
import { prisma } from "../database/prisma";
import { botUsername } from "../config";
import { logger } from "../utils/logger";

// O'yin lifecycle boshqaruvchisi
export class GameController {
  private notifier: NotificationService;
  private registrationMessageId: Map<string, number> = new Map();
  private votingMessageId: Map<string, number> = new Map();
  private registrationTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private registrationTimeLeft: Map<string, number> = new Map();

  constructor(notifier: NotificationService) {
    this.notifier = notifier;
  }

  // ==================== REGISTRATION ====================

  async handleStartGame(chatTelegramId: bigint, chatTitle?: string): Promise<GameEngine> {
    const engine = await gameManager.createGame(chatTelegramId, chatTitle);
    const msgId = await startRegistration(engine, this.notifier);
    const chatKey = chatTelegramId.toString();

    if (msgId) {
      this.registrationMessageId.set(chatKey, msgId);
    }

    // Registration countdown timer
    this.registrationTimeLeft.set(chatKey, engine.settings.registrationTimeout);
    const interval = setInterval(async () => {
      const current = (this.registrationTimeLeft.get(chatKey) || 0) - 10;
      this.registrationTimeLeft.set(chatKey, current);
      if (current <= 0) {
        clearInterval(interval);
        this.registrationTimers.delete(chatKey);
        this.registrationTimeLeft.delete(chatKey);
        await this.handleRegistrationEnd(chatTelegramId);
        return;
      }
      // Xabarni yangilash
      const msgId = this.registrationMessageId.get(chatKey);
      if (msgId) {
        const text = getRegistrationText(engine, current);
        await this.notifier.editGroupMessage(
          chatTelegramId,
          msgId,
          text,
          joinGameKeyboard(engine.gameId, botUsername, engine.chatTelegramId)
        );
      }
    }, 10000);

    this.registrationTimers.set(chatKey, interval);
    return engine;
  }

  async handleRegistrationEnd(chatTelegramId: bigint): Promise<void> {
    const chatKey = chatTelegramId.toString();
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine || engine.status !== "WAITING") return;

    // Timer tozalash
    const timer = this.registrationTimers.get(chatKey);
    if (timer) {
      clearInterval(timer);
      this.registrationTimers.delete(chatKey);
    }
    this.registrationTimeLeft.delete(chatKey);

    if (engine.getPlayerCount() < engine.settings.minPlayers) {
      await this.notifier.sendToGroup(
        chatTelegramId,
        uz.game.notEnoughPlayers.replace("{min}", engine.settings.minPlayers.toString())
      );
      await engine.cancel();
      await gameManager.endGame(chatTelegramId);
      return;
    }

    // O'yinni boshlash
    await this.notifier.sendToGroup(chatTelegramId, uz.game.gameStarting);
    await engine.assignRoles();

    // Rolllarni yuborish
    for (const player of engine.players.values()) {
      await this.notifier.sendRoleToPlayer(player);
    }

    // Mafiya a'zolariga bir-birini ko'rsatish
    const mafiaMembers = engine.getMafiaMembers();
    if (mafiaMembers.length > 1) {
      await this.notifier.sendMafiaIntro(mafiaMembers);
    }

    // Kecha boshlash
    await this.startNightPhase(chatTelegramId);
  }

  // ==================== NIGHT ====================

  async startNightPhase(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine) return;

    await engine.startNight();

    // Tunda guruhni mute qilish
    if (engine.settings.muteOnNight) {
      await this.notifier.muteGroup(chatTelegramId);
    }

    // Tun rasmi
    await this.notifier.sendPhasePhoto(chatTelegramId, "night");

    await this.notifier.sendToGroup(
      chatTelegramId,
      uz.game.nightStarts.replace("{round}", engine.currentRound.toString())
    );

    // Har bir rolga shaxsiy chatda tundagi promptlarni yuborish
    await sendNightPrompts(engine, this.notifier);

    // Night timer
    engine.setTimer(engine.settings.nightTimeout * 1000, async () => {
      await this.handleNightEnd(chatTelegramId);
    });
  }

  async handleNightEnd(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine || engine.status !== "NIGHT") return;

    // Harakat qilmaganlarga xabar
    for (const player of engine.getAlivePlayers()) {
      if (engine.isNightActiveRole(player.role) && !engine.hasNightAction(player.role, player.playerId)) {
        this.notifier.sendToPlayer(player.telegramId, "⏰ Vaqt tugadi! Harakatingiz o'tkazib yuborildi.").catch(() => {});
      }
    }

    // Kecha natijalarini hisoblash
    const nightResult = engine.processNightActions();

    // Natijalarni e'lon qilish
    await this.notifier.announceNightResults(
      chatTelegramId,
      nightResult,
      engine.settings.showRoleOnDeath
    );

    // ROBBER_ROB — haqiqiy pul o'tkazish
    for (const event of nightResult.events) {
      if (event.type === "ROBBER_ROB" && event.targetId) {
        const actor = engine.getPlayer(event.actorId);
        const target = engine.getPlayer(event.targetId);
        if (actor && target) {
          await economyService.spendMoney(target.userId, 1000, "robbed").catch(() => false);
          await economyService.addMoney(actor.userId, 1000, "robber_rob").catch(() => {});
        }
      }
    }

    // Shaxsiy natijalarni yuborish
    for (const event of nightResult.events) {
      if (event.privateMessage) {
        const actor = engine.getPlayer(event.actorId);
        if (actor) {
          await this.notifier.sendToPlayer(actor.telegramId, event.privateMessage);
        }
      }
      if (event.targetPrivateMessage && event.targetId) {
        const target = engine.getPlayer(event.targetId);
        if (target) {
          await this.notifier.sendToPlayer(target.telegramId, event.targetPrivateMessage);
        }
      }
    }

    // G'olib tekshirish
    const winner = engine.checkWin();
    if (winner) {
      await this.endGame(chatTelegramId, winner);
      return;
    }

    // Kunduz bosqichiga o'tish
    await this.startDayPhase(chatTelegramId);
  }

  // ==================== DAY ====================

  async startDayPhase(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine) return;

    await engine.startDay();

    // Kunduz — guruhni unmute qilish
    if (engine.settings.muteOnNight) {
      await this.notifier.unmuteGroup(chatTelegramId);
    }

    // Kunduz rasmi
    await this.notifier.sendPhasePhoto(chatTelegramId, "day");

    await startDayPhase(engine, this.notifier);

    // Muhokama timer → ovoz berishga o'tish
    engine.setTimer(engine.settings.dayDiscussionTimeout * 1000, async () => {
      await this.startVotingPhase(chatTelegramId);
    });
  }

  // ==================== VOTING ====================

  async startVotingPhase(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine) return;

    await engine.startVoting();
    const msgId = await startVotingPhase(engine, this.notifier);
    if (msgId) {
      this.votingMessageId.set(chatTelegramId.toString(), msgId);
    }

    // Voting timer
    engine.setTimer(engine.settings.votingTimeout * 1000, async () => {
      await this.handleVotingEnd(chatTelegramId);
    });
  }

  async handleVotingEnd(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine || engine.status !== "VOTING") return;

    // Ovoz natijalarini hisoblash (hali o'ldirmasdan!)
    const voteCount = engine.getVoteCounts();
    const alive = engine.getAlivePlayers();

    // Eng ko'p ovoz
    let maxCount = 0;
    let maxTargetId: number | null = null;
    let isTie = false;
    for (const [targetId, count] of voteCount) {
      if (targetId === -1) continue; // "Hech kimga" ni hisobga olmaymiz
      if (count > maxCount) {
        maxCount = count;
        maxTargetId = targetId;
        isTie = false;
      } else if (count === maxCount && count > 0) {
        isTie = true;
      }
    }

    // Hech kim ovoz bermagan yoki teng
    if (isTie || maxTargetId === null || maxCount === 0) {
      await this.notifier.sendToGroup(
        chatTelegramId,
        `Ovoz berish yakunlandi:\nAxoli kelisha olmadi... Kelisha olmaslik oqibatida hech kim osilmadi...`
      );
      await this.afterVoting(chatTelegramId);
      return;
    }

    const candidate = engine.getPlayer(maxTargetId);
    if (!candidate) {
      await this.afterVoting(chatTelegramId);
      return;
    }

    // Koldun himoyasi — osilmaydi
    if (candidate.isProtectedByWarlock) {
      await this.notifier.sendToGroup(
        chatTelegramId,
        `⚡️ <b>${candidate.firstName}</b> sehrli himoya ostida — osib bo'lmadi!`
      );
      await this.afterVoting(chatTelegramId);
      return;
    }

    // TASDIQLASH BOSQICHI — status o'zgaradi, yangi ovoz qabul qilinmaydi
    await engine.startConfirming();
    engine.resetConfirmVotes();
    engine.pendingHangTarget = maxTargetId;

    const confirmMsgId = await this.notifier.sendToGroup(
      chatTelegramId,
      `⚖️ <b>${candidate.firstName}</b>ni osmoqchimisiz?\n\n👍 Ha — osish\n👎 Yo'q — qo'yib yuborish`,
      confirmHangKeyboard(engine.gameId, maxTargetId)
    );

    if (confirmMsgId) {
      this.votingMessageId.set(chatTelegramId.toString(), confirmMsgId);
    }

    // 30 soniya tasdiqlash uchun
    engine.setTimer(30000, async () => {
      await this.handleConfirmEnd(chatTelegramId);
    });
  }

  // Tasdiqlash tugagach
  async handleConfirmEnd(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine || !engine.pendingHangTarget) return;

    const { yes, no } = engine.getConfirmCounts();
    const candidate = engine.getPlayer(engine.pendingHangTarget);

    if (!candidate) {
      engine.resetConfirmVotes();
      await this.afterVoting(chatTelegramId);
      return;
    }

    if (yes > no && !candidate.isProtectedByWarlock) {
      // 👍 ko'p — OSILADI
      const voteResult = engine.processVotes();

      // Kamikaze tekshirish
      if (voteResult.votedOut?.role === "KAMIKAZE") {
        const aliveNow = engine.getAlivePlayers();
        const kb = kamikazeTargetKeyboard(aliveNow);
        await this.notifier.sendToPlayer(
          voteResult.votedOut.telegramId,
          "💣 Siz osildingiz! Kimni o'zingiz bilan olib ketasiz?",
          kb
        );

        engine.setTimer(15000, async () => {
          await this.notifier.announceVoteResults(chatTelegramId, voteResult, engine.settings.showRoleOnDeath);
          engine.resetConfirmVotes();
          await this.afterVoting(chatTelegramId);
        });
        return;
      }

      await this.notifier.announceVoteResults(chatTelegramId, voteResult, engine.settings.showRoleOnDeath);
    } else if (candidate.isProtectedByWarlock) {
      await this.notifier.sendToGroup(
        chatTelegramId,
        `⚡️ <b>${candidate.firstName}</b> sehrli himoya ostida — osib bo'lmadi!`
      );
    } else {
      // 👎 ko'p yoki teng — OSILMAYDI
      await this.notifier.sendToGroup(
        chatTelegramId,
        `Axoli kelisha olmadi... <b>${candidate.firstName}</b> osilmadi!`
      );
    }

    engine.resetConfirmVotes();
    await this.afterVoting(chatTelegramId);
  }

  private async afterVoting(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine) return;

    // G'olib tekshirish
    const winner = engine.checkWin();
    if (winner) {
      await this.endGame(chatTelegramId, winner);
      return;
    }

    // Keyingi kecha
    await this.startNightPhase(chatTelegramId);
  }

  // ==================== GAME END ====================

  async endGame(chatTelegramId: bigint, winner: Winner): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine) return;

    const players = [...engine.players.values()];

    // Solo g'olib rolini aniqlash
    let soloWinnerRole: string | undefined;
    if (winner === "SOLO") {
      const soloPlayer = players.find((p) => p.isAlive && ["KILLER", "SNIPER", "ARCHER", "MINER"].includes(p.role));
      if (soloPlayer) {
        soloWinnerRole = `${ROLE_EMOJI[soloPlayer.role]} ${ROLE_NAME[soloPlayer.role]}`;
      }
    }

    // O'yin tugaganda guruhni unmute qilish
    if (engine.settings.muteOnNight) {
      await this.notifier.unmuteGroup(chatTelegramId);
    }

    await this.notifier.announceGameEnd(chatTelegramId, winner, players, soloWinnerRole);
    await engine.finish(winner);

    // Statistika yangilash — ketma-ket (race condition oldini olish)
    for (const player of players) {
      try {
        const won = this.didPlayerWin(player, winner);
        const ratingChange = this.calculateRating(player, winner, won);

        await statsRepo.recordGameAndRating(player.userId, player.role, won, ratingChange);

        if (won) {
          await economyService.giveGameReward(player.userId, winner, player.role);
          // Geroyga ball
          await heroService.addPointsForWin(player.userId, winner);
        }
      } catch (e) {
        logger.error(e, `Statistika yozishda xatolik (userId: ${player.userId})`);
      }
    }

    await gameManager.endGame(chatTelegramId);
  }

  private didPlayerWin(player: PlayerState, winner: Winner): boolean {
    const team = player.role;
    switch (winner) {
      case "TOWN":
        return ["CIVILIAN", "DOCTOR", "TRAMP", "SHERIFF", "KAMIKAZE", "HOOKER", "SERGEANT", "WARLOCK", "SANTA", "SNOWBOY"].includes(team);
      case "MAFIA":
        return ["DON", "MAFIA", "LAWYER", "SPY", "LAB"].includes(team);
      case "SOLO":
        return ["KILLER", "SNIPER", "ARCHER", "MINER"].includes(team);
      default:
        return false;
    }
  }

  private calculateRating(player: PlayerState, winner: Winner, won: boolean): number {
    if (!won) return -15;

    switch (winner) {
      case "TOWN":
        return 25;
      case "MAFIA":
        return 35;
      case "SOLO":
        return 50;
      default:
        return 0;
    }
  }

  // ==================== EXTEND ====================

  async handleExtend(chatTelegramId: bigint): Promise<boolean> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine) return false;
    const chatKey = chatTelegramId.toString();

    if (engine.status === "WAITING") {
      // Registration fazasi — timeLeft ni 30 soniyaga oshirish
      const current = this.registrationTimeLeft.get(chatKey) || 0;
      this.registrationTimeLeft.set(chatKey, current + 30);
      return true;
    }

    // Boshqa fazalar (tun, kun, ovoz berish)
    if (["NIGHT", "DAY", "VOTING"].includes(engine.status)) {
      engine.extendTimer(30000);
      return true;
    }

    return false;
  }

  // ==================== STOP GAME ====================

  async handleStopGame(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine) return;

    const chatKey = chatTelegramId.toString();
    const timer = this.registrationTimers.get(chatKey);
    if (timer) {
      clearInterval(timer);
      this.registrationTimers.delete(chatKey);
    }
    this.registrationTimeLeft.delete(chatKey);

    // O'yin to'xtatilganda guruhni unmute qilish
    if (engine.settings.muteOnNight) {
      await this.notifier.unmuteGroup(chatTelegramId);
    }

    await engine.cancel();
    await gameManager.endGame(chatTelegramId);
    await this.notifier.sendToGroup(chatTelegramId, uz.game.gameStopped);
  }
}
