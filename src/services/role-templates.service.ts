import { Role } from "@prisma/client";
import { prisma } from "../database/prisma";
import { logger } from "../utils/logger";
import {
  RoleBracket,
  RoleFixed,
  UNIQUE_ROLES,
  ROLE_TEMPLATE_DEFAULTS,
  findBracketForCount,
} from "./role-templates.defaults";

const CONFIG_KEY = "role_templates";

let cache: RoleBracket[] | null = null;

function deepCloneBrackets(src: RoleBracket[]): RoleBracket[] {
  return src.map((b) => ({
    id: b.id,
    minP: b.minP,
    maxP: b.maxP,
    fixed: b.fixed.map((f) => ({ ...f })),
    randomSlots: b.randomSlots,
  }));
}

async function loadFromDb(): Promise<RoleBracket[]> {
  const row = await prisma.config.findUnique({ where: { key: CONFIG_KEY } });
  if (!row) return deepCloneBrackets(ROLE_TEMPLATE_DEFAULTS);
  try {
    const parsed = JSON.parse(row.value) as RoleBracket[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return deepCloneBrackets(ROLE_TEMPLATE_DEFAULTS);
    }
    return parsed;
  } catch {
    return deepCloneBrackets(ROLE_TEMPLATE_DEFAULTS);
  }
}

async function saveToDb(brackets: RoleBracket[]): Promise<void> {
  const value = JSON.stringify(brackets);
  await prisma.config.upsert({
    where: { key: CONFIG_KEY },
    update: { value },
    create: { key: CONFIG_KEY, value },
  });
  cache = brackets;
}

export interface ValidateResult {
  ok: boolean;
  error?: string;
  totalFixed?: number;
  remaining?: number;
}

function validateBracket(b: RoleBracket): ValidateResult {
  // UNIQUE rollar count <= 1
  for (const f of b.fixed) {
    if (UNIQUE_ROLES.includes(f.role) && f.count > 1) {
      return { ok: false, error: `${f.role} UNIQUE rol — max 1 ta bo'lishi kerak` };
    }
    if (f.count < 1) {
      return { ok: false, error: `${f.role} count 1 dan kam bo'lishi mumkin emas` };
    }
  }
  if (b.randomSlots < 0) {
    return { ok: false, error: "Random slot manfiy bo'lishi mumkin emas" };
  }
  const totalFixed = b.fixed.reduce((s, f) => s + f.count, 0);
  const totalSlots = totalFixed + b.randomSlots;
  if (totalSlots > b.maxP) {
    return {
      ok: false,
      error: `Jami ${totalSlots} > ${b.maxP} (max). Kamaytiring!`,
      totalFixed,
    };
  }
  return {
    ok: true,
    totalFixed,
    remaining: b.maxP - totalSlots, // Tinch aholi slotlari
  };
}

export const roleTemplatesService = {
  async getTemplates(): Promise<RoleBracket[]> {
    if (cache) return cache;
    cache = await loadFromDb();
    return cache;
  },

  async getForCount(playerCount: number): Promise<RoleBracket> {
    const brackets = await this.getTemplates();
    return findBracketForCount(playerCount, brackets);
  },

  validate: validateBracket,

  async getBracket(id: string): Promise<RoleBracket | null> {
    const brackets = await this.getTemplates();
    return brackets.find((b) => b.id === id) ?? null;
  },

  // Bitta rolning count'ini set qilish. Agar count=0 — olib tashlash.
  async setRoleCount(bracketId: string, role: Role, count: number): Promise<ValidateResult> {
    const brackets = await this.getTemplates();
    const b = brackets.find((x) => x.id === bracketId);
    if (!b) return { ok: false, error: "Bracket topilmadi" };

    if (count <= 0) {
      b.fixed = b.fixed.filter((f) => f.role !== role);
    } else {
      const existing = b.fixed.find((f) => f.role === role);
      if (existing) {
        existing.count = count;
      } else {
        b.fixed.push({ role, count });
      }
    }

    const v = validateBracket(b);
    if (!v.ok) {
      cache = null; // DB'ni qayta o'qitish — tarqaladigan holatni tiklash
      return v;
    }

    await saveToDb(brackets);
    return v;
  },

  async addRole(bracketId: string, role: Role): Promise<ValidateResult> {
    const brackets = await this.getTemplates();
    const b = brackets.find((x) => x.id === bracketId);
    if (!b) return { ok: false, error: "Bracket topilmadi" };

    const existing = b.fixed.find((f) => f.role === role);
    if (existing) {
      // UNIQUE bo'lsa 1 da qolsin
      if (UNIQUE_ROLES.includes(role)) {
        return { ok: false, error: `${role} allaqachon bor (UNIQUE rol)` };
      }
      existing.count += 1;
    } else {
      b.fixed.push({ role, count: 1 });
    }

    const v = validateBracket(b);
    if (!v.ok) {
      cache = null;
      return v;
    }
    await saveToDb(brackets);
    return v;
  },

  async removeRole(bracketId: string, role: Role): Promise<ValidateResult> {
    const brackets = await this.getTemplates();
    const b = brackets.find((x) => x.id === bracketId);
    if (!b) return { ok: false, error: "Bracket topilmadi" };
    b.fixed = b.fixed.filter((f) => f.role !== role);
    await saveToDb(brackets);
    return validateBracket(b);
  },

  async adjustRoleCount(bracketId: string, role: Role, delta: number): Promise<ValidateResult> {
    const brackets = await this.getTemplates();
    const b = brackets.find((x) => x.id === bracketId);
    if (!b) return { ok: false, error: "Bracket topilmadi" };
    const existing = b.fixed.find((f) => f.role === role);
    const newCount = Math.max(0, (existing?.count ?? 0) + delta);
    return this.setRoleCount(bracketId, role, newCount);
  },

  async setRandomSlots(bracketId: string, slots: number): Promise<ValidateResult> {
    const brackets = await this.getTemplates();
    const b = brackets.find((x) => x.id === bracketId);
    if (!b) return { ok: false, error: "Bracket topilmadi" };
    b.randomSlots = Math.max(0, slots);
    const v = validateBracket(b);
    if (!v.ok) {
      cache = null;
      return v;
    }
    await saveToDb(brackets);
    return v;
  },

  async adjustRandomSlots(bracketId: string, delta: number): Promise<ValidateResult> {
    const b = await this.getBracket(bracketId);
    if (!b) return { ok: false, error: "Bracket topilmadi" };
    return this.setRandomSlots(bracketId, b.randomSlots + delta);
  },

  async resetAllToDefaults(): Promise<void> {
    await prisma.config.deleteMany({ where: { key: CONFIG_KEY } });
    cache = null;
    logger.info("Rol templates default holatga qaytarildi");
  },

  async resetBracketToDefault(bracketId: string): Promise<ValidateResult> {
    const defaultB = ROLE_TEMPLATE_DEFAULTS.find((b) => b.id === bracketId);
    if (!defaultB) return { ok: false, error: "Bracket topilmadi" };
    const brackets = await this.getTemplates();
    const idx = brackets.findIndex((b) => b.id === bracketId);
    if (idx < 0) return { ok: false, error: "Bracket topilmadi" };
    brackets[idx] = {
      ...defaultB,
      fixed: defaultB.fixed.map((f) => ({ ...f })),
    };
    await saveToDb(brackets);
    return validateBracket(brackets[idx]);
  },

  clearCache(): void {
    cache = null;
  },
};

// Qayta eksport — import qulayligi uchun
export type { RoleBracket, RoleFixed } from "./role-templates.defaults";
export { UNIQUE_ROLES, MULTI_ROLES } from "./role-templates.defaults";
