/**
 * CodeMate Background Service Worker
 * 
 * Handles:
 * - Side panel behavior (open on action click)
 * - Message routing between content scripts and side panel
 * - Tab change detection
 * - Content script injection for SPA-navigated pages
 */

// ─── Side Panel Setup ───────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

// Ensure side panel behavior is set on startup too
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
  // May fail if called too early
});

// ─── Supported URL Check ────────────────────────────────────────────

function isSupportedUrl(url: string): boolean {
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

// ─── Find Problem Tab Resiliently ───────────────────────────────────

async function getActiveProblemTab(): Promise<chrome.tabs.Tab | null> {
  // 1. Try active tab in last focused window
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs[0]?.url && isSupportedUrl(tabs[0].url)) {
      return tabs[0];
    }
  } catch {}

  // 2. Try active tab in current window (hosting the side panel)
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.url && isSupportedUrl(tabs[0].url)) {
      return tabs[0];
    }
  } catch {}

  // 3. Try any active tab matching supported URL across any window
  try {
    const allActive = await chrome.tabs.query({ active: true });
    const supported = allActive.find((t) => t.url && isSupportedUrl(t.url));
    if (supported) return supported;
  } catch {}

  // 4. Try any tab open with a problem page
  try {
    const candidates = await chrome.tabs.query({
      url: [
        "*://*.leetcode.com/problems/*",
        "*://*.codeforces.com/problemset/problem/*",
        "*://*.codeforces.com/contest/*/problem/*",
        "*://*.codeforces.com/gym/*/problem/*",
      ],
    });
    if (candidates.length > 0) {
      return candidates.find((t) => t.active) || candidates[0];
    }
  } catch {}

  // 5. Fallback: whichever tab is active
  try {
    const fallback = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return fallback[0] || null;
  } catch {
    return null;
  }
}

// ─── Content Script Injection ───────────────────────────────────────

/**
 * Try to inject the content script into a tab if it hasn't been injected yet.
 */
async function ensureContentScript(tabId: number): Promise<boolean> {
  try {
    // First, try to ping the existing content script
    const res = await chrome.tabs.sendMessage(tabId, { type: "CODEMATE_PING" });
    if (res?.ok) return true;
  } catch {
    // Ping failed, inject script
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    // Wait a brief moment for the script to initialize
    await new Promise((r) => setTimeout(r, 200));
    return true;
  } catch (err) {
    console.warn("[CodeMate] Could not inject content script:", err);
    return false;
  }
}

import { markProblemAccepted } from "@/storage";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CODEMATE_GET_TAB_CONTEXT") {
    handleGetTabContext(sendResponse);
    return true; // Keep channel open for async
  }

  if (message?.type === "CODEMATE_PAGE_CHANGED" && sender.tab?.id) {
    // A content script is reporting a page change — forward to side panel
  }

  if (message?.type === "CODEMATE_SUBMISSION_RESULT" && message.payload) {
    if (message.payload.status === "accepted") {
      markProblemAccepted(message.payload).then(() => {
        // Broadcast to side panel
        chrome.runtime.sendMessage({
          type: "CODEMATE_SUBMISSION_RESULT",
          payload: message.payload,
        }).catch(() => {});
      }).catch(console.error);
    }
  }
});

async function handleGetTabContext(
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    const tab = await getActiveProblemTab();

    if (!tab?.id || !tab.url) {
      sendResponse({
        ok: false,
        error: "No active tab found. Make sure a browser tab is open.",
      });
      return;
    }

    if (!isSupportedUrl(tab.url)) {
      sendResponse({
        ok: false,
        error: `This page is not a supported problem page (${tab.url}). Open a LeetCode problem or Codeforces problem page.`,
        tab: { id: tab.id, url: tab.url },
      });
      return;
    }

    // Ensure content script is injected
    const injected = await ensureContentScript(tab.id);
    if (!injected) {
      sendResponse({
        ok: false,
        error: "Could not connect to the page. Try refreshing the problem page.",
        tab: { id: tab.id, url: tab.url },
      });
      return;
    }

    try {
      const context = await chrome.tabs.sendMessage(tab.id, { type: "CODEMATE_READ_PAGE" });
      sendResponse({
        ok: true,
        context,
        tab: { id: tab.id, url: tab.url },
      });
    } catch {
      sendResponse({
        ok: false,
        error: "Could not read the page. Try refreshing the problem page and clicking 'Read page' again.",
        tab: { id: tab.id, url: tab.url },
      });
    }
  } catch (err) {
    sendResponse({
      ok: false,
      error: `Unexpected error: ${err instanceof Error ? err.message : "Unknown"}`,
    });
  }
}

// ─── Tab Change Listener ────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && isSupportedUrl(tab.url)) {
      chrome.runtime.sendMessage({
        type: "CODEMATE_PAGE_CHANGED",
        payload: { url: tab.url, tabId: activeInfo.tabId },
      }).catch(() => {
        // Side panel may not be open
      });
    }
  } catch {
    // Tab may have been closed
  }
});
