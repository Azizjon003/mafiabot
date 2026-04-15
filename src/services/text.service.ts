import { prisma } from "../database/prisma";
import { TEXT_DEFAULTS } from "./text-defaults";
import { logger } from "../utils/logger";

// DB kalit prefiksi — pricing kalitlari bilan aralashib ketmasligi uchun
const DB_PREFIX = "text_";

// Sync cache — bot startda preloadAll() bilan to'ldiriladi
const cache = new Map<string, string>();
let preloaded = false;

function applyParams(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = params[key];
    return v === undefined || v === null ? `{${key}}` : String(v);
  });
}

// HTML tag balansini oddiy tekshirish — yopilmagan tag bo'lsa false
export function validateHtml(text: string): { ok: true } | { ok: false; error: string } {
  const stack: string[] = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/)?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const full = m[0];
    const tag = m[1].toLowerCase();
    const isSelfClose = full.startsWith("</") === false && full.endsWith("/>");
    const isClose = full.startsWith("</");
    if (isSelfClose) continue;
    if (isClose) {
      const top = stack.pop();
      if (top !== tag) {
        return { ok: false, error: `Yopilmagan yoki mos kelmagan tag: <${top ?? "?"}> vs </${tag}>` };
      }
    } else {
      stack.push(tag);
    }
  }
  if (stack.length > 0) {
    return { ok: false, error: `Yopilmagan tag: <${stack[stack.length - 1]}>` };
  }
  return { ok: true };
}

export const textService = {
  // Bot startda chaqiriladi — barcha text_ kalitlarini DB'dan yuklaydi
  async preloadAll(): Promise<void> {
    const rows = await prisma.config.findMany({ where: { key: { startsWith: DB_PREFIX } } });
    cache.clear();
    for (const row of rows) {
      const key = row.key.slice(DB_PREFIX.length);
      cache.set(key, row.value);
    }
    preloaded = true;
    logger.info({ loaded: cache.size }, "Text service: loaded custom texts from DB");
  },

  // Sync — migratsiya qulay bo'lishi uchun
  t(key: string, params?: Record<string, string | number>): string {
    const custom = cache.get(key);
    const template = custom !== undefined ? custom : (TEXT_DEFAULTS[key] ?? key);
    return applyParams(template, params);
  },

  async setText(key: string, value: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const v = validateHtml(value);
    if (!v.ok) return v;
    const dbKey = DB_PREFIX + key;
    await prisma.config.upsert({
      where: { key: dbKey },
      update: { value },
      create: { key: dbKey, value },
    });
    cache.set(key, value);
    return { ok: true };
  },

  async resetText(key: string): Promise<void> {
    const dbKey = DB_PREFIX + key;
    await prisma.config.deleteMany({ where: { key: dbKey } });
    cache.delete(key);
  },

  isCustom(key: string): boolean {
    return cache.has(key);
  },

  getDefault(key: string): string | undefined {
    return TEXT_DEFAULTS[key];
  },

  getCurrent(key: string): string {
    return cache.get(key) ?? TEXT_DEFAULTS[key] ?? "";
  },

  // Barcha kalitlar (default + custom flaglar bilan)
  getAllKeys(): { key: string; isCustom: boolean }[] {
    return Object.keys(TEXT_DEFAULTS).map((key) => ({ key, isCustom: cache.has(key) }));
  },

  // Kategoriya prefiksi bo'yicha kalitlar
  getKeysByPrefix(prefix: string): { key: string; isCustom: boolean }[] {
    return Object.keys(TEXT_DEFAULTS)
      .filter((k) => k.startsWith(prefix))
      .map((key) => ({ key, isCustom: cache.has(key) }));
  },

  // Qidirish — kalit yoki qiymat bo'yicha
  search(query: string): { key: string; isCustom: boolean }[] {
    const q = query.toLowerCase();
    return Object.keys(TEXT_DEFAULTS)
      .filter((k) => {
        if (k.toLowerCase().includes(q)) return true;
        const cur = cache.get(k) ?? TEXT_DEFAULTS[k] ?? "";
        return cur.toLowerCase().includes(q);
      })
      .map((key) => ({ key, isCustom: cache.has(key) }));
  },

  // Faqat custom'larni olish — export uchun
  exportCustoms(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of cache.entries()) out[k] = v;
    return out;
  },

  // Import — objectdan
  async importCustoms(data: Record<string, string>): Promise<{ ok: number; failed: number }> {
    let ok = 0;
    let failed = 0;
    for (const [key, value] of Object.entries(data)) {
      if (!(key in TEXT_DEFAULTS)) {
        failed++;
        continue;
      }
      const res = await this.setText(key, value);
      if (res.ok) ok++;
      else failed++;
    }
    return { ok, failed };
  },

  clearCache(): void {
    cache.clear();
    preloaded = false;
  },

  isPreloaded(): boolean {
    return preloaded;
  },
};

// Qulay qisqartma — import { t } from "../services/text.service"
export const t = textService.t.bind(textService);
