import { Composer } from "grammy";
import { Role } from "@prisma/client";
import { BotContext } from "../../types/context";
import { GameController } from "../../game/controller";
import { gameManager } from "../../game/manager";
import { sheriffActionKeyboard, robberResponseKeyboard, professorBoxesKeyboard } from "../../keyboards/game";
import { MAFIA_KILL_VOTERS, ROLE_TEAM, Team, ROLE_EMOJI, ROLE_NAME } from "../../utils/constants";
import { uz } from "../../locales/uz";

// Night action callback pattern: night_{role}:{targetPlayerId|skip}
const NIGHT_ROLE_MAP: Record<string, Role> = {
  night_hooker: "HOOKER",
  night_traitor: "TRAITOR",
  night_lawyer: "LAWYER",
  night_spy: "SPY",
  night_mafia: "MAFIA",
  night_lab: "LAB",
  night_sheriff: "SHERIFF",
  night_doctor: "DOCTOR",
  night_warlock: "WARLOCK",
  night_tramp: "TRAMP",
  night_killer: "KILLER",
  night_sniper: "SNIPER",
  night_archer: "ARCHER",
  night_miner: "MINER",
  night_snowboy: "SNOWBOY",
  night_santa: "SANTA",
  night_robber: "ROBBER",
  night_professor: "PROFESSOR",
};

function findPlayerGame(telegramId: bigint) {
  for (const game of gameManager.getAllGames()) {
    const player = game.getPlayerByTelegramId(telegramId);
    if (player && player.isAlive) {
      return { engine: game, player };
    }
  }
  return null;
}

// Guruhga hikoya matni — har rol faqat 1 marta
const sentStories = new Set<string>();

async function sendStory(ctx: BotContext, engine: any, role: string): Promise<void> {
  const key = `${engine.gameId}:${role}`;
  if (sentStories.has(key)) return;
  const story = uz.nightStory[role];
  if (!story) return;
  sentStories.add(key);
  try {
    await ctx.api.sendMessage(engine.chatTelegramId.toString(), story, { parse_mode: "HTML" });
  } catch { /* ignore */ }
  setTimeout(() => sentStories.delete(key), 600000);
}

export function createNightActionCallbacks(controller: GameController): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  // ==================== KOMISSAR ====================

  // 1-bosqich: nishon tanlash → "Tekshirish / Otish"
  composer.callbackQuery(/^night_sheriff:(\d+)$/, async (ctx) => {
    if (!ctx.from) return;
    const targetPlayerId = parseInt(ctx.match[1]);
    const found = findPlayerGame(BigInt(ctx.from.id));
    if (!found || found.engine.status !== "NIGHT") {
      await ctx.answerCallbackQuery({ text: "Hozir tun emas!" }).catch(() => {});
      return;
    }
    const target = found.engine.getPlayer(targetPlayerId);
    if (!target) {
      await ctx.answerCallbackQuery({ text: "Noto'g'ri nishon!" }).catch(() => {});
      return;
    }
    await ctx.answerCallbackQuery().catch(() => {});
    await ctx.editMessageText(
      `🕵🏻‍♂ <b>${target.firstName}</b>ni tanladingiz.\n\nNima qilasiz?`,
      { parse_mode: "HTML", reply_markup: sheriffActionKeyboard(targetPlayerId) }
    ).catch(() => {});
  });

  // Komissar skip
  composer.callbackQuery("night_sheriff:skip", async (ctx) => {
    if (!ctx.from) return;
    const found = findPlayerGame(BigInt(ctx.from.id));
    if (!found) return;
    found.engine.markNightRoleDone("SHERIFF");
    await ctx.answerCallbackQuery({ text: "🚫 O'tkazildi" }).catch(() => {});
    await ctx.editMessageText("🚫 O'tkazib yubordingiz.", { parse_mode: "HTML" }).catch(() => {});
    if (found.engine.isNightComplete()) {
      await controller.handleNightEnd(found.engine.chatTelegramId);
    }
  });

  // 2-bosqich: "Tekshirish" yoki "Otish"
  composer.callbackQuery(/^sheriff_action:(check|shoot):(\d+)$/, async (ctx) => {
    if (!ctx.from) return;
    const action = ctx.match[1];
    const targetPlayerId = parseInt(ctx.match[2]);
    const found = findPlayerGame(BigInt(ctx.from.id));
    if (!found || found.engine.status !== "NIGHT") {
      await ctx.answerCallbackQuery({ text: "Hozir tun emas!" }).catch(() => {});
      return;
    }
    const target = found.engine.getPlayer(targetPlayerId);
    if (!target) {
      await ctx.answerCallbackQuery({ text: "Noto'g'ri nishon!" }).catch(() => {});
      return;
    }

    // Darhol javob
    await ctx.answerCallbackQuery().catch(() => {});

    // Guruhga hikoya
    await sendStory(ctx, found.engine, "SHERIFF");

    if (action === "check") {
      found.engine.submitNightAction(found.player.playerId, targetPlayerId, "SHERIFF");
      found.engine.markNightRoleDone("SHERIFF");

      let isMafia = ROLE_TEAM[target.role] === Team.MAFIA;
      if (target.isProtectedByLawyer) isMafia = false;

      // Hujjat himoyasi — tekshiruv aldanadi va hujjat sarflanadi
      if (target.hasDocumentActive) {
        isMafia = false;
        target.hasDocumentActive = false;
        // Nishonga PM
        try {
          await ctx.api.sendMessage(
            target.telegramId.toString(),
            `📜 Sizning hujjatingiz ishlatildi! Komissar tekshiruvi sizni tinch axoli deb ko'rdi.`,
            { parse_mode: "HTML" }
          );
        } catch { /* ignore */ }
      }

      const resultText = isMafia
        ? uz.night.sheriffResult_mafia.replace("{name}", target.firstName)
        : uz.night.sheriffResult_town.replace("{name}", target.firstName);
      await ctx.editMessageText(`🔍 <b>Tekshiruv natijasi:</b>\n${resultText}`, { parse_mode: "HTML" }).catch(() => {});
    } else {
      found.engine.submitNightAction(found.player.playerId, targetPlayerId, "SHERIFF");
      found.engine.setSheriffShoot(targetPlayerId);
      found.engine.markNightRoleDone("SHERIFF");
      await ctx.editMessageText(`🔫 Siz <b>${target.firstName}</b>ga o'q uzdingiz!`, { parse_mode: "HTML" }).catch(() => {});
    }

    if (found.engine.isNightComplete()) {
      await controller.handleNightEnd(found.engine.chatTelegramId);
    }
  });

  // Komissar "Ortga"
  composer.callbackQuery("sheriff_action:back", async (ctx) => {
    if (!ctx.from) return;
    const found = findPlayerGame(BigInt(ctx.from.id));
    if (!found) return;
    const { nightActionKeyboard } = await import("../../keyboards/game");
    const alive = found.engine.getAlivePlayers().filter((p) => p.playerId !== found.player.playerId);
    const showSkip = found.engine.currentRound > 1;
    const kb = nightActionKeyboard(alive, "night_sheriff", showSkip);
    await ctx.answerCallbackQuery().catch(() => {});
    await ctx.editMessageText(uz.night.sheriffPrompt, { parse_mode: "HTML", reply_markup: kb }).catch(() => {});
  });

  // ==================== QAROQCHI ====================

  // Qaroqchi nishon tanlaydi — nishonga "Pul ber / Bosh tort" tugmasi yuboriladi
  composer.callbackQuery(/^night_robber:(\d+)$/, async (ctx) => {
    if (!ctx.from) return;
    const targetPlayerId = parseInt(ctx.match[1]);
    const found = findPlayerGame(BigInt(ctx.from.id));
    if (!found || found.engine.status !== "NIGHT") {
      await ctx.answerCallbackQuery({ text: "Hozir tun emas!" }).catch(() => {});
      return;
    }
    const target = found.engine.getPlayer(targetPlayerId);
    if (!target || !target.isAlive) {
      await ctx.answerCallbackQuery({ text: "Noto'g'ri nishon!" }).catch(() => {});
      return;
    }

    await ctx.answerCallbackQuery({ text: `✅ ${target.firstName} tanlandi` }).catch(() => {});

    found.engine.submitNightAction(found.player.playerId, targetPlayerId, "ROBBER");
    found.engine.markNightRoleDone("ROBBER");

    await ctx.editMessageText(
      uz.night.robberWaiting.replace("{name}", target.firstName),
      { parse_mode: "HTML" }
    ).catch(() => {});

    // Nishonga PMda tanlov tugmalari
    try {
      await ctx.api.sendMessage(
        target.telegramId.toString(),
        uz.night.robberTargetPrompt,
        { parse_mode: "HTML", reply_markup: robberResponseKeyboard(found.engine.gameId) }
      );
    } catch { /* ignore */ }

    // Guruhga hikoya
    await sendStory(ctx, found.engine, "ROBBER");

    if (found.engine.isNightComplete()) {
      await controller.handleNightEnd(found.engine.chatTelegramId);
    }
  });

  // Qaroqchi nishoning javobi
  composer.callbackQuery(/^robber_response:(\d+):(pay|refuse)$/, async (ctx) => {
    if (!ctx.from) return;
    const gameId = parseInt(ctx.match[1]);
    const choice = ctx.match[2];

    let engine = null;
    for (const game of gameManager.getAllGames()) {
      if (game.gameId === gameId) { engine = game; break; }
    }
    if (!engine || engine.status !== "NIGHT") {
      await ctx.answerCallbackQuery({ text: "Kech qoldingiz!" }).catch(() => {});
      return;
    }
    const player = engine.getPlayerByTelegramId(BigInt(ctx.from.id));
    if (!player || !player.isAlive) {
      await ctx.answerCallbackQuery({ text: "Siz javob bera olmaysiz!" }).catch(() => {});
      return;
    }

    engine.setRobberResponse(choice === "pay" ? "PAY" : "REFUSE");
    await ctx.answerCallbackQuery().catch(() => {});
    await ctx.editMessageText(
      choice === "pay" ? uz.night.robberTargetPaid : uz.night.robberTargetRefused,
      { parse_mode: "HTML" }
    ).catch(() => {});
  });

  // ==================== PROFESSOR ====================

  // Professor nishon tanladi — qutilar tayyorlanadi va nishonga yuboriladi
  composer.callbackQuery(/^night_professor:(\d+)$/, async (ctx) => {
    if (!ctx.from) return;
    const targetPlayerId = parseInt(ctx.match[1]);
    const found = findPlayerGame(BigInt(ctx.from.id));
    if (!found || found.engine.status !== "NIGHT") {
      await ctx.answerCallbackQuery({ text: "Hozir tun emas!" }).catch(() => {});
      return;
    }
    const target = found.engine.getPlayer(targetPlayerId);
    if (!target || !target.isAlive) {
      await ctx.answerCallbackQuery({ text: "Noto'g'ri nishon!" }).catch(() => {});
      return;
    }

    await ctx.answerCallbackQuery({ text: `✅ ${target.firstName} tanlandi` }).catch(() => {});
    found.engine.submitNightAction(found.player.playerId, targetPlayerId, "PROFESSOR");
    found.engine.markNightRoleDone("PROFESSOR");

    // Nishonga 3 ta yopiq quti yuborish
    const boxes = found.engine.prepareProfessorBoxes(targetPlayerId);
    if (boxes) {
      try {
        await ctx.api.sendMessage(
          target.telegramId.toString(),
          uz.night.professorBoxesPrompt,
          { parse_mode: "HTML", reply_markup: professorBoxesKeyboard(target.playerId) }
        );
      } catch { /* ignore */ }
    }

    await ctx.editMessageText(
      `🎩 Siz <b>${target.firstName}</b>ga 3 ta sirli quti taklif qildingiz.\nU birini ochganda natija ma'lum bo'ladi.`,
      { parse_mode: "HTML" }
    ).catch(() => {});

    await sendStory(ctx, found.engine, "PROFESSOR");

    if (found.engine.isNightComplete()) {
      await controller.handleNightEnd(found.engine.chatTelegramId);
    }
  });

  // Nishon qutini tanladi
  composer.callbackQuery(/^professor_box:(\d+):(\d+)$/, async (ctx) => {
    if (!ctx.from) return;
    const targetPlayerId = parseInt(ctx.match[1]);
    const boxIndex = parseInt(ctx.match[2]);
    const found = findPlayerGame(BigInt(ctx.from.id));
    if (!found) {
      await ctx.answerCallbackQuery({ text: "O'yinda emassiz!" }).catch(() => {});
      return;
    }
    if (found.player.playerId !== targetPlayerId) {
      await ctx.answerCallbackQuery({ text: "Bu tugma siz uchun emas!" }).catch(() => {});
      return;
    }
    if (found.engine.status !== "NIGHT") {
      await ctx.answerCallbackQuery({ text: "Hozir tun emas!" }).catch(() => {});
      return;
    }

    const outcome = found.engine.resolveProfessorChoice(targetPlayerId, boxIndex);
    if (!outcome) {
      await ctx.answerCallbackQuery({ text: "⚠️ Quti allaqachon tanlangan!" }).catch(() => {});
      return;
    }

    await ctx.answerCallbackQuery().catch(() => {});
    let text: string;
    if (outcome === "DEATH") text = uz.night.professorResult_death;
    else if (outcome === "HERO") text = uz.night.professorResult_hero;
    else text = uz.night.professorResult_empty;
    await ctx.editMessageText(text, { parse_mode: "HTML" }).catch(() => {});
  });

  // ==================== BOSHQA ROLLAR ====================

  composer.callbackQuery(/^(night_\w+):(.+)$/, async (ctx) => {
    if (!ctx.from) return;
    const actionPrefix = ctx.match[1];
    const targetValue = ctx.match[2];

    // Komissar yuqorida handle qilingan
    if (actionPrefix === "night_sheriff") return;
    // Professor nishon tanlash ham yuqorida handle qilingan
    if (actionPrefix === "night_professor" && /^\d+$/.test(targetValue)) return;

    const role = NIGHT_ROLE_MAP[actionPrefix];
    if (!role) {
      await ctx.answerCallbackQuery({ text: "Noto'g'ri harakat!" }).catch(() => {});
      return;
    }

    const found = findPlayerGame(BigInt(ctx.from.id));
    if (!found) {
      await ctx.answerCallbackQuery({ text: "O'yinda emassiz!" }).catch(() => {});
      return;
    }
    if (found.engine.status !== "NIGHT") {
      await ctx.answerCallbackQuery({ text: "Hozir tun emas!" }).catch(() => {});
      return;
    }

    // Skip
    if (targetValue === "skip") {
      const actionRole = MAFIA_KILL_VOTERS.includes(found.player.role) ? found.player.role : role;
      found.engine.markNightRoleDone(actionRole);
      await ctx.answerCallbackQuery({ text: "🚫 O'tkazildi" }).catch(() => {});
      await ctx.editMessageText("🚫 O'tkazib yubordingiz.", { parse_mode: "HTML" }).catch(() => {});
      if (found.engine.isNightComplete()) {
        await controller.handleNightEnd(found.engine.chatTelegramId);
      }
      return;
    }

    const targetPlayerId = parseInt(targetValue);
    if (isNaN(targetPlayerId)) {
      await ctx.answerCallbackQuery({ text: "Noto'g'ri nishon!" }).catch(() => {});
      return;
    }

    const target = found.engine.getPlayer(targetPlayerId);
    if (!target || !target.isAlive) {
      await ctx.answerCallbackQuery({ text: "Bu o'yinchi allaqachon o'lik!" }).catch(() => {});
      return;
    }

    // Shifokor o'zini faqat 1 marta
    if (actionPrefix === "night_doctor" && targetPlayerId === found.player.playerId && found.player.doctorSelfHealUsed) {
      await ctx.answerCallbackQuery({ text: "⚠️ O'zingizni allaqachon bir marta davolagansiz!", show_alert: true }).catch(() => {});
      return;
    }

    // Kezuvchi komissarni uxlatishi taqiq
    if (actionPrefix === "night_hooker" && target.role === "SHERIFF") {
      await ctx.answerCallbackQuery({ text: "⚠️ Komissarni uxlatish taqiqlanadi!", show_alert: true }).catch(() => {});
      return;
    }

    // DARHOL javob
    await ctx.answerCallbackQuery({ text: `✅ ${target.firstName} tanlandi` }).catch(() => {});

    // Mafiya ovozi
    if (actionPrefix === "night_mafia") {
      found.engine.submitNightAction(found.player.playerId, targetPlayerId, found.player.role);
      found.engine.markNightRoleDone(found.player.role);
      await ctx.editMessageText(`🤵🏼 Siz <b>${target.firstName}</b>ni tanladingiz.`, { parse_mode: "HTML" }).catch(() => {});

      // Guruhga hikoya — Don yoki birinchi mafiya
      if (found.player.role === "DON") {
        await sendStory(ctx, found.engine, "DON");
      } else if (!found.engine.getAlivePlayers().some((p: any) => p.role === "DON")) {
        await sendStory(ctx, found.engine, "MAFIA");
      }
    } else {
      found.engine.submitNightAction(found.player.playerId, targetPlayerId, role);
      found.engine.markNightRoleDone(role);
      await ctx.editMessageText(`✅ Siz <b>${target.firstName}</b>ni tanladingiz.`, { parse_mode: "HTML" }).catch(() => {});

      // Guruhga hikoya
      await sendStory(ctx, found.engine, role);
    }

    if (found.engine.isNightComplete()) {
      await controller.handleNightEnd(found.engine.chatTelegramId);
    }
  });

  return composer;
}
