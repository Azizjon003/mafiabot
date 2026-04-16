import { GameEngine } from "../engine";
import { NotificationService } from "../../services/notification.service";
import { t } from "../../services/text.service";
import { buildRoster } from "../roster";

export async function startDayPhase(
  engine: GameEngine,
  notifier: NotificationService
): Promise<void> {
  // 1. Tong otdi xabari
  await notifier.sendToGroup(
    engine.chatTelegramId,
    t("game.dayStarts", { round: engine.currentRound })
  );

  // 2. Tirik o'yinchilar roster
  await notifier.sendToGroup(engine.chatTelegramId, buildRoster(engine));

  // 3. Muhokama e'loni
  await notifier.sendToGroup(
    engine.chatTelegramId,
    t("game.discussion", { time: engine.settings.dayDiscussionTimeout })
  );
}
