import { Context, SessionFlavor } from "grammy";

export interface SessionData {
  language: string;
}

export interface BotContext extends Context, SessionFlavor<SessionData> {
  // DB dan yuklangan user
  dbUser?: {
    id: number;
    telegramId: bigint;
    language: string;
  };
}
