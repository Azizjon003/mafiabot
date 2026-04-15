// Oxirgi so'z tizimi — o'lgan o'yinchi 10 soniya ichida guruhga xabar yuborishi mumkin
// Map<playerTelegramId, { chatTelegramId, playerName, expiresAt, timer }>

interface LastWordsWindow {
  chatTelegramId: bigint;
  playerName: string;
  expiresAt: number; // Date.now() + 10000
  timer: ReturnType<typeof setTimeout>;
}

const windows = new Map<string, LastWordsWindow>();

const WINDOW_MS = 10_000; // 10 soniya

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
  },

  // Oyna mavjudmi? Agar ha — guruh IDsini va ismni qaytaradi
  consume(playerTelegramId: bigint): { chatTelegramId: bigint; playerName: string } | null {
    const key = playerTelegramId.toString();
    const w = windows.get(key);
    if (!w) return null;
    if (Date.now() > w.expiresAt) {
      clearTimeout(w.timer);
      windows.delete(key);
      return null;
    }
    // Xabar yubordi — oyna yopiladi
    clearTimeout(w.timer);
    windows.delete(key);
    return { chatTelegramId: w.chatTelegramId, playerName: w.playerName };
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
