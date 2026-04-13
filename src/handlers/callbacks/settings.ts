import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { chatRepo } from "../../database/repositories/chat.repository";
import {
  settingsText,
  settingsMainKeyboard,
  settingsEditKeyboard,
  settingsEditText,
  SETTING_LIMITS,
  SettingKey,
} from "../../keyboards/game";
import { uz } from "../../locales/uz";

export function createSettingsCallbacks(): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  // settings:{key} — sozlama tanlash yoki orqaga qaytish
  composer.callbackQuery(/^settings:(.+)$/, async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;

    // Admin tekshirish
    try {
      const member = await ctx.getChatMember(ctx.from.id);
      if (member.status !== "creator" && member.status !== "administrator") {
        await ctx.answerCallbackQuery({ text: uz.errors.notAdmin });
        return;
      }
    } catch {
      await ctx.answerCallbackQuery({ text: uz.errors.notAdmin });
      return;
    }

    const key = ctx.match[1];

    if (key === "back") {
      // Asosiy sozlamalar sahifasiga qaytish
      const chat = await chatRepo.findOrCreate(BigInt(ctx.chat.id), ctx.chat.title);
      const settings = await chatRepo.getSettings(chat.id);
      await ctx.editMessageText(settingsText(settings), {
        parse_mode: "HTML",
        reply_markup: settingsMainKeyboard(),
      });
      await ctx.answerCallbackQuery();
      return;
    }

    // muteOnNight — toggle (true/false)
    if (key === "muteOnNight") {
      const chat = await chatRepo.findOrCreate(BigInt(ctx.chat.id), ctx.chat.title);
      const settings = await chatRepo.getSettings(chat.id);
      const newValue = !settings.muteOnNight;
      await chatRepo.updateSettings(chat.id, { muteOnNight: newValue });

      // Asosiy sahifani yangilash
      const updatedSettings = await chatRepo.getSettings(chat.id);
      await ctx.editMessageText(settingsText(updatedSettings), {
        parse_mode: "HTML",
        reply_markup: settingsMainKeyboard(),
      });
      await ctx.answerCallbackQuery({ text: uz.settings.updated });
      return;
    }

    // Sozlamani tahrirlash sahifasi
    if (key in SETTING_LIMITS) {
      const settingKey = key as SettingKey;
      const chat = await chatRepo.findOrCreate(BigInt(ctx.chat.id), ctx.chat.title);
      const settings = await chatRepo.getSettings(chat.id);
      const currentValue = settings[settingKey] as number;

      await ctx.editMessageText(settingsEditText(settingKey, currentValue), {
        parse_mode: "HTML",
        reply_markup: settingsEditKeyboard(settingKey, currentValue),
      });
      await ctx.answerCallbackQuery();
    }
  });

  // settings_adj:{key}:{step} — qiymatni o'zgartirish
  composer.callbackQuery(/^settings_adj:(\w+):(-?\d+)$/, async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;

    // Admin tekshirish
    try {
      const member = await ctx.getChatMember(ctx.from.id);
      if (member.status !== "creator" && member.status !== "administrator") {
        await ctx.answerCallbackQuery({ text: uz.errors.notAdmin });
        return;
      }
    } catch {
      await ctx.answerCallbackQuery({ text: uz.errors.notAdmin });
      return;
    }

    const key = ctx.match[1] as SettingKey;
    const step = parseInt(ctx.match[2]);

    if (!(key in SETTING_LIMITS)) return;

    const limits = SETTING_LIMITS[key];
    const chat = await chatRepo.findOrCreate(BigInt(ctx.chat.id), ctx.chat.title);
    const settings = await chatRepo.getSettings(chat.id);
    const currentValue = settings[key] as number;
    const newValue = Math.min(limits.max, Math.max(limits.min, currentValue + step));

    if (newValue === currentValue) {
      await ctx.answerCallbackQuery({ text: `Chegara: ${limits.min} — ${limits.max}` });
      return;
    }

    await chatRepo.updateSettings(chat.id, { [key]: newValue });

    await ctx.editMessageText(settingsEditText(key, newValue), {
      parse_mode: "HTML",
      reply_markup: settingsEditKeyboard(key, newValue),
    });
    await ctx.answerCallbackQuery({ text: uz.settings.updated });
  });

  return composer;
}
