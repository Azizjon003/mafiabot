import { GameEngine } from "../engine";
import { NotificationService } from "../../services/notification.service";
import { t } from "../../services/text.service";
import { buildRoster } from "../roster";
import { PACING } from "../../utils/constants";
import { sleep } from "../../utils/helpers";

// sendMorningText — agar true bo'lsa, "Xayrli tong" matnini alohida xabar qilib yuboradi
// (odatda u rasm caption'ida bo'ladi, lekin rasm yo'q bo'lsa fallback)
export async function startDayPhase(
  engine: GameEngine,
  notifier: NotificationService,
  sendMorningText = true,
): Promise<void> {
  // 1. Tong otdi xabari (faqat rasm yuborilmagan bo'lsa)
  if (sendMorningText) {
    await notifier.sendToGroup(
      engine.chatTelegramId,
      t("game.dayStarts", { round: engine.currentRound })
    );
  }

  // Tong matni (yoki rasm caption'i) o'qilishi uchun pauza —
  // aks holda roster va muhokama e'loni ustidan birdan tushadi.
  await sleep(PACING.DAY_STEP_MS);

  // 2. Tirik o'yinchilar roster
  await notifier.sendToGroup(engine.chatTelegramId, buildRoster(engine));
  await sleep(PACING.DAY_STEP_MS);

  // 3. Muhokama e'loni
  await notifier.sendToGroup(
    engine.chatTelegramId,
    t("game.discussion", { time: engine.settings.dayDiscussionTimeout })
  );
}
