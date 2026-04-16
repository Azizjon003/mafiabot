import { bot } from "./bot";
import { connectDatabase, disconnectDatabase } from "./database/prisma";
import { NotificationService } from "./services/notification.service";
import { GameController } from "./game/controller";
import { shopService } from "./services/shop.service";
import { authMiddleware } from "./handlers/middleware/auth";
import { startCommand } from "./handlers/commands/start";
import { createGameCommands } from "./handlers/commands/game";
import { statsCommand } from "./handlers/commands/stats";
import { economyCommand } from "./handlers/commands/economy";
import { shopCommand } from "./handlers/commands/shop";
import { vipCommand } from "./handlers/commands/vip";
import { profileCommand } from "./handlers/commands/profile";
import { adminCommand } from "./handlers/commands/admin";
import { ownerCommand } from "./handlers/commands/owner";
import { nextCommand } from "./handlers/commands/next";
import { createJoinGameCallbacks } from "./handlers/callbacks/join-game";
import { createNightActionCallbacks } from "./handlers/callbacks/night-action";
import { createVoteCallbacks } from "./handlers/callbacks/vote";
import { createSettingsCallbacks } from "./handlers/callbacks/settings";
import { inlineHandler } from "./handlers/inline";
import { chatHandler } from "./handlers/chat";
import { nightSilenceHandler } from "./handlers/night-silence";
import { logger } from "./utils/logger";
import { setBotUsername } from "./config";
import { setupBotCommands } from "./setup-commands";

async function main() {
  // Database ulanish
  await connectDatabase();

  // Bot restart — aktiv o'yinlarni DB'dan tiklash (persistent state)
  const { prisma } = await import("./database/prisma");

  // Do'kon default itemlari
  await shopService.seedDefaultItems();

  // Matnlarni DB'dan yuklash (admin tahrirlagan custom matnlar)
  const { textService } = await import("./services/text.service");
  await textService.preloadAll();

  // Bot username'ni oldindan olish (getMe)
  const botInfo = await bot.api.getMe();
  setBotUsername(botInfo.username);
  logger.info(`Bot username: @${botInfo.username}`);

  // Bot buyruqlari menyusini sozlash (/start yozganda chiqadigan)
  await setupBotCommands(bot);

  // Servislar
  const notifier = new NotificationService(bot);
  const gameController = new GameController(notifier);

  // Aktiv o'yinlarni tiklash (bot restart'dan keyin)
  await restoreActiveGames(gameController, notifier).catch((e) =>
    logger.error(e, "Aktiv o'yinlarni tiklashda xatolik")
  );

  // Middleware
  bot.use(authMiddleware);

  // Tunda xabarlarni avtomatik o'chirish (eng boshida)
  bot.use(nightSilenceHandler);

  // Commands
  bot.use(startCommand);
  bot.use(createGameCommands(gameController));
  bot.use(statsCommand);
  bot.use(economyCommand);
  bot.use(shopCommand);
  bot.use(vipCommand);
  bot.use(profileCommand);
  bot.use(adminCommand);
  bot.use(ownerCommand);
  bot.use(nextCommand);

  // Inline mode
  bot.use(inlineHandler);

  // Callbacks
  bot.use(createJoinGameCallbacks(gameController));
  bot.use(createNightActionCallbacks(gameController));
  bot.use(createVoteCallbacks(gameController));
  bot.use(createSettingsCallbacks());

  // Chat handler — eng oxirida (mafia chat, dead chat, whisper)
  bot.use(chatHandler);

  // Bot ishga tushirish
  bot.start({
    onStart: (botInfo) => {
      setBotUsername(botInfo.username);
      logger.info(`🎭 Mafia Bot ishga tushdi: @${botInfo.username}`);
    },
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Bot to'xtatilmoqda...");
  bot.stop();
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Bot to'xtatilmoqda...");
  bot.stop();
  await disconnectDatabase();
  process.exit(0);
});

// Bot restart'dan keyin aktiv o'yinlarni DB'dan tiklash
async function restoreActiveGames(
  controller: GameController,
  notifier: NotificationService,
): Promise<void> {
  const { loadActiveGames, applySerializedToEngine } = await import("./game/persistence");
  const { GameEngine } = await import("./game/engine");
  const { gameManager } = await import("./game/manager");
  const { prisma } = await import("./database/prisma");

  const snapshots = await loadActiveGames();
  if (snapshots.length === 0) return;

  let restored = 0;
  let cancelled = 0;

  for (const s of snapshots) {
    try {
      // WAITING (ro'yxatdan o'tish) — tiklash xavfli, cancel qilamiz
      if (s.status === "WAITING") {
        await prisma.game.update({
          where: { id: s.gameId },
          data: { status: "CANCELLED", endedAt: new Date(), state: null as any },
        }).catch(() => {});
        try {
          await notifier.sendToGroup(
            BigInt(s.chatTelegramId),
            "⚠️ Bot qayta ishga tushdi — ro'yxatdan o'tish bekor qilindi. /startgame bilan yangisini boshlang.",
          );
        } catch { /* ignore */ }
        cancelled++;
        continue;
      }

      const engine = new GameEngine(s.gameId, s.chatId, BigInt(s.chatTelegramId), s.settings);
      applySerializedToEngine(engine, s);
      gameManager.registerEngine(engine);

      // Timer tiklash
      if (s.pendingPhaseAction && s.timerEndsAt) {
        const remaining = Math.max(1000, s.timerEndsAt - Date.now()); // min 1s
        const action = s.pendingPhaseAction;
        const chatTgId = engine.chatTelegramId;

        const callback = async () => {
          switch (action) {
            case "NIGHT_END":
              await controller.handleNightEnd(chatTgId);
              break;
            case "DAY_END":
              await controller.startVotingPhase(chatTgId);
              break;
            case "VOTING_END":
              await controller.handleVotingEnd(chatTgId);
              break;
            case "CONFIRM_END":
              await controller.handleConfirmEnd(chatTgId);
              break;
            default:
              logger.warn({ action }, "Noma'lum pendingPhaseAction — timer qayta yoqilmadi");
          }
        };

        engine.setTimer(remaining, callback, action);
      }

      // Guruhga xabar
      try {
        await notifier.sendToGroup(
          engine.chatTelegramId,
          `🔄 <b>Bot qayta ishga tushdi!</b>\n\nO'yin davom etmoqda (bosqich: <code>${engine.status}</code>, kun: ${engine.currentRound}).`,
        );
      } catch { /* ignore — guruh o'chirilgan bo'lishi mumkin */ }

      restored++;
    } catch (e) {
      logger.error(e, `O'yinni tiklab bo'lmadi, cancel qilinadi (gameId=${s.gameId})`);
      await prisma.game.update({
        where: { id: s.gameId },
        data: { status: "CANCELLED", endedAt: new Date(), state: null as any },
      }).catch(() => {});
      cancelled++;
    }
  }

  logger.info({ restored, cancelled }, "Aktiv o'yinlar tiklandi");
}

main().catch((err) => {
  logger.fatal(err, "Bot ishga tushirishda xatolik!");
  process.exit(1);
});
