// ─── Platform Types ─────────────────────────────────────────────────
export type Platform = "LeetCode" | "Codeforces";

export interface ProblemContext {
  platform: Platform;
  problemId: string;       // Normalized stable identifier
  title: string;
  url: string;
  statement: string;
  examples: string;
  constraints: string;
  tags: string[];
  difficulty: string;
  editorCode: string;
  pageTitle: string;
  extractedAt: number;
  extractionQuality: "full" | "partial" | "title-only" | "failed";
  isSolved?: boolean;
}

// ─── Message Types ──────────────────────────────────────────────────
export type MessageType =
  | "CODEMATE_READ_PAGE"
  | "CODEMATE_GET_TAB_CONTEXT"
  | "CODEMATE_PAGE_CHANGED"
  | "CODEMATE_EXTRACTION_RESULT"
  | "CODEMATE_SUBMISSION_RESULT";

export interface SubmissionPayload {
  problemId: string;
  platform: Platform;
  title: string;
  status: "accepted" | "wrong_answer" | "tle" | "attempted";
  runtime?: string;
  memory?: string;
  tags?: string[];
  difficulty?: string;
  url?: string;
}

export interface CodemateMessage {
  type: MessageType;
  payload?: unknown;
}

export interface TabContextResponse {
  ok: boolean;
  context?: ProblemContext;
  tab?: { id: number; url: string };
  error?: string;
}

// ─── Hint Types ─────────────────────────────────────────────────────
export type HintLevel = 1 | 2 | 3 | 4;

export interface Hint {
  level: HintLevel;
  title: string;
  content: string;
  isHeuristic: boolean;
}

export interface HintState {
  problemId: string;
  currentLevel: HintLevel;
  hints: Hint[];
  unlockedLevels: HintLevel[];
}

// ─── Notebook Types ─────────────────────────────────────────────────
export interface NotebookEntry {
  id: string;              // Stable problem ID
  title: string;
  platform: Platform;
  url: string;
  tags: string[];
  difficulty: string;
  approach: string;
  mistakes: string;
  observations: string;
  complexityNotes: string;
  reviewStatus: "new" | "learning" | "reviewing" | "mastered";
  nextReviewDate: string;  // ISO date string
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  isSolved?: boolean;
  solvedAt?: string;
  runtime?: string;
  memory?: string;
}

export interface NotebookData {
  version: number;
  entries: Record<string, NotebookEntry>;
}

// ─── Progress/Analytics Types ───────────────────────────────────────
export interface ProblemAttempt {
  problemId: string;
  platform: Platform;
  title: string;
  firstSeen: string;
  lastSeen: string;
  hintLevelReached: HintLevel;
  hasNotes: boolean;
  tags: string[];
  isSolved?: boolean;
  solvedAt?: string;
  submissionStatus?: "accepted" | "wrong_answer" | "tle" | "attempted";
  runtime?: string;
  memory?: string;
}

export interface ProgressData {
  version: number;
  attempts: Record<string, ProblemAttempt>;
  weeklyActivity: Record<string, number>; // ISO week string -> count
}

// ─── Code Review Types ──────────────────────────────────────────────
export type FindingSeverity = "info" | "warning" | "error" | "suggestion";
export type FindingSource = "syntactic" | "heuristic" | "ai";

export interface CodeFinding {
  severity: FindingSeverity;
  source: FindingSource;
  message: string;
  lineHint?: string;
}

// ─── Settings Types ─────────────────────────────────────────────────
export interface Settings {
  aiEnabled: boolean;
  aiConsented: boolean;
  backendUrl: string;
  apiKey?: string;
  model?: string;
  theme: "dark";
  autoExtract: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  aiEnabled: false,
  aiConsented: false,
  backendUrl: "http://localhost:3001",
  apiKey: "",
  model: "gemini-2.0-flash",
  theme: "dark",
  autoExtract: true,
};

// ─── Tab Types ──────────────────────────────────────────────────────
export type SidePanelTab =
  | "problem"
  | "hints"
  | "explain"
  | "debug"
  | "notebook"
  | "progress"
  | "settings";
