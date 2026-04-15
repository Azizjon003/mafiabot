import { GameEngine } from "../engine";
import { NotificationService } from "../../services/notification.service";
import { t } from "../../services/text.service";

export async function startDayPhase(
  engine: GameEngine,
  notifier: NotificationService
): Promise<void> {
  const text =
    t("game.dayStarts", { round: engine.currentRound }) +
    "\n\n" +
    t("game.discussion", { time: engine.settings.dayDiscussionTimeout });

  await notifier.sendToGroup(engine.chatTelegramId, text);
}
