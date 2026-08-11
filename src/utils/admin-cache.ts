import { BotContext } from "../types/context";

// Guruh admini ekanligini tekshirish HAR SAFAR Telegram API'ga so'rov yuboradi.
// Bu ikki joyda og'riq beradi:
//   1) spam — har bir /extend, /begingame uchun alohida so'rov
//   2) night-silence — guruhdagi HAR BIR xabar uchun alohida so'rov
// Shuning uchun natijani qisqa muddatga keshlaymiz.
const TTL_MS = 5 * 60_000;
const cache = new Map<string, { isAdmin: boolean; expiresAt: number }>();

export async function isChatAdminCached(ctx: BotContext, userId?: number): Promise<boolean> {
  const uid = userId ?? ctx.from?.id;
  if (!ctx.chat || uid === undefined) return false;

  const key = `${ctx.chat.id}:${uid}`;
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) return hit.isAdmin;

  let isAdmin = false;
  try {
    const member = await ctx.getChatMember(uid);
    isAdmin = member.status === "creator" || member.status === "administrator";
  } catch {
    // So'rov muvaffaqiyatsiz — keshlamaymiz, keyingi safar qayta urinamiz
    return hit?.isAdmin ?? false;
  }

  cache.set(key, { isAdmin, expiresAt: now + TTL_MS });
  return isAdmin;
}

// Admin huquqi o'zgarganda qo'lda tozalash uchun
export function invalidateAdminCache(chatId: number | bigint, userId?: number | bigint): void {
  if (userId === undefined) {
    const prefix = `${chatId}:`;
    for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
    return;
  }
  cache.delete(`${chatId}:${userId}`);
}

// Eskirganlarni davriy tozalash
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
}, TTL_MS);
if (typeof cleanup.unref === "function") cleanup.unref();

export function _clearAdminCache(): void {
  cache.clear();
}
