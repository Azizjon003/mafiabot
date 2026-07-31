import { Winner, Role } from "@prisma/client";
import { GameEngine } from "./engine";
import { PlayerState } from "../types";
import { gameManager } from "./manager";
import { NotificationService } from "../services/notification.service";
import { startRegistration, getRegistrationText } from "./phases/registration";
import { sendNightPrompts, sendNightStories } from "./phases/night";
import { startDayPhase } from "./phases/day";
import { startVotingPhase } from "./phases/voting";
import { joinGameKeyboard, kamikazeTargetKeyboard, confirmHangKeyboard, votingPlayerListKeyboard } from "../keyboards/game";
import { t } from "../services/text.service";
import { MAFIA_ROLES, PACING, ROLE_EMOJI, ROLE_NAME, ROLE_TEAM, SANTA_GIFT_AMOUNT, SOLO_ROLES, Team } from "../utils/constants";
import { buildRoster } from "./roster";
import { escapeHtml, mention, sleep } from "../utils/helpers";
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
  private registrationLastRepostAt: Map<string, number> = new Map(); // epoch ms

  constructor(notifier: NotificationService) {
    this.notifier = notifier;
  }

  // ==================== REGISTRATION ====================

  async handleStartGame(chatTelegramId: bigint, chatTitle?: string, creatorTelegramId?: bigint): Promise<GameEngine> {
    const engine = await gameManager.createGame(chatTelegramId, chatTitle);
    if (creatorTelegramId != null) engine.creatorTelegramId = creatorTelegramId;
    const msgId = await startRegistration(engine, this.notifier);
    const chatKey = chatTelegramId.toString();

    if (msgId) {
      this.registrationMessageId.set(chatKey, msgId);
      this.registrationLastRepostAt.set(chatKey, Date.now());
      engine.registrationMessageId = msgId;
      // Registratsiyani guruh tepasiga pin qilish (jim — push yubormaydi)
      await this.notifier.pinMessage(chatTelegramId, msgId, true);
    }

    // /next obunachilariga xabar yuborish (parallel)
    this.notifyNextSubscribers(chatTelegramId, chatTitle).catch((e) =>
      logger.error(e, "Next subscriber notification error")
    );

    // Registration countdown timer
    this.registrationTimeLeft.set(chatKey, engine.settings.registrationTimeout);
    const REPOST_EVERY_MS = 60_000; // Har 60 soniyada registratsiya xabarini qayta yuborish (pastda turishi uchun)
    const interval = setInterval(async () => {
      const current = (this.registrationTimeLeft.get(chatKey) || 0) - 10;
      this.registrationTimeLeft.set(chatKey, current);
      if (current <= 0) {
        clearInterval(interval);
        this.registrationTimers.delete(chatKey);
        this.registrationTimeLeft.delete(chatKey);
        this.registrationLastRepostAt.delete(chatKey);
        await this.handleRegistrationEnd(chatTelegramId);
        return;
      }

      const text = getRegistrationText(engine, current);
      const kb = joinGameKeyboard(engine.gameId, botUsername, engine.chatTelegramId);
      const msgId = this.registrationMessageId.get(chatKey);
      const lastRepost = this.registrationLastRepostAt.get(chatKey) || 0;
      const shouldRepost = current > 20 && Date.now() - lastRepost >= REPOST_EVERY_MS;

      if (shouldRepost && msgId) {
        // Eski xabarni o'chirib, yangisini pastga yuborish — chat'dagi xabarlar ustidan turishi uchun
        await this.notifier.unpinMessage(chatTelegramId, msgId).catch(() => {});
        await this.notifier.deleteMessage(chatTelegramId, msgId).catch(() => {});
        const newId = await this.notifier.sendToGroup(chatTelegramId, text, kb);
        if (newId) {
          this.registrationMessageId.set(chatKey, newId);
          engine.registrationMessageId = newId;
          this.registrationLastRepostAt.set(chatKey, Date.now());
          await this.notifier.pinMessage(chatTelegramId, newId, true).catch(() => {});
        }
      } else if (msgId) {
        // Oddiy edit — countdown yangilash
        await this.notifier.editGroupMessage(chatTelegramId, msgId, text, kb);
      }
    }, 10000);

    this.registrationTimers.set(chatKey, interval);
    return engine;
  }

  // Registratsiya xabarini pastga qayta yuborish (/startgame qayta bosilganda)
  async bumpRegistration(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine || engine.status !== "WAITING") return;
    const chatKey = chatTelegramId.toString();
    const currentLeft = this.registrationTimeLeft.get(chatKey) ?? engine.settings.registrationTimeout;

    const text = getRegistrationText(engine, currentLeft);
    const kb = joinGameKeyboard(engine.gameId, botUsername, engine.chatTelegramId);

    const oldMsgId = this.registrationMessageId.get(chatKey);
    if (oldMsgId) {
      await this.notifier.unpinMessage(chatTelegramId, oldMsgId).catch(() => {});
      await this.notifier.deleteMessage(chatTelegramId, oldMsgId).catch(() => {});
    }

    const newId = await this.notifier.sendToGroup(chatTelegramId, text, kb);
    if (newId) {
      this.registrationMessageId.set(chatKey, newId);
      engine.registrationMessageId = newId;
      this.registrationLastRepostAt.set(chatKey, Date.now());
      await this.notifier.pinMessage(chatTelegramId, newId, true).catch(() => {});
    }
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

    // Registratsiya xabarini unpin qilish
    const regMsgId = this.registrationMessageId.get(chatKey);
    if (regMsgId) {
      await this.notifier.unpinMessage(chatTelegramId, regMsgId);
      this.registrationMessageId.delete(chatKey);
    }

    if (engine.getPlayerCount() < engine.settings.minPlayers) {
      // Kam o'yinchi — registratsiya va xato xabarlarini tozalab tashlash
      if (regMsgId) {
        await this.notifier.deleteMessage(chatTelegramId, regMsgId).catch(() => {});
      }
      // Xato xabarini yuboramiz va 15 sekunddan keyin o'chiradi (chat tozaligi uchun)
      const errMsgId = await this.notifier.sendToGroup(
        chatTelegramId,
        t("game.notEnoughPlayers", { min: engine.settings.minPlayers })
      );
      if (errMsgId) {
        setTimeout(() => {
          this.notifier.deleteMessage(chatTelegramId, errMsgId).catch(() => {});
        }, 15000);
      }
      await engine.cancel();
      await gameManager.endGame(chatTelegramId);
      return;
    }

    // O'yinni boshlash
    await this.notifier.sendToGroup(chatTelegramId, t("game.gameStarting"));
    await engine.assignRoles();

    // Rolllarni shaxsiy xabarda yuborish
    for (const player of engine.players.values()) {
      await this.notifier.sendRoleToPlayer(player);
    }
    await sleep(PACING.ROLE_INTRO_MS);

    // Mafiya a'zolariga bir-birini ko'rsatish
    const mafiaMembers = engine.getMafiaMembers();
    if (mafiaMembers.length > 1) {
      await this.notifier.sendMafiaIntro(mafiaMembers);
    }
    await sleep(PACING.ROLE_INTRO_MS);

    // Komissar + Serjant bir-birini bilishi uchun
    const sheriff = engine.getAlivePlayers().find((p) => p.role === "SHERIFF");
    const sergeant = engine.getAlivePlayers().find((p) => p.role === "SERGEANT");
    if (sheriff && sergeant) {
      await this.notifier.sendTownTeamIntro(sheriff, sergeant);
    }

    // Guruhga "Mening rolim" tugmasi
    const { InlineKeyboard } = await import("grammy");
    const roleKb = new InlineKeyboard().text("🎭 Mening rolim", `showrole:${engine.gameId}`);
    await this.notifier.sendToGroup(
      chatTelegramId,
      t("game.rolesDistributed"),
      roleKb
    );
    await sleep(PACING.GAME_SETUP_MS);

    // Roster — tirik o'yinchilar va jamoa bo'yicha rollar
    await this.notifier.sendToGroup(chatTelegramId, buildRoster(engine));
    await sleep(PACING.GAME_SETUP_MS);

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

    // Tun rasmi + atmosferali matn caption sifatida + roster + "Bot-ga o'tish" tugma
    const { InlineKeyboard: NightKb } = await import("grammy");
    const nightKb = new NightKb().url(
      t("game.nightBotButton"),
      `https://t.me/${botUsername}`
    );
    const nightCaption =
      t("game.nightStarts", { round: engine.currentRound }) +
      "\n\n" +
      t("game.nightAtmosphere") +
      "\n\n" +
      buildRoster(engine);
    const photoSent = await this.notifier.sendPhasePhoto(
      chatTelegramId,
      "night",
      nightCaption,
      nightKb,
    );

    // Rasm yuborilmagan bo'lsa — matnni alohida
    if (!photoSent) {
      await this.notifier.sendToGroup(chatTelegramId, nightCaption, nightKb);
    }

    // Har bir rolga shaxsiy chatda tundagi promptlarni yuborish
    await sendNightPrompts(engine, this.notifier);

    // Tun atmosfera hikoyalari — o'yinchilar tanlov qilayotganda guruhga oqim sifatida boradi
    await sendNightStories(engine, this.notifier);

    // Promptlar/hikoyalar yuborilayotganda hamma harakat qilib ulgurgan bo'lishi mumkin —
    // unda tun allaqachon yakunlanib, kunduz boshlangan bo'ladi. Bunday holda tun taymerini
    // QO'YMAYMIZ: setTimer avval clearTimer() qiladi va kunduzgi taymerni o'chirib yuborardi
    // (natijada o'yin kunduzda qotib qolardi).
    if (engine.status !== "NIGHT") return;

    // Night timer
    engine.setTimer(engine.settings.nightTimeout * 1000, async () => {
      await this.handleNightEnd(chatTelegramId);
    }, "NIGHT_END");
    await engine.persistNow();
  }

  async handleNightEnd(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine || engine.status !== "NIGHT") return;
    // Reentrancy guard — timer callback va oxirgi o'yinchi harakati bir vaqtda
    // kelsa, kecha ikki marta hisoblanmasligi uchun (sinxron tekshiruv+o'rnatish).
    if (engine.phaseResolving) return;
    engine.phaseResolving = true;
    engine.clearTimer();

    try {
    // Harakat qilmaganlarga xabar (ataylab skip bosganlar bundan mustasno)
    for (const player of engine.getAlivePlayers()) {
      if (
        engine.isNightActiveRole(player.role) &&
        !engine.hasNightAction(player.role, player.playerId) &&
        !engine.hasSkippedNight(player.playerId)
      ) {
        this.notifier.sendToPlayer(player.telegramId, t("game.actionTimeout")).catch(() => {});
      }
    }

    // Kecha natijalarini hisoblash
    const nightResult = engine.processNightActions();
    // Darhol saqlash — o'lganlar + state o'zgarishi DB'da
    await engine.persistNow();

    // Natijalarni e'lon qilish
    await this.notifier.announceNightResults(
      chatTelegramId,
      nightResult,
      engine.settings.showRoleOnDeath
    );

    // O'lganlar uchun oxirgi so'z oynasi (10 sek)
    await this.openLastWordsForDead(chatTelegramId, nightResult.killed.map((k) => k.player));

    // ROBBER_ROB — haqiqiy pul o'tkazish; SANTA_GIFT — nishonga haqiqiy sovg'a puli
    for (const event of nightResult.events) {
      if (event.type === "ROBBER_ROB" && event.targetId) {
        const actor = engine.getPlayer(event.actorId);
        const target = engine.getPlayer(event.targetId);
        if (actor && target) {
          // Faqat nishonda pul bo'lsa o'g'irlanadi (yo'qdan pul yaratilmaydi)
          const ROB_AMOUNT = 100;
          const stole = await economyService.spendMoney(target.userId, ROB_AMOUNT, "robbed").catch(() => false);
          if (stole) await economyService.addMoney(actor.userId, ROB_AMOUNT, "robber_rob").catch(() => {});
        }
      }
      if (event.type === "SANTA_GIFT" && event.targetId) {
        const target = engine.getPlayer(event.targetId);
        if (target) {
          await economyService.addMoney(target.userId, SANTA_GIFT_AMOUNT, "santa_gift").catch(() => {});
        }
      }
    }

    // Shaxsiy natijalarni to'plash — bitta odamga bir nechta xabar bo'lsa, birga (burst) emas, ketma-ket yuborish uchun
    const privateMessages = new Map<string, { telegramId: bigint; messages: string[] }>();
    const queuePrivateMessage = (telegramId: bigint, message: string) => {
      const key = telegramId.toString();
      const entry = privateMessages.get(key);
      if (entry) entry.messages.push(message);
      else privateMessages.set(key, { telegramId, messages: [message] });
    };
    for (const event of nightResult.events) {
      if (event.privateMessage) {
        const actor = engine.getPlayer(event.actorId);
        if (actor) queuePrivateMessage(actor.telegramId, event.privateMessage);
      }
      if (event.targetPrivateMessage && event.targetId) {
        const target = engine.getPlayer(event.targetId);
        if (target) queuePrivateMessage(target.telegramId, event.targetPrivateMessage);
      }
    }

    // Turli odamlarga parallel, lekin bitta odamning xabarlari orasida pauza bilan (ketma-ket)
    await Promise.all(
      [...privateMessages.values()].map(({ telegramId, messages }) =>
        (async () => {
          for (let i = 0; i < messages.length; i++) {
            await this.notifier.sendToPlayer(telegramId, messages[i]);
            if (i < messages.length - 1) await sleep(PACING.PRIVATE_RESULT_MS);
          }
        })().catch(() => {})
      )
    );

    // G'olib tekshirish
    const winner = engine.checkWin();
    if (winner) {
      await this.endGame(chatTelegramId, winner);
      return;
    }

    // Natijalar o'qilishi uchun nafas — keyin kunduz bosqichi
    await this.notifier.pauseBeforeDay();
    await this.startDayPhase(chatTelegramId);
    } finally {
      engine.phaseResolving = false;
    }
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

    // Kunduz rasmi + tong otdi matni caption sifatida
    const photoSent = await this.notifier.sendPhasePhoto(
      chatTelegramId,
      "day",
      t("game.dayStarts", { round: engine.currentRound }),
    );

    // Rasm yuborilmagan bo'lsa (photo yo'q) — matnni alohida xabar sifatida
    await startDayPhase(engine, this.notifier, !photoSent);

    // Geroy egalariga (SNIPER/DON/SHERIFF) PM yuborish
    await this.sendHeroDayPrompts(engine).catch((e) => logger.error(e, "Hero day PM error"));

    // Muhokama timer → ovoz berishga o'tish
    engine.setTimer(engine.settings.dayDiscussionTimeout * 1000, async () => {
      await this.startVotingPhase(chatTelegramId);
    }, "DAY_END");
    await engine.persistNow();
  }

  // Tong otganda — geroyga ega ruxsatli rollarga PM
  // Oxirgi so'z oynasini o'lganlarga ochish (10 sekund)
  private async openLastWordsForDead(chatTelegramId: bigint, deadPlayers: PlayerState[]): Promise<void> {
    const { lastWordsService } = await import("../services/last-words.service");
    const secs = lastWordsService.getWindowSeconds();

    logger.info({ count: deadPlayers.length, chatId: chatTelegramId.toString() }, "openLastWordsForDead — oyna ochilmoqda");

    for (const dead of deadPlayers) {
      lastWordsService.open(dead.telegramId, chatTelegramId, dead.firstName);
      // O'lgan o'yinchiga PM
      const msgId = await this.notifier.sendToPlayer(
        dead.telegramId,
        t("game.lastWordsPrompt", { seconds: secs }),
      ).catch((e) => {
        logger.error(e, `Oxirgi so'z PM yuborilmadi (telegramId=${dead.telegramId})`);
        return undefined;
      });
      if (!msgId) {
        logger.warn({ telegramId: dead.telegramId.toString(), name: dead.firstName }, "Oxirgi so'z PM yuborilmadi — bot DM qilolmadi");
      }
    }
  }

  // 💔🔫 O'lim zanjirlari (sevishganlar qayg'usi + Ovchi o'qi) — guruhga e'lon + oxirgi so'z
  private async announceDeathChains(
    chatTelegramId: bigint,
    engine: GameEngine,
    griefVictims: PlayerState[],
    hunterVictims: { hunter: PlayerState; victim: PlayerState }[] = []
  ): Promise<void> {
    for (const hv of hunterVictims) {
      const roleInfo = engine.settings.showRoleOnDeath
        ? ` (${ROLE_EMOJI[hv.victim.role]} ${ROLE_NAME[hv.victim.role]})`
        : "";
      await this.notifier.sendToGroup(
        chatTelegramId,
        `💥 <b>${escapeHtml(hv.hunter.firstName)}</b> (🔫 Ovchi) o'layotib tepkini bosdi!\n<b>${escapeHtml(hv.victim.firstName)}</b>${roleInfo} otib ketildi!`
      );
      await this.openLastWordsForDead(chatTelegramId, [hv.victim]);
    }
    for (const v of griefVictims) {
      const roleInfo = engine.settings.showRoleOnDeath
        ? ` (${ROLE_EMOJI[v.role]} ${ROLE_NAME[v.role]})`
        : "";
      await this.notifier.sendToGroup(
        chatTelegramId,
        `💔 <b>${escapeHtml(v.firstName)}</b>${roleInfo} o'z juftining o'limiga chiday olmay, qayg'udan hayotdan ko'z yumdi...`
      );
      await this.openLastWordsForDead(chatTelegramId, [v]);
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
      // Har kun Himoyalanish tugmasi ko'rsatiladi
      kb.text("⚜️ Himoyalanish", "hero:defend");

      const text = t("game.heroDayPrompt");

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

    // Ballotlarni AVTOMATIK har bir tirik o'yinchiga PM qilib yuborish —
    // guruhdagi tugmani bosishga hojat yo'q (qatnashuvni oshiradi).
    // Botni bloklaganlarga ketmasa — guruhdagi URL tugma zaxira yo'l bo'lib qoladi.
    const aliveVoters = engine.getAlivePlayers();
    await Promise.all(
      aliveVoters.map((voter) => {
        // Kezuvchi uxlatganlar ovoz bera olmaydi — ballot yubormaymiz
        if (voter.isBlocked) return Promise.resolve();
        const targets = aliveVoters.filter((p) => p.playerId !== voter.playerId);
        const kb = votingPlayerListKeyboard(engine.gameId, targets);
        return this.notifier
          .sendToPlayer(voter.telegramId, t("start.voteWhoPrompt"), kb)
          .then(() => undefined)
          .catch(() => undefined);
      })
    );

    // Voting timer
    engine.setTimer(engine.settings.votingTimeout * 1000, async () => {
      await this.handleVotingEnd(chatTelegramId);
    }, "VOTING_END");
    await engine.persistNow();
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
      await this.notifier.sendToGroup(chatTelegramId, t("game.voteInconclusive"));
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
        t("game.warlockProtectedFromHang", { name: escapeHtml(candidate.firstName) })
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
      t("game.hangConfirmPrompt", { name: escapeHtml(candidate.firstName) }),
      confirmHangKeyboard(engine.gameId, maxTargetId)
    );

    if (confirmMsgId) {
      this.votingMessageId.set(chatTelegramId.toString(), confirmMsgId);
    }

    // 30 soniya tasdiqlash uchun
    engine.setTimer(30000, async () => {
      await this.handleConfirmEnd(chatTelegramId);
    }, "CONFIRM_END");
    await engine.persistNow();
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
          t("game.kamikazePrompt"),
          kb
        );

        engine.setTimer(15000, async () => {
          // Kamikaze tanlagan nishonni endi qo'llaymiz (tanlamagan bo'lsa null qaytadi).
          // processVotes paytida nishon hali tanlanmagan edi — shu yerda o'ldiriladi.
          const kamikazeVictim = engine.applyKamikazeTarget();
          if (kamikazeVictim) voteResult.kamikazeTarget = kamikazeVictim;
          // Kamikaze qurbonidan keyingi o'lim zanjirlari (qayg'u + Ovchi o'qi)
          const kamikazeChains = engine.resolveDeathChains();
          await this.notifier.announceVoteResults(chatTelegramId, voteResult, engine.settings.showRoleOnDeath);
          // Oxirgi so'z — Kamikaze uchun
          if (voteResult.votedOut) {
            await this.openLastWordsForDead(chatTelegramId, [voteResult.votedOut]);
          }
          if (voteResult.kamikazeTarget) {
            await this.openLastWordsForDead(chatTelegramId, [voteResult.kamikazeTarget]);
          }
          await this.announceDeathChains(
            chatTelegramId,
            engine,
            [...(voteResult.loverVictims ?? []), ...kamikazeChains.griefVictims],
            [...(voteResult.hunterVictims ?? []), ...kamikazeChains.hunterVictims]
          );
          engine.resetConfirmVotes();
          await this.afterVoting(chatTelegramId);
        }, "KAMIKAZE_DELAY");
        await engine.persistNow();
        return;
      }

      await this.notifier.announceVoteResults(chatTelegramId, voteResult, engine.settings.showRoleOnDeath);
      // Oxirgi so'z — osilgan odamga
      if (voteResult.votedOut) {
        await this.openLastWordsForDead(chatTelegramId, [voteResult.votedOut]);
      }
      // Osilgandan keyingi o'lim zanjirlari (qayg'u + Ovchi o'qi) — e'lon
      await this.announceDeathChains(
        chatTelegramId,
        engine,
        voteResult.loverVictims ?? [],
        voteResult.hunterVictims ?? []
      );
    } else if (candidate.isProtectedByWarlock) {
      await this.notifier.sendToGroup(
        chatTelegramId,
        t("game.warlockProtectedFromHang", { name: escapeHtml(candidate.firstName) })
      );
    } else {
      // 👎 ko'p yoki teng — OSILMAYDI
      await this.notifier.sendToGroup(
        chatTelegramId,
        t("game.hangCancelled", { name: escapeHtml(candidate.firstName) })
      );
    }

    engine.resetConfirmVotes();
    await this.afterVoting(chatTelegramId);
  }

  // Restart KAMIKAZE_DELAY o'rtasida sodir bo'lsa — voteResult closure yo'qoladi.
  // O'yin abadiy qotib qolmasligi uchun keyingi bosqichga xavfsiz o'tkazamiz (degraded recovery).
  async resumeAfterVoting(chatTelegramId: bigint): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine) return;
    engine.resetConfirmVotes();
    engine.pendingHangTarget = null;
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

    // Keyingi kecha — vote natijasi o'qilishi uchun nafas
    await sleep(PACING.BEFORE_NIGHT_MS);
    await this.startNightPhase(chatTelegramId);
  }

  // ==================== GAME END ====================

  async endGame(chatTelegramId: bigint, winner: Winner): Promise<void> {
    const engine = gameManager.getGame(chatTelegramId);
    if (!engine) return;
    // Bir marta ishlash guard — konkurent chaqiruvlarda mukofot ikki barobar
    // berilmasligi uchun (sinxron tekshiruv+o'rnatish).
    if (engine.ending) return;
    engine.ending = true;
    engine.clearTimer();

    const players = [...engine.players.values()];

    // Solo g'olib rolini aniqlash
    let soloWinnerRole: string | undefined;
    if (winner === "SOLO") {
      const soloPlayer = players.find((p) => p.isAlive && SOLO_ROLES.includes(p.role));
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
    await sleep(PACING.GAME_END_MS);

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

        // Shield va Hujjat finalize — ishlatilgan bo'lsa iste'mol, bo'lmasa saqlanadi
        // Shield used = hasShieldActive false bo'ldi (hujum bor edi va shield o'z ishini qildi)
        // Document used = hasDocumentActive false bo'ldi (Komissar tekshirdi va yomon rolni tinch ko'rsatdi)
        const shieldUsed = player.reservedShield && !player.hasShieldActive;
        const documentUsed = player.reservedDocument && !player.hasDocumentActive;
        const { inventoryService } = await import("../services/inventory.service");
        await inventoryService.finalizeForGame(
          player.userId,
          { shield: player.reservedShield, document: player.reservedDocument },
          { shield: shieldUsed, document: documentUsed },
        ).catch((e) => logger.error(e, `finalizeForGame xatolik userId=${player.userId}`));
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
      ? t("game.personalResultWon")
      : t("game.personalResultLost");
    text += `🎭 Sizning rolingiz: ${ROLE_EMOJI[player.role]} <b>${ROLE_NAME[player.role]}</b>\n\n`;
    text += `💰 Pul: <b>+${money}</b>\n`;
    if (diamonds > 0) text += `💎 Olmos: <b>+${diamonds}</b>\n`;
    text += `⭐️ Reyting: <b>${ratingChange > 0 ? "+" : ""}${ratingChange}</b>\n`;
    text += `\n📊 /profile — to'liq ma'lumot\n`;
    text += `🎭 /startgame — yangi o'yin`;

    await this.notifier.sendToPlayer(player.telegramId, text);
  }

  private didPlayerWin(player: PlayerState, winner: Winner): boolean {
    // Faqat tirik qolganlar g'olib sanaladi.
    // O'lgan jamoa a'zolari — yutqazganlar ro'yxatida.
    if (!player.isAlive) return false;
    const team = player.role;
    switch (winner) {
      case "TOWN":
        return ROLE_TEAM[team] === Team.TOWN;
      case "MAFIA":
        return MAFIA_ROLES.includes(team);
      case "SOLO":
        return SOLO_ROLES.includes(team);
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
      // Agar timer allaqachon tugagan bo'lsa — uzaytirib bo'lmaydi
      if (!this.registrationTimers.has(chatKey)) {
        logger.warn({ chatId: chatTelegramId.toString() }, "Extend chaqirildi lekin registratsiya timer yo'q");
        return false;
      }
      const current = this.registrationTimeLeft.get(chatKey) || 0;
      const newLeft = current + 30;
      this.registrationTimeLeft.set(chatKey, newLeft);

      // Xabarni darhol yangilash (10s interval kutmasdan)
      const msgId = this.registrationMessageId.get(chatKey);
      if (msgId) {
        const text = getRegistrationText(engine, newLeft);
        await this.notifier.editGroupMessage(
          chatTelegramId,
          msgId,
          text,
          joinGameKeyboard(engine.gameId, botUsername, engine.chatTelegramId)
        );
      }

      logger.info({ chatId: chatTelegramId.toString(), newLeft }, "Registration extended +30s");
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

    const { escapeHtml: esc } = await import("../utils/helpers");
    const groupName = esc(chatTitle || "Guruh");
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

    // Registratsiya xabarini unpin qilish
    const regMsgId = this.registrationMessageId.get(chatKey);
    if (regMsgId) {
      await this.notifier.unpinMessage(chatTelegramId, regMsgId);
      this.registrationMessageId.delete(chatKey);
    }

    // O'yin to'xtatilganda guruhni unmute qilish
    if (engine.settings.muteOnNight) {
      await this.notifier.unmuteGroup(chatTelegramId);
    }

    await engine.cancel();
    await gameManager.endGame(chatTelegramId);
    await this.notifier.sendToGroup(chatTelegramId, t("game.gameStopped"));
  }
}
