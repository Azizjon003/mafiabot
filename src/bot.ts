import { Bot, session } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { config } from "./config";
import { BotContext, SessionData } from "./types/context";
import { logger } from "./utils/logger";

export const bot = new Bot<BotContext>(config.botToken);

// Throttler — Telegram API rate limitlariga rioya qilib so'rovlarni navbatga soladi
bot.api.config.use(apiThrottler());

// Auto-retry — 429 rate limit xatolarini avtomatik qayta urinadi
bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 15 }));

// Session middleware
bot.use(
  session({
    initial: (): SessionData => ({
      language: "uz",
    }),
  })
);

// Error handler
bot.catch((err) => {
  logger.error(err, "Bot xatoligi");
});
