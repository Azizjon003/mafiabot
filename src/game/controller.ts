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
import { pricingService, rolePriceKey, PRICE_KEYS } from "../services/pricing.service";
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
      engine.registrationMessageId = msgId;
    }

    // /next obunachilariga xabar yuborish (parallel)
    this.notifyNextSubscribers(chatTelegramId, chatTitle).catch((e) =>
      logger.error(e, "Next subscriber notification error")
    );

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

    // Rolllarni shaxsiy xabarda yuborish
    for (const player of engine.players.values()) {
      await this.notifier.sendRoleToPlayer(player);
    }

    // Mafiya a'zolariga bir-birini ko'rsatish
    const mafiaMembers = engine.getMafiaMembers();
    if (mafiaMembers.length > 1) {
      await this.notifier.sendMafiaIntro(mafiaMembers);
    }

    // Guruhga "Mening rolim" tugmasi
    const { InlineKeyboard } = await import("grammy");
    const roleKb = new InlineKeyboard().text("🎭 Mening rolim", `showrole:${engine.gameId}`);
    await this.notifier.sendToGroup(
      chatTelegramId,
      `🎭 <b>Rollar tarqatildi!</b>\n\nO'z rolingizni ko'rish uchun tugmani bosing 👇`,
      roleKb
    );

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

    // O'lganlar uchun oxirgi so'z oynasi (10 sek)
    await this.openLastWordsForDead(chatTelegramId, nightResult.killed.map((k) => k.player));

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

    // Geroy egalariga (SNIPER/DON/SHERIFF) PM yuborish
    await this.sendHeroDayPrompts(engine).catch((e) => logger.error(e, "Hero day PM error"));

    // Muhokama timer → ovoz berishga o'tish
    engine.setTimer(engine.settings.dayDiscussionTimeout * 1000, async () => {
      await this.startVotingPhase(chatTelegramId);
    });
  }

  // Tong otganda — geroyga ega ruxsatli rollarga PM
  // Oxirgi so'z oynasini o'lganlarga ochish (10 sekund)
  private async openLastWordsForDead(chatTelegramId: bigint, deadPlayers: PlayerState[]): Promise<void> {
    const { lastWordsService } = await import("../services/last-words.service");
    const secs = lastWordsService.getWindowSeconds();

    for (const dead of deadPlayers) {
      lastWordsService.open(dead.telegramId, chatTelegramId, dead.firstName);
      // O'lgan o'yinchiga PM
      await this.notifier.sendToPlayer(
        dead.telegramId,
        `⏱ <b>Oxirgi so'z vaqti!</b>\n\n` +
        `Sizda <b>${secs} soniya</b> ichida guruhga oxirgi xabar yuborish imkoniyati bor.\n` +
        `Shunchaki botga matnni yozing — guruhga yetkaziladi.`,
      ).catch(() => {});
    }
  }

  private async sendHeroDayPrompts(engine: GameEngine): Promise<void> {
    const { HERO_ATTACK_ROLES } = await import("../utils/constants");
    const { InlineKeyboard } = await import("grammy");

    for (const player of engine.getAlivePlayers()) {
      if (!player.hasHeroActive) continue;
      if (!HERO_ATTACK_ROLES.includes(player.role)) continue;

      const kb = new InlineKeyboard();
      kb.text("🥷 Otish", "hero:attack");
      // Himoyalanish faqat hali ishlatilmagan bo'lsa
      if (!player.heroDefendUsed) {
        kb.text("⚜️ Himoyalanish", "hero:defend");
      }

      const text =
        `🌅 <b>Tong otdi!</b>\n\n` +
        `🥷 Sizning Geroyingiz tayyor.\n` +
        `Bugun nima qilasiz?`;

      await this.notifier.sendToPlayer(player.telegramId, text, kb).catch(() => {});
    }
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
          // Oxirgi so'z — Kamikaze uchun
          if (voteResult.votedOut) {
            await this.openLastWordsForDead(chatTelegramId, [voteResult.votedOut]);
          }
          if (voteResult.kamikazeTarget) {
            await this.openLastWordsForDead(chatTelegramId, [voteResult.kamikazeTarget]);
          }
          engine.resetConfirmVotes();
          await this.afterVoting(chatTelegramId);
        });
        return;
      }

      await this.notifier.announceVoteResults(chatTelegramId, voteResult, engine.settings.showRoleOnDeath);
      // Oxirgi so'z — osilgan odamga
      if (voteResult.votedOut) {
        await this.openLastWordsForDead(chatTelegramId, [voteResult.votedOut]);
      }
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

    // O'yin muddati (minutda)
    let durationMinutes: number | undefined;
    if (engine.gameStartedAt) {
      const ms = Date.now() - engine.gameStartedAt.getTime();
      durationMinutes = Math.max(1, Math.round(ms / 60000));
    }

    // G'olib aniqlash funksiyasi
    const isWinnerFn = (p: PlayerState) => this.didPlayerWin(p, winner);

    await this.notifier.announceGameEnd(
      chatTelegramId,
      winner,
      players,
      soloWinnerRole,
      isWinnerFn,
      durationMinutes
    );
    await engine.finish(winner);

    // Statistika yangilash — ketma-ket (race condition oldini olish)
    for (const player of players) {
      try {
        const won = isWinnerFn(player);
        const ratingChange = this.calculateRating(player, winner, won);

        // Geroy himoya qoldig'ini User.hero.protection'ga saqlash
        if (player.hasHeroActive && player.heroDefendUsed) {
          const { heroRepo } = await import("../database/repositories/hero.repository");
          await heroRepo.updateProtection(player.userId, Math.max(0, player.heroProtection)).catch(() => {});
        }

        await statsRepo.recordGameAndRating(player.userId, player.role, won, ratingChange);

        let moneyEarned = 0;
        let diamondsEarned = 0;
        if (won) {
          // Standart mukofot + g'oliblik bonusi (dinamik)
          const reward = await economyService.giveGameReward(player.userId, winner, player.role);
          const bonus = await pricingService.get(PRICE_KEYS.REWARD_WINNER_BONUS);
          if (bonus > 0) await economyService.addMoney(player.userId, bonus, "winner_bonus");
          await heroService.addPointsForWin(player.userId, winner);
          moneyEarned = reward.money + bonus;
          diamondsEarned = reward.diamonds;
        } else {
          // Yutqazganlarga konsolyatsiya (dinamik)
          const consolation = await pricingService.get(PRICE_KEYS.REWARD_LOSER_CONSOLATION);
          if (consolation > 0) await economyService.addMoney(player.userId, consolation, "loser_consolation");
          moneyEarned = consolation;
        }

        // Shaxsiy natija xabari
        await this.sendPersonalGameResult(player, won, moneyEarned, diamondsEarned, ratingChange).catch(() => {});
      } catch (e) {
        logger.error(e, `Statistika yozishda xatolik (userId: ${player.userId})`);
      }
    }

    await gameManager.endGame(chatTelegramId);
  }

  // Har o'yinchiga PMda natija
  private async sendPersonalGameResult(
    player: PlayerState,
    won: boolean,
    money: number,
    diamonds: number,
    ratingChange: number,
  ): Promise<void> {
    let text = won
      ? `🎉 <b>Siz YUTDINGIZ!</b>\n\n`
      : `😢 <b>Siz yutqazdingiz</b>\n\n`;
    text += `🎭 Sizning rolingiz: ${ROLE_EMOJI[player.role]} <b>${ROLE_NAME[player.role]}</b>\n\n`;
    text += `💰 Pul: <b>+${money}</b>\n`;
    if (diamonds > 0) text += `💎 Olmos: <b>+${diamonds}</b>\n`;
    text += `⭐️ Reyting: <b>${ratingChange > 0 ? "+" : ""}${ratingChange}</b>\n`;
    text += `\n📊 /profile — to'liq ma'lumot\n`;
    text += `🎭 /startgame — yangi o'yin`;

    await this.notifier.sendToPlayer(player.telegramId, text);
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

  // /next obunachilariga xabar yuborish va obunani tozalash
  private async notifyNextSubscribers(chatTelegramId: bigint, chatTitle?: string): Promise<void> {
    const { subscriptionRepo } = await import("../database/repositories/subscription.repository");
    const { prisma } = await import("../database/prisma");
    const { botUsername } = await import("../config");

    const userIds = await subscriptionRepo.listForChat(chatTelegramId);
    if (userIds.length === 0) return;

    // User'larni olib TelegramId'larni topish
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { telegramId: true },
    });

    const groupName = chatTitle || "Guruh";
    const text =
      `🎭 <b>Yangi o'yin boshlanmoqda!</b>\n\n` +
      `📍 Guruh: <b>${groupName}</b>\n\n` +
      `Qo'shilish uchun tugmani bosing:`;

    const { InlineKeyboard } = await import("grammy");
    const kb = new InlineKeyboard().url("✅ Qo'shilish", `https://t.me/${botUsername}?start=join_${chatTelegramId}`);

    let sent = 0;
    let blocked = 0;
    for (const u of users) {
      try {
        const result = await this.notifier.sendToPlayer(u.telegramId, text, kb);
        if (result !== undefined) sent++;
        else blocked++; // null qaytardi — xabar ketmadi
      } catch {
        blocked++;
      }
    }

    // Obunalarni tozalash (bir martalik — bloklangan userlar ham tozalanadi)
    await subscriptionRepo.clearForChat(chatTelegramId);
    logger.info(
      { chatId: chatTelegramId.toString(), sent, blocked, total: userIds.length },
      "Next subscribers notified"
    );
  }

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
