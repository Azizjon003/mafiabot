import { GameEngine } from "../engine";
import { NotificationService } from "../../services/notification.service";
import { votingButtonKeyboard } from "../../keyboards/game";
import { t } from "../../services/text.service";
import { botUsername } from "../../config";

export async function startVotingPhase(
  engine: GameEngine,
  notifier: NotificationService
): Promise<number | undefined> {
  const text = t("game.votingAnnounce", { seconds: engine.settings.votingTimeout });
  const kb = votingButtonKeyboard(botUsername, engine.chatTelegramId);
  return await notifier.sendToGroup(engine.chatTelegramId, text, kb);
}
