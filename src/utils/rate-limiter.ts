// Oddiy sirpanuvchi oyna (sliding window) cheklovchi.
// Xotirada saqlanadi — bot restartda tozalanadi, bu yetarli: spam sessiyasi qisqa.

const buckets = new Map<string, number[]>();

/**
 * Urinishni ro'yxatga oladi.
 * @returns true — ruxsat, false — chegara oshib ketdi
 */
export function tryHit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const prev = buckets.get(key);
  const fresh = prev ? prev.filter((t) => now - t < windowMs) : [];
  if (fresh.length >= max) {
    buckets.set(key, fresh); // eskilarini tozalab qo'yamiz
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}

/** Chegaraga qancha qolganini bilish (xabar matni uchun) */
export function remaining(key: string, max: number, windowMs: number): number {
  const now = Date.now();
  const fresh = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  return Math.max(0, max - fresh.length);
}

export function reset(key: string): void {
  buckets.delete(key);
}

// Xotira cheksiz o'smasin — eskirgan kalitlarni davriy tozalaymiz.
// unref() — bu interval process'ni tirik ushlab turmaydi.
const CLEANUP_MS = 5 * 60_000;
const MAX_AGE_MS = 10 * 60_000;
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, arr] of buckets) {
    const fresh = arr.filter((t) => now - t < MAX_AGE_MS);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}, CLEANUP_MS);
if (typeof cleanup.unref === "function") cleanup.unref();

// Testlar uchun
export function _size(): number {
  return buckets.size;
}
export function _clear(): void {
  buckets.clear();
}
