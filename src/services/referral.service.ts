import { prisma } from "../database/prisma";
import { referralRepo, referralChatRepo } from "../database/repositories/referral.repository";
import { economyService } from "./economy.service";
import { pricingService, PRICE_KEYS } from "./pricing.service";
import { logger } from "../utils/logger";
import { t } from "./text.service";
import { escapeHtml } from "../utils/helpers";

export interface ReferralSettings {
  reward: number;
  currency: "diamond" | "money";
  minGames: number;
  maxRewards: number; // 0 = cheksiz
}

export const referralService = {
  async getSettings(): Promise<ReferralSettings> {
    const [reward, minGames, maxRewards, currency] = await Promise.all([
      pricingService.get(PRICE_KEYS.REFERRAL_REWARD),
      pricingService.get(PRICE_KEYS.REFERRAL_MIN_GAMES),
      pricingService.get(PRICE_KEYS.REFERRAL_MAX_REWARDS),
      pricingService.getCurrency(PRICE_KEYS.REFERRAL_REWARD),
    ]);
    return { reward, currency, minGames: Math.max(1, minGames), maxRewards };
  },

  /**
   * /start ref_<telegramId> bosilganda chaqiriladi.
   * Suiiste'molga qarshi barcha tekshiruvlar shu yerda.
   */
  async register(
    invitedUserId: number,
    invitedTelegramId: bigint,
    referrerTelegramId: bigint,
  ): Promise<{ ok: boolean; reason?: string }> {
    // 1. O'ziga o'zi
    if (invitedTelegramId === referrerTelegramId) {
      return { ok: false, reason: "self" };
    }

    // 2. Taklif qiluvchi mavjudmi
    const referrer = await prisma.user.findUnique({
      where: { telegramId: referrerTelegramId },
      select: { id: true },
    });
    if (!referrer) return { ok: false, reason: "no_referrer" };

    // 3. Bu odam allaqachon taklif qilinganmi (bir marta — umrbod)
    const existing = await referralRepo.findByInvited(invitedUserId);
    if (existing) return { ok: false, reason: "already" };

    // 4. YANGI o'yinchi bo'lishi shart — allaqachon o'ynagan odamni
    //    "yangi do'st" deb ko'rsatib bo'lmaydi
    const played = await prisma.player.count({ where: { userId: invitedUserId } });
    if (played > 0) return { ok: false, reason: "not_new" };

    // 5. Halqa: A ni B taklif qilgan bo'lsa, A endi B ni taklif qila olmaydi
    const reverse = await referralRepo.findByInvited(referrer.id);
    if (reverse && reverse.referrerId === invitedUserId) {
      return { ok: false, reason: "cycle" };
    }

    const created = await referralRepo.create(referrer.id, invitedUserId);
    if (!created) return { ok: false, reason: "already" };

    logger.info({ referrerId: referrer.id, invitedId: invitedUserId }, "Referral ro'yxatga olindi");
    return { ok: true };
  },

  /**
   * O'yin tugaganda har bir o'yinchi uchun chaqiriladi.
   * Faqat admin TANLAGAN guruhlarda hisoblanadi.
   * Shart bajarilsa — mukofot beriladi va natija qaytariladi (xabar yuborish uchun).
   */
  async onGameFinished(
    chatTelegramId: bigint,
    invitedUserId: number,
  ): Promise<{ rewarded: true; referrerTelegramId: bigint; amount: number; currency: string } | null> {
    // Guruh maqsadli emasmi — umuman sanamaymiz
    if (!(await referralChatRepo.isTarget(chatTelegramId))) return null;

    const row = await referralRepo.countGame(invitedUserId);
    if (!row) return null; // referali yo'q yoki allaqachon mukofotlangan

    const s = await this.getSettings();
    if (row.gamesPlayed < s.minGames) return null;

    // Shift: bir odam cheksiz mukofot olmasin
    if (s.maxRewards > 0) {
      const already = await referralRepo.countRewarded(row.referrerId);
      if (already >= s.maxRewards) {
        logger.info({ referrerId: row.referrerId, already }, "Referral shifti tugagan");
        return null;
      }
    }

    if (s.reward <= 0) return null;

    // Shartli "band qilish" — ikki o'yin bir vaqtda tugasa ikki marta to'lanmaydi
    const claimed = await referralRepo.claimReward(row.id, s.reward, s.currency);
    if (!claimed) return null;

    if (s.currency === "diamond") {
      await economyService.addDiamonds(row.referrerId, s.reward, `referral_${row.id}`);
    } else {
      await economyService.addMoney(row.referrerId, s.reward, `referral_${row.id}`);
    }

    const referrer = await prisma.user.findUnique({
      where: { id: row.referrerId },
      select: { telegramId: true },
    });
    logger.info({ referralId: row.id, referrerId: row.referrerId, reward: s.reward }, "Referral mukofoti berildi");
    if (!referrer) return null;

    return {
      rewarded: true,
      referrerTelegramId: referrer.telegramId,
      amount: s.reward,
      currency: s.currency,
    };
  },

  async statsFor(userId: number) {
    return referralRepo.statsFor(userId);
  },

  /**
   * O'yin yakunidagi shaxsiy xabarga qo'shiladigan referral bloki.
   * Referral o'chirilgan bo'lsa (mukofot 0 yoki guruh tanlanmagan) — null,
   * ya'ni xabarga umuman qo'shilmaydi.
   */
  async buildPromo(
    userId: number,
    telegramId: bigint,
    botUsername: string,
  ): Promise<{ text: string; link: string } | null> {
    const s = await this.getSettings();
    if (s.reward <= 0) return null;

    const groups = await referralChatRepo.listTargets();
    if (groups.length === 0) return null;

    const stats = await referralRepo.statsFor(userId);
    const link = `https://t.me/${botUsername}?start=ref_${telegramId}`;
    const unit = s.currency === "diamond" ? "💎" : "💰";

    return {
      link,
      text: t("referral.promo", {
        reward: s.reward.toLocaleString(),
        unit,
        minGames: s.minGames,
        rewarded: stats.rewarded,
        link,
      }),
    };
  },

  async targetGroups() {
    return referralChatRepo.listTargets();
  },

  /**
   * Maqsadli guruhlarni foydalanuvchiga ko'rsatish uchun formatlaydi.
   * Havolasi bor guruh bosiladigan bo'ladi — do'st shu yerdan qo'shiladi.
   * Havolasi yo'q bo'lsa nomi ko'rsatiladi (admin havola qo'shishi kerak).
   */
  async targetGroupsText(): Promise<string> {
    const groups = await referralChatRepo.listTargets();
    if (groups.length === 0) return "—";
    return groups
      .map((g) => {
        const title = escapeHtml(g.title ?? "Guruh");
        return g.inviteLink
          ? `• <a href="${g.inviteLink}">${title}</a>`
          : `• ${title}`;
      })
      .join("\n");
  },
};
