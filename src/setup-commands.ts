import { Bot } from "grammy";
import { BotContext } from "./types/context";
import { logger } from "./utils/logger";

// Shaxsiy chatda ko'rinadigan buyruqlar
const PRIVATE_COMMANDS = [
  { command: "start", description: "Botni ishga tushirish" },
  { command: "profile", description: "Mening profilim" },
  { command: "balance", description: "Balans — pul va olmos" },
  { command: "stats", description: "Mening statistikam" },
  { command: "vip", description: "VIP ma'lumoti" },
  { command: "buyvip", description: "VIP sotib olish" },
  { command: "heroname", description: "Geroy nomini o'zgartirish" },
  { command: "say", description: "Anonim shivir (tirik o'yinchilar)" },
  { command: "help", description: "Yordam" },
  { command: "rules", description: "O'yin qoidalari" },
];

// Guruhda ko'rinadigan buyruqlar
const GROUP_COMMANDS = [
  { command: "startgame", description: "Yangi o'yin boshlash" },
  { command: "begingame", description: "Ro'yxatni yopib o'yinni boshlash" },
  { command: "stopgame", description: "O'yinni to'xtatish" },
  { command: "extend", description: "Ro'yxat vaqtini uzaytirish" },
  { command: "next", description: "Keyingi o'yinga obuna" },
  { command: "unsubscribe", description: "Obunani bekor qilish" },
  { command: "send", description: "Reply: olmos yuborish" },
  { command: "money", description: "Reply: pul yuborish" },
  { command: "gsend", description: "Barcha o'yinchilarga tarqatish" },
  { command: "change", description: "Random g'olibga olmos" },
  { command: "top", description: "Top reyting" },
  { command: "top7", description: "Haftalik top" },
  { command: "top30", description: "Oylik top" },
  { command: "settings", description: "O'yin sozlamalari (admin)" },
  { command: "mute", description: "Reply: o'yinchini mute (admin)" },
  { command: "kick", description: "Reply: o'yindan chiqarish (admin)" },
  { command: "ban", description: "Reply: ban (admin)" },
  { command: "stats", description: "Mening statistikam" },
  { command: "help", description: "Yordam" },
  { command: "rules", description: "O'yin qoidalari" },
];

export async function setupBotCommands(bot: Bot<BotContext>): Promise<void> {
  try {
    // DM uchun
    await bot.api.setMyCommands(PRIVATE_COMMANDS, {
      scope: { type: "all_private_chats" },
    });

    // Guruhlar uchun
    await bot.api.setMyCommands(GROUP_COMMANDS, {
      scope: { type: "all_group_chats" },
    });

    logger.info(`Bot commands menu sozlandi: ${PRIVATE_COMMANDS.length} DM + ${GROUP_COMMANDS.length} guruh`);
  } catch (e) {
    logger.error(e, "setMyCommands xatolik");
  }
}
