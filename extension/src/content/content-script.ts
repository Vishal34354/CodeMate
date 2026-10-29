/**
 * CodeMate Content Script
 * 
 * Runs on LeetCode and Codeforces problem pages.
 * Handles:
 * - Page extraction via platform-specific adapters
 * - SPA navigation detection (critical for LeetCode)
 * - Asynchronous page rendering (waits for content)
 * - Message passing with the background service worker
 * 
 * This script is designed to avoid:
 * - Uncontrolled MutationObserver loops
 * - Duplicate event listeners
 * - Repeated full DOM scans
 */

import type { ProblemContext } from "@/types";
import { detectPlatform, isSupportedProblemUrl } from "@/utils";
import { extractLeetCode } from "./adapters/leetcode";
import { extractCodeforces } from "./adapters/codeforces";

// ─── State ──────────────────────────────────────────────────────────
let lastUrl = location.href;
let extractionInProgress = false;
let observer: MutationObserver | null = null;

// ─── Extraction Logic ───────────────────────────────────────────────

function extractProblemContext(): ProblemContext | null {
  const url = location.href;

  if (!isSupportedProblemUrl(url)) {
    return null;
  }

  const platform = detectPlatform(url);

  try {
    if (platform === "LeetCode") {
      return extractLeetCode(url);
    }
    if (platform === "Codeforces") {
      return extractCodeforces(url);
    }
  } catch (err) {
    console.warn("[CodeMate] Extraction error:", err);
  }

  return null;
}

/**
 * Wait for the DOM to settle before extracting.
 * LeetCode renders content asynchronously after navigation.
 * We use a bounded retry approach instead of an unbounded observer.
 */
async function waitAndExtract(maxRetries = 8, delayMs = 500): Promise<ProblemContext | null> {
  if (extractionInProgress) return null;
  extractionInProgress = true;

  try {
    for (let i = 0; i < maxRetries; i++) {
      const context = extractProblemContext();

      // If we got at least a title, we have something useful
      if (context && context.extractionQuality !== "failed") {
        // If we have full extraction or this is our last try, return
        if (context.extractionQuality === "full" || i === maxRetries - 1) {
          return context;
        }
        // If partial, wait a bit more for full content to load
        if (context.extractionQuality === "partial" && i >= 2) {
          return context;
        }
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }

    // Final attempt
    return extractProblemContext();
  } finally {
    extractionInProgress = false;
  }
}

// ─── SPA Navigation Detection ───────────────────────────────────────

function setupNavigationDetection(): void {
  // Method 1: Listen for popstate (back/forward navigation)
  window.addEventListener("popstate", () => {
    checkForNavigation();
  });

  // Method 2: Observe URL changes via MutationObserver on <title> or <head>
  // LeetCode changes the URL without triggering popstate events
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  let checkTimeout: ReturnType<typeof setTimeout> | null = null;

  observer = new MutationObserver(() => {
    // Debounce to avoid excessive checking
    if (checkTimeout) clearTimeout(checkTimeout);
    checkTimeout = setTimeout(() => {
      checkForNavigation();
    }, 300);
  });

  // Only observe the title element for changes (lightweight)
  const titleEl = document.querySelector("title");
  if (titleEl) {
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  // Also observe minimal body changes for SPA routing
  observer.observe(document.body, {
    childList: true,
    subtree: false, // Only direct children — avoids expensive deep observation
  });
}

function checkForNavigation(): void {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;

    if (isSupportedProblemUrl(currentUrl)) {
      // Notify background that page changed, then extract after delay
      try {
        chrome.runtime.sendMessage({
          type: "CODEMATE_PAGE_CHANGED",
          payload: { url: currentUrl },
        }).catch(() => {
          // Extension context may be invalidated
        });
      } catch {
        // Swallow — extension may have been reloaded
      }
    }
  }
}

// ─── Submission & Verdict Detection ──────────────────────────────────
let lastReportedVerdictTime = 0;

function checkSubmissionResults(): void {
  const now = Date.now();
  if (now - lastReportedVerdictTime < 3000) return; // Debounce 3s

  const url = location.href;
  if (!isSupportedProblemUrl(url)) return;

  const platform = detectPlatform(url);

  if (platform === "LeetCode") {
    // Check for LeetCode Accepted indicator
    const resultElements = document.querySelectorAll(
      "[data-e2e-locator='submission-result'], span.text-green-s, div.text-green-s, span.text-sd-easy, [class*='text-green']"
    );

    for (const el of resultElements) {
      const text = el.textContent?.trim() || "";
      if (text === "Accepted" || text.includes("Accepted")) {
        lastReportedVerdictTime = now;

        // Try extracting runtime / memory beats
        let runtime = "";
        let memory = "";
        try {
          const detailBlock = el.closest("[data-layout-path], div.flex-col, div.space-y-4, div")?.parentElement;
          if (detailBlock) {
            const blockText = detailBlock.textContent || "";
            const rtMatch = blockText.match(/Runtime\s*([0-9.]+\s*ms(?:\s*Beats\s*[0-9.]+%)?)/i);
            if (rtMatch) runtime = rtMatch[1];
            const memMatch = blockText.match(/Memory\s*([0-9.]+\s*MB(?:\s*Beats\s*[0-9.]+%)?)/i);
            if (memMatch) memory = memMatch[1];
          }
        } catch {}

        const context = extractProblemContext();
        if (context?.problemId) {
          chrome.runtime.sendMessage({
            type: "CODEMATE_SUBMISSION_RESULT",
            payload: {
              problemId: context.problemId,
              platform: "LeetCode",
              title: context.title,
              status: "accepted",
              runtime,
              memory,
              tags: context.tags,
              difficulty: context.difficulty,
              url,
            },
          }).catch(() => {});
        }
        break;
      }
    }
  } else if (platform === "Codeforces") {
    const verdicts = document.querySelectorAll(".verdict-accepted, span[class*='verdict-accepted'], span.verdict-successful-challenge");
    for (const el of verdicts) {
      if (el.textContent?.toLowerCase().includes("accepted")) {
        lastReportedVerdictTime = now;
        const context = extractProblemContext();
        if (context?.problemId) {
          chrome.runtime.sendMessage({
            type: "CODEMATE_SUBMISSION_RESULT",
            payload: {
              problemId: context.problemId,
              platform: "Codeforces",
              title: context.title,
              status: "accepted",
              tags: context.tags,
              difficulty: context.difficulty,
              url,
            },
          }).catch(() => {});
        }
        break;
      }
    }
  }
}

function setupSubmissionWatcher(): void {
  // Listen for clicks on the Submit button
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest("button, [role='button']");
    if (btn) {
      const text = btn.textContent?.toLowerCase() || "";
      if (text.includes("submit") || btn.getAttribute("data-e2e-locator") === "console-submit-button") {
        // Poll for submission verdict every 800ms for 15s
        let attempts = 0;
        const interval = setInterval(() => {
          checkSubmissionResults();
          attempts++;
          if (attempts > 18) clearInterval(interval);
        }, 800);
      }
    }
  });

  // Also check periodically when DOM mutates
  const subObserver = new MutationObserver(() => {
    checkSubmissionResults();
  });
  subObserver.observe(document.body, { childList: true, subtree: true });
}

// ─── Message Listener ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CODEMATE_PING") {
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "CODEMATE_READ_PAGE") {
    waitAndExtract().then((context) => {
      if (context) {
        sendResponse(context);
      } else {
        // Return a failed context with useful info
        sendResponse({
          platform: detectPlatform(location.href) ?? "LeetCode",
          problemId: "",
          title: "",
          url: location.href,
          statement: "",
          examples: "",
          constraints: "",
          tags: [],
          difficulty: "",
          editorCode: "",
          pageTitle: document.title,
          extractedAt: Date.now(),
          extractionQuality: "failed",
        } satisfies ProblemContext);
      }
    }).catch(() => {
      sendResponse({
        platform: detectPlatform(location.href) ?? "LeetCode",
        problemId: "",
        title: "",
        url: location.href,
        statement: "",
        examples: "",
        constraints: "",
        tags: [],
        difficulty: "",
        editorCode: "",
        pageTitle: document.title,
        extractedAt: Date.now(),
        extractionQuality: "failed",
      } satisfies ProblemContext);
    });

    return true; // Keep message channel open for async response
  }
});

// ─── Initialization ─────────────────────────────────────────────────

function init(): void {
  lastUrl = location.href;
  setupNavigationDetection();
  setupSubmissionWatcher();

  // Notify background that content script is ready
  try {
    chrome.runtime.sendMessage({
      type: "CODEMATE_PAGE_CHANGED",
      payload: { url: location.href },
    }).catch(() => {
      // Background may not be ready yet
    });
  } catch {
    // Swallow
  }
}

// Run initialization
init();
