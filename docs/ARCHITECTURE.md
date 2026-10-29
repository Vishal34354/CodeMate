# CodeMate Architecture & Design Document

CodeMate is a production-grade, privacy-first Chrome Extension (Manifest V3) and AI companion designed for competitive programmers solving problems on **LeetCode** and **Codeforces**.

---

## 1. High-Level Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Chrome Browser                                │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │   LeetCode / CF Tab   │             │    CodeMate Side Panel     │  │
│  │  (DOM + Monaco/ACE)   │             │   (React + TypeScript UI)  │  │
│  └───────────┬───────────┘             └─────────────┬──────────────┘  │
│              │                                       │                 │
│              │ Content Script Message                │ Chrome Storage  │
│              ▼                                       ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                 Background Service Worker (MV3)                  │  │
│  │    • Session & Tab Management  • Message Relay                   │  │
│  │    • Dynamic Script Injection  • Side Panel Action Lifecycle     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                      ▲                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │
                                   Optional User-Consented HTTP
                                                       │
                                                       ▼
                                ┌──────────────────────────────────────┐
                                │       CodeMate Backend Service       │
                                │         (Express + TS, Port 3001)    │
                                │                                      │
                                │   • Rate Limiting & Health Check     │
                                │   • Zod Schema Validation            │
                                │   • AI Router (Gemini/OpenAI/Mock)   │
                                └──────────────────────────────────────┘
```

---

## 2. Component Breakdown

### 2.1 Chrome Extension (`/extension`)
- **Manifest V3 Compliant**: Uses persistent `sidePanel` API with `openPanelOnActionClick: true`.
- **Content Scripts (`src/content/`)**:
  - `adapters/leetcode.ts`: Multi-generation resilient DOM extraction (supports new React/Next SPA UI, dynamic layout classes, and legacy formats), plus Monaco editor extraction fallback.
  - `adapters/codeforces.ts`: Handles problemset, contest, and gym layouts; parses MathJax / LaTeX formulas cleanly.
  - `content-script.ts`: SPA-navigation watcher using lightweight title/body mutations; debounces reads to avoid UI lag.
- **Background Worker (`src/background/service-worker.ts`)**:
  - Responds to `CODEMATE_GET_TAB_CONTEXT`.
  - Ensures content script injection on client-side navigations where manifest automatic matching may not trigger immediately.
- **Side Panel UI (`src/sidepanel/`)**:
  - **Problem Page**: Live extraction status badge, tag list, difficulty, constraints display, and manual statement/code fallbacks.
  - **Hints Page**: 4-level progressive reveal system (1: Direction, 2: Approach, 3: Implementation, 4: Complexity). Locks future hints until the current level is unlocked.
  - **Explain Page**: Conceptual decomposition, constraint-based complexity calculator, key invariant finder, and boundary edge case catalog.
  - **Debug Page**: Pattern-based static analysis (integer overflow, off-by-one with `.size()`, etc.), pre-submission checklist, and AI diagnostic assistant.
  - **Notebook Page**: Rich personal CP notes categorized by Approach, Invariants, Mistakes, and Complexity. Full search, tag filtering, and JSON import/export.
  - **Progress & SRS Page**: Spaced Repetition queue (1, 3, 7, 14, 30, 60-day intervals), platform balance meter, top problem topics, and hint usage analytics.
  - **Settings Page**: Backend connection toggle, privacy consent acknowledgment, endpoint test button, and local storage data management.

### 2.2 Storage Layer (`src/storage/`)
- Uses `chrome.storage.local` with strict schema versioning (`version: 1`).
- Atomic writes, non-destructive imports, and full export capabilities.

### 2.3 Backend Service (`/backend`)
- **Express + TypeScript** server with modular provider architecture.
- **Zero API Key Requirement for Local Use**: Ships with an intelligent `local-mock` provider that yields structured Socratic advice and pitfall diagnoses offline.
- **Extensible AI Providers**: Supports Gemini (`gemini-1.5-flash`) and OpenAI (`gpt-4o-mini`) via environment variables.
- **Security & Privacy**:
  - Never receives cookies, session credentials, or browsing history.
  - Explicit data sharing confirmation modal in the UI prior to any transmission.

---

## 3. Testing & Quality Assurance
- **Extension Tests**: 14 Vitest unit tests covering URL normalization, platform detection, SRS calculation, code analysis regexes, and hint generation.
- **Backend Tests**: Vitest suite covering mock provider logic, complexity advice, and pitfall checks.
- **Build Pipeline**: Zero-warning TypeScript compilation (`tsc --noEmit`) and Vite bundling.
