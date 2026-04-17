import { GameStatus, Role, DeathCause, ActionType, Winner, ChatSettings } from "@prisma/client";
import { PlayerState, NightResult, NightEvent, VoteResult, MafiaVote, KilledPlayer, RobberResponse } from "../types";
import { gameRepo } from "../database/repositories/game.repository";
import { playerRepo } from "../database/repositories/player.repository";
import { ROLE_TEAM, Team, MAFIA_ROLES, MAFIA_KILL_VOTERS, ROLE_EMOJI, ROLE_NAME } from "../utils/constants";
import { checkWinCondition } from "./win-checker";
import { assignRoles } from "./role-assigner";
import { getMostVoted, mention, shuffle } from "../utils/helpers";
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

  // Komissar otish
  private sheriffShootTarget: number | null = null;

  // Ovoz berish
  private votes: Map<number, number> = new Map(); // voterId -> targetPlayerId
  private kamikazeTarget: number | null = null;

  // Osishni tasdiqlash (👍/👎)
  private confirmVotes: Map<number, boolean> = new Map(); // playerId -> true=yes, false=no
  pendingHangTarget: number | null = null; // osish kutilayotgan o'yinchi

  // Qaroqchi 2-bosqich — nishon javobi
  robberTargetResponse: RobberResponse | null = null;

  // O'yin boshlangan vaqt (statistika uchun)
  gameStartedAt: Date | null = null;

  // Registration xabar ID (yangilash uchun)
  registrationMessageId: number | null = null;

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
    for (const player of allPlayers) {
      if (assignedPlayers.has(player.playerId)) continue;
      if (availableRoles.length > 0) {
        const newRole = availableRoles.shift()!;
        player.role = newRole;
        await playerRepo.assignRole(player.playerId, newRole);
      }
    }

    this.status = "STARTING";
    this.gameStartedAt = new Date();
    await gameRepo.updateStatus(this.gameId, "STARTING");

    // refundUserIds endi har doim bo'sh — pul qaytarilmaydi
    return { refundUserIds };
  }

  // ==================== NIGHT PHASE ====================

  async startNight(): Promise<void> {
    this.currentRound++;
    this.status = "NIGHT";
    this.nightActions.clear();
    this.mafiaVotes = [];
    this.pendingNightRoles.clear();

    this.sheriffShootTarget = null;
    this.robberTargetResponse = null;

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
    }

    // Tunda harakat qiladigan tirik rollarni aniqlash
    const alive = this.getAlivePlayers();
    for (const player of alive) {
      if (this.isNightActiveRole(player.role)) {
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
      "ROBBER", "PROFESSOR",
    ];
    return nightRoles.includes(role);
  }

  submitNightAction(actorPlayerId: number, targetPlayerId: number, role: Role): boolean {
    const actor = this.getPlayer(actorPlayerId);
    if (!actor || !actor.isAlive) return false;

    // Mafiya ovozi
    if (MAFIA_KILL_VOTERS.includes(role)) {
      this.mafiaVotes.push({ voterId: actorPlayerId, targetId: targetPlayerId });
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

  setRobberResponse(choice: RobberResponse): void {
    this.robberTargetResponse = choice;
    this.persistSoon();
  }

  markNightRoleDone(role: Role): void {
    if (MAFIA_KILL_VOTERS.includes(role)) {
      // Barcha mafiya ovoz berganda
      const totalMafiaAlive = this.getAlivePlayers().filter((p) =>
        MAFIA_KILL_VOTERS.includes(p.role)
      ).length;
      if (this.mafiaVotes.length >= totalMafiaAlive) {
        this.pendingNightRoles.delete("MAFIA");
      }
    } else {
      this.pendingNightRoles.delete(role);
    }
    this.persistSoon();
  }

  isNightComplete(): boolean {
    return this.pendingNightRoles.size === 0;
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

    // 1. Kezuvchi bloklashi
    const hookerAction = this.nightActions.get("HOOKER");
    if (hookerAction) {
      const actor = this.getPlayer(hookerAction.actorId);
      const target = this.getPlayer(hookerAction.targetId);
      if (actor && target && !actor.isBlocked) {
        target.isBlocked = true;
        this.addVisitor(visitorsMap, hookerAction.targetId, hookerAction.actorId);
        result.events.push({
          type: "HOOKER_BLOCK",
          actorId: hookerAction.actorId,
          targetId: hookerAction.targetId,
          message: `Kezuvchi blokladi`,
          privateMessage: `💃 Siz ${target.firstName}ni muvaffaqiyatli blokladingiz.`,
        });
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

    // 4. Ayg'oqchi tekshiruvi
    const spyAction = this.nightActions.get("SPY");
    if (spyAction) {
      const actor = this.getPlayer(spyAction.actorId);
      const target = this.getPlayer(spyAction.targetId);
      if (actor && target && !actor.isBlocked) {
        result.events.push({
          type: "SPY_CHECK",
          actorId: spyAction.actorId,
          targetId: spyAction.targetId,
          message: `Ayg'oqchi tekshirdi`,
          privateMessage: `${ROLE_EMOJI[target.role]} ${ROLE_NAME[target.role]}`,
        });
      }
    }

    // 5. Mafiya o'ldirishi (mafiya o'z jamoasini o'ldira olmaydi)
    const mafiaTarget = this.resolveMafiaKill();
    if (mafiaTarget !== null) {
      const mafiaVictim = this.getPlayer(mafiaTarget);
      // Mafiya jamoasini o'ldirmaslik
      if (mafiaVictim && ROLE_TEAM[mafiaVictim.role] !== Team.MAFIA) {
        killTargets.set(mafiaTarget, "MAFIA_KILL");
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
          killTargets.set(labAction.targetId, "LAB_KILL");
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
          killTargets.set(sheriffAction.targetId, "SHERIFF_KILL");
          result.events.push({
            type: "SHERIFF_SHOOT_HIT",
            actorId: sheriffAction.actorId,
            targetId: sheriffAction.targetId,
            message: `Komissar otdi`,
          });
        } else {
          // TEKSHIRISH — natija callback'da darhol ko'rsatilgan, bu yerda faqat advokat tekshiruvi
          const actuallyMafia = ROLE_TEAM[target.role] === Team.MAFIA;

          // Nishonga ogohlantirish — Komissar uni tekshirdi
          result.events.push({
            type: "SHERIFF_CHECK_NOTIFY",
            actorId: sheriffAction.actorId,
            targetId: sheriffAction.targetId,
            message: "",
            targetPrivateMessage: `🕵🏻‍♂ <b>Komissar sizning rolingizga qiziqdi.</b>`,
          });

          // Advokat himoyasi ishlagan bo'lsa — advokatga xabar
          if (actuallyMafia && target.isProtectedByLawyer && lawyerAction) {
            result.events.push({
              type: "LAWYER_PROTECT_SUCCESS",
              actorId: lawyerAction.actorId,
              targetId: sheriffAction.targetId,
              message: `Advokat himoyasi ishladi`,
              privateMessage: `👨🏼‍💼 Sizning himoyangiz ishladi! Komissar ${target.firstName}ni tinch axoli deb ko'rdi.`,
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
            info = `👮🏻‍♂ Komissar bu tunda <b>${sheriffTarget?.firstName}</b>ga 🔫 o'q uzdi.`;
          } else {
            info = `👮🏻‍♂ Komissar bu tunda <b>${sheriffTarget?.firstName}</b>ni 🔍 tekshirdi.`;
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
          privateMessage: `👨🏼‍⚕️ Siz <b>${doctorTarget.firstName}</b>ni davoladingiz.`,
          targetPrivateMessage: targetMsg,
        });
      }
    }

    // 10. Koldun harakati
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
          // Boshqa taraf — o'ldiradi
          killTargets.set(warlockAction.targetId, "WARLOCK_KILL");
          result.events.push({
            type: "WARLOCK_KILL",
            actorId: warlockAction.actorId,
            targetId: warlockAction.targetId,
            message: `Koldun o'ldirdi`,
            privateMessage: "dushman, o'ldirdingiz",
          });
        }
        this.addVisitor(visitorsMap, warlockAction.targetId, warlockAction.actorId);
      }
    }

    // 11. Daydi kuzatuvi
    const trampAction = this.nightActions.get("TRAMP");
    if (trampAction) {
      const actor = this.getPlayer(trampAction.actorId);
      if (actor && !actor.isBlocked) {
        const visitors = visitorsMap.get(trampAction.targetId) || [];
        const visitorNames = visitors
          .filter((id) => id !== -1)
          .map((id) => {
            const p = this.getPlayer(id);
            return p ? p.firstName : "Noma'lum";
          });

        result.events.push({
          type: "TRAMP_VISIT",
          actorId: trampAction.actorId,
          targetId: trampAction.targetId,
          message: `Daydi kuzatdi`,
          privateMessage:
            visitorNames.length > 0
              ? `Kelganlar: ${visitorNames.join(", ")}`
              : "Hech kim kelmadi",
          // Nishonga xabar — Daydi uyiga tashrif buyurdi
          targetPrivateMessage: `🧙🏼‍♂️ <b>Daydi sizning uyingizga tashrif buyurdi.</b>`,
        });

        // Qotillik guvoh
        if (killTargets.has(trampAction.targetId)) {
          const victim = this.getPlayer(trampAction.targetId);
          result.events.push({
            type: "TRAMP_WITNESS",
            actorId: trampAction.actorId,
            targetId: trampAction.targetId,
            message: `Daydi qotillikka guvoh bo'ldi`,
            privateMessage: `🔴 ${victim?.firstName || "Noma'lum"} uyida qotillik sodir bo'ldi!`,
          });
        }
      }
    }

    // 12. Minior mina qo'yishi
    const minerAction = this.nightActions.get("MINER");
    if (minerAction) {
      const actor = this.getPlayer(minerAction.actorId);
      if (actor && !actor.isBlocked) {
        const visitors = visitorsMap.get(minerAction.targetId) || [];
        for (const visitorId of visitors) {
          if (visitorId !== -1 && visitorId !== minerAction.actorId) {
            killTargets.set(visitorId, "MINER_KILL");
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
        killTargets.set(killerAction.targetId, "KILLER_KILL");
        this.addVisitor(visitorsMap, killerAction.targetId, killerAction.actorId);
      }
    }

    // 14. Snayperchi o'ldirishi (himoyani ham o'tadi)
    const sniperAction = this.nightActions.get("SNIPER");
    if (sniperAction) {
      const actor = this.getPlayer(sniperAction.actorId);
      if (actor && !actor.isBlocked) {
        // Snayperchi — himoyani ham o'tadi, shuning uchun healedTargets dan olib tashlaymiz
        healedTargets.delete(sniperAction.targetId);
        killTargets.set(sniperAction.targetId, "SNIPER_KILL");
        // Daydi ko'rmaydi — visitor qo'shmaymiz
      }
    }

    // 15. Kamonchi o'ldirishi (maxfiy — daydi sezmaydi)
    const archerAction = this.nightActions.get("ARCHER");
    if (archerAction) {
      const actor = this.getPlayer(archerAction.actorId);
      if (actor && !actor.isBlocked) {
        killTargets.set(archerAction.targetId, "ARCHER_KILL");
        // Daydi sezmaydi — visitor qo'shmaymiz
      }
    }

    // 16. Qorbola qorbo'roni
    const snowboyAction = this.nightActions.get("SNOWBOY");
    if (snowboyAction) {
      const actor = this.getPlayer(snowboyAction.actorId);
      if (actor && !actor.isBlocked) {
        killTargets.set(snowboyAction.targetId, "SNOWBOY_KILL");
        this.addVisitor(visitorsMap, snowboyAction.targetId, snowboyAction.actorId);
      }
    }

    // 17. Qorbobo sovg'asi
    const santaAction = this.nightActions.get("SANTA");
    if (santaAction) {
      const actor = this.getPlayer(santaAction.actorId);
      const santaTarget = this.getPlayer(santaAction.targetId);
      if (actor && santaTarget && !actor.isBlocked) {
        result.events.push({
          type: "SANTA_GIFT",
          actorId: santaAction.actorId,
          targetId: santaAction.targetId,
          message: `Qorbobo sovg'a berdi`,
          privateMessage: `🎅🏻 Siz ${santaTarget.firstName}ga sovg'a berdingiz!`,
          targetPrivateMessage: `🎅🏻 Tunda sizga Qorbobo sovg'a qoldirdi!`,
        });
        this.addVisitor(visitorsMap, santaAction.targetId, santaAction.actorId);
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
            privateMessage: `👺 ${target.firstName}dan 1000 pul undirdingiz`,
            targetPrivateMessage: `👺 Tunda siznikiga qaroqchi keldi va 1000 pul olib ketdi!`,
          });
        } else {
          killTargets.set(robberAction.targetId, "ROBBER_KILL");
          result.events.push({
            type: "ROBBER_KILL",
            actorId: robberAction.actorId,
            targetId: robberAction.targetId,
            message: `Qaroqchi o'ldirdi`,
            privateMessage: `👺 ${target.firstName} bosh tortdi — o'ldirdingiz`,
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
          killTargets.set(professorAction.targetId, "PROFESSOR_KILL");
          result.events.push({
            type: "PROFESSOR_DEATH",
            actorId: professorAction.actorId,
            targetId: professorAction.targetId,
            message: `Professor qutisidan o'lim chiqdi`,
            privateMessage: `🎩 ${target.firstName} qutidan o'lim chiqardi!`,
            targetPrivateMessage: `🎩 Professor qutisini ochdingiz... ⚰️ O'lim chiqdi!`,
          });
        } else if (outcome === "EMPTY") {
          result.events.push({
            type: "PROFESSOR_EMPTY",
            actorId: professorAction.actorId,
            targetId: professorAction.targetId,
            message: `Professor qutisi bo'sh chiqdi`,
            privateMessage: `🎩 ${target.firstName} bo'sh qutini tanladi.`,
            targetPrivateMessage: `🎩 Professor qutisini ochdingiz... 🥡 Bo'sh chiqdi!`,
          });
        } else if (outcome === "HERO") {
          target.hasHeroActive = true;
          result.events.push({
            type: "PROFESSOR_HERO",
            actorId: professorAction.actorId,
            targetId: professorAction.targetId,
            message: `Professor qutisidan geroy chiqdi!`,
            privateMessage: `🎩 ${target.firstName}ga geroy kuchi berildi!`,
            targetPrivateMessage: `🎩 Professor qutisini ochdingiz... 🥷 Geroy kuchi oldingiz!`,
          });
        }
        this.addVisitor(visitorsMap, professorAction.targetId, professorAction.actorId);
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
      if (!this.isNightActiveRole(player.role)) continue;
      // Bloklangan bo'lsa — harakatsizlikka sanalmaydi
      if (player.isBlocked) continue;

      const acted = this.hasNightAction(player.role, player.playerId);
      if (acted) {
        player.inactiveNights = 0;
      } else {
        player.inactiveNights = (player.inactiveNights ?? 0) + 1;
        if (player.inactiveNights >= 2) {
          killTargets.set(player.playerId, "INACTIVE" as DeathCause);
        }
      }
    }

    // ==================== NATIJALARNI HISOBLASH ====================

    for (const [targetId, cause] of killTargets) {
      const target = this.getPlayer(targetId);
      if (!target || !target.isAlive) continue;

      // Harakatsizlikdan o'lim — hech narsa saqlamaydi
      const isInactiveDeath = (cause as string) === "INACTIVE";

      // Shifokor davolagani tekshiruv (sniper va inaktiv bundan mustasno)
      if (healedTargets.has(targetId) && cause !== "SNIPER_KILL" && !isInactiveDeath) {
        result.saved.push(target);
        continue;
      }

      // Shield tekshiruvi — 1 o'yinda 1 marta (sniper va inaktiv bundan mustasno)
      if (target.hasShieldActive && cause !== "SNIPER_KILL" && !isInactiveDeath) {
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

      target.isAlive = false;
      result.killed.push({ player: target, cause });

      playerRepo.kill(targetId, this.currentRound, cause).catch((e) =>
        logger.error(e, "O'yinchini o'ldirishda xatolik")
      );
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
            privateMessage: `💊 Siz ${dTarget.firstName}ni o'limdan saqlab qoldingiz!`,
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
          privateMessage: `✅ ${sTarget.firstName} o'ldirildi!`,
        });
      } else if (wasSaved) {
        result.events.push({
          type: `${role}_RESULT`,
          actorId: action.actorId,
          targetId: action.targetId,
          message: `${ROLE_NAME[role]} muvaffaqiyatsiz`,
          privateMessage: `❌ ${sTarget.firstName} saqlab qolindi!`,
        });
      }
    }

    // Komissar o'lsa — Serjant Komissar bo'ladi
    this.promoteSergeantIfNeeded();
    // Don o'lsa — Mafiya Don bo'ladi
    this.promoteMafiaIfNeeded();

    return result;
  }

  private resolveMafiaKill(): number | null {
    if (this.mafiaVotes.length === 0) return null;

    const voteCount = new Map<number, number>();
    for (const vote of this.mafiaVotes) {
      voteCount.set(vote.targetId, (voteCount.get(vote.targetId) || 0) + 1);
    }

    // Eng ko'p ovoz
    const result = getMostVoted(voteCount);
    if (result) return result.target;

    // Teng ovoz — Don hal qiladi
    const don = this.getAlivePlayers().find((p) => p.role === "DON");
    if (don) {
      const donVote = this.mafiaVotes.find((v) => v.voterId === don.playerId);
      if (donVote) return donVote.targetId;
    }

    // Don yo'q — birinchi ovoz
    return this.mafiaVotes[0]?.targetId ?? null;
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
    return checkWinCondition([...this.players.values()]);
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
  }): void {
    this.nightActions = new Map(state.nightActions);
    this.mafiaVotes = state.mafiaVotes;
    this.pendingNightRoles = new Set(state.pendingNightRoles);
    this.sheriffShootTarget = state.sheriffShootTarget;
    this.votes = new Map(state.votes);
    this.kamikazeTarget = state.kamikazeTarget;
    this.confirmVotes = new Map(state.confirmVotes);
  }
}
