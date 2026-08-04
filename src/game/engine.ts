import { GameStatus, Role, DeathCause, ActionType, Winner, ChatSettings } from "@prisma/client";
import { PlayerState, NightResult, NightEvent, VoteResult, MafiaVote, KilledPlayer, RobberResponse } from "../types";
import { gameRepo } from "../database/repositories/game.repository";
import { playerRepo } from "../database/repositories/player.repository";
import { ROLE_TEAM, Team, MAFIA_ROLES, MAFIA_KILL_VOTERS, ROLE_EMOJI, ROLE_NAME, SANTA_GIFT_AMOUNT, hasCharge, useCharge, initCharges } from "../utils/constants";
import { checkWinCondition } from "./win-checker";
import { assignRoles, matchRolesAvoidingRepeat } from "./role-assigner";
import { escapeHtml, getMostVoted, mention, shuffle } from "../utils/helpers";
import { logger } from "../utils/logger";

export class GameEngine {
  gameId: number;
  chatId: number;
  chatTelegramId: bigint;
  status: GameStatus = "WAITING";
  players: Map<number, PlayerState> = new Map(); // playerId -> PlayerState
  currentRound: number = 0;
  settings: ChatSettings;

  // Kecha harakatlari
  private nightActions: Map<Role, { actorId: number; targetId: number }> = new Map();
  private mafiaVotes: MafiaVote[] = [];
  private pendingNightRoles: Set<Role> = new Set();
  // Shu tunda ataylab "O'tkazish" bosganlar — harakatsizlikka SANALMAYDI
  private nightSkips: Set<number> = new Set();

  // Komissar otish
  private sheriffShootTarget: number | null = null;

  // Komissar tekshiruvi natijasi — tongda DM yuboriladi
  private pendingSheriffCheck: { sheriffId: number; targetId: number; disguiseAsTown: boolean } | null = null;

  // Ovoz berish
  private votes: Map<number, number> = new Map(); // voterId -> targetPlayerId
  private kamikazeTarget: number | null = null;

  // Osishni tasdiqlash (👍/👎)
  private confirmVotes: Map<number, boolean> = new Map(); // playerId -> true=yes, false=no
  pendingHangTarget: number | null = null; // osish kutilayotgan o'yinchi

  // Qaroqchi 2-bosqich — nishon javobi
  robberTargetResponse: RobberResponse | null = null;

  // Kupidon tanlagan juftlik (faqat 1-tunda tanlanadi)
  cupidPick: { first: number; second: number } | null = null;

  // O'yin boshlangan vaqt (statistika uchun)
  gameStartedAt: Date | null = null;

  // Registration xabar ID (yangilash uchun)
  registrationMessageId: number | null = null;

  // O'yinni yaratgan foydalanuvchi (u ham /stopgame qila oladi)
  creatorTelegramId: bigint | null = null;

  // Faza yakunlanishi reentrancy guard — timer va oxirgi harakat bir vaqtda
  // kelganda faza ikki marta hisoblanmasligi uchun (double-resolution oldini oladi).
  phaseResolving: boolean = false;
  // O'yin yakunlanishi guard — endGame faqat bir marta ishlashi uchun.
  ending: boolean = false;

  // Timerlar
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private timerStartedAt: number = 0;
  private timerDuration: number = 0;
  private timerCallback: (() => void) | null = null;
  // Restart'dan keyin tiklash uchun — keyingi phase qaysi, qachon tugaydi
  pendingPhaseAction: string | null = null; // "NIGHT_END" | "DAY_END" | "VOTING_END" | "CONFIRM_END" | "REGISTRATION_END" | "KAMIKAZE_DELAY"
  timerEndsAt: number | null = null; // epoch ms

  // Callbacks — bot handlerlar tomonidan o'rnatiladi
  onPhaseEnd?: () => Promise<void>;

  // Persistence — debounced + serialized
  // 500ms ichida bir necha persistSoon() chaqirilsa — bitta yozishga birlashadi.
  // Oldingi yozish tugamaguncha yangisi boshlanmaydi (race condition yo'q).
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persistInFlight: Promise<void> | null = null;
  private persistDirty: boolean = false;
  private static PERSIST_DEBOUNCE_MS = 500;

  persistSoon(): void {
    this.persistDirty = true;
    if (this.persistTimer) return; // allaqachon rejalashtirilgan
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.flushPersist();
    }, GameEngine.PERSIST_DEBOUNCE_MS);
  }

  private async flushPersist(): Promise<void> {
    // Agar oldingi yozish davom etayotgan bo'lsa — kutamiz
    if (this.persistInFlight) {
      await this.persistInFlight.catch(() => {});
    }
    if (!this.persistDirty) return;
    this.persistDirty = false;
    this.persistInFlight = (async () => {
      try {
        const m = await import("./persistence");
        await m.persistEngine(this);
      } catch {
        // persistEngine o'zi log qiladi
      } finally {
        this.persistInFlight = null;
      }
    })();
    await this.persistInFlight;
    // Yozish paytida yana dirty bo'lgan bo'lsa — qayta flush
    if (this.persistDirty) {
      this.persistSoon();
    }
  }

  // Kritik joylar uchun — darhol yozish (debounce'ni oldin ishlatadi)
  async persistNow(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.persistDirty = true;
    await this.flushPersist();
  }

  constructor(
    gameId: number,
    chatId: number,
    chatTelegramId: bigint,
    settings: ChatSettings
  ) {
    this.gameId = gameId;
    this.chatId = chatId;
    this.chatTelegramId = chatTelegramId;
    this.settings = settings;
  }

  // ==================== PLAYER MANAGEMENT ====================

  addPlayer(state: PlayerState): void {
    this.players.set(state.playerId, state);
  }

  removePlayer(playerId: number): boolean {
    return this.players.delete(playerId);
  }

  getPlayer(playerId: number): PlayerState | undefined {
    return this.players.get(playerId);
  }

  getPlayerByTelegramId(telegramId: bigint): PlayerState | undefined {
    for (const p of this.players.values()) {
      if (p.telegramId === telegramId) return p;
    }
    return undefined;
  }

  getAlivePlayers(): PlayerState[] {
    return [...this.players.values()].filter((p) => p.isAlive);
  }

  getAlivePlayersByRole(role: Role): PlayerState[] {
    return this.getAlivePlayers().filter((p) => p.role === role);
  }

  // Himoyalanish faollashtirish — 1 o'yinda 1 marta, lekin tugma har kun ko'rinadi.
  // Agar allaqachon faol bo'lsa — holatini qaytaradi (qayta yuklamaydi).
  async activateHeroDefense(playerId: number): Promise<{ success: boolean; reason?: string; protection?: number; alreadyActive?: boolean }> {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, reason: "O'yinchi topilmadi" };
    if (!player.isAlive) return { success: false, reason: "Siz o'lgansiz" };
    if (!player.hasHeroActive) return { success: false, reason: "Geroy yo'q" };

    // Allaqachon faol va qalqon bor — xabar berib qaytamiz (qayta yuklamaymiz)
    if (player.heroDefendUsed && player.heroProtection > 0) {
      return {
        success: true,
        alreadyActive: true,
        protection: player.heroProtection,
        reason: `Allaqachon himoyadasiz — qalqon: ${player.heroProtection}`,
      };
    }
    // Avval ishlatilgan va qalqon tugagan
    if (player.heroDefendUsed && player.heroProtection <= 0) {
      return { success: false, reason: "Himoya ishlatilgan va tugagan. Profildan 'Himoyani yangilash' ni bosing." };
    }

    const { heroRepo } = await import("../database/repositories/hero.repository");
    const hero = await heroRepo.findByUser(player.userId);
    if (!hero || hero.protection <= 0) {
      return { success: false, reason: "Himoyangiz yo'q! Profilda 'Himoyani yangilash' ni bosing." };
    }

    player.heroProtectionAvailable = true;
    player.heroDefendUsed = true;
    player.heroProtection = hero.protection;
    return { success: true, protection: hero.protection };
  }

  // Geroy kunduz hujumi — HP + Protection tizimi
  // damage → avval Protection'dan ayriladi, qolgan qism HP'dan ayriladi
  async performHeroDayAttack(attackerPlayerId: number, targetPlayerId: number): Promise<{
    killed: boolean;
    damage: number;
    absorbedByProtection: number;
    hpDamage: number;
    remainingHP: number;
    remainingProtection: number;
    targetHasHero: boolean;
  } | null> {
    const attacker = this.getPlayer(attackerPlayerId);
    const target = this.getPlayer(targetPlayerId);
    if (!attacker || !target || !attacker.isAlive || !target.isAlive) return null;
    if (attackerPlayerId === targetPlayerId) return null;

    // Hujum kuchi — attacker.hero'dan random
    const { heroRepo } = await import("../database/repositories/hero.repository");
    const attackerHero = await heroRepo.findByUser(attacker.userId);
    if (!attackerHero) return null;
    const damage = Math.floor(Math.random() * (attackerHero.powerMax - attackerHero.powerMin + 1)) + attackerHero.powerMin;

    // Har bir o'yinchi 100 HP bilan boshlaydi (heroHP'ni umumiy HP sifatida qayta ishlatamiz).
    // Eski o'yinlarda heroHP=0 bo'lishi mumkin (migratsiya) — birinchi hujumda 100 deb hisoblaymiz.
    if (target.heroHP <= 0 && target.isAlive) {
      target.heroHP = 100;
    }

    // Geroy bor bo'lsa — avval Protection (qalqon) yutadi, qolgani HP'ga
    // Geroy yo'q — to'g'ridan-to'g'ri HP'ga
    const absorbed = target.hasHeroActive
      ? Math.min(damage, target.heroProtection)
      : 0;
    target.heroProtection -= absorbed;
    const hpDamage = damage - absorbed;
    target.heroHP -= hpDamage;

    if (target.heroProtection <= 0) {
      target.heroProtectionAvailable = false;
    }

    if (target.heroHP <= 0) {
      target.heroHP = 0;
      target.isAlive = false;
      playerRepo.kill(targetPlayerId, this.currentRound, "MAFIA_KILL").catch((e) =>
        logger.error(e, "Hero attack kill error")
      );
      return {
        killed: true, damage, absorbedByProtection: absorbed, hpDamage,
        remainingHP: 0, remainingProtection: target.heroProtection, targetHasHero: target.hasHeroActive,
      };
    }

    return {
      killed: false, damage, absorbedByProtection: absorbed, hpDamage,
      remainingHP: target.heroHP, remainingProtection: target.heroProtection, targetHasHero: target.hasHeroActive,
    };
  }

  getMafiaMembers(): PlayerState[] {
    return this.getAlivePlayers().filter((p) => MAFIA_ROLES.includes(p.role));
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  // ==================== ROLE ASSIGNMENT ====================

  async assignRoles(): Promise<{ refundUserIds: { userId: number; role: Role }[] }> {
    const playerCount = this.players.size;
    let availableRoles = await assignRoles(playerCount, this.settings);
    const refundUserIds: { userId: number; role: Role }[] = [];

    // O'yinchilarni aralashtirish (adolat uchun — bir xil rol sotgan o'yinchilar tarqatish tartibi random)
    const allPlayers = shuffle([...this.players.values()]);
    const playersWithPreferred = allPlayers.filter((p) => p.preferredRole);
    const assignedPlayers = new Set<number>();

    // ===== 1-BOSQICH: Aktiv rolga ega o'yinchilarga PRIORITET berish =====
    // Agar rol pool'da bo'lsa — beriladi. Yo'q bo'lsa — keyingi bosqichda oddiy rol oladi.
    for (const player of playersWithPreferred) {
      const role = player.preferredRole!;
      const idx = availableRoles.indexOf(role);
      if (idx >= 0) {
        player.role = role;
        await playerRepo.assignRole(player.playerId, role);
        availableRoles.splice(idx, 1);
        assignedPlayers.add(player.playerId);
        logger.info({ firstName: player.firstName, role }, "✅ Aktiv rol berildi");
      } else {
        logger.info(
          { firstName: player.firstName, role },
          "⚠️ Aktiv rol pool'da yo'q — oddiy rol beriladi"
        );
      }
    }

    // ===== 2-BOSQICH: Qolgan o'yinchilarga qolgan rollar =====
    // Ketma-ket 2 o'yinda bir xil rol tushmasligi uchun oldingi o'yin rollari hisobga olinadi.
    // Aktiv rol sotib olganlar (1-bosqich) bu cheklovga tushmaydi — ular rolni ataylab tanlagan.
    const rest = allPlayers.filter((p) => !assignedPlayers.has(p.playerId));
    const lastRoles = await this.fetchLastRoles(rest);

    for (const { player, role } of matchRolesAvoidingRepeat(rest, availableRoles, lastRoles)) {
      player.role = role;
      await playerRepo.assignRole(player.playerId, role);
      if (lastRoles.get(player.userId) === role) {
        // Pool'da boshqa variant qolmagan (mas. 4 kishilik o'yinda rollar deyarli qat'iy)
        logger.warn(
          { firstName: player.firstName, role },
          "⚠️ Rol takrorlandi — pool'da muqobil rol yo'q edi"
        );
      }
    }

    this.status = "STARTING";
    this.gameStartedAt = new Date();
    await gameRepo.updateStatus(this.gameId, "STARTING");

    // refundUserIds endi har doim bo'sh — pul qaytarilmaydi
    return { refundUserIds };
  }

  // O'yinchilarning oldingi o'yindagi rollari (userId -> Role).
  // DB xatosi rol tarqatishni TO'XTATMASLIGI kerak — bunday holda takror himoyasisiz davom etamiz.
  private async fetchLastRoles(players: PlayerState[]): Promise<Map<number, Role>> {
    if (players.length === 0) return new Map();
    try {
      const map = await playerRepo.getLastRoles(
        players.map((p) => p.userId),
        this.gameId
      );
      return map instanceof Map ? map : new Map();
    } catch (e) {
      logger.error(e, "Oldingi rollarni o'qib bo'lmadi — takror himoyasi bu o'yinda ishlamaydi");
      return new Map();
    }
  }

  // ==================== NIGHT PHASE ====================

  async startNight(): Promise<void> {
    this.currentRound++;
    this.status = "NIGHT";
    this.nightActions.clear();
    this.mafiaVotes = [];
    this.pendingNightRoles.clear();
    this.nightStartedAt = Date.now();

    this.sheriffShootTarget = null;
    this.robberTargetResponse = null;
    this.pendingSheriffCheck = null;
    this.nightSkips.clear();

    await gameRepo.updateStatus(this.gameId, "NIGHT");
    await gameRepo.incrementRound(this.gameId);

    // Reset tundagi holatlar
    for (const player of this.players.values()) {
      player.isBlocked = false;
      player.isProtectedByLawyer = false;
      player.isProtectedByWarlock = false;
      player.isHealedByDoctor = false;
      player.professorBoxes = undefined;
      player.professorChoice = undefined;
      player.isFramed = false;
      player.hunterAimPlayerId = undefined; // Ovchi har tun qayta mo'ljal oladi
      // Initialize charges for new night
      initCharges(player);
    }

    // Tunda harakat qiladigan tirik rollarni aniqlash
    const alive = this.getAlivePlayers();
    for (const player of alive) {
      if (this.isNightActiveForPlayer(player)) {
        this.pendingNightRoles.add(player.role);
      }
    }

    // Mafiya uchun bir marta qo'shish (DON va MAFIA birgalikda ovoz beradi)
    if (this.pendingNightRoles.has("DON") || this.pendingNightRoles.has("MAFIA")) {
      this.pendingNightRoles.delete("DON");
      this.pendingNightRoles.delete("MAFIA");
      this.pendingNightRoles.add("MAFIA"); // bitta slot
    }
  }

  isNightActiveRole(role: Role): boolean {
    const nightRoles: Role[] = [
      "HOOKER", "TRAITOR", "LAWYER", "SPY", "DON", "MAFIA", "LAB",
      "SHERIFF", "SERGEANT", "DOCTOR", "WARLOCK", "TRAMP",
      "KILLER", "SNIPER", "ARCHER", "MINER", "SNOWBOY", "SANTA",
      "ROBBER", "PROFESSOR", "CUPID", "BARMEN",
      "BODYGUARD", "HUNTER", "ORACLE", "FRAMER",
    ];
    return nightRoles.includes(role);
  }

  // Rol umumiy tungi rol bo'lsa ham, AYNAN SHU o'yinchi shu tunda harakat qila
  // oladimi — Kupidon faqat juftlik hali tanlanmagan bo'lsa harakat qiladi
  // (odatda 1-tun; uxlatilgan/mast qilingan bo'lsa keyingi tunda qayta urinadi).
  isNightActiveForPlayer(player: PlayerState): boolean {
    if (player.role === "CUPID") {
      return !this.cupidPick;
    }
    return this.isNightActiveRole(player.role);
  }

  // Kupidon juftligini saqlash (1-tun, callback'dan)
  setCupidPick(firstPlayerId: number, secondPlayerId: number): void {
    this.cupidPick = { first: firstPlayerId, second: secondPlayerId };
    this.persistSoon();
  }

  submitNightAction(actorPlayerId: number, targetPlayerId: number, role: Role): boolean {
    const actor = this.getPlayer(actorPlayerId);
    if (!actor || !actor.isAlive) return false;

    // Mafiya ovozi — bitta mafioz uchun bitta ovoz (qayta bosса — eski ovoz almashtiriladi)
    if (MAFIA_KILL_VOTERS.includes(role)) {
      const existing = this.mafiaVotes.find((v) => v.voterId === actorPlayerId);
      if (existing) {
        existing.targetId = targetPlayerId;
      } else {
        this.mafiaVotes.push({ voterId: actorPlayerId, targetId: targetPlayerId });
      }
      this.persistSoon();
      return true;
    }

    this.nightActions.set(role, { actorId: actorPlayerId, targetId: targetPlayerId });
    this.persistSoon();
    return true;
  }

  hasNightAction(role: Role, playerId: number): boolean {
    // Mafiya — mafiaVotes tekshirish
    if (MAFIA_KILL_VOTERS.includes(role)) {
      return this.mafiaVotes.some((v) => v.voterId === playerId);
    }
    return this.nightActions.has(role);
  }

  setSheriffShoot(targetPlayerId: number): void {
    this.sheriffShootTarget = targetPlayerId;
    this.persistSoon();
  }

  setPendingSheriffCheck(sheriffId: number, targetId: number, disguiseAsTown: boolean): void {
    this.pendingSheriffCheck = { sheriffId, targetId, disguiseAsTown };
    this.persistSoon();
  }

  setRobberResponse(choice: RobberResponse): void {
    this.robberTargetResponse = choice;
    this.persistSoon();
  }

  // O'yinchi ataylab "O'tkazish" bosdi — bu HARAKAT hisoblanadi (harakatsizlik emas)
  markNightSkip(playerId: number): void {
    this.nightSkips.add(playerId);
    this.persistSoon();
  }

  hasSkippedNight(playerId: number): boolean {
    return this.nightSkips.has(playerId);
  }

  markNightRoleDone(role: Role): void {
    if (MAFIA_KILL_VOTERS.includes(role)) {
      // Barcha mafiya ovoz berganda YOKI skip bosganda
      const aliveVoters = this.getAlivePlayers().filter((p) =>
        MAFIA_KILL_VOTERS.includes(p.role)
      );
      const doneCount = aliveVoters.filter(
        (p) =>
          this.mafiaVotes.some((v) => v.voterId === p.playerId) ||
          this.nightSkips.has(p.playerId)
      ).length;
      if (doneCount >= aliveVoters.length) {
        this.pendingNightRoles.delete("MAFIA");
      }
    } else {
      this.pendingNightRoles.delete(role);
    }
    this.persistSoon();
  }

  // Tun boshlangan vaqt — minimum tun muddatini hisoblash uchun
  private nightStartedAt: number = 0;

  // Hamma submit qilgan bo'lsa ham, MIN_NIGHT_RATIO ga yetmasa false qaytaradi
  // (mafiya chat qilishga va o'yin tezligi uchun)
  private static MIN_NIGHT_RATIO = 0.4; // 40% — 90s dan 36s minimum

  isNightComplete(): boolean {
    if (this.pendingNightRoles.size !== 0) return false;
    // Minimum tun muddatidan oldin tugamaydi
    if (this.nightStartedAt > 0) {
      const elapsedMs = Date.now() - this.nightStartedAt;
      const totalMs = this.settings.nightTimeout * 1000;
      const minMs = totalMs * GameEngine.MIN_NIGHT_RATIO;
      if (elapsedMs < minMs) return false;
    }
    return true;
  }

  // Professor qutilari — nishonga 3 ta aralashtirilgan quti tayyorlaydi.
  // Agar Professor bloklangan bo'lsa yoki nishon topilmasa null qaytaradi.
  prepareProfessorBoxes(targetPlayerId: number): ("DEATH" | "EMPTY" | "HERO")[] | null {
    const professorAction = this.nightActions.get("PROFESSOR");
    if (!professorAction) return null;
    const actor = this.getPlayer(professorAction.actorId);
    const target = this.getPlayer(targetPlayerId);
    if (!actor || !target || actor.isBlocked) return null;

    const boxes: ("DEATH" | "EMPTY" | "HERO")[] = ["DEATH", "EMPTY", "HERO"];
    for (let i = boxes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [boxes[i], boxes[j]] = [boxes[j], boxes[i]];
    }
    target.professorBoxes = boxes;
    target.professorChoice = undefined;
    return boxes;
  }

  // Nishon qutini tanlaganda chaqiriladi. Natija nomini qaytaradi.
  // Agar allaqachon tanlangan bo'lsa yoki qutilar tayyorlanmagan bo'lsa null.
  resolveProfessorChoice(targetPlayerId: number, index: number): "DEATH" | "EMPTY" | "HERO" | null {
    const target = this.getPlayer(targetPlayerId);
    if (!target || !target.professorBoxes) return null;
    if (target.professorChoice !== undefined) return null;
    if (index < 0 || index >= target.professorBoxes.length) return null;
    target.professorChoice = index;
    return target.professorBoxes[index];
  }

  // Kecha natijalarini hisoblash
  processNightActions(): NightResult {
    const result: NightResult = { killed: [], saved: [], events: [] };
    const killTargets: Map<number, DeathCause> = new Map();
    const healedTargets: Set<number> = new Set();
    const visitorsMap: Map<number, number[]> = new Map(); // targetId -> visitorIds
    // Snayper o'q uzgan nishonlar. killTargets — Map bo'lgani uchun undan KEYIN
    // ishlaydigan rollar (Kamonchi, Qorbola, Qaroqchi, Professor) sababni almashtirib
    // yuborishi mumkin edi — natijada "cause !== SNIPER_KILL" tekshiruvi aldanib,
    // Shield va Tan qo'riqchisi snayper o'qini to'sib qolardi. Endi sabab emas,
    // MANA SHU ro'yxat asos qilib olinadi (Shifokordagi healedTargets.delete kabi).
    const sniperTargets: Set<number> = new Set();
    // Kim kimni o'ldirdi: targetId -> actorId. Ikki narsa uchun kerak:
    //   1) Kamikaze tunda o'ldirilsa — o'ldirgan odam ham portlashdan o'ladi
    //   2) "Snayper o'qi" predmeti — qotilda o'q bo'lsa uning zarbasi himoyani yorib o'tadi
    // Sababsiz o'limlarda (INACTIVE) actor bo'lmaydi.
    const killActors: Map<number, number> = new Map();
    const setKill = (targetId: number, cause: DeathCause, actorId: number | null): void => {
      killTargets.set(targetId, cause);
      if (actorId !== null) killActors.set(targetId, actorId);
      else killActors.delete(targetId);
    };

    // 1. Kezuvchi bloklashi
    const hookerAction = this.nightActions.get("HOOKER");
    if (hookerAction) {
      const actor = this.getPlayer(hookerAction.actorId);
      const target = this.getPlayer(hookerAction.targetId);
      if (actor && target && !actor.isBlocked) {
        // Kezuvchi komissarni uxlatishi taqiqlanadi (PRD)
        if (target.role === "SHERIFF") {
          result.events.push({
            type: "HOOKER_BLOCK_FAILED",
            actorId: hookerAction.actorId,
            targetId: hookerAction.targetId,
            message: `Kezuvchi komissarni uxlata olmadi`,
            privateMessage: `💃 Komissarni uxlatib bo'lmaydi! Tanlang: boshqa kishini tanlang.`,
          });
        } else {
          target.isBlocked = true;
          this.addVisitor(visitorsMap, hookerAction.targetId, hookerAction.actorId);
          result.events.push({
            type: "HOOKER_BLOCK",
            actorId: hookerAction.actorId,
            targetId: hookerAction.targetId,
            message: `Kezuvchi blokladi`,
            privateMessage: `💃 Siz bir kishini blokladingiz. Uning roli oshkor qilinmaydi.`,
            // Nishonga xabar — aks holda o'yinchi harakati nega ishlamaganini bilmaydi
            targetPrivateMessage: `💃 <b>Bu tunda sizni uxlatishdi!</b>\nTundagi harakatingiz bekor qilindi va ertaga kunduzi ham hech narsa qila olmaysiz — ovoz berish, hujum va guruhda yozish taqiqlanadi.`,
          });
        }
      }
    }

    // 1b. Barmen — ichirish: 50% nishon rolini bilib oladi, 50% nishonni mast qiladi
    // (mastlik = tungi harakati bekor; Kezuvchidan farqli — ertasi kunga ta'sir qilmaydi)
    let barmenDrunkTargetId: number | null = null;
    const barmenAction = this.nightActions.get("BARMEN");
    if (barmenAction) {
      const actor = this.getPlayer(barmenAction.actorId);
      const target = this.getPlayer(barmenAction.targetId);
      if (actor && target && !actor.isBlocked) {
        if (Math.random() < 0.5) {
          // Rol ochiladi
          result.events.push({
            type: "BARMEN_REVEAL",
            actorId: barmenAction.actorId,
            targetId: barmenAction.targetId,
            message: `Barmen rolni bildi`,
            privateMessage: `🍺 Ichish chog'ida <b>${escapeHtml(target.firstName)}</b> tilini bo'shatib yubordi — u ${ROLE_EMOJI[target.role]} <b>${ROLE_NAME[target.role]}</b> ekan!`,
            targetPrivateMessage: `🍺 Bu tunda Barmen bilan qittak-qittak qildingiz. Ertalab boshingiz og'riyapti...`,
          });
        } else {
          // Mast qilish — tungi harakati bekor (faqat shu tunga)
          if (!target.isBlocked) barmenDrunkTargetId = target.playerId;
          target.isBlocked = true;
          result.events.push({
            type: "BARMEN_DRUNK",
            actorId: barmenAction.actorId,
            targetId: barmenAction.targetId,
            message: `Barmen mast qildi`,
            privateMessage: `🍺 <b>${escapeHtml(target.firstName)}</b>ni rosa ichirdingiz — u mast bo'lib uxlab qoldi, bu tun hech narsa qila olmaydi.`,
            targetPrivateMessage: `🍺 <b>Barmen sizni ichirib mast qildi!</b>\nTundagi harakatingiz bekor bo'ldi.`,
          });
        }
        this.addVisitor(visitorsMap, barmenAction.targetId, barmenAction.actorId);
      }
    }

    // 1c. Kupidon — sevishganlarni bog'lash (faqat 1-tunda tanlangan bo'ladi)
    const cupidAction = this.nightActions.get("CUPID");
    if (cupidAction && this.cupidPick) {
      const actor = this.getPlayer(cupidAction.actorId);
      const loverA = this.getPlayer(this.cupidPick.first);
      const loverB = this.getPlayer(this.cupidPick.second);
      if (actor && loverA && loverB && !actor.isBlocked && loverA.playerId !== loverB.playerId) {
        loverA.loverPlayerId = loverB.playerId;
        loverB.loverPlayerId = loverA.playerId;
        result.events.push({
          type: "CUPID_MATCH",
          actorId: cupidAction.actorId,
          message: `Kupidon sevishtirdi`,
          privateMessage: `💘 Siz <b>${escapeHtml(loverA.firstName)}</b> va <b>${escapeHtml(loverB.firstName)}</b>ni sevishtirdingiz!`,
        });
        result.events.push({
          type: "CUPID_LOVER",
          actorId: cupidAction.actorId,
          targetId: loverA.playerId,
          message: "",
          targetPrivateMessage: `💘 <b>Siz sevib qoldingiz!</b>\nJuftingiz: <b>${escapeHtml(loverB.firstName)}</b>\nAgar u o'lsa — siz ham qayg'udan o'lasiz. Uni asrang!`,
        });
        result.events.push({
          type: "CUPID_LOVER",
          actorId: cupidAction.actorId,
          targetId: loverB.playerId,
          message: "",
          targetPrivateMessage: `💘 <b>Siz sevib qoldingiz!</b>\nJuftingiz: <b>${escapeHtml(loverA.firstName)}</b>\nAgar u o'lsa — siz ham qayg'udan o'lasiz. Uni asrang!`,
        });
      } else if (actor && actor.isBlocked) {
        // Kupidon uxlatilgan — juftlik bog'lanmadi, imkoniyat keyingi tunga o'tadi
        this.cupidPick = null;
        this.nightActions.delete("CUPID");
      }
    }

    // 1d. Ovchi — mo'ljal olish (o'lsa o'q avtomatik uziladi)
    const hunterAction = this.nightActions.get("HUNTER");
    if (hunterAction) {
      const actor = this.getPlayer(hunterAction.actorId);
      const target = this.getPlayer(hunterAction.targetId);
      if (actor && target && !actor.isBlocked) {
        actor.hunterAimPlayerId = hunterAction.targetId;
        result.events.push({
          type: "HUNTER_AIM",
          actorId: hunterAction.actorId,
          targetId: hunterAction.targetId,
          message: `Ovchi mo'ljal oldi`,
          privateMessage: `🔫 Siz <b>${escapeHtml(target.firstName)}</b>ni mo'ljalga oldingiz.\nAgar bugun o'lsangiz — miltiq o'z-o'zidan otiladi!`,
        });
        // Ovchi uydan mo'ljal oladi — tashrif YO'Q (Daydi ko'rmaydi)
      }
    }

    // 1e. Tuhmatchi — tinch aholiga tuhmat: shu tunda Komissar/Folbin uni "yovuz" ko'radi
    const framerAction = this.nightActions.get("FRAMER");
    if (framerAction) {
      const actor = this.getPlayer(framerAction.actorId);
      const target = this.getPlayer(framerAction.targetId);
      if (actor && target && !actor.isBlocked) {
        target.isFramed = true;
        result.events.push({
          type: "FRAMER_FRAME",
          actorId: framerAction.actorId,
          targetId: framerAction.targetId,
          message: `Tuhmatchi tuhmat qildi`,
          privateMessage: `🎭 Siz <b>${escapeHtml(target.firstName)}</b>ga tuhmat qildingiz.\nBu tunda Komissar uni tekshirsa — "Mafiya" deb ko'radi!`,
        });
        this.addVisitor(visitorsMap, framerAction.targetId, framerAction.actorId);
      }
    }

    // 2. Sotqin tanlovi
    const traitorAction = this.nightActions.get("TRAITOR");
    if (traitorAction) {
      const actor = this.getPlayer(traitorAction.actorId);
      const target = this.getPlayer(traitorAction.targetId);
      if (actor && target && !actor.isBlocked) {
        const targetTeam = ROLE_TEAM[target.role];
        let newRole: Role;
        let message: string;

        if (targetTeam === Team.MAFIA) {
          newRole = "MAFIA";
          message = `mafiya tarafida! Endi siz Mafiya`;
        } else if (targetTeam === Team.TOWN) {
          newRole = "SERGEANT";
          message = `tinch axoli! Endi siz Serjant`;
        } else {
          newRole = "KILLER";
          message = `yakka rol! Endi siz Qotil`;
        }

        actor.role = newRole;
        actor.originalRole = "TRAITOR";
        result.events.push({
          type: "TRAITOR_CHANGE",
          actorId: traitorAction.actorId,
          targetId: traitorAction.targetId,
          message: `Sotqin rol o'zgartirdi`,
          privateMessage: message,
        });
      }
    }

    // 3. Advokat himoyasi
    const lawyerAction = this.nightActions.get("LAWYER");
    if (lawyerAction) {
      const actor = this.getPlayer(lawyerAction.actorId);
      if (actor && !actor.isBlocked) {
        const target = this.getPlayer(lawyerAction.targetId);
        if (target) target.isProtectedByLawyer = true;
      }
    }

    // 4. Ayg'oqchi tekshiruvi — Hujjat himoyasi ham ishlaydi (mafiya/yakka tinch axoli bo'lib ko'rinadi)
    const spyAction = this.nightActions.get("SPY");
    if (spyAction) {
      const actor = this.getPlayer(spyAction.actorId);
      const target = this.getPlayer(spyAction.targetId);
      if (actor && target && !actor.isBlocked) {
        // Ayg'oqchi o'zini tekshira olmasin
        if (spyAction.actorId === spyAction.targetId) {
          result.events.push({
            type: "SPY_CHECK_SELF",
            actorId: spyAction.actorId,
            targetId: spyAction.targetId,
            message: `Ayg'oqchi o'zini tekshira olmadi`,
            privateMessage: `🦇 O'zingizni tekshira olmaysiz!`,
          });
        } else {
          const targetTeam = ROLE_TEAM[target.role];
          const isBadRole = targetTeam === Team.MAFIA || targetTeam === Team.SOLO;
          const spyHiddenByDoc = target.hasDocumentActive && isBadRole;
          if (spyHiddenByDoc) {
            target.hasDocumentActive = false;
            try {
              // Nishonga xabar — hujjat sarflandi
              // (async — engine imkon bersa)
            } catch { /* ignore */ }
          }

          const displayRole: Role = spyHiddenByDoc ? "CIVILIAN" : target.role;
          const displayEmoji = ROLE_EMOJI[displayRole] || "";
          const displayName = ROLE_NAME[displayRole] || displayRole;

          result.events.push({
            type: "SPY_CHECK",
            actorId: spyAction.actorId,
            targetId: spyAction.targetId,
            message: `Ayg'oqchi tekshirdi`,
            privateMessage: `🦇 <b>${escapeHtml(target.firstName)}</b> — ${displayName} ${displayEmoji}`,
            targetPrivateMessage: spyHiddenByDoc
              ? `📜 Sizning hujjatingiz ishlatildi! Ayg'oqchi sizni tinch axoli deb ko'rdi.`
              : undefined,
          });
        }
      }
    }

    // 4b. Folbin — aura tekshiruvi (aniq rol emas, faqat yaxshi/yovuz)
    const oracleAction = this.nightActions.get("ORACLE");
    if (oracleAction) {
      const actor = this.getPlayer(oracleAction.actorId);
      const target = this.getPlayer(oracleAction.targetId);
      if (actor && target && !actor.isBlocked && oracleAction.actorId !== oracleAction.targetId) {
        const targetTeam = ROLE_TEAM[target.role];
        // Tuhmat qilingan bo'lsa — yovuz ko'rinadi; aks holda jamoa bo'yicha
        const isEvil = target.isFramed || targetTeam !== Team.TOWN;
        result.events.push({
          type: "ORACLE_CHECK",
          actorId: oracleAction.actorId,
          targetId: oracleAction.targetId,
          message: `Folbin aurani ko'rdi`,
          privateMessage: isEvil
            ? `🔮 <b>${escapeHtml(target.firstName)}</b>ning aurasi: 😈 <b>YOVUZ</b>`
            : `🔮 <b>${escapeHtml(target.firstName)}</b>ning aurasi: 😇 <b>Yaxshi</b>`,
        });
        this.addVisitor(visitorsMap, oracleAction.targetId, oracleAction.actorId);
      }
    }

    // 5. Mafiya o'ldirishi (mafiya o'z jamoasini o'ldira olmaydi)
    const mafiaTarget = this.resolveMafiaKill();
    if (mafiaTarget !== null) {
      const mafiaVictim = this.getPlayer(mafiaTarget);
      // Mafiya jamoasini o'ldirmaslik
      if (mafiaVictim && ROLE_TEAM[mafiaVictim.role] !== Team.MAFIA) {
        // Mafiya jamoaviy o'ldiradi — "qotil" sifatida qaror ovozini bergan
        // mafioz olinadi (Kamikaze portlashi va Snayper o'qi shunga bog'lanadi).
        setKill(mafiaTarget, "MAFIA_KILL", this.resolveMafiaKiller(mafiaTarget));
        this.addVisitor(visitorsMap, mafiaTarget, -1);
      }
    }

    // 6. Labarant harakati
    const labAction = this.nightActions.get("LAB");
    if (labAction) {
      const actor = this.getPlayer(labAction.actorId);
      const target = this.getPlayer(labAction.targetId);
      if (actor && target && !actor.isBlocked) {
        if (ROLE_TEAM[target.role] === Team.MAFIA) {
          // Mafiya tarafida — davolaydi
          healedTargets.add(labAction.targetId);
          result.events.push({
            type: "LAB_HEAL",
            actorId: labAction.actorId,
            targetId: labAction.targetId,
            message: `Labarant davoladi`,
            privateMessage: "mafiya tarafida, davoladingiz",
          });
        } else {
          // Mafiya emas — o'ldiradi
          setKill(labAction.targetId, "LAB_KILL", labAction.actorId);
          result.events.push({
            type: "LAB_KILL",
            actorId: labAction.actorId,
            targetId: labAction.targetId,
            message: `Labarant o'ldirdi`,
            privateMessage: "mafiya emas, o'ldirdingiz",
          });
        }
        this.addVisitor(visitorsMap, labAction.targetId, labAction.actorId);
      }
    }

    // 7. Komissar tekshiruvi YOKI otish
    const sheriffAction = this.nightActions.get("SHERIFF");
    if (sheriffAction) {
      const actor = this.getPlayer(sheriffAction.actorId);
      const target = this.getPlayer(sheriffAction.targetId);
      if (actor && target && !actor.isBlocked) {
        if (this.sheriffShootTarget === sheriffAction.targetId) {
          // OTISH — komissar nishonni o'ldiradi (kimligidan qat'i nazar)
          // PRD: Birinchi tunda o'tish TAQIQLANADI
          if (this.currentRound === 1) {
            // Birinchi tunda o'tish mumkin emas — xabar beramiz
            result.events.push({
              type: "SHERIFF_SHOOT_BLOCKED",
              actorId: sheriffAction.actorId,
              targetId: sheriffAction.targetId,
              message: `Komissar birinchi tunda o'ta olmadi`,
              privateMessage: `🔫 Birinchi tunda o'tish taqiqlangan! Siz faqat tekshira olasiz.`,
            });
          } else {
            setKill(sheriffAction.targetId, "SHERIFF_KILL", sheriffAction.actorId);
            result.events.push({
              type: "SHERIFF_SHOOT_HIT",
              actorId: sheriffAction.actorId,
              targetId: sheriffAction.targetId,
              message: `Komissar otdi`,
            });
          }
        } else {
          // TEKSHIRISH — natija tongda (DM) yuboriladi
          const actuallyMafia = ROLE_TEAM[target.role] === Team.MAFIA;

          // Nishonga ogohlantirish — Komissar uni tekshirdi
          result.events.push({
            type: "SHERIFF_CHECK_NOTIFY",
            actorId: sheriffAction.actorId,
            targetId: sheriffAction.targetId,
            message: "",
            targetPrivateMessage: `🕵🏻‍♂ <b>Komissar sizning rolingizga qiziqdi.</b>`,
          });

          // Komissarning o'ziga natija — tongda DM
          if (this.pendingSheriffCheck) {
            // Yashirinish: Hujjat (submit paytida aniqlangan) YOKI Advokat himoyasi.
            // Advokat himoyasi AYNAN SHU YERDA tekshiriladi — isProtectedByLawyer
            // 3-qadamda (bu qadamdan oldin) o'rnatilib bo'lgan.
            const disguised =
              this.pendingSheriffCheck.disguiseAsTown ||
              (actuallyMafia && target.isProtectedByLawyer);
            // Tuhmatchi tuhmat qilgan tinch odam — "Mafiya" bo'lib ko'rinadi
            const framed = !disguised && !actuallyMafia && target.isFramed;
            const displayRole: Role = disguised ? "CIVILIAN" : framed ? "MAFIA" : target.role;
            const displayEmoji = ROLE_EMOJI[displayRole] || "";
            const displayName = ROLE_NAME[displayRole] || displayRole;

            result.events.push({
              type: "SHERIFF_CHECK_RESULT",
              actorId: sheriffAction.actorId,
              targetId: sheriffAction.targetId,
              message: "",
              privateMessage:
                `🔎 <b>${escapeHtml(target.firstName)}</b> — ${displayName} ${displayEmoji}`,
            });
          }

          // Advokat himoyasi ishlagan bo'lsa — advokatga xabar
          if (actuallyMafia && target.isProtectedByLawyer && lawyerAction) {
            result.events.push({
              type: "LAWYER_PROTECT_SUCCESS",
              actorId: lawyerAction.actorId,
              targetId: sheriffAction.targetId,
              message: `Advokat himoyasi ishladi`,
              privateMessage: `👨🏼‍💼 Sizning himoyangiz ishladi! Komissar ${escapeHtml(target.firstName)}ni tinch axoli deb ko'rdi.`,
            });
          }
        }
        this.addVisitor(visitorsMap, sheriffAction.targetId, sheriffAction.actorId);
      }
    }

    // 8. Serjant ma'lumoti — Komissar kimni tekshirgani haqida
    const sergeantAction = this.nightActions.get("SERGEANT");
    if (sergeantAction) {
      const actor = this.getPlayer(sergeantAction.actorId);
      if (actor && !actor.isBlocked) {
        const sheriffAlive = this.getAlivePlayers().some((p) => p.role === "SHERIFF");

        let info: string;
        if (!sheriffAlive) {
          info = "👮🏻‍♂ Komissar vafot etdi! Endi siz yangi <b>Komissar</b>siz!";
        } else if (sheriffAction) {
          const sheriffTarget = this.getPlayer(sheriffAction.targetId);
          if (this.sheriffShootTarget) {
            info = `👮🏻‍♂ Komissar bu tunda <b>${escapeHtml(sheriffTarget?.firstName ?? "")}</b>ga 🔫 o'q uzdi.`;
          } else {
            info = `👮🏻‍♂ Komissar bu tunda <b>${escapeHtml(sheriffTarget?.firstName ?? "")}</b>ni 🔍 tekshirdi.`;
          }
        } else {
          info = "👮🏻‍♂ Komissar bu tunda hech narsa qilmadi.";
        }

        result.events.push({
          type: "SERGEANT_INFO",
          actorId: sergeantAction.actorId,
          message: `Serjant ma'lumot oldi`,
          privateMessage: info,
        });
      }
    }

    // 9. Shifokor davolashi
    const doctorAction = this.nightActions.get("DOCTOR");
    if (doctorAction) {
      const actor = this.getPlayer(doctorAction.actorId);
      const doctorTarget = this.getPlayer(doctorAction.targetId);
      if (actor && doctorTarget && !actor.isBlocked) {
        // O'zini davolash cheklovi: faqat 1 marta o'yin davomida
        if (doctorAction.actorId === doctorAction.targetId && actor.doctorSelfHealUsed) {
          // Allaqachon o'zini davolagan — bu tun davolay olmaydi
        } else {
          healedTargets.add(doctorAction.targetId);
          // O'zini davolash tekshiruvi
          if (doctorAction.actorId === doctorAction.targetId) {
            actor.doctorSelfHealUsed = true;
          }
          this.addVisitor(visitorsMap, doctorAction.targetId, doctorAction.actorId);

          // Shifokorga tasdiq + nishonga (agar o'zi emas) xabar
          const targetMsg = doctorAction.actorId !== doctorAction.targetId
            ? `👨🏼‍⚕️ <b>Shifokor sizni davolash uchun uyingizga keldi.</b>`
            : undefined;
          result.events.push({
            type: "DOCTOR_HEAL_NOTIFY",
            actorId: doctorAction.actorId,
            targetId: doctorAction.targetId,
            message: "",
            privateMessage: `👨🏼‍⚕️ Siz <b>${escapeHtml(doctorTarget.firstName)}</b>ni davoladingiz.`,
            targetPrivateMessage: targetMsg,
          });
        }
      }
    }

    // 10. Koldun harakati - ZARYAD CHEKLANGAN (1 marta o'ldirish)
        const warlockAction = this.nightActions.get("WARLOCK");
        if (warlockAction) {
          const actor = this.getPlayer(warlockAction.actorId);
          const target = this.getPlayer(warlockAction.targetId);
          if (actor && target && !actor.isBlocked) {
            if (ROLE_TEAM[target.role] === Team.TOWN) {
              // Tinch axoli — osilishdan saqlaydi (kunduzgi ovozdan himoya)
              target.isProtectedByWarlock = true;
              result.events.push({
                type: "WARLOCK_SAVE",
                actorId: warlockAction.actorId,
                targetId: warlockAction.targetId,
                message: `Koldun saqladi`,
                privateMessage: "tinch axoli, osilishdan saqladingiz",
              });
            } else {
              // Boshqa taraf — o'ldiradi (1 marta zaryad)
              if (!hasCharge(actor, "WARLOCK")) {
                result.events.push({
                  type: "WARLOCK_NO_CHARGE",
                  actorId: warlockAction.actorId,
                  message: "Koldunning o'ldirish zaryadi tugagan",
                  privateMessage: "⚡️ Sizning o'ldirish zaryadingiz tugagan! Bu tunda o'ldira olmaysiz.",
                });
              } else {
                setKill(warlockAction.targetId, "WARLOCK_KILL", warlockAction.actorId);
                useCharge(actor, "WARLOCK");
                result.events.push({
                  type: "WARLOCK_KILL",
                  actorId: warlockAction.actorId,
                  targetId: warlockAction.targetId,
                  message: `Koldun o'ldirdi`,
                  privateMessage: `dushman, o'ldirdingiz! Qoldiq: ${actor.chargesLeft?.WARLOCK ?? 0}`,
                });
              }
            }
            this.addVisitor(visitorsMap, warlockAction.targetId, warlockAction.actorId);
          }
        }

            // 11. Daydi tashrifi — bu yerda faqat "keldi" deb yoziladi.
            // Kuzatuv HISOBOTI 19-b qadamda, barcha tashriflar yozilib bo'lgach tuziladi.
            // (Aks holda Qotil, Qorbola, Qorbobo, Qaroqchi va Professor hisobotga tushmay qolardi.)
            const trampAction = this.nightActions.get("TRAMP");
            const trampActor = trampAction ? this.getPlayer(trampAction.actorId) : undefined;
            const trampActive = !!(trampAction && trampActor && !trampActor.isBlocked);
            if (trampAction && trampActive) {
              // Daydi o'zi ham visitor sifatida yoziladi (Minior uni ko'rishi uchun)
              this.addVisitor(visitorsMap, trampAction.targetId, trampAction.actorId);
            }

            // 12. Minior mina qo'yishi (Daydi dan keyin — Daydi kelganini ko'ra olishi uchun)
            const minerAction = this.nightActions.get("MINER");
            if (minerAction) {
              const actor = this.getPlayer(minerAction.actorId);
              if (actor && !actor.isBlocked) {
                const visitors = visitorsMap.get(minerAction.targetId) || [];
                for (const visitorId of visitors) {
                  if (visitorId !== -1 && visitorId !== minerAction.actorId) {
                    setKill(visitorId, "MINER_KILL", minerAction.actorId);
                  }
                }
                // Agar mafiya ham kelgan bo'lsa (targetni o'ldirmoqchi)
                if (killTargets.get(minerAction.targetId) === "MAFIA_KILL") {
                  // Mafiya a'zolari ham mina portlashidan o'lmaydi, faqat tashrif buyurganlar
                }
              }
            }

            // 13. Qotil o'ldirishi
            const killerAction = this.nightActions.get("KILLER");
            if (killerAction) {
              const actor = this.getPlayer(killerAction.actorId);
              if (actor && !actor.isBlocked) {
                setKill(killerAction.targetId, "KILLER_KILL", killerAction.actorId);
                this.addVisitor(visitorsMap, killerAction.targetId, killerAction.actorId);
              }
            }

            // 14. Snayperchi o'ldirishi (himoyani ham o'tadi) - ZARYAD CHEKLANGAN
            const sniperAction = this.nightActions.get("SNIPER");
            if (sniperAction) {
              const actor = this.getPlayer(sniperAction.actorId);
              if (actor && !actor.isBlocked) {
                // Zaryad tekshiruvi
                if (!hasCharge(actor, "SNIPER")) {
                  result.events.push({
                    type: "SNIPER_NO_CHARGE",
                    actorId: sniperAction.actorId,
                    message: "Snayperchi zaryadlari tugagan",
                    privateMessage: "🔫 Sizning o'qlaringiz tugagan! Bu tunda o'ta olmaysiz.",
                  });
                } else {
                  // Snayperchi — himoyani ham o'tadi, shuning uchun healedTargets dan olib tashlaymiz
                  healedTargets.delete(sniperAction.targetId);
                  sniperTargets.add(sniperAction.targetId);
                  setKill(sniperAction.targetId, "SNIPER_KILL", sniperAction.actorId);
                  // Daydi ko'rmaydi — visitor qo'shmaymiz
                  useCharge(actor, "SNIPER");
                  result.events.push({
                    type: "SNIPER_SHOT",
                    actorId: sniperAction.actorId,
                    targetId: sniperAction.targetId,
                    message: "Snayperchi o'q uzdi",
                    privateMessage: `🔫 Siz o'q uzdingiz! Qoldiq zaryadlar: ${actor.chargesLeft?.SNIPER ?? 0}`,
                  });
                }
              }
            }

    // 15. Kamonchi o'ldirishi (maxfiy — daydi sezmaydi) - ZARYAD CHEKLANGAN
                const archerAction = this.nightActions.get("ARCHER");
                if (archerAction) {
                  const actor = this.getPlayer(archerAction.actorId);
                  if (actor && !actor.isBlocked) {
                    if (!hasCharge(actor, "ARCHER")) {
                      result.events.push({
                        type: "ARCHER_NO_CHARGE",
                        actorId: archerAction.actorId,
                        message: "Kamonchi o'qlari tugagan",
                        privateMessage: "🏹 Sizning o'qlaringiz tugagan! Bu tunda o'ta olmaysiz.",
                      });
                    } else {
                      setKill(archerAction.targetId, "ARCHER_KILL", archerAction.actorId);
                      useCharge(actor, "ARCHER");
                      result.events.push({
                        type: "ARCHER_SHOT",
                        actorId: archerAction.actorId,
                        targetId: archerAction.targetId,
                        message: "Kamonchi o'q uzdi",
                        privateMessage: `🏹 Siz o'q uzdingiz! Qoldiq o'qlar: ${actor.chargesLeft?.ARCHER ?? 0}`,
                      });
                    }
                  }
                }

    // 16. Qorbola qorbo'roni - ZARYAD CHEKLANGAN (1 qorbo'ron)
    const snowboyAction = this.nightActions.get("SNOWBOY");
    if (snowboyAction) {
      const actor = this.getPlayer(snowboyAction.actorId);
      if (actor && !actor.isBlocked) {
        if (!hasCharge(actor, "SNOWBOY")) {
          result.events.push({
            type: "SNOWBOY_NO_CHARGE",
            actorId: snowboyAction.actorId,
            message: "Qorbolaning qorbo'ronlari tugagan",
            privateMessage: "⛄️ Sizning qorbo'ronlaringiz tugagan! Bu tunda o'ta olmaysiz.",
          });
        } else {
          setKill(snowboyAction.targetId, "SNOWBOY_KILL", snowboyAction.actorId);
          useCharge(actor, "SNOWBOY");
          this.addVisitor(visitorsMap, snowboyAction.targetId, snowboyAction.actorId);
          result.events.push({
            type: "SNOWBOY_KILL",
            actorId: snowboyAction.actorId,
            targetId: snowboyAction.targetId,
            message: "Qorbola qorbo'ron qildi",
            privateMessage: `⛄️ Siz qorbo'ron qoldingiz! Qoldiq: ${actor.chargesLeft?.SNOWBOY ?? 0}`,
          });
        }
      }
    }

    // 17. Qorbobo sovg'asi
    const santaAction = this.nightActions.get("SANTA");
    if (santaAction) {
      const actor = this.getPlayer(santaAction.actorId);
      const santaTarget = this.getPlayer(santaAction.targetId);
      if (actor && santaTarget && !actor.isBlocked) {
        // Qorbobo o'ziga sovg'a bera olmasin
        if (santaAction.actorId === santaAction.targetId) {
          result.events.push({
            type: "SANTA_GIFT_SELF",
            actorId: santaAction.actorId,
            targetId: santaAction.targetId,
            message: `Qorbobo o'ziga sovg'a bera olmadi`,
            privateMessage: `🎅🏻 O'zingizga sovg'a bera olmaysiz!`,
          });
        } else {
          result.events.push({
            type: "SANTA_GIFT",
            actorId: santaAction.actorId,
            targetId: santaAction.targetId,
            message: `Qorbobo sovg'a berdi`,
            privateMessage: `🎅🏻 Siz ${escapeHtml(santaTarget.firstName)}ga sovg'a berdingiz! (+${SANTA_GIFT_AMOUNT}💰)`,
            targetPrivateMessage: `🎅🏻 Tunda sizga Qorbobo sovg'a qoldirdi! (+${SANTA_GIFT_AMOUNT}💰)`,
          });
          this.addVisitor(visitorsMap, santaAction.targetId, santaAction.actorId);
        }
      }
    }

    // 18. Qaroqchi — pul undirish yoki o'ldirish
    const robberAction = this.nightActions.get("ROBBER");
    if (robberAction) {
      const actor = this.getPlayer(robberAction.actorId);
      const target = this.getPlayer(robberAction.targetId);
      if (actor && target && !actor.isBlocked) {
        const response = this.robberTargetResponse ?? "PAY"; // default PAY
        if (response === "PAY") {
          result.events.push({
            type: "ROBBER_ROB",
            actorId: robberAction.actorId,
            targetId: robberAction.targetId,
            message: `Qaroqchi pul undirdi`,
            privateMessage: `👺 ${escapeHtml(target.firstName)}dan 100 pul undirdingiz`,
            targetPrivateMessage: `👺 Tunda siznikiga qaroqchi keldi va 100 pul olib ketdi!`,
          });
        } else {
          setKill(robberAction.targetId, "ROBBER_KILL", robberAction.actorId);
          result.events.push({
            type: "ROBBER_KILL",
            actorId: robberAction.actorId,
            targetId: robberAction.targetId,
            message: `Qaroqchi o'ldirdi`,
            privateMessage: `👺 ${escapeHtml(target.firstName)} bosh tortdi — o'ldirdingiz`,
          });
        }
        this.addVisitor(visitorsMap, robberAction.targetId, robberAction.actorId);
      }
    }

    // 19. Professor — nishon tanlagan quti (yoki tanlamagan bo'lsa random) natijasini qo'llash
    const professorAction = this.nightActions.get("PROFESSOR");
    if (professorAction) {
      const actor = this.getPlayer(professorAction.actorId);
      const target = this.getPlayer(professorAction.targetId);
      if (actor && target && !actor.isBlocked) {
        // Qutilar tayyorlanmagan bo'lsa (masalan, callback ishlamagan) — hozir tayyorlaymiz
        if (!target.professorBoxes) {
          this.prepareProfessorBoxes(professorAction.targetId);
        }
        // Nishon tanlamagan bo'lsa — default random
        let idx = target.professorChoice;
        if (idx === undefined && target.professorBoxes) {
          idx = Math.floor(Math.random() * target.professorBoxes.length);
          target.professorChoice = idx;
        }
        const outcome = target.professorBoxes ? target.professorBoxes[idx!] : null;
        if (outcome === "DEATH") {
          setKill(professorAction.targetId, "PROFESSOR_KILL", professorAction.actorId);
          result.events.push({
            type: "PROFESSOR_DEATH",
            actorId: professorAction.actorId,
            targetId: professorAction.targetId,
            message: `Professor qutisidan o'lim chiqdi`,
            privateMessage: `🎩 ${escapeHtml(target.firstName)} qutidan o'lim chiqardi!`,
            targetPrivateMessage: `🎩 Professor qutisini ochdingiz... ⚰️ O'lim chiqdi!`,
          });
        } else if (outcome === "EMPTY") {
          result.events.push({
            type: "PROFESSOR_EMPTY",
            actorId: professorAction.actorId,
            targetId: professorAction.targetId,
            message: `Professor qutisi bo'sh chiqdi`,
            privateMessage: `🎩 ${escapeHtml(target.firstName)} bo'sh qutini tanladi.`,
            targetPrivateMessage: `🎩 Professor qutisini ochdingiz... 🥡 Bo'sh chiqdi!`,
          });
        } else if (outcome === "HERO") {
          target.hasHeroActive = true;
          result.events.push({
            type: "PROFESSOR_HERO",
            actorId: professorAction.actorId,
            targetId: professorAction.targetId,
            message: `Professor qutisidan geroy chiqdi!`,
            privateMessage: `🎩 ${escapeHtml(target.firstName)}ga geroy kuchi berildi!`,
            targetPrivateMessage: `🎩 Professor qutisini ochdingiz... 🥷 Geroy kuchi oldingiz!`,
          });
        }
        this.addVisitor(visitorsMap, professorAction.targetId, professorAction.actorId);
      }
    }

    // 19-b. Daydi kuzatuv hisoboti — barcha rollar tashrifi yozilib bo'lgach.
    // Shu joyda tuzilgani uchun Daydi tundagi HAMMA tashrifchini ko'radi va
    // har qanday turdagi qotillikka guvoh bo'la oladi.
    if (trampAction && trampActive) {
      const visitors = visitorsMap.get(trampAction.targetId) || [];
      const seen = new Set<number>();
      const visitorLines: string[] = [];
      for (const vId of visitors) {
        if (seen.has(vId)) continue;
        seen.add(vId);
        if (vId === -1) {
          visitorLines.push(`🤵🏼 Mafiya`);
        } else if (vId === trampAction.actorId) {
          continue; // Daydi o'zi — ko'rsatmaymiz
        } else {
          const p = this.getPlayer(vId);
          if (p) visitorLines.push(`${ROLE_EMOJI[p.role]} ${ROLE_NAME[p.role]} (${escapeHtml(p.firstName)})`);
        }
      }

      result.events.push({
        type: "TRAMP_VISIT",
        actorId: trampAction.actorId,
        targetId: trampAction.targetId,
        message: `Daydi kuzatdi`,
        privateMessage:
          visitorLines.length > 0
            ? `🧙🏼‍♂️ <b>Uyga kelganlar:</b>\n${visitorLines.join("\n")}`
            : "🧙🏼‍♂️ Hech kim kelmadi — tinch tun edi.",
        // Nishonga xabar — Daydi uyiga tashrif buyurdi
        targetPrivateMessage: `🧙🏼‍♂️ <b>Daydi sizning uyingizga tashrif buyurdi.</b>`,
      });

      // Qotillik guvoh — endi barcha o'ldirish turlarini ko'radi
      if (killTargets.has(trampAction.targetId)) {
        const victim = this.getPlayer(trampAction.targetId);
        result.events.push({
          type: "TRAMP_WITNESS",
          actorId: trampAction.actorId,
          targetId: trampAction.targetId,
          message: `Daydi qotillikka guvoh bo'ldi`,
          privateMessage: `🔴 ${escapeHtml(victim?.firstName || "Noma'lum")} uyida qotillik sodir bo'ldi!`,
        });
      }
    }

    // ==================== HARAKATSIZLIK TEKSHIRUVI ====================
    // Faol tun rolidagi o'yinchilar harakat qilmasa — inactiveNights oshadi.
    // 2 ga yetgan bo'lsa — avtomatik o'lim (INACTIVE sababi bilan).
    // Istisnolar: CIVILIAN va KAMIKAZE (tunda harakati yo'q),
    // SERGEANT (avtomatik harakat qiladi).
    const INACTIVITY_EXEMPT: Role[] = ["CIVILIAN", "KAMIKAZE", "SERGEANT"];
    for (const player of this.getAlivePlayers()) {
      if (INACTIVITY_EXEMPT.includes(player.role)) continue;
      if (!this.isNightActiveForPlayer(player)) continue;
      // Bloklangan bo'lsa — harakatsizlikka sanalmaydi
      if (player.isBlocked) continue;

      // Ataylab "O'tkazish" bosish ham harakat hisoblanadi
      const acted =
        this.hasNightAction(player.role, player.playerId) ||
        this.nightSkips.has(player.playerId);
      if (acted) {
        player.inactiveNights = 0;
      } else {
        player.inactiveNights = (player.inactiveNights ?? 0) + 1;
        if (player.inactiveNights >= 2) {
          setKill(player.playerId, "INACTIVE" as DeathCause, null);
        }
      }
    }

    // ==================== SNAYPER O'QI (inventar predmeti) ====================
    // Shieldga teskari predmet: o'q sotib olgan o'yinchining shu tundagi o'ldirishi
    // BARCHA himoyani yorib o'tadi (Shield, Shifokor davolashi, Tan qo'riqchisi) va
    // nishonning Shieldini parchalab tashlaydi — ham himoyasi ketadi, ham o'ladi.
    // Bitta o'q = bitta nishon (Minior bir necha kishini o'ldirsa — faqat birinchisi).
    const bulletTargets: Set<number> = new Set();
    const bulletShooters: Map<number, number> = new Map(); // targetId -> shooterId
    const shootersUsed: Set<number> = new Set();
    for (const [targetId, actorId] of killActors) {
      if (shootersUsed.has(actorId)) continue;
      const shooter = this.getPlayer(actorId);
      if (!shooter || !shooter.hasBulletActive) continue;
      if ((killTargets.get(targetId) as string) === "INACTIVE") continue;
      shootersUsed.add(actorId);
      bulletTargets.add(targetId);
      bulletShooters.set(targetId, actorId);
    }

    // O'q HAQIQATAN ish berganda (himoyani yorganda) sarflanadi. Nishonda hech qanday
    // himoya bo'lmasa — odam baribir o'lardi, shuning uchun o'q keyingi o'yinga qoladi.
    const spendBullet = (targetId: number, blocked: string): void => {
      const shooterId = bulletShooters.get(targetId);
      if (shooterId === undefined) return;
      const shooter = this.getPlayer(shooterId);
      if (!shooter || !shooter.hasBulletActive) return;
      shooter.hasBulletActive = false;
      const victim = this.getPlayer(targetId);
      result.events.push({
        type: "BULLET_USED",
        actorId: shooterId,
        targetId,
        message: "",
        privateMessage:
          `🎯 <b>Snayper o'qingiz ishladi!</b>\n` +
          `${escapeHtml(victim?.firstName ?? "Nishon")}ni ${blocked} saqlab qololmadi.`,
      });
    };

    // ==================== TAN QO'RIQCHISI — O'ZINI O'RTAGA TASHLASH ====================
    // Qo'riqlangan odamga hujum bo'lsa — qo'riqchi UNING O'RNIGA o'ladi.
    // Istisnolar: Snayper o'qi (hech narsa to'sa olmaydi) va INACTIVE.
    const bodyguardAction = this.nightActions.get("BODYGUARD");
    if (bodyguardAction) {
      const guard = this.getPlayer(bodyguardAction.actorId);
      const protectedTarget = this.getPlayer(bodyguardAction.targetId);
      if (guard && protectedTarget && guard.isAlive && !guard.isBlocked &&
          guard.playerId !== protectedTarget.playerId) {
        this.addVisitor(visitorsMap, bodyguardAction.targetId, bodyguardAction.actorId);
        result.events.push({
          type: "BODYGUARD_GUARD",
          actorId: bodyguardAction.actorId,
          targetId: bodyguardAction.targetId,
          message: "",
          privateMessage: `🛡 Siz <b>${escapeHtml(protectedTarget.firstName)}</b>ni qo'riqladingiz.`,
        });

        const cause = killTargets.get(bodyguardAction.targetId);
        const sniped =
          sniperTargets.has(bodyguardAction.targetId) ||
          bulletTargets.has(bodyguardAction.targetId);
        // Qo'riqchi o'zini tashlay olmadi, chunki o'q uni ham yorib o'tardi — o'q sarflandi
        if (cause && bulletTargets.has(bodyguardAction.targetId) && (cause as string) !== "INACTIVE") {
          spendBullet(bodyguardAction.targetId, "Tan qo'riqchisi ham");
        }
        if (cause && !sniped && cause !== "SNIPER_KILL" && (cause as string) !== "INACTIVE") {
          // Hujumni o'ziga oladi — qotil ham qo'riqchiga "o'tadi"
          const attacker = killActors.get(bodyguardAction.targetId) ?? null;
          killTargets.delete(bodyguardAction.targetId);
          killActors.delete(bodyguardAction.targetId);
          setKill(guard.playerId, cause, attacker);
          result.saved.push(protectedTarget);
          result.events.push({
            type: "BODYGUARD_SACRIFICE",
            actorId: bodyguardAction.actorId,
            targetId: bodyguardAction.targetId,
            message: `Tan qo'riqchisi jonini berdi`,
            targetPrivateMessage: `🛡 <b>Bu tunda sizga hujum bo'ldi!</b>\nTan qo'riqchisi o'zini o'rtaga tashlab, siz uchun jonini berdi...`,
          });
        }
      }
    }

    // ==================== NATIJALARNI HISOBLASH ====================

    for (const [targetId, cause] of killTargets) {
      const target = this.getPlayer(targetId);
      if (!target || !target.isAlive) continue;

      // Harakatsizlikdan o'lim — hech narsa saqlamaydi
      const isInactiveDeath = (cause as string) === "INACTIVE";

      // Snayper o'qi hech narsa bilan to'silmaydi. Boshqa qotil ham shu odamni
      // nishonga olgan bo'lsa `cause` almashib qolishi mumkin — shuning uchun
      // sabab emas, sniperTargets ro'yxati tekshiriladi.
      // bulletTargets — "Snayper o'qi" inventar predmeti tekkan nishonlar.
      const hitByBullet = bulletTargets.has(targetId);
      const isSniped = cause === "SNIPER_KILL" || sniperTargets.has(targetId) || hitByBullet;

      // Shifokor davolagani tekshiruv (sniper va inaktiv bundan mustasno)
      if (healedTargets.has(targetId) && !isSniped && !isInactiveDeath) {
        result.saved.push(target);
        continue;
      }
      // O'q shifokor davolashini yorib o'tdi — sarflandi
      if (healedTargets.has(targetId) && hitByBullet && !isInactiveDeath) {
        spendBullet(targetId, "Shifokor ham");
      }

      // Shield tekshiruvi — 1 o'yinda 1 marta (sniper va inaktiv bundan mustasno)
      if (target.hasShieldActive && !isSniped && !isInactiveDeath) {
        target.hasShieldActive = false;
        target.shieldCharges = 0;
        result.saved.push(target);
        result.events.push({
          type: "SHIELD_USED",
          actorId: targetId,
          message: `🛡 <b>Kimdir himoyasini ishlatdi!</b>`,
          privateMessage: `🛡 Sizning Shieldingiz sizni o'limdan saqladi!`,
        });
        // DB'da yangilash
        playerRepo.consumeShieldCharge(targetId, 0).catch((e) =>
          logger.error(e, "Shield consume xatolik")
        );
        continue;
      }

      // O'q Shieldni PARCHALAB tashlaydi — himoyasi ham ketadi, o'zi ham o'ladi.
      // (Snayper ROLI bundan farq qiladi: u shieldga tegmaydi, faqat o'tib ketadi.)
      if (target.hasShieldActive && hitByBullet && !isInactiveDeath) {
        target.hasShieldActive = false;
        target.shieldCharges = 0;
        playerRepo.consumeShieldCharge(targetId, 0).catch((e) =>
          logger.error(e, "Shield consume xatolik")
        );
        spendBullet(targetId, "Shieldi ham");
        result.events.push({
          type: "SHIELD_SHATTERED",
          actorId: targetId,
          message: `🎯 <b>Kimningdir himoyasi parchalanib ketdi!</b>`,
          privateMessage: `🎯 <b>Sizning Shieldingiz parchalanib ketdi</b> — snayper o'qi uni yorib o'tdi!`,
        });
      }

      target.isAlive = false;
      result.killed.push({ player: target, cause });

      playerRepo.kill(targetId, this.currentRound, cause).catch((e) =>
        logger.error(e, "O'yinchini o'ldirishda xatolik")
      );

      // O'lgan o'yinchi o'z uyiga kelganlarni ko'rsin.
      // DIQQAT: faqat ROL ko'rsatiladi — ism EMAS. Aks holda o'ldirilgan odam
      // qotilning kimligini bilib qoladi (Daydi rolining kuchi ham qadrsizlanadi).
      const visitors = visitorsMap.get(targetId) || [];
      if (visitors.length > 0) {
        const seen = new Set<number>();
        const visitorLines: string[] = [];
        for (const vId of visitors) {
          if (seen.has(vId)) continue;
          seen.add(vId);
          if (vId === -1) {
            visitorLines.push(`🤵🏼 Mafiya`);
          } else {
            const vp = this.getPlayer(vId);
            if (vp) {
              visitorLines.push(`${ROLE_EMOJI[vp.role]} ${ROLE_NAME[vp.role]}`);
            }
          }
        }
        if (visitorLines.length > 0) {
          result.events.push({
            type: "DEATH_VISITORS",
            actorId: targetId,
            message: "",
            privateMessage: `💀 <b>Tunda sizning uyingizga kelganlar:</b>\n${visitorLines.join("\n")}`,
          });
        }
      }
    }

    // ==================== KAMIKAZE TUNDA PORTLAYDI ====================
    // Kamikazeni tunda o'ldirgan odam portlashdan qutulmaydi — o'zi ham o'ladi.
    // Portlashni hech narsa to'sa olmaydi (Shield/Shifokor/Tan qo'riqchisi ham).
    // Faqat HAQIQATAN o'lgan Kamikaze uchun ishlaydi — saqlanib qolgani portlamaydi.
    const kamikazeDeaths = result.killed.filter((k) => k.player.role === "KAMIKAZE");
    for (const { player: kamikaze } of kamikazeDeaths) {
      const killerId = killActors.get(kamikaze.playerId);
      if (killerId === undefined || killerId === kamikaze.playerId) continue;
      const killer = this.getPlayer(killerId);
      if (!killer || !killer.isAlive) continue;

      killer.isAlive = false;
      result.killed.push({ player: killer, cause: "KAMIKAZE_KILL" });
      playerRepo.kill(killer.playerId, this.currentRound, "KAMIKAZE_KILL").catch((e) =>
        logger.error(e, "Kamikaze tungi portlashida o'ldirishda xatolik")
      );
      result.events.push({
        type: "KAMIKAZE_NIGHT_EXPLODE",
        actorId: kamikaze.playerId,
        targetId: killer.playerId,
        message: "",
        targetPrivateMessage: `💣 Siz o'ldirgan odam <b>Kamikaze</b> ekan! Portlash sizni ham olib ketdi...`,
      });
    }
    if (kamikazeDeaths.length > 0) {
      this.promoteSergeantIfNeeded();
      this.promoteMafiaIfNeeded();
    }

    // Doktor natija xabari
    if (doctorAction) {
      const dActor = this.getPlayer(doctorAction.actorId);
      const dTarget = this.getPlayer(doctorAction.targetId);
      if (dActor && dTarget && !dActor.isBlocked) {
        const wasSaved = result.saved.some((p) => p.playerId === doctorAction.targetId);
        if (wasSaved && healedTargets.has(doctorAction.targetId)) {
          result.events.push({
            type: "DOCTOR_SAVE",
            actorId: doctorAction.actorId,
            targetId: doctorAction.targetId,
            message: `Shifokor saqlab qoldi`,
            privateMessage: `💊 Siz ${escapeHtml(dTarget.firstName)}ni o'limdan saqlab qoldingiz!`,
            targetPrivateMessage: `💊 Siznikiga tunda shifokor keldi va sizni saqlab qoldi!`,
          });
        }
      }
    }

    // Solo killerlar natija xabari
    const soloKillerRoles: { role: Role; cause: DeathCause }[] = [
      { role: "KILLER", cause: "KILLER_KILL" },
      { role: "SNIPER", cause: "SNIPER_KILL" },
      { role: "ARCHER", cause: "ARCHER_KILL" },
      { role: "SNOWBOY", cause: "SNOWBOY_KILL" },
    ];
    for (const { role, cause } of soloKillerRoles) {
      const action = this.nightActions.get(role);
      if (!action) continue;
      const sActor = this.getPlayer(action.actorId);
      const sTarget = this.getPlayer(action.targetId);
      if (!sActor || !sTarget || sActor.isBlocked) continue;

      const wasKilled = result.killed.some((k) => k.player.playerId === action.targetId);
      const wasSaved = result.saved.some((p) => p.playerId === action.targetId);

      if (wasKilled) {
        result.events.push({
          type: `${role}_RESULT`,
          actorId: action.actorId,
          targetId: action.targetId,
          message: `${ROLE_NAME[role]} muvaffaqiyatli`,
          privateMessage: `✅ ${escapeHtml(sTarget.firstName)} o'ldirildi!`,
        });
      } else if (wasSaved) {
        result.events.push({
          type: `${role}_RESULT`,
          actorId: action.actorId,
          targetId: action.targetId,
          message: `${ROLE_NAME[role]} muvaffaqiyatsiz`,
          privateMessage: `❌ ${escapeHtml(sTarget.firstName)} saqlab qolindi!`,
        });
      }
    }

    // O'lim zanjirlari: Ovchi o'qi + sevishganlar qayg'usi
    const chains = this.resolveDeathChains();
    for (const hv of chains.hunterVictims) {
      result.killed.push({ player: hv.victim, cause: "HUNTER_KILL" });
    }
    for (const griefVictim of chains.griefVictims) {
      result.killed.push({ player: griefVictim, cause: "LOVER_GRIEF" });
    }

    // Barmen mastligi faqat TUNGA tegishli — Kezuvchidan farqli, ertasi kunga o'tmaydi
    if (barmenDrunkTargetId !== null) {
      const drunk = this.getPlayer(barmenDrunkTargetId);
      if (drunk) drunk.isBlocked = false;
    }

    // Komissar o'lsa — Serjant Komissar bo'ladi
    this.promoteSergeantIfNeeded();
    // Don o'lsa — Mafiya Don bo'ladi
    this.promoteMafiaIfNeeded();

    return result;
  }

  // O'lim ZANJIRLARI: har qanday o'limdan keyin chaqiriladi (tun, osish, kamikaze,
  // geroy hujumi). Ikki mexanika bir-birini trigger qilishi mumkin, shuning uchun
  // barqarorlashguncha aylanadi:
  //   1) O'lgan Ovchining o'qi — mo'ljaldagi odam o'ladi
  //   2) Sevishganlar — jufti o'lgan oshiq qayg'udan o'ladi
  resolveDeathChains(): {
    griefVictims: PlayerState[];
    hunterVictims: { hunter: PlayerState; victim: PlayerState }[];
  } {
    const griefVictims: PlayerState[] = [];
    const hunterVictims: { hunter: PlayerState; victim: PlayerState }[] = [];
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 30) {
      changed = false;

      // 1) O'lgan Ovchining o'qi
      for (const p of this.players.values()) {
        if (p.isAlive || p.role !== "HUNTER") continue;
        if (!p.hunterAimPlayerId || p.hunterShotFired) continue;
        p.hunterShotFired = true;
        const victim = this.getPlayer(p.hunterAimPlayerId);
        if (victim && victim.isAlive) {
          victim.isAlive = false;
          playerRepo.kill(victim.playerId, this.currentRound, "HUNTER_KILL").catch((e) =>
            logger.error(e, "Hunter shot kill xatolik")
          );
          hunterVictims.push({ hunter: p, victim });
          changed = true;
        }
      }

      // 2) Qayg'u o'limi (sevishganlar)
      for (const p of this.players.values()) {
        if (!p.isAlive || !p.loverPlayerId) continue;
        const partner = this.getPlayer(p.loverPlayerId);
        if (partner && !partner.isAlive) {
          p.isAlive = false;
          playerRepo.kill(p.playerId, this.currentRound, "LOVER_GRIEF").catch((e) =>
            logger.error(e, "Lover grief kill xatolik")
          );
          griefVictims.push(p);
          changed = true;
        }
      }
    }
    if (griefVictims.length > 0 || hunterVictims.length > 0) {
      this.promoteSergeantIfNeeded();
      this.promoteMafiaIfNeeded();
      this.persistSoon();
    }
    return { griefVictims, hunterVictims };
  }

  private resolveMafiaKill(): number | null {
    // Kezuvchi uxlatgan (bloklangan) yoki o'lgan mafiozning ovozi hisobga olinmaydi.
    // Hamma ovoz beruvchi uxlatilgan bo'lsa — bu tunda mafiya o'ldira olmaydi.
    const activeVotes = this.mafiaVotes.filter((v) => {
      const voter = this.getPlayer(v.voterId);
      return !!voter && voter.isAlive && !voter.isBlocked;
    });
    if (activeVotes.length === 0) return null;

    const voteCount = new Map<number, number>();
    for (const vote of activeVotes) {
      voteCount.set(vote.targetId, (voteCount.get(vote.targetId) || 0) + 1);
    }

    // Eng ko'p ovoz
    const result = getMostVoted(voteCount);
    if (result) return result.target;

    // Teng ovoz — Don hal qiladi (uxlatilgan Don hal qila olmaydi)
    const don = this.getAlivePlayers().find((p) => p.role === "DON" && !p.isBlocked);
    if (don) {
      const donVote = activeVotes.find((v) => v.voterId === don.playerId);
      if (donVote) return donVote.targetId;
    }

    // Don yo'q — birinchi ovoz
    return activeVotes[0]?.targetId ?? null;
  }

  // Mafiya jamoaviy o'ldiradi, lekin "qotil" sifatida bitta odam kerak bo'ladi
  // (Kamikaze portlashi kimni olib ketishi, kimning "Snayper o'qi" ishlashi).
  // Nishonga ovoz berganlar orasidan: avval Don, bo'lmasa birinchi tirik mafioz.
  private resolveMafiaKiller(targetId: number): number | null {
    const voters = this.mafiaVotes.filter((v) => {
      if (v.targetId !== targetId) return false;
      const voter = this.getPlayer(v.voterId);
      return !!voter && voter.isAlive && !voter.isBlocked;
    });
    if (voters.length === 0) return null;
    const don = voters.find((v) => this.getPlayer(v.voterId)?.role === "DON");
    return (don ?? voters[0]).voterId;
  }

  private addVisitor(map: Map<number, number[]>, targetId: number, visitorId: number): void {
    const visitors = map.get(targetId) || [];
    visitors.push(visitorId);
    map.set(targetId, visitors);
  }

  // ==================== DAY PHASE ====================

  async startDay(): Promise<void> {
    this.status = "DAY";
    await gameRepo.updateStatus(this.gameId, "DAY");
  }

  // ==================== VOTING ====================

  async startVoting(): Promise<void> {
    this.status = "VOTING";
    this.votes.clear();
    this.kamikazeTarget = null;
    await gameRepo.updateStatus(this.gameId, "VOTING");
  }

  submitVote(voterPlayerId: number, targetPlayerId: number): boolean {
    const voter = this.getPlayer(voterPlayerId);
    if (!voter || !voter.isAlive) return false;
    // Kezuvchi uxlatgan o'yinchi shu kunduzi ovoz bera olmaydi
    if (voter.isBlocked) return false;

    this.votes.set(voterPlayerId, targetPlayerId);
    this.persistSoon();
    return true;
  }

  hasVoted(voterPlayerId: number): boolean {
    return this.votes.has(voterPlayerId);
  }

  // Hozirgi ovoz countlarini olish (keyboard yangilash uchun)
  getVoteCounts(): Map<number, number> {
    const counts = new Map<number, number>();
    for (const [, targetId] of this.votes) {
      counts.set(targetId, (counts.get(targetId) || 0) + 1);
    }
    return counts;
  }

  // Kim kimga ovoz bergan — log uchun
  getVoteLog(): { voter: PlayerState; target: PlayerState | null }[] {
    const log: { voter: PlayerState; target: PlayerState | null }[] = [];
    for (const [voterId, targetId] of this.votes) {
      const voter = this.getPlayer(voterId);
      const target = targetId === -1 ? null : (this.getPlayer(targetId) ?? null);
      if (voter) log.push({ voter, target });
    }
    return log;
  }

  async startConfirming(): Promise<void> {
    this.status = "CONFIRMING";
    await gameRepo.updateStatus(this.gameId, "CONFIRMING");
  }

  // Osishni tasdiqlash
  submitConfirmVote(voterPlayerId: number, approve: boolean): void {
    const voter = this.getPlayer(voterPlayerId);
    // Kezuvchi uxlatgan o'yinchi tasdiqlashda ham qatnasha olmaydi
    if (!voter || !voter.isAlive || voter.isBlocked) return;
    this.confirmVotes.set(voterPlayerId, approve);
    this.persistSoon();
  }

  getConfirmCounts(): { yes: number; no: number } {
    let yes = 0;
    let no = 0;
    for (const [, approve] of this.confirmVotes) {
      if (approve) yes++;
      else no++;
    }
    return { yes, no };
  }

  resetConfirmVotes(): void {
    this.confirmVotes.clear();
    this.pendingHangTarget = null;
  }

  // Kamikaze nishonini belgilash (osilgandan keyin)
  setKamikazeTarget(targetPlayerId: number): void {
    this.kamikazeTarget = targetPlayerId;
    this.persistSoon();
  }

  // Kamikaze tanlagan nishonni QO'LLASH — tanlov oynasi (15s) tugagach chaqiriladi.
  // processVotes paytida nishon hali tanlanmagan bo'ladi (null), shuning uchun
  // o'ldirish aynan shu alohida metodda amalga oshiriladi.
  applyKamikazeTarget(): PlayerState | null {
    if (!this.kamikazeTarget) return null;
    const victim = this.getPlayer(this.kamikazeTarget);
    this.kamikazeTarget = null;
    if (!victim || !victim.isAlive) return null;

    victim.isAlive = false;
    playerRepo.kill(victim.playerId, this.currentRound, "KAMIKAZE_KILL").catch((e) =>
      logger.error(e, "Kamikaze o'ldirishda xatolik")
    );
    // Qurbon Komissar/Don bo'lsa — promotion
    this.promoteSergeantIfNeeded();
    this.promoteMafiaIfNeeded();
    this.persistSoon();
    return victim;
  }

  processVotes(): VoteResult {
    const voteCount = new Map<number, number>();

    for (const [, targetId] of this.votes) {
      voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1);
    }

    const result: VoteResult = {
      votedOut: null,
      votes: voteCount,
    };

    const mostVoted = getMostVoted(voteCount);
    if (mostVoted && mostVoted.target !== -1) {
      // -1 = "Hech kimga" ovoz
      const target = this.getPlayer(mostVoted.target);
      if (target) {
        target.isAlive = false;
        result.votedOut = target;

        playerRepo.kill(target.playerId, this.currentRound, "VOTED_OUT").catch((e) =>
          logger.error(e, "Ovoz natijasida o'ldirishda xatolik")
        );

        // Kamikaze tekshiruvi
        if (target.role === "KAMIKAZE" && this.kamikazeTarget) {
          const kamikazeVictim = this.getPlayer(this.kamikazeTarget);
          if (kamikazeVictim && kamikazeVictim.isAlive) {
            kamikazeVictim.isAlive = false;
            result.kamikazeTarget = kamikazeVictim;

            playerRepo
              .kill(kamikazeVictim.playerId, this.currentRound, "KAMIKAZE_KILL")
              .catch((e) => logger.error(e, "Kamikaze o'ldirishda xatolik"));
          }
        }
      }
    }

    // O'lim zanjirlari: osilgan Ovchining o'qi + sevishganlar qayg'usi
    const voteChains = this.resolveDeathChains();
    if (voteChains.griefVictims.length > 0) result.loverVictims = voteChains.griefVictims;
    if (voteChains.hunterVictims.length > 0) result.hunterVictims = voteChains.hunterVictims;

    // Komissar/Don o'lsa promotion
    this.promoteSergeantIfNeeded();
    this.promoteMafiaIfNeeded();

    return result;
  }

  // ==================== PROMOTIONS ====================

  private promoteSergeantIfNeeded(): void {
    const sheriffAlive = this.getAlivePlayers().some((p) => p.role === "SHERIFF");
    if (!sheriffAlive) {
      const sergeant = this.getAlivePlayers().find((p) => p.role === "SERGEANT");
      if (sergeant) {
        sergeant.role = "SHERIFF";
        playerRepo.changeRole(sergeant.playerId, "SHERIFF").catch((e) =>
          logger.error(e, "Serjant promotion xatolik")
        );
      }
    }
  }

  private promoteMafiaIfNeeded(): void {
    const donAlive = this.getAlivePlayers().some((p) => p.role === "DON");
    if (!donAlive) {
      const mafias = this.getAlivePlayers().filter((p) => p.role === "MAFIA");
      if (mafias.length > 0) {
        mafias[0].role = "DON";
        playerRepo.changeRole(mafias[0].playerId, "DON").catch((e) =>
          logger.error(e, "Mafiya Don promotion xatolik")
        );
      }
    }
  }

  // ==================== WIN CHECK ====================

  checkWin(): Winner | null {
    const result = checkWinCondition([...this.players.values()], this.settings.maxRounds, this.currentRound);
    return result.winner;
  }

  // ==================== CLEANUP ====================

  async finish(winner: Winner): Promise<void> {
    this.status = "FINISHED";
    await gameRepo.setWinner(this.gameId, winner);
    this.clearTimer();
  }

  async cancel(): Promise<void> {
    this.status = "CANCELLED";
    await gameRepo.updateStatus(this.gameId, "CANCELLED");
    this.clearTimer();
  }

  setTimer(ms: number, callback: () => void, pendingPhase?: string): void {
    this.clearTimer();
    this.timerStartedAt = Date.now();
    this.timerDuration = ms;
    this.timerCallback = callback;
    this.phaseTimer = setTimeout(callback, ms);
    this.timerEndsAt = Date.now() + ms;
    if (pendingPhase) this.pendingPhaseAction = pendingPhase;
  }

  extendTimer(extraMs: number): number {
    if (!this.phaseTimer || !this.timerCallback) return 0;
    const elapsed = Date.now() - this.timerStartedAt;
    const remaining = Math.max(0, this.timerDuration - elapsed);
    const newDuration = remaining + extraMs;
    this.clearTimer();
    this.timerStartedAt = Date.now();
    this.timerDuration = newDuration;
    const cb = this.timerCallback;
    this.phaseTimer = setTimeout(cb, newDuration);
    this.timerCallback = cb;
    this.timerEndsAt = Date.now() + newDuration;
    return newDuration;
  }

  clearTimer(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    this.timerEndsAt = null;
    this.pendingPhaseAction = null;
  }

  // Timerni muddatidan OLDIN ishga tushirish — o'yinchi kutilgan harakatni
  // qilib bo'lgach bekorga kutib o'tirmaslik uchun (masalan Kamikaze nishonni tanladi).
  // Faqat timer haqiqatan qurollangan bo'lsa ishlaydi — ikki marta chaqirilsa
  // ikkinchisi false qaytaradi (double-resolution bo'lmaydi).
  fireTimerNow(): boolean {
    const cb = this.timerCallback;
    if (!cb || !this.phaseTimer) return false;
    this.clearTimer();
    this.timerCallback = null;
    cb();
    return true;
  }

  // Persistence uchun — private state'ga access
  getInternalState() {
    return {
      nightActions: [...this.nightActions.entries()],
      mafiaVotes: this.mafiaVotes,
      pendingNightRoles: [...this.pendingNightRoles],
      sheriffShootTarget: this.sheriffShootTarget,
      votes: [...this.votes.entries()],
      kamikazeTarget: this.kamikazeTarget,
      confirmVotes: [...this.confirmVotes.entries()],
      nightSkips: [...this.nightSkips],
    };
  }

  setInternalState(state: {
    nightActions: [Role, { actorId: number; targetId: number }][];
    mafiaVotes: MafiaVote[];
    pendingNightRoles: Role[];
    sheriffShootTarget: number | null;
    votes: [number, number][];
    kamikazeTarget: number | null;
    confirmVotes: [number, boolean][];
    nightSkips?: number[];
  }): void {
    this.nightActions = new Map(state.nightActions);
    this.mafiaVotes = state.mafiaVotes;
    this.pendingNightRoles = new Set(state.pendingNightRoles);
    this.sheriffShootTarget = state.sheriffShootTarget;
    this.votes = new Map(state.votes);
    this.kamikazeTarget = state.kamikazeTarget;
    this.confirmVotes = new Map(state.confirmVotes);
    this.nightSkips = new Set(state.nightSkips ?? []);
  }
}
