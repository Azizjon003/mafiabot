import { Composer } from "grammy";
import { BotContext } from "../../types/context";
import { GameController } from "../../game/controller";

export function createJoinGameCallbacks(controller: GameController): Composer<BotContext> {
  const composer = new Composer<BotContext>();
  // Qo'shilish deep link orqali (start.ts da handle qilinadi)
  // Chiqish tugmasi olib tashlangan
  return composer;
}
