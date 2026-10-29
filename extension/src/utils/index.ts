import type { Platform } from "@/types";

/**
 * Normalize a problem URL into a stable identifier.
 * Strips query params, trailing slashes, fragments, and `/description` suffixes.
 * Returns a string like "leetcode:two-sum" or "codeforces:268/A".
 */
export function normalizeProblemUrl(url: string): string {
  try {
    const u = new URL(url);
    let path = u.pathname.replace(/\/+$/, "").toLowerCase();

    if (u.hostname.includes("leetcode.com")) {
      // Match /problems/<slug> with optional /description suffix
      const match = path.match(/\/problems\/([a-z0-9][a-z0-9-]*)/);
      if (match) return `leetcode:${match[1]}`;
    }

    if (u.hostname.includes("codeforces.com")) {
      // /problemset/problem/268/A -> codeforces:268/A
      const problemset = path.match(/\/problemset\/problem\/(\d+)\/([a-z0-9]+)/i);
      if (problemset) return `codeforces:${problemset[1]}/${problemset[2].toUpperCase()}`;

      // /contest/1234/problem/A -> codeforces:1234/A
      const contest = path.match(/\/(?:contest|gym)\/(\d+)\/problem\/([a-z0-9]+)/i);
      if (contest) return `codeforces:${contest[1]}/${contest[2].toUpperCase()}`;
    }

    // Fallback: use hostname + cleaned path
    return `unknown:${u.hostname}${path}`;
  } catch {
    return `unknown:${url.slice(0, 120)}`;
  }
}

/**
 * Detect which platform a URL belongs to.
 */
export function detectPlatform(url: string): Platform | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("leetcode.com")) return "LeetCode";
    if (hostname.includes("codeforces.com")) return "Codeforces";
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a supported problem page.
 */
export function isSupportedProblemUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();

    if (u.hostname.includes("leetcode.com")) {
      return /^\/problems\/[^/]+/i.test(path);
    }

    if (u.hostname.includes("codeforces.com")) {
      return (
        /^\/problemset\/problem\/\d+\/[a-z0-9]+/i.test(path) ||
        /^\/(?:contest|gym)\/\d+\/problem\/[a-z0-9]+/i.test(path)
      );
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Extract a human-readable title from a LeetCode slug.
 * e.g., "01-matrix" -> "01 Matrix"
 */
export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Clean text: collapse excessive whitespace, trim.
 */
export function cleanText(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").replace(/\t/g, "  ").trim();
}

/**
 * Get current ISO week string for activity tracking.
 */
export function getISOWeek(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Calculate next review date using spaced repetition.
 * Intervals: 1 day, 3 days, 7 days, 14 days, 30 days, 60 days
 */
export function getNextReviewDate(reviewCount: number): string {
  const intervals = [1, 3, 7, 14, 30, 60];
  const days = intervals[Math.min(reviewCount, intervals.length - 1)];
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Safely truncate a string.
 */
export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/**
 * Sanitize text to prevent XSS when used in non-React contexts.
 */
export function sanitizeForDisplay(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
