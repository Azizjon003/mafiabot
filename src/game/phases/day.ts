import { GameEngine } from "../engine";
import { NotificationService } from "../../services/notification.service";
import { uz } from "../../locales/uz";

export async function startDayPhase(
  engine: GameEngine,
  notifier: NotificationService
): Promise<void> {
  const text =
    uz.game.dayStarts.replace("{round}", engine.currentRound.toString()) +
    "\n\n" +
    uz.game.discussion.replace("{time}", engine.settings.dayDiscussionTimeout.toString());

  await notifier.sendToGroup(engine.chatTelegramId, text);
}
