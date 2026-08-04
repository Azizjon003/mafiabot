// Xabar qatlami — yangi eventlar va matn kalitlari.
// Ishga tushirish: npx tsx tests/messages.smoke.ts
// Xabar qatlami: yangi eventlar guruhga to'g'ri chiqadimi (Telegram API stub).
process.env.LOG_LEVEL = "silent";
import { PACING } from "../src/utils/constants";
for (const k of Object.keys(PACING) as (keyof typeof PACING)[]) (PACING as any)[k] = 0;

import { NotificationService } from "../src/services/notification.service";
import { PlayerState, NightResult } from "../src/types";

const sent: { chat: string; text: string }[] = [];
const fakeBot: any = {
  api: {
    sendMessage: async (chat: string, text: string) => { sent.push({ chat, text }); return { message_id: 1 }; },
    pinChatMessage: async () => ({}), unpinChatMessage: async () => ({}),
    editMessageText: async () => ({}), deleteMessage: async () => ({}),
  },
};
const notifier = new NotificationService(fakeBot);

function P(id: number, name: string, role: any, over: any = {}): PlayerState {
  return {
    playerId: id, userId: id, telegramId: BigInt(1000 + id), firstName: name, role,
    isAlive: true, isBlocked: false, isProtectedByLawyer: false, isProtectedByWarlock: false,
    isHealedByDoctor: false, doctorSelfHealUsed: false, hasHeroActive: false,
    heroProtectionAvailable: false, heroDefendUsed: false, heroHP: 100, heroProtection: 0,
    hasShieldActive: false, shieldCharges: 0, reservedShield: false, reservedDocument: false,
    inactiveNights: 0, ...over,
  } as PlayerState;
}

const out: { ok: boolean; name: string; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: string) => out.push({ ok, name, detail: ok ? undefined : detail });

async function main() {
  // ===== 1. Kamikaze tunda portladi =====
  const kam = P(1, "Kamil", "KAMIKAZE");
  const don = P(2, "Doniyor", "DON");
  const res1: NightResult = {
    killed: [{ player: kam, cause: "MAFIA_KILL" }, { player: don, cause: "KAMIKAZE_KILL" }],
    saved: [],
    events: [{ type: "KAMIKAZE_NIGHT_EXPLODE", actorId: 1, targetId: 2, message: "" }],
  };
  sent.length = 0;
  await notifier.announceNightResults(BigInt(-100), res1, true);
  const all1 = sent.map((s) => s.text).join("\n---\n");
  check("Kamikaze portlashi guruhga e'lon qilindi",
    all1.includes("Kamil") && all1.includes("Doniyor") && all1.includes("Portlash"),
    all1.replace(/\n/g, " | "));
  check("Portlash xabarida {name}/{killer} placeholder qolmadi",
    !all1.includes("{name}") && !all1.includes("{killer}"), all1);

  // ===== 2. Shield parchalandi =====
  const vic = P(3, "Vali", "CIVILIAN");
  const res2: NightResult = {
    killed: [{ player: vic, cause: "KILLER_KILL" }],
    saved: [],
    events: [{
      type: "SHIELD_SHATTERED", actorId: 3,
      message: "🎯 <b>Kimningdir himoyasi parchalanib ketdi!</b>",
      privateMessage: "x",
    }],
  };
  sent.length = 0;
  await notifier.announceNightResults(BigInt(-100), res2, true);
  const all2 = sent.map((s) => s.text).join("\n---\n");
  check("Shield parchalanishi guruhga anonim e'lon qilindi",
    all2.includes("parchalanib ketdi") && !all2.includes("Kimningdir himoyasi parchalanib ketdi!</b> Vali"),
    all2.replace(/\n/g, " | "));
  check("Parchalangan o'yinchi ismi e'londa OSHKOR bo'lmadi (faqat o'lim xabarida)",
    all2.indexOf("parchalanib") < all2.indexOf("Vali"), all2.replace(/\n/g, " | "));

  // ===== 3. Rol xabarida o'q haqida ogohlantirish =====
  sent.length = 0;
  await notifier.sendRoleToPlayer(P(4, "Qotil", "KILLER", { hasBulletActive: true }));
  check("Rol xabariga 'Snayper o'qi faol' qo'shildi",
    sent.length === 1 && sent[0].text.includes("Snayper o'qi faol"), sent[0]?.text ?? "(xabar yo'q)");

  sent.length = 0;
  await notifier.sendRoleToPlayer(P(5, "Tinch", "CIVILIAN"));
  check("O'qsiz o'yinchiga ortiqcha matn qo'shilmadi",
    sent.length === 1 && !sent[0].text.includes("Snayper o'qi faol"), sent[0]?.text ?? "");

  // ===== 4. Kamikaze DM yiqilgan holat matni =====
  const { t } = await import("../src/services/text.service");
  const noDm = t("game.kamikazeNoDm");
  check("game.kamikazeNoDm matni mavjud (kalit qaytmadi)", noDm !== "game.kamikazeNoDm" && noDm.length > 10, noDm);
  const shopBullet = t("profile.shopBullet", { emoji: "💎", price: "14" });
  check("profile.shopBullet matni to'ldirildi",
    shopBullet.includes("14") && !shopBullet.includes("{price}") && !shopBullet.includes("{emoji}"), shopBullet);
  const useTitle = t("profile.useTitle", { shieldCount: 1, bulletCount: 2, documentCount: 0, activeRole: "yo'q", hero: "yo'q" });
  check("profile.useTitle da {bulletCount} to'ldirildi",
    useTitle.includes("2 ta") && !useTitle.includes("{bulletCount}"), useTitle.replace(/\n/g, " | "));

  // ===== 5. HTML balansi (Telegram parse_mode xatosi bermasin) =====
  const { validateHtml } = await import("../src/services/text.service");
  const { TEXT_DEFAULTS } = await import("../src/services/text-defaults");
  const badKeys: string[] = [];
  for (const [k, v] of Object.entries(TEXT_DEFAULTS)) {
    if (!validateHtml(v).ok) badKeys.push(k);
  }
  check("Barcha matnlarda HTML taglari balansda", badKeys.length === 0, badKeys.join(", "));

  let bad = 0;
  for (const r of out) {
    if (!r.ok) bad++;
    console.log(`${r.ok ? "OK " : "XXX"} ${r.name}${r.detail ? "\n      <- " + r.detail : ""}`);
  }
  console.log(`\n${out.length - bad}/${out.length} o'tdi`);
}

main().catch((e) => { console.error(e); process.exit(1); });
