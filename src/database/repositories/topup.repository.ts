import { TopUpKind, TopUpStatus } from "@prisma/client";
import { prisma } from "../prisma";

export const topUpRepo = {
  async create(userId: number, kind: TopUpKind, amount: number, priceSom: number) {
    return prisma.topUpRequest.create({
      data: { userId, kind, amount, priceSom, status: "AWAITING_RECEIPT" },
    });
  },

  async findById(id: number) {
    return prisma.topUpRequest.findUnique({ where: { id }, include: { user: true } });
  },

  // Foydalanuvchining chek kutayotgan oxirgi so'rovi
  async findAwaitingReceipt(userId: number) {
    return prisma.topUpRequest.findFirst({
      where: { userId, status: "AWAITING_RECEIPT" },
      orderBy: { createdAt: "desc" },
    });
  },

  async attachReceipt(id: number, fileId: string) {
    return prisma.topUpRequest.update({
      where: { id },
      data: { receiptFileId: fileId, status: "PENDING" },
    });
  },

  // Ko'rib chiqish — FAQAT PENDING holatdagini o'zgartiradi.
  // Ikki admin bir vaqtda bosса, faqat bittasi count===1 oladi (ikki marta hisoblanmaydi).
  async review(
    id: number,
    status: Extract<TopUpStatus, "APPROVED" | "REJECTED">,
    adminTgId: bigint,
    note?: string,
  ): Promise<boolean> {
    const res = await prisma.topUpRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status, reviewedBy: adminTgId, reviewNote: note ?? null, reviewedAt: new Date() },
    });
    return res.count === 1;
  },

  async cancelStale(userId: number) {
    return prisma.topUpRequest.updateMany({
      where: { userId, status: "AWAITING_RECEIPT" },
      data: { status: "CANCELLED" },
    });
  },

  async listPending(limit = 20) {
    return prisma.topUpRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: { user: true },
    });
  },

  async listForUser(userId: number, limit = 10) {
    return prisma.topUpRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
