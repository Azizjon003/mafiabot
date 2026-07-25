// Guruhda faol foydalanuvchilarni kuzatuvchi xotira (in-memory).
// /diamond kabi random tarqatish uchun foydalanadi.

export interface ChatMember {
  userId: number;
  telegramId: bigint;
  firstName: string;
  lastSeenAt: number; // ms epoch
}

// Kuzatilish muddati — 24 soat. Bundan keyin "faol emas" deb hisoblanadi.
const ACTIVITY_TTL_MS = 24 * 60 * 60 * 1000;
// Guruhiga maksimal saqlanadigan faol a'zolar soni
const MAX_PER_CHAT = 500;
// Kuzatiladigan guruhlar maksimal soni — cheksiz o'sishning oldini oladi
const MAX_CHATS = 2000;

// chatTelegramId -> Map<userId, ChatMember>
// Map insertion tartibini saqlaydi; oxirgi tegilgan chatni oxiriga ko'chirib LRU emulyatsiya qilamiz.
const activity = new Map<bigint, Map<number, ChatMember>>();

export const chatActivity = {
  // Har kim guruhda xabar yuborganida chaqiriladi
  track(chatTelegramId: bigint, userId: number, telegramId: bigint, firstName: string): void {
    let perChat = activity.get(chatTelegramId);
    if (!perChat) {
      perChat = new Map();
    } else {
      // LRU: mavjud chatni delete+set orqali Map oxiriga ko'chiramiz (eng yangi tegilgan)
      activity.delete(chatTelegramId);
    }
    activity.set(chatTelegramId, perChat);
    perChat.set(userId, { userId, telegramId, firstName, lastSeenAt: Date.now() });

    // MAX_CHATS dan oshsa — eng eski tegilgan chatlarni (Map boshidagilar) tozalash
    while (activity.size > MAX_CHATS) {
      const oldestKey = activity.keys().next().value;
      if (oldestKey === undefined) break;
      activity.delete(oldestKey);
    }
    // MAX limitdan oshsa — eng eski yozuvlarni tozalash
    if (perChat.size > MAX_PER_CHAT) {
      const sorted = [...perChat.entries()].sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt);
      const toRemove = sorted.slice(0, perChat.size - MAX_PER_CHAT);
      for (const [key] of toRemove) perChat.delete(key);
    }
  },

  // Faol a'zolarni qaytaradi (TTL ichida). excludeUserId — o'zini chiqarib tashlaydi
  getActive(chatTelegramId: bigint, excludeUserId?: number): ChatMember[] {
    const perChat = activity.get(chatTelegramId);
    if (!perChat) return [];
    const cutoff = Date.now() - ACTIVITY_TTL_MS;
    return [...perChat.values()]
      .filter((m) => m.lastSeenAt >= cutoff && m.userId !== excludeUserId);
  },

  // Debug / statistika
  size(chatTelegramId: bigint): number {
    return activity.get(chatTelegramId)?.size ?? 0;
  },
};
