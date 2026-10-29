/**
 * Chrome Storage abstraction for CodeMate.
 * 
 * Uses chrome.storage.local for all persistent data.
 * Implements schema versioning and migration.
 * Never silently overwrites user data during upgrades.
 */

import type { NotebookData, NotebookEntry, ProgressData, ProblemAttempt, Settings } from "@/types";
import { DEFAULT_SETTINGS, type HintLevel } from "@/types";
import { getISOWeek, getNextReviewDate } from "@/utils";

// ─── Storage Keys ───────────────────────────────────────────────────

const STORAGE_KEYS = {
  NOTEBOOK: "codemate_notebook",
  PROGRESS: "codemate_progress",
  SETTINGS: "codemate_settings",
  SCHEMA_VERSION: "codemate_schema_version",
} as const;

const CURRENT_SCHEMA_VERSION = 1;

// ─── Schema Migration ───────────────────────────────────────────────

export async function ensureSchemaVersion(): Promise<void> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SCHEMA_VERSION);
  const version = data[STORAGE_KEYS.SCHEMA_VERSION] as number | undefined;

  if (!version || version < CURRENT_SCHEMA_VERSION) {
    // Migrate old v0.1 notes format if present
    await migrateFromV01();
    await chrome.storage.local.set({ [STORAGE_KEYS.SCHEMA_VERSION]: CURRENT_SCHEMA_VERSION });
  }
}

async function migrateFromV01(): Promise<void> {
  // The old v0.1 format stored notes with keys like "codemate-note:<url>"
  const allData = await chrome.storage.local.get(null);
  const oldNotes: Record<string, NotebookEntry> = {};

  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith("codemate-note:") && typeof value === "object" && value !== null) {
      const old = value as Record<string, string>;
      const now = new Date().toISOString();
      const id = key.replace("codemate-note:", "");

      oldNotes[id] = {
        id,
        title: old.title || "Migrated Note",
        platform: old.url?.includes("codeforces") ? "Codeforces" : "LeetCode",
        url: old.url || "",
        tags: [],
        difficulty: "",
        approach: old.approach || "",
        mistakes: old.mistakes || "",
        observations: "",
        complexityNotes: "",
        reviewStatus: "new",
        nextReviewDate: getNextReviewDate(0),
        reviewCount: 0,
        createdAt: old.updatedAt || now,
        updatedAt: old.updatedAt || now,
      };
    }
  }

  if (Object.keys(oldNotes).length > 0) {
    const existingNotebook = await getNotebook();
    // Merge without overwriting existing entries
    for (const [id, entry] of Object.entries(oldNotes)) {
      if (!existingNotebook.entries[id]) {
        existingNotebook.entries[id] = entry;
      }
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.NOTEBOOK]: existingNotebook });
  }
}

// ─── Notebook Operations ────────────────────────────────────────────

export async function getNotebook(): Promise<NotebookData> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.NOTEBOOK);
  const notebook = data[STORAGE_KEYS.NOTEBOOK] as NotebookData | undefined;
  if (!notebook) return { version: CURRENT_SCHEMA_VERSION, entries: {} };
  if (!notebook.entries || typeof notebook.entries !== "object") {
    notebook.entries = {};
  }
  return notebook;
}

export async function getNotebookEntry(id: string): Promise<NotebookEntry | null> {
  const notebook = await getNotebook();
  return notebook.entries[id] ?? null;
}

export async function saveNotebookEntry(entry: NotebookEntry): Promise<void> {
  const notebook = await getNotebook();
  entry.updatedAt = new Date().toISOString();
  if (!entry.createdAt) {
    entry.createdAt = entry.updatedAt;
  }
  notebook.entries[entry.id] = entry;
  await chrome.storage.local.set({ [STORAGE_KEYS.NOTEBOOK]: notebook });
}

export async function deleteNotebookEntry(id: string): Promise<void> {
  const notebook = await getNotebook();
  delete notebook.entries[id];
  await chrome.storage.local.set({ [STORAGE_KEYS.NOTEBOOK]: notebook });
}

export async function clearAllNotes(): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.NOTEBOOK]: { version: CURRENT_SCHEMA_VERSION, entries: {} },
  });
}

export async function exportNotebook(): Promise<string> {
  const notebook = await getNotebook();
  return JSON.stringify(notebook, null, 2);
}

export async function importNotebook(jsonStr: string): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { imported: 0, errors: ["Invalid JSON format."] };
  }

  if (!parsed || typeof parsed !== "object") {
    return { imported: 0, errors: ["Expected a JSON object."] };
  }

  const imported = parsed as Record<string, unknown>;
  const entries = (imported.entries ?? imported) as Record<string, unknown>;

  if (typeof entries !== "object") {
    return { imported: 0, errors: ["No entries found in the import data."] };
  }

  const notebook = await getNotebook();
  let count = 0;

  for (const [id, raw] of Object.entries(entries)) {
    if (!raw || typeof raw !== "object") {
      errors.push(`Skipped entry "${id}": not a valid object.`);
      continue;
    }
    const entry = raw as Record<string, unknown>;

    // Validate required fields
    if (typeof entry.title !== "string") {
      errors.push(`Skipped entry "${id}": missing title.`);
      continue;
    }

    const now = new Date().toISOString();
    notebook.entries[id] = {
      id: typeof entry.id === "string" ? entry.id : id,
      title: entry.title as string,
      platform: (entry.platform === "Codeforces" ? "Codeforces" : "LeetCode"),
      url: typeof entry.url === "string" ? entry.url : "",
      tags: Array.isArray(entry.tags) ? entry.tags.filter((t): t is string => typeof t === "string") : [],
      difficulty: typeof entry.difficulty === "string" ? entry.difficulty : "",
      approach: typeof entry.approach === "string" ? entry.approach : "",
      mistakes: typeof entry.mistakes === "string" ? entry.mistakes : "",
      observations: typeof entry.observations === "string" ? entry.observations : "",
      complexityNotes: typeof entry.complexityNotes === "string" ? entry.complexityNotes : "",
      reviewStatus: ["new", "learning", "reviewing", "mastered"].includes(entry.reviewStatus as string)
        ? (entry.reviewStatus as NotebookEntry["reviewStatus"])
        : "new",
      nextReviewDate: typeof entry.nextReviewDate === "string" ? entry.nextReviewDate : getNextReviewDate(0),
      reviewCount: typeof entry.reviewCount === "number" ? entry.reviewCount : 0,
      createdAt: typeof entry.createdAt === "string" ? entry.createdAt : now,
      updatedAt: now,
    };
    count++;
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.NOTEBOOK]: notebook });
  return { imported: count, errors };
}

// ─── Progress Operations ────────────────────────────────────────────

export async function getProgress(): Promise<ProgressData> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.PROGRESS);
  const progress = data[STORAGE_KEYS.PROGRESS] as ProgressData | undefined;
  if (!progress) return { version: CURRENT_SCHEMA_VERSION, attempts: {}, weeklyActivity: {} };
  if (!progress.attempts || typeof progress.attempts !== "object") {
    progress.attempts = {};
  }
  if (!progress.weeklyActivity || typeof progress.weeklyActivity !== "object") {
    progress.weeklyActivity = {};
  }
  return progress;
}

export async function recordAttempt(
  problemId: string,
  platform: "LeetCode" | "Codeforces",
  title: string,
  hintLevel: HintLevel,
  tags: string[],
): Promise<void> {
  const progress = await getProgress();
  const now = new Date().toISOString();
  const week = getISOWeek();

  const existing = progress.attempts[problemId];
  progress.attempts[problemId] = {
    problemId,
    platform,
    title,
    firstSeen: existing?.firstSeen || now,
    lastSeen: now,
    hintLevelReached: Math.max(existing?.hintLevelReached ?? 1, hintLevel) as HintLevel,
    hasNotes: existing?.hasNotes ?? false,
    tags: tags.length > 0 ? tags : (existing?.tags ?? []),
  };

  progress.weeklyActivity[week] = (progress.weeklyActivity[week] ?? 0) + 1;

  await chrome.storage.local.set({ [STORAGE_KEYS.PROGRESS]: progress });
}

export async function markAttemptHasNotes(problemId: string): Promise<void> {
  const progress = await getProgress();
  if (progress.attempts[problemId]) {
    progress.attempts[problemId].hasNotes = true;
    await chrome.storage.local.set({ [STORAGE_KEYS.PROGRESS]: progress });
  }
}

export async function markProblemAccepted(payload: {
  problemId: string;
  platform: "LeetCode" | "Codeforces";
  title: string;
  runtime?: string;
  memory?: string;
  tags?: string[];
  difficulty?: string;
  url?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const week = getISOWeek();

  // 1. Update Progress Attempt
  const progress = await getProgress();
  const existingAttempt = progress.attempts[payload.problemId];
  progress.attempts[payload.problemId] = {
    problemId: payload.problemId,
    platform: payload.platform,
    title: payload.title,
    firstSeen: existingAttempt?.firstSeen || now,
    lastSeen: now,
    hintLevelReached: existingAttempt?.hintLevelReached ?? 1,
    hasNotes: existingAttempt?.hasNotes ?? false,
    tags: payload.tags && payload.tags.length > 0 ? payload.tags : (existingAttempt?.tags ?? []),
    isSolved: true,
    solvedAt: now,
    submissionStatus: "accepted",
    runtime: payload.runtime || existingAttempt?.runtime,
    memory: payload.memory || existingAttempt?.memory,
  };
  progress.weeklyActivity[week] = (progress.weeklyActivity[week] ?? 0) + 1;
  await chrome.storage.local.set({ [STORAGE_KEYS.PROGRESS]: progress });

  // 2. Automatically schedule into SRS Notebook Queue
  const notebook = await getNotebook();
  const existingNote = notebook.entries[payload.problemId];
  if (existingNote) {
    existingNote.isSolved = true;
    existingNote.solvedAt = now;
    if (payload.runtime) existingNote.runtime = payload.runtime;
    if (payload.memory) existingNote.memory = payload.memory;
    if (existingNote.reviewStatus === "new") {
      existingNote.reviewStatus = "learning";
      existingNote.nextReviewDate = getNextReviewDate(0);
    }
    existingNote.updatedAt = now;
    notebook.entries[payload.problemId] = existingNote;
  } else {
    notebook.entries[payload.problemId] = {
      id: payload.problemId,
      title: payload.title,
      platform: payload.platform,
      url: payload.url || "",
      tags: payload.tags || [],
      difficulty: payload.difficulty || "",
      approach: "",
      mistakes: "",
      observations: "",
      complexityNotes: "",
      reviewStatus: "learning",
      nextReviewDate: getNextReviewDate(0),
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
      isSolved: true,
      solvedAt: now,
      runtime: payload.runtime,
      memory: payload.memory,
    };
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.NOTEBOOK]: notebook });
}

export async function isProblemAccepted(problemId: string): Promise<boolean> {
  const progress = await getProgress();
  return Boolean(progress.attempts[problemId]?.isSolved);
}

// ─── Settings Operations ────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const settings = data[STORAGE_KEYS.SETTINGS] as Settings | undefined;
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: { ...current, ...settings },
  });
}

// ─── Revision Queue ─────────────────────────────────────────────────

export async function getRevisionQueue(): Promise<NotebookEntry[]> {
  const notebook = await getNotebook();
  const today = new Date().toISOString().split("T")[0];

  return Object.values(notebook.entries)
    .filter((entry) => {
      // Due for review if nextReviewDate <= today and not mastered
      return entry.reviewStatus !== "mastered" && entry.nextReviewDate <= today;
    })
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
}

export async function completeReview(id: string): Promise<void> {
  const notebook = await getNotebook();
  const entry = notebook.entries[id];
  if (!entry) return;

  entry.reviewCount++;
  entry.nextReviewDate = getNextReviewDate(entry.reviewCount);
  entry.updatedAt = new Date().toISOString();

  // Update status based on review count
  if (entry.reviewCount >= 5) {
    entry.reviewStatus = "mastered";
  } else if (entry.reviewCount >= 3) {
    entry.reviewStatus = "reviewing";
  } else {
    entry.reviewStatus = "learning";
  }

  notebook.entries[id] = entry;
  await chrome.storage.local.set({ [STORAGE_KEYS.NOTEBOOK]: notebook });
}
