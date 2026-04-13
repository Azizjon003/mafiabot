import { GameEngine } from "../engine";
import { NotificationService } from "../../services/notification.service";
import { joinGameKeyboard } from "../../keyboards/game";
import { uz } from "../../locales/uz";
import { mention } from "../../utils/helpers";
import { botUsername } from "../../config";

export async function startRegistration(
  engine: GameEngine,
  notifier: NotificationService
): Promise<number | undefined> {
  const text = `📝 <b>Ro'yxatdan o'tish davom etmoqda</b>${getPlayerListText(engine)}`;
  const messageId = await notifier.sendToGroup(
    engine.chatTelegramId,
    text,
    joinGameKeyboard(engine.gameId, botUsername, engine.chatTelegramId)
  );

  return messageId;
}

export function getPlayerListText(engine: GameEngine): string {
  const players = [...engine.players.values()];
  if (players.length === 0) return "";

  const namesInline = players
    .map((p) => mention(p.firstName, p.telegramId))
    .join(", ");

  return `\n\n<i>Ro'yxatdan o'tganlar:</i>\n${namesInline}\n\nJami <b>${players.length}</b>ta odam.`;
}

export function getRegistrationText(engine: GameEngine, timeLeft: number): string {
  return `📝 <b>Ro'yxatdan o'tish davom etmoqda</b>` + getPlayerListText(engine);
}
