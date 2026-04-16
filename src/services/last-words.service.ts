// Oxirgi so'z tizimi — o'lgan o'yinchi belgilangan vaqt ichida guruhga xabar yuborishi mumkin
// Map<playerTelegramId, { chatTelegramId, playerName, expiresAt, timer }>
import { logger } from "../utils/logger";

interface LastWordsWindow {
  chatTelegramId: bigint;
  playerName: string;
  expiresAt: number;
  timer: ReturnType<typeof setTimeout>;
}

const windows = new Map<string, LastWordsWindow>();

// Default oyna — 30 soniya (avval 10s edi, qisqa bo'lganidan ishlamay qolayotgan edi)
let WINDOW_MS = 30_000;

export const lastWordsService = {
  // O'lim sodir bo'lganda oyna ochish
  open(
    playerTelegramId: bigint,
    chatTelegramId: bigint,
    playerName: string,
    onExpire?: () => void
  ): void {
    const key = playerTelegramId.toString();

    // Avvalgi oyna bor bo'lsa tozalash
    const prev = windows.get(key);
    if (prev) clearTimeout(prev.timer);

    const timer = setTimeout(() => {
      windows.delete(key);
      onExpire?.();
    }, WINDOW_MS);

    windows.set(key, {
      chatTelegramId,
      playerName,
      expiresAt: Date.now() + WINDOW_MS,
      timer,
    });
    logger.info({ key, playerName, windowMs: WINDOW_MS }, "Oxirgi so'z oynasi ochildi");
  },

  // Oyna mavjudmi? Agar ha — guruh IDsini va ismni qaytaradi
  consume(playerTelegramId: bigint): { chatTelegramId: bigint; playerName: string } | null {
    const key = playerTelegramId.toString();
    const w = windows.get(key);
    if (!w) {
      logger.debug({ key }, "Oxirgi so'z — oyna topilmadi");
      return null;
    }
    if (Date.now() > w.expiresAt) {
      clearTimeout(w.timer);
      windows.delete(key);
      logger.info({ key, playerName: w.playerName }, "Oxirgi so'z — oyna muddati tugagan");
      return null;
    }
    clearTimeout(w.timer);
    windows.delete(key);
    logger.info({ key, playerName: w.playerName }, "Oxirgi so'z — xabar qabul qilindi");
    return { chatTelegramId: w.chatTelegramId, playerName: w.playerName };
  },

  setWindowMs(ms: number): void {
    WINDOW_MS = ms;
  },

  // Ochiq oynani ko'rish (consume qilmasdan)
  peek(playerTelegramId: bigint): boolean {
    const key = playerTelegramId.toString();
    const w = windows.get(key);
    if (!w) return false;
    if (Date.now() > w.expiresAt) {
      clearTimeout(w.timer);
      windows.delete(key);
      return false;
    }
    return true;
  },

  getWindowSeconds(): number {
    return Math.floor(WINDOW_MS / 1000);
  },
};
