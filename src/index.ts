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
import { logger } from "./utils/logger";
import { setBotUsername } from "./config";

async function main() {
  // Database ulanish
  await connectDatabase();

  // Bot restart — eski aktiv o'yinlarni cancel qilish
  const { prisma } = await import("./database/prisma");
  const cancelledCount = await prisma.game.updateMany({
    where: { status: { notIn: ["FINISHED", "CANCELLED"] } },
    data: { status: "CANCELLED", endedAt: new Date() },
  });
  if (cancelledCount.count > 0) {
    logger.info(`${cancelledCount.count} ta eski aktiv o'yin bekor qilindi (bot restart)`);
  }

  // Do'kon default itemlari
  await shopService.seedDefaultItems();

  // Bot username'ni oldindan olish (getMe)
  const botInfo = await bot.api.getMe();
  setBotUsername(botInfo.username);
  logger.info(`Bot username: @${botInfo.username}`);

  // Servislar
  const notifier = new NotificationService(bot);
  const gameController = new GameController(notifier);

  // Middleware
  bot.use(authMiddleware);

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

main().catch((err) => {
  logger.fatal(err, "Bot ishga tushirishda xatolik!");
  process.exit(1);
});
