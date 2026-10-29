import type { ProblemContext } from "@/types";
import { cleanText, normalizeProblemUrl } from "@/utils";

/**
 * Codeforces problem adapter.
 * 
 * Codeforces pages are server-rendered and relatively stable,
 * but we still use multiple selectors for resilience.
 */

const TITLE_SELECTORS = [
  ".problem-statement .header .title",
  ".title",
  "#pageContent .title",
  "h1",
];

const STATEMENT_SELECTOR = ".problem-statement";

const TAG_SELECTORS = [
  ".tag-box",
  "span.tag-box",
  ".roundbox .tag-box",
];

const EDITOR_SELECTORS = [
  "#editor textarea",
  ".ace_editor",
  ".monaco-editor .view-lines",
  "textarea#sourceCodeTextarea",
];

function firstTextFromSelectors(selectors: string[]): string {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el.textContent ?? "");
        if (text.length > 1) return text;
      }
    } catch {
      // Skip invalid selectors
    }
  }
  return "";
}

function allTextFromSelectors(selectors: string[]): string[] {
  const results: string[] = [];
  for (const selector of selectors) {
    try {
      document.querySelectorAll(selector).forEach((el) => {
        const text = cleanText(el.textContent ?? "").toLowerCase();
        if (text.length > 1 && !results.includes(text)) {
          results.push(text);
        }
      });
    } catch { /* skip */ }
  }
  return results;
}

/**
 * Extract problem ID from Codeforces URL path.
 */
function extractCodeforcesId(url: string): { contestId: string; problemLetter: string } | null {
  try {
    const path = new URL(url).pathname;
    const problemset = path.match(/\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);
    if (problemset) return { contestId: problemset[1], problemLetter: problemset[2].toUpperCase() };

    const contest = path.match(/\/(?:contest|gym)\/(\d+)\/problem\/([A-Za-z0-9]+)/);
    if (contest) return { contestId: contest[1], problemLetter: contest[2].toUpperCase() };

    return null;
  } catch {
    return null;
  }
}

export function extractCodeforces(url: string): ProblemContext {
  const problemId = normalizeProblemUrl(url);
  const cfId = extractCodeforcesId(url);

  // Title
  let title = firstTextFromSelectors(TITLE_SELECTORS);
  // Codeforces titles often include the problem letter prefix like "A. Watermelon"
  if (!title && cfId) {
    title = `Problem ${cfId.contestId}${cfId.problemLetter}`;
  }

  // Full statement
  let statement = "";
  try {
    const statementEl = document.querySelector(STATEMENT_SELECTOR);
    if (statementEl) {
      statement = cleanText(statementEl.textContent ?? "");
    }
  } catch { /* skip */ }

  // Extract examples — Codeforces has clear input/output sections
  let examples = "";
  try {
    const exampleEls = document.querySelectorAll(".sample-test");
    const parts: string[] = [];
    exampleEls.forEach((el) => {
      parts.push(cleanText(el.textContent ?? ""));
    });
    examples = parts.join("\n\n");
  } catch { /* skip */ }

  // Constraints: Codeforces time/memory limits + input constraints
  let constraints = "";
  try {
    const limits: string[] = [];
    const timeLimitEl = document.querySelector(".time-limit");
    if (timeLimitEl) limits.push(cleanText(timeLimitEl.textContent ?? ""));
    const memoryLimitEl = document.querySelector(".memory-limit");
    if (memoryLimitEl) limits.push(cleanText(memoryLimitEl.textContent ?? ""));

    const inputSpecEl = document.querySelector(".input-specification");
    if (inputSpecEl) {
      limits.push(cleanText(inputSpecEl.textContent ?? ""));
    }

    if (limits.length > 0) {
      constraints = limits.join("\n\n");
    } else if (statement) {
      const lines = statement.split("\n");
      const constraintLines = lines.filter((l) =>
        /\d+\s*[≤<=]\s*\w+|input|output|time limit|memory limit/i.test(l)
      );
      if (constraintLines.length > 0) {
        constraints = constraintLines.slice(0, 10).join("\n");
      }
    }
  } catch { /* skip */ }

  // Difficulty: Codeforces shows difficulty ratings
  let difficulty = "";
  try {
    const diffEl = document.querySelector(".problem-rating");
    if (diffEl) {
      difficulty = cleanText(diffEl.textContent ?? "");
    }
  } catch { /* skip */ }

  // Tags
  const tags = allTextFromSelectors(TAG_SELECTORS).slice(0, 10);

  // Editor code
  let editorCode = "";
  for (const sel of EDITOR_SELECTORS) {
    try {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) {
        const text = (el as HTMLTextAreaElement).value ?? cleanText(el.textContent ?? "");
        if (text.length > 10) {
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
    platform: "Codeforces",
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
