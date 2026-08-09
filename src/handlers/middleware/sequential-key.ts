import { Context } from "grammy";
import { gameManager } from "../../game/manager";

/**
 * `sequentialize` uchun kalit.
 *
 * Runner update'larni PARALLEL ishlaydi, engine esa umumiy o'zgaruvchan
 * xotira (players, nightActions, votes) — hech qanday qulf yo'q. Shuning uchun
 * BITTA o'yinga tegishli hamma update ketma-ket bo'lishi shart.
 *
 * DIQQAT: oddiy `ctx.chat.id` kaliti bu yerda YETMAYDI. Tun harakatlari
 * o'yinchilarning SHAXSIY chatlaridan keladi, o'yin esa GURUH bo'yicha
 * kalitlangan. `ctx.chat.id` ishlatilsa, ikki o'yinchining tugmasi ikki xil
 * kalitga tushib parallel ketadi va bitta engine'ni birga o'zgartiradi.
 *
 * Shuning uchun shaxsiy chatdan kelgan update o'yinchining O'YIN GURUHI
 * kalitiga tarjima qilinadi.
 */
export function sequentialKey(ctx: Context): string | undefined {
  // Guruh/superguruh — o'yin aynan shu chatga bog'langan
  if (ctx.chat && ctx.chat.type !== "private") {
    return `c${ctx.chat.id}`;
  }

  const userId = ctx.from?.id;
  if (userId === undefined) return undefined; // kalitsiz — cheklovsiz o'tadi

  // Shaxsiy chat: o'yinchi biror o'yinda bo'lsa — o'sha o'yin navbatiga qo'shamiz
  const engine = gameManager.findGameByPlayer(BigInt(userId));
  if (engine) return `c${engine.chatTelegramId}`;

  // O'yinda emas (profil, do'kon, admin buyruqlari) — o'zining navbati yetarli
  return `u${userId}`;
}
