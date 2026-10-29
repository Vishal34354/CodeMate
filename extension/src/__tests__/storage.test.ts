import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getNotebook,
  saveNotebookEntry,
  getNotebookEntry,
  deleteNotebookEntry,
  getProgress,
  recordAttempt,
  getRevisionQueue,
} from "../storage";
import type { NotebookEntry } from "@/types";

// Mock chrome.storage.local
const mockStorage: Record<string, any> = {};

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) {
    delete mockStorage[k];
  }

  (globalThis as any).chrome = {
    storage: {
      local: {
        get: vi.fn(async (key: any) => {
          if (key === null) return { ...mockStorage };
          if (typeof key === "string") return { [key]: mockStorage[key] };
          return {};
        }),
        set: vi.fn(async (items: Record<string, any>) => {
          Object.assign(mockStorage, items);
        }),
        clear: vi.fn(async () => {
          for (const k of Object.keys(mockStorage)) delete mockStorage[k];
        }),
      },
    },
  };
});

describe("Storage & Notebook Engine", () => {
  it("initializes empty notebook safely when no storage exists", async () => {
    const notebook = await getNotebook();
    expect(notebook).toBeDefined();
    expect(notebook.entries).toEqual({});
  });

  it("saves and retrieves notebook entries correctly", async () => {
    const entry: NotebookEntry = {
      id: "leetcode:two-sum",
      title: "Two Sum",
      platform: "LeetCode",
      url: "https://leetcode.com/problems/two-sum/",
      tags: ["array", "hash-table"],
      difficulty: "Easy",
      approach: "One-pass hash map storing complement indices.",
      mistakes: "Checked same element twice initially.",
      observations: "Complements sum to target.",
      complexityNotes: "O(N) time, O(N) space",
      reviewStatus: "learning",
      nextReviewDate: "2026-10-30",
      reviewCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveNotebookEntry(entry);
    const retrieved = await getNotebookEntry("leetcode:two-sum");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe("Two Sum");
    expect(retrieved?.approach).toContain("hash map");
  });

  it("deletes notebook entries without corrupting storage", async () => {
    const entry: NotebookEntry = {
      id: "codeforces:4/A",
      title: "Watermelon",
      platform: "Codeforces",
      url: "https://codeforces.com/problemset/problem/4/A",
      tags: ["math"],
      difficulty: "800",
      approach: "Check if w > 2 and w % 2 == 0",
      mistakes: "Forgot w = 2 corner case",
      observations: "",
      complexityNotes: "O(1)",
      reviewStatus: "mastered",
      nextReviewDate: "2026-11-01",
      reviewCount: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveNotebookEntry(entry);
    await deleteNotebookEntry("codeforces:4/A");
    const retrieved = await getNotebookEntry("codeforces:4/A");
    expect(retrieved).toBeNull();
  });

  it("records attempts and manages progress analytics", async () => {
    await recordAttempt("leetcode:3sum", "LeetCode", "3Sum", 2, ["two-pointers", "sorting"]);
    const progress = await getProgress();
    expect(progress.attempts["leetcode:3sum"]).toBeDefined();
    expect(progress.attempts["leetcode:3sum"].hintLevelReached).toBe(2);
  });
});
