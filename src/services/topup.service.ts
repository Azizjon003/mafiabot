import { TopUpKind } from "@prisma/client";
import { prisma } from "../database/prisma";
import { topUpRepo } from "../database/repositories/topup.repository";
import { economyService } from "./economy.service";
import { pricingService, PRICE_KEYS } from "./pricing.service";
import { textService } from "./text.service";
import { logger } from "../utils/logger";

// Karta rekvizitlari matn sifatida saqlanadi (Config jadvalida `text_` prefiksi bilan),
// shuning uchun admin ularni /admin matn panelidan ham, /setcard bilan ham o'zgartira oladi.
export const CARD_KEYS = {
  NUMBER: "payment.cardNumber",
  HOLDER: "payment.cardHolder",
} as const;

export interface Rates {
  diamondToMoney: number; // 1💎 = N💰
  diamondSom: number;     // 1💎 = N so'm
  moneySom: number;       // 1💰 = N so'm
  minSom: number;
}

export const topUpService = {
  async getRates(): Promise<Rates> {
    const [diamondToMoney, diamondSom, moneySom, minSom] = await Promise.all([
      pricingService.get(PRICE_KEYS.EXCHANGE_DIAMOND_MONEY),
      pricingService.get(PRICE_KEYS.DIAMOND_SOM),
      pricingService.get(PRICE_KEYS.MONEY_SOM),
      pricingService.get(PRICE_KEYS.TOPUP_MIN_SOM),
    ]);
    return { diamondToMoney, diamondSom, moneySom, minSom };
  },

  getCard(): { number: string; holder: string; filled: boolean } {
    const number = textService.getCurrent(CARD_KEYS.NUMBER).trim();
    const holder = textService.getCurrent(CARD_KEYS.HOLDER).trim();
    // Default qiymat "—" bo'lsa hali to'ldirilmagan hisoblanadi
    const filled = number.length > 0 && number !== "—";
    return { number, holder, filled };
  },

  async setCard(number: string, holder: string, editorTgId?: bigint): Promise<void> {
    await textService.setText(CARD_KEYS.NUMBER, number, editorTgId);
    await textService.setText(CARD_KEYS.HOLDER, holder, editorTgId);
  },

  // ==================== O'YIN ICHIDA AYIRBOSHLASH ====================

  // Pulni olmosga: N💎 olish uchun N × kurs 💰 yechiladi
  async moneyToDiamond(userId: number, diamonds: number): Promise<{ ok: boolean; error?: string; cost?: number }> {
    if (!Number.isFinite(diamonds) || diamonds <= 0) return { ok: false, error: "Miqdor noto'g'ri!" };
    const rate = await pricingService.get(PRICE_KEYS.EXCHANGE_DIAMOND_MONEY);
    if (rate <= 0) return { ok: false, error: "Kurs sozlanmagan — adminga murojaat qiling." };
    const cost = diamonds * rate;
    const spent = await economyService.spendMoney(userId, cost, "exchange_money_to_diamond");
    if (!spent) return { ok: false, error: `Yetarli pulingiz yo'q! (${cost.toLocaleString()}💰 kerak)` };
    await economyService.addDiamonds(userId, diamonds, "exchange_money_to_diamond");
    return { ok: true, cost };
  },

  // Olmosni pulga: N💎 berib N × kurs 💰 olinadi
  async diamondToMoney(userId: number, diamonds: number): Promise<{ ok: boolean; error?: string; gain?: number }> {
    if (!Number.isFinite(diamonds) || diamonds <= 0) return { ok: false, error: "Miqdor noto'g'ri!" };
    const rate = await pricingService.get(PRICE_KEYS.EXCHANGE_DIAMOND_MONEY);
    if (rate <= 0) return { ok: false, error: "Kurs sozlanmagan — adminga murojaat qiling." };
    const spent = await economyService.spendDiamonds(userId, diamonds, "exchange_diamond_to_money");
    if (!spent) return { ok: false, error: `Yetarli olmosingiz yo'q! (${diamonds}💎 kerak)` };
    const gain = diamonds * rate;
    await economyService.addMoney(userId, gain, "exchange_diamond_to_money");
    return { ok: true, gain };
  },

  // ==================== REAL PULGA SOTIB OLISH ====================

  // Narx: qancha so'm to'lash kerak
  async priceFor(kind: TopUpKind, amount: number): Promise<number> {
    const rates = await this.getRates();
    const per = kind === "DIAMOND" ? rates.diamondSom : rates.moneySom;
    return Math.round(amount * per);
  },

  // Yangi so'rov — chek kutish holatida. Eskilari bekor qilinadi (bittasi faol tursin).
  async createRequest(userId: number, kind: TopUpKind, amount: number) {
    const priceSom = await this.priceFor(kind, amount);
    await topUpRepo.cancelStale(userId);
    return topUpRepo.create(userId, kind, amount, priceSom);
  },

  async attachReceipt(requestId: number, fileId: string) {
    return topUpRepo.attachReceipt(requestId, fileId);
  },

  // Admin tasdiqladi — balans to'ldiriladi.
  // review() faqat PENDING dan o'tkazadi, shuning uchun ikki admin bir vaqtda
  // bosса ham balans IKKI MARTA to'lmaydi.
  async approve(requestId: number, adminTgId: bigint): Promise<{ ok: boolean; error?: string }> {
    const req = await topUpRepo.findById(requestId);
    if (!req) return { ok: false, error: "So'rov topilmadi" };
    if (req.status !== "PENDING") return { ok: false, error: `Bu so'rov allaqachon ko'rib chiqilgan (${req.status})` };

    const claimed = await topUpRepo.review(requestId, "APPROVED", adminTgId);
    if (!claimed) return { ok: false, error: "Bu so'rovni boshqa admin allaqachon ko'rib chiqdi" };

    try {
      if (req.kind === "DIAMOND") {
        await economyService.addDiamonds(req.userId, req.amount, `topup_${requestId}`);
      } else {
        await economyService.addMoney(req.userId, req.amount, `topup_${requestId}`);
      }
    } catch (e) {
      logger.error(e, `To'ldirish tasdiqlandi, lekin balans yozilmadi (requestId=${requestId})`);
      return { ok: false, error: "Balans yozishda xatolik — logni tekshiring" };
    }
    return { ok: true };
  },

  async reject(requestId: number, adminTgId: bigint, reason: string): Promise<{ ok: boolean; error?: string }> {
    const req = await topUpRepo.findById(requestId);
    if (!req) return { ok: false, error: "So'rov topilmadi" };
    if (req.status !== "PENDING") return { ok: false, error: `Bu so'rov allaqachon ko'rib chiqilgan (${req.status})` };

    const claimed = await topUpRepo.review(requestId, "REJECTED", adminTgId, reason);
    if (!claimed) return { ok: false, error: "Bu so'rovni boshqa admin allaqachon ko'rib chiqdi" };
    return { ok: true };
  },

  async getBalance(userId: number): Promise<{ money: number; diamonds: number }> {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { money: true, diamonds: true } });
    return { money: u?.money ?? 0, diamonds: u?.diamonds ?? 0 };
  },
};
