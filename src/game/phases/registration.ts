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
  const text = uz.game.started.replace("{time}", engine.settings.registrationTimeout.toString());
  const playerList = getPlayerListText(engine);

  const messageId = await notifier.sendToGroup(
    engine.chatTelegramId,
    text + playerList,
    joinGameKeyboard(engine.gameId, botUsername, engine.chatTelegramId)
  );

  return messageId;
}

export function getPlayerListText(engine: GameEngine): string {
  const players = [...engine.players.values()];
  if (players.length === 0) return "";

  const list = players
    .map((p, i) => `${i + 1}. ${mention(p.firstName, p.telegramId)}`)
    .join("\n");

  return uz.game.playerList
    .replace("{count}", players.length.toString())
    .replace("{list}", list);
}

export function getRegistrationText(engine: GameEngine, timeLeft: number): string {
  const text = uz.game.started.replace("{time}", timeLeft.toString());
  return text + getPlayerListText(engine);
}
