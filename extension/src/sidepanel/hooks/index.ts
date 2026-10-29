/**
 * Custom hooks for the CodeMate side panel.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  ProblemContext,
  TabContextResponse,
  HintState,
  HintLevel,
  NotebookEntry,
  NotebookData,
  ProgressData,
  Settings,
  SidePanelTab,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { normalizeProblemUrl, getNextReviewDate } from "@/utils";
import { generateHints } from "@/sidepanel/services/hint-engine";
import {
  ensureSchemaVersion,
  getNotebook,
  getNotebookEntry,
  saveNotebookEntry,
  deleteNotebookEntry,
  clearAllNotes,
  exportNotebook,
  importNotebook,
  getProgress,
  recordAttempt,
  markAttemptHasNotes,
  getSettings,
  saveSettings,
  getRevisionQueue,
  completeReview,
} from "@/storage";

// ─── Problem Context Hook ───────────────────────────────────────────

import { isProblemAccepted, markProblemAccepted } from "@/storage";

export function useProblemContext() {
  const [context, setContext] = useState<ProblemContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: TabContextResponse = await chrome.runtime.sendMessage({
        type: "CODEMATE_GET_TAB_CONTEXT",
      });

      if (!response?.ok) {
        setContext(null);
        setError(response?.error || "Could not read the page.");
        return null;
      }

      const ctx = response.context!;
      if (ctx.problemId) {
        const solved = await isProblemAccepted(ctx.problemId);
        ctx.isSolved = solved;
      }
      setContext(ctx);

      // Record the attempt in progress tracking
      if (ctx.problemId) {
        try {
          await recordAttempt(ctx.problemId, ctx.platform, ctx.title, 1, ctx.tags);
        } catch {
          // Non-critical
        }
      }

      return ctx;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setContext(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const markCurrentAccepted = useCallback(async () => {
    if (!context?.problemId) return;
    await markProblemAccepted({
      problemId: context.problemId,
      platform: context.platform,
      title: context.title,
      tags: context.tags,
      difficulty: context.difficulty,
      url: context.url,
      runtime: "Manual Verified",
    });
    setContext((prev) => (prev ? { ...prev, isSolved: true } : null));
  }, [context]);

  // Listen for page change or submission notifications
  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message?.type === "CODEMATE_PAGE_CHANGED" || message?.type === "CODEMATE_SUBMISSION_RESULT") {
        loadContext();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [loadContext]);

  return { context, loading, error, loadContext, setContext, markCurrentAccepted };
}

// ─── Hint State Hook ────────────────────────────────────────────────

export function useHints(context: ProblemContext | null) {
  const [hintState, setHintState] = useState<HintState>({
    problemId: "",
    currentLevel: 1,
    hints: [],
    unlockedLevels: [1],
  });

  useEffect(() => {
    if (context && context.problemId) {
      const hints = generateHints(context);
      setHintState({
        problemId: context.problemId,
        currentLevel: 1,
        hints,
        unlockedLevels: [1],
      });
    }
  }, [context?.problemId]); // Only regenerate when problem changes

  const revealLevel = useCallback((level: HintLevel) => {
    setHintState((prev) => {
      const newUnlocked = prev.unlockedLevels.includes(level)
        ? prev.unlockedLevels
        : [...prev.unlockedLevels, level].sort();
      return { ...prev, currentLevel: level, unlockedLevels: newUnlocked };
    });

    // Record hint progression
    if (context?.problemId) {
      recordAttempt(context.problemId, context.platform, context.title, level, context.tags).catch(() => {});
    }
  }, [context]);

  const resetHints = useCallback(() => {
    if (context) {
      const hints = generateHints(context);
      setHintState({
        problemId: context.problemId,
        currentLevel: 1,
        hints,
        unlockedLevels: [1],
      });
    }
  }, [context]);

  return { hintState, revealLevel, resetHints };
}

// ─── Notebook Hook ──────────────────────────────────────────────────

export function useNotebook(context: ProblemContext | null) {
  const [currentEntry, setCurrentEntry] = useState<NotebookEntry | null>(null);
  const [allEntries, setAllEntries] = useState<NotebookEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Load current problem's notes
  useEffect(() => {
    if (context?.problemId) {
      getNotebookEntry(context.problemId).then((entry) => {
        if (entry) {
          setCurrentEntry(entry);
        } else {
          // Create a blank entry template
          setCurrentEntry({
            id: context.problemId,
            title: context.title,
            platform: context.platform,
            url: context.url,
            tags: context.tags,
            difficulty: context.difficulty,
            approach: "",
            mistakes: "",
            observations: "",
            complexityNotes: "",
            reviewStatus: "new",
            nextReviewDate: getNextReviewDate(0),
            reviewCount: 0,
            createdAt: "",
            updatedAt: "",
          });
        }
      });
    }
  }, [context?.problemId]);

  // Load all entries
  const refreshEntries = useCallback(async () => {
    setLoading(true);
    try {
      const notebook = await getNotebook();
      setAllEntries(Object.values(notebook.entries));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  const save = useCallback(async (entry: NotebookEntry) => {
    try {
      await saveNotebookEntry(entry);
      setCurrentEntry(entry);
      await markAttemptHasNotes(entry.id);
      setStatusMessage("Saved ✓");
      await refreshEntries();
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err) {
      setStatusMessage(`Error saving: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [refreshEntries]);

  const remove = useCallback(async (id: string) => {
    await deleteNotebookEntry(id);
    if (currentEntry?.id === id) {
      setCurrentEntry(null);
    }
    await refreshEntries();
    setStatusMessage("Deleted");
    setTimeout(() => setStatusMessage(""), 3000);
  }, [currentEntry, refreshEntries]);

  const clearAll = useCallback(async () => {
    await clearAllNotes();
    setCurrentEntry(null);
    setAllEntries([]);
    setStatusMessage("All notes cleared");
    setTimeout(() => setStatusMessage(""), 3000);
  }, []);

  const doExport = useCallback(async (): Promise<string> => {
    return exportNotebook();
  }, []);

  const doImport = useCallback(async (json: string) => {
    const result = await importNotebook(json);
    await refreshEntries();
    if (result.errors.length > 0) {
      setStatusMessage(`Imported ${result.imported} entries. ${result.errors.length} errors.`);
    } else {
      setStatusMessage(`Imported ${result.imported} entries ✓`);
    }
    setTimeout(() => setStatusMessage(""), 5000);
    return result;
  }, [refreshEntries]);

  // Filter entries by search query
  const filteredEntries = allEntries.filter((entry) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.tags.some((t) => t.toLowerCase().includes(q)) ||
      entry.platform.toLowerCase().includes(q) ||
      entry.approach.toLowerCase().includes(q) ||
      entry.difficulty.toLowerCase().includes(q)
    );
  });

  return {
    currentEntry,
    setCurrentEntry,
    allEntries: filteredEntries,
    searchQuery,
    setSearchQuery,
    statusMessage,
    loading,
    save,
    remove,
    clearAll,
    doExport,
    doImport,
    refreshEntries,
  };
}

// ─── Progress Hook ──────────────────────────────────────────────────

export function useProgress() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [revisionQueue, setRevisionQueue] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, q] = await Promise.all([getProgress(), getRevisionQueue()]);
      setProgress(p);
      setRevisionQueue(q);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message?.type === "CODEMATE_SUBMISSION_RESULT" || message?.type === "CODEMATE_PAGE_CHANGED") {
        refresh();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  const markReviewed = useCallback(async (id: string) => {
    await completeReview(id);
    await refresh();
  }, [refresh]);

  const attemptsList = Object.values(progress?.attempts || {});
  const solvedProblems = attemptsList.filter((a) => a.isSolved);
  const inProgressProblems = attemptsList.filter((a) => !a.isSolved);

  return {
    progress,
    revisionQueue,
    solvedProblems,
    inProgressProblems,
    loading,
    refresh,
    markReviewed,
  };
}

// ─── Settings Hook ──────────────────────────────────────────────────

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((s) => {
      setSettingsState(s);
      setLoading(false);
    });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    await saveSettings(newSettings);
    setSettingsState(newSettings);
  }, [settings]);

  return { settings, loading, updateSettings };
}

// ─── Active Tab Hook ────────────────────────────────────────────────

export function useActiveTab() {
  const [activeTab, setActiveTab] = useState<SidePanelTab>("problem");
  return { activeTab, setActiveTab };
}
