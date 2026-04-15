import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { GameController } from "../../game/controller";
import { gameManager } from "../../game/manager";
import { ROLE_EMOJI, ROLE_NAME } from "../../utils/constants";

export function createJoinGameCallbacks(_controller: GameController): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  // Guruhda "🎭 Mening rolim" tugmasi — har kim bossa o'z rolini ko'radi (privat)
  composer.callbackQuery(/^showrole:(\d+)$/, async (ctx) => {
    const chatId = ctx.callbackQuery.message?.chat.id;
    if (!chatId || !ctx.from) return;

    const gameId = parseInt(ctx.match[1]);
    const engine = gameManager.getGame(BigInt(chatId));

    if (!engine || engine.gameId !== gameId) {
      await ctx.answerCallbackQuery({
        text: "Bu o'yin allaqachon tugagan!",
        show_alert: true,
      }).catch(() => {});
      return;
    }

    const player = engine.getPlayerByTelegramId(BigInt(ctx.from.id));
    if (!player) {
      await ctx.answerCallbackQuery({
        text: "Siz bu o'yinda qatnashmayapsiz!",
        show_alert: true,
      }).catch(() => {});
      return;
    }

    const status = player.isAlive ? "✅ Tirik" : "💀 O'lik";
    const roleText = `${ROLE_EMOJI[player.role]} Siz — ${ROLE_NAME[player.role]}\n${status}`;

    await ctx.answerCallbackQuery({
      text: roleText,
      show_alert: true,
    }).catch(() => {});
  });

  return composer;
}
