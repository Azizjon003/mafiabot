// Massivni aralashtirish (Fisher-Yates shuffle)
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Ovozlarni hisoblash — eng ko'p ovoz olgan element
export function getMostVoted<T>(votes: Map<T, number>): { target: T; count: number } | null {
  let maxCount = 0;
  let maxTarget: T | null = null;
  let isTie = false;

  for (const [target, count] of votes) {
    if (count > maxCount) {
      maxCount = count;
      maxTarget = target;
      isTie = false;
    } else if (count === maxCount) {
      isTie = true;
    }
  }

  if (isTie || maxTarget === null || maxCount === 0) return null;
  return { target: maxTarget, count: maxCount };
}

// Timer promise
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Telegram user mention
export function mention(firstName: string, telegramId: bigint | number): string {
  return `<a href="tg://user?id=${telegramId}">${escapeHtml(firstName)}</a>`;
}

// HTML escape
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
