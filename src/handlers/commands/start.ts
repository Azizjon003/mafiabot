import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { gameManager } from "../../game/manager";
import { getRegistrationText } from "../../game/phases/registration";
import { joinGameKeyboard, votingPlayerListKeyboard } from "../../keyboards/game";
import { t } from "../../services/text.service";
import { mention } from "../../utils/helpers";
import { botUsername } from "../../config";
import { referralService } from "../../services/referral.service";
import { escapeHtml } from "../../utils/helpers";

export const startCommand = new Composer<BotContext>();

// Ko'p odam bir vaqtda qo'shilganda har bir join uchun guruh xabarini edit qilish
// Telegram'ning bitta chat limitini to'ldiradi. Burst joinlarni bitta editga yig'amiz.
const registrationRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleRegistrationRefresh(ctx: BotContext, chatTelegramId: bigint): void {
  const key = chatTelegramId.toString();
  const previous = registrationRefreshTimers.get(key);
  if (previous) clearTimeout(previous);

  const timer = setTimeout(() => {
    registrationRefreshTimers.delete(key);
    const latestEngine = gameManager.getGame(chatTelegramId);
    if (!latestEngine || latestEngine.status !== "WAITING" || !latestEngine.registrationMessageId) return;

    ctx.api.editMessageText(
      key,
      latestEngine.registrationMessageId,
      getRegistrationText(latestEngine, latestEngine.settings.registrationTimeout),
      {
        parse_mode: "HTML",
        reply_markup: joinGameKeyboard(latestEngine.gameId, botUsername, chatTelegramId),
      }
    ).catch(() => {});
  }, 750);

  registrationRefreshTimers.set(key, timer);
}

startCommand.command("start", async (ctx) => {
  if (ctx.chat.type !== "private") {
    await ctx.reply(t("start.botStartedInGroup"), { parse_mode: "HTML" });
    return;
  }

  // Deep link tekshirish: /start join_CHATID
  const payload = ctx.match;

  if (!ctx.from) return;

  if (payload && typeof payload === "string" && payload.startsWith("join_")) {
    const chatIdStr = payload.replace("join_", "");
    const chatTelegramId = BigInt(chatIdStr);

    const engine = gameManager.getGame(chatTelegramId);
    if (!engine || engine.status !== "WAITING") {
      await ctx.reply(t("start.gameNotFound"), { parse_mode: "HTML" });
      return;
    }

    // Allaqachon qo'shilganmi
    if (engine.getPlayerByTelegramId(BigInt(ctx.from.id))) {
      await ctx.reply(t("start.alreadyJoined"), { parse_mode: "HTML" });
      return;
    }

    // Boshqa guruhda o'yindami
    if (gameManager.isPlayerInAnyGame(BigInt(ctx.from.id))) {
      await ctx.reply(t("start.alreadyInOtherGame"), { parse_mode: "HTML" });
      return;
    }

    // O'yinga qo'shish
    const player = await gameManager.addPlayerToGame(
      chatTelegramId,
      BigInt(ctx.from.id),
      ctx.from.first_name,
      ctx.from.username
    );

    if (!player) {
      await ctx.reply(t("start.cantJoin"), { parse_mode: "HTML" });
      return;
    }

    await ctx.reply(
      t("start.joinedSuccess", { count: engine.getPlayerCount(), max: engine.settings.maxPlayers }),
      { parse_mode: "HTML" }
    );

    scheduleRegistrationRefresh(ctx, chatTelegramId);

    return;
  }

  // Deep link: /start ref_<taklif qilgan telegramId> — do'st taklifi
  if (payload && typeof payload === "string" && payload.startsWith("ref_")) {
    const raw = payload.slice(4);
    if (ctx.dbUser && /^\d+$/.test(raw)) {
      const res = await referralService.register(
        ctx.dbUser.id,
        BigInt(ctx.from.id),
        BigInt(raw),
      );
      if (res.ok) {
        const s = await referralService.getSettings();
        // Havolali ro'yxat — do'st shu yerdan guruhga kira oladi
        const groupList = await referralService.targetGroupsText();
        await ctx.reply(
          t("referral.invitedWelcome", { minGames: s.minGames, groups: groupList }),
          { parse_mode: "HTML" },
        );
      }
      // Xato bo'lsa jim o'tamiz — pastdagi oddiy /start javobi beriladi
    }
    // Deep link tugadi, oddiy salomlashuvga o'tamiz (return YO'Q)
  }

  // Deep link: /start vote_CHATID — ovoz berish
  if (payload && typeof payload === "string" && payload.startsWith("vote_")) {
    const chatIdStr = payload.replace("vote_", "");
    const chatTelegramId = BigInt(chatIdStr);

    const engine = gameManager.getGame(chatTelegramId);
    if (!engine || engine.status !== "VOTING") {
      await ctx.reply(t("start.noVotingNow"), { parse_mode: "HTML" });
      return;
    }

    const voter = engine.getPlayerByTelegramId(BigInt(ctx.from.id));
    if (!voter) {
      await ctx.reply(t("start.notInThisGame"), { parse_mode: "HTML" });
      return;
    }
    if (!voter.isAlive) {
      await ctx.reply(t("errors.playerDead"), { parse_mode: "HTML" });
      return;
    }

    // Kezuvchi uxlatgan o'yinchi kunduzi ovoz bera olmaydi
    if (voter.isBlocked) {
      await ctx.reply(t("errors.playerBlocked"), { parse_mode: "HTML" });
      return;
    }

    // Allaqachon ovoz berganmi
    if (engine.hasVoted(voter.playerId)) {
      await ctx.reply(t("game.alreadyVoted"), { parse_mode: "HTML" });
      return;
    }

    // Tirik o'yinchilar ro'yxati (o'zidan boshqa)
    const alive = engine.getAlivePlayers().filter((p) => p.playerId !== voter.playerId);
    const kb = votingPlayerListKeyboard(engine.gameId, alive);

    await ctx.reply(
      t("start.voteWhoPrompt"),
      { parse_mode: "HTML", reply_markup: kb }
    );
    return;
  }

  // Oddiy /start
  await ctx.reply(t("start.welcome"), { parse_mode: "HTML" });
});

startCommand.command("help", async (ctx) => {
  await ctx.reply(t("help.text"), { parse_mode: "HTML" });
});

startCommand.command("rules", async (ctx) => {
  await ctx.reply(t("start.rules"), { parse_mode: "HTML" });
});
