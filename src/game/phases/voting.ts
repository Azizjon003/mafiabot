import { GameEngine } from "../engine";
import { NotificationService } from "../../services/notification.service";
import { votingButtonKeyboard } from "../../keyboards/game";
import { uz } from "../../locales/uz";
import { botUsername } from "../../config";

export async function startVotingPhase(
  engine: GameEngine,
  notifier: NotificationService
): Promise<number | undefined> {
  const text =
    `🗳 <b>Aybdorlarni aniqlash va jazolash vaqti keldi.</b>\n` +
    `Ovoz berish uchun <b>${engine.settings.votingTimeout} sekund</b>\n` +
    `<b>Ovoz berish</b>`;

  const kb = votingButtonKeyboard(botUsername, engine.chatTelegramId);
  return await notifier.sendToGroup(engine.chatTelegramId, text, kb);
}
