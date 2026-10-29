import type { ProblemContext } from "@/types";
import { cleanText, normalizeProblemUrl, slugToTitle } from "@/utils";

/**
 * LeetCode problem adapter.
 * 
 * Uses multiple fallback strategies because LeetCode frequently changes
 * its DOM class names and data attributes. The adapter also extracts
 * title from the URL slug as a guaranteed fallback.
 * 
 * IMPORTANT: This was specifically designed to fix the detection failure
 * on URLs like /problems/01-matrix/description/?envType=...
 */

// ─── Selector Banks ─────────────────────────────────────────────────
// Ordered by observed reliability. Checked in sequence until one works.

const TITLE_SELECTORS = [
  "[data-cy='question-title']",
  ".text-title-large",
  "div[class*='text-title-large']",
  "h4[class*='text-title-large']",
  'a[href*="/problems/"] span.text-lg',
  "div.flex-1 > div > a",
  "#qd-content h1",
  "#qd-content h4",
  ".question-title",
  "div[class*='title__']",
  "h1",
  "[class*='title'] a",
];

const STATEMENT_SELECTORS = [
  "[data-track-load='description_content']",
  "div[data-track-load='description_content']",
  "[data-key='description-content']",
  "[data-cy='question-content']",
  ".elfjS",
  "div[class*='elfjS']",
  "#qd-content div.xFUwe",
  "div.xFUwe",
  ".question-content__JfgR",
  "#qd-content .content__u3I1",
  "div.break-words",
  "div[class*='description']",
  "div[class*='content'] div[class*='html']",
];

const DIFFICULTY_SELECTORS = [
  "div[class*='difficulty'] span",
  "span.text-difficulty-easy",
  "span.text-difficulty-medium",
  "span.text-difficulty-hard",
  "[diff]",
  "span[class*='Easy']",
  "span[class*='Medium']",
  "span[class*='Hard']",
];

const TAG_SELECTORS = [
  "a[href*='/tag/']",
  "div[class*='topic-tag'] span",
  "span.topic-tag__2i2V",
];

const EDITOR_SELECTORS = [
  ".monaco-editor .view-lines",
  ".CodeMirror-code",
  "textarea[name='code']",
  "[contenteditable='true']",
];

// ─── Helper Functions ───────────────────────────────────────────────

function firstTextFromSelectors(selectors: string[]): string {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el.textContent ?? "");
        if (text.length > 1) return text;
      }
    } catch {
      // Invalid selector — skip
    }
  }
  return "";
}

function allTextFromSelectors(selectors: string[]): string[] {
  const results: string[] = [];
  for (const selector of selectors) {
    try {
      document.querySelectorAll(selector).forEach((el) => {
        const text = cleanText(el.textContent ?? "");
        if (text.length > 1 && !results.includes(text)) {
          results.push(text);
        }
      });
    } catch {
      // Skip invalid selectors
    }
  }
  return results;
}

/**
 * Extract the problem slug from a LeetCode URL.
 * Works regardless of query params, fragments, or /description suffix.
 */
function extractSlug(url: string): string | null {
  try {
    const path = new URL(url).pathname.toLowerCase();
    const match = path.match(/\/problems\/([a-z0-9][a-z0-9-]*)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// ─── Main Extraction ────────────────────────────────────────────────

export function extractLeetCode(url: string): ProblemContext {
  const slug = extractSlug(url);
  const problemId = normalizeProblemUrl(url);

  // Title: try DOM first, fall back to URL slug (guaranteed to work)
  let title = firstTextFromSelectors(TITLE_SELECTORS);
  if (!title && slug) {
    title = slugToTitle(slug);
  }
  // Sometimes the DOM title includes the problem number prefix like "1. Two Sum"
  // Keep it as-is since it's useful information.

  // Statement extraction
  let statement = firstTextFromSelectors(STATEMENT_SELECTORS);

  // If primary selectors fail, try a broader heuristic:
  // Look for the largest text block inside #qd-content or main content areas
  if (!statement || statement.length < 30) {
    const candidates = document.querySelectorAll(
      "#qd-content div, main div, [role='main'] div"
    );
    let best = "";
    candidates.forEach((el) => {
      const t = cleanText(el.textContent ?? "");
      // Heuristic: problem statements are typically 100+ chars and contain "Example"
      if (t.length > best.length && t.length > 100 && /example|input|output|constraint/i.test(t)) {
        best = t;
      }
    });
    if (best) statement = best;
  }

  // Extract examples from the statement
  let examples = "";
  if (statement) {
    const exMatch = statement.match(/(Example\s*1[\s\S]*?)(?=Constraints|$)/i);
    if (exMatch) examples = cleanText(exMatch[1]);
  }

  // Extract constraints
  let constraints = "";
  if (statement) {
    const cMatch = statement.match(/(Constraints[\s\S]*?)$/i);
    if (cMatch) constraints = cleanText(cMatch[1]);
  }

  // Difficulty
  let difficulty = "";
  for (const sel of DIFFICULTY_SELECTORS) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = cleanText(el.textContent ?? "").toLowerCase();
        if (["easy", "medium", "hard"].includes(text)) {
          difficulty = text.charAt(0).toUpperCase() + text.slice(1);
          break;
        }
      }
    } catch { /* skip */ }
  }

  // Tags
  const tags = allTextFromSelectors(TAG_SELECTORS).slice(0, 10);

  // Editor code
  let editorCode = "";
  for (const sel of EDITOR_SELECTORS) {
    try {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) {
        const text = (el as HTMLTextAreaElement).value ?? cleanText(el.textContent ?? "");
        if (text.length > 20) {
          editorCode = text;
          break;
        }
      }
    } catch { /* skip */ }
  }

  // Determine extraction quality
  let extractionQuality: ProblemContext["extractionQuality"] = "failed";
  if (statement && statement.length > 50 && title) {
    extractionQuality = "full";
  } else if (statement && title) {
    extractionQuality = "partial";
  } else if (title) {
    extractionQuality = "title-only";
  }

  return {
    platform: "LeetCode",
    problemId,
    title: title || "Unknown Problem",
    url,
    statement: statement.slice(0, 15000),
    examples: examples.slice(0, 5000),
    constraints: constraints.slice(0, 2000),
    tags,
    difficulty,
    editorCode: editorCode.slice(0, 15000),
    pageTitle: document.title,
    extractedAt: Date.now(),
    extractionQuality,
  };
}
