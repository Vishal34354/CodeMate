# CodeMate — AI Competitive Programming Companion

CodeMate is a production-quality Chrome extension (Manifest V3) that provides a persistent side-panel companion for competitive programmers on **LeetCode** and **Codeforces**.

It features progressive hints, conceptual problem explanations, static code inspection, a personal learning notebook with spaced repetition (SRS), and an optional private AI backend.

---

## ⚡ Quick Start: Load in Chrome

### Step 1: Build the Extension
The extension has been pre-built in `extension/dist`. If you make changes or want a fresh build:
```bash
cd extension
npm install
npm run build
```
This produces the unpacked extension bundle in `extension/dist/`.

### Step 2: Load into Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Turn on the **Developer mode** toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the **`extension/dist`** directory (e.g. `C:\Users\kumaw\Downloads\CodeMate-Chrome-Extension-v0.1\extension\dist`).
5. You will see **CodeMate — AI CP Companion** appear in your extensions list.
6. Click the extension puzzle icon in Chrome's toolbar and **pin** CodeMate for quick access.

### Step 3: Start the Backend Companion Service (Optional)
CodeMate runs 100% offline using its built-in heuristic engine. If you wish to use AI deep explanations or logic diagnoses:
```bash
cd backend
npm install
npm run dev
```
The server will start at `http://localhost:3001`. You can test it at `http://localhost:3001/health`.
*(By default, it uses the offline local competitive programming engine without needing any external API keys. You can add `GEMINI_API_KEY` or `OPENAI_API_KEY` in `backend/.env` whenever desired).*

---

## 🧭 How to Test & Use CodeMate

### 1. Test on LeetCode
1. Open any LeetCode problem, such as:
   - [https://leetcode.com/problems/two-sum/](https://leetcode.com/problems/two-sum/)
   - [https://leetcode.com/problems/trapping-rain-water/](https://leetcode.com/problems/trapping-rain-water/)
2. Click the CodeMate toolbar icon to open Chrome's native **Side Panel**.
3. **Problem Tab**: View the extracted title, difficulty, topic tags, and constraints.
4. **Hints Tab**: Step through progressive hints:
   - *Level 1 (Direction)*: Core invariant and high-level strategy.
   - *Level 2 (Approach)*: Data structures and state transitions.
   - *Level 3 (Implementation)*: Tricky off-by-one loops and pointer bounds.
   - *Level 4 (Complexity & Proof)*: Asymptotic bounds and proof intuition.
5. **Explain Tab**: View conceptual invariant decomposition, target complexity calculator, and edge cases.
6. **Debug Tab**: Run the static heuristic analyzer on your code or test against the pre-submission checklist.
7. **Notes Tab**: Write your key observations, approach, and mistakes. Save into your revision library.
8. **SRS / Progress Tab**: Track problems due for spaced repetition review and monitor topic coverage.

### 2. Test on Codeforces
1. Open any Codeforces problem, such as:
   - [https://codeforces.com/problemset/problem/4/A](https://codeforces.com/problemset/problem/4/A)
   - [https://codeforces.com/problemset/problem/1850/C](https://codeforces.com/problemset/problem/1850/C)
   - Or any contest/gym problem (`/contest/1900/problem/B`).
2. CodeMate automatically detects Codeforces, extracts the title, time limit, memory limit, and statement, and generates customized heuristics.

---

## 🧪 Running Automated Tests

Run the full automated test suites across both projects:

### Extension Unit Tests (14 tests)
```bash
cd extension
npm test
```
Tests URL normalization, platform detection, SRS interval calculations, syntax pattern checks (overflow, unsigned loop boundaries), and hint generation.

### Backend Unit Tests (3 tests)
```bash
cd backend
npm test
```
Tests health endpoints, request validation, complexity guidance, and pitfall diagnostics.

---

## 🛡️ Privacy & Security Guarantees

1. **Local-First**: All notes, attempt histories, and revision queues are saved locally in your browser (`chrome.storage.local`).
2. **Zero Telemetry**: No tracking scripts, analytics, or third-party cookies.
3. **Explicit Consent**: Problem statements and code are **never** transmitted to any server unless you explicitly enable AI in Settings, provide consent, and click a query action. Before any network request, an interactive disclosure displays the exact payload being sent.
4. **Isolated Keys**: External API keys (Gemini, OpenAI) are kept exclusively on your local backend server and are never bundled into the extension.

---

## 📁 Repository Structure

```text
CodeMate/
├── extension/                     # Chrome Extension (Manifest V3)
│   ├── public/                    # Manifest V3 & icons (16, 48, 128)
│   ├── src/
│   │   ├── background/            # Background service worker (SidePanel + injection)
│   │   ├── content/               # Multi-platform content scripts & adapters
│   │   │   ├── adapters/          # LeetCode & Codeforces resilient extractors
│   │   ├── sidepanel/             # React 18 + Tailwind CSS dark-mode side panel
│   │   │   ├── components/        # Header, Navigation, Modals
│   │   │   ├── pages/             # Problem, Hints, Explain, Debug, Notes, Progress, Settings
│   │   │   ├── services/          # Hint engine, code review, AI service
│   │   │   └── hooks/             # Reactive context & storage hooks
│   │   ├── storage/               # Schema-versioned chrome.storage manager
│   │   ├── types/                 # Shared TypeScript interfaces
│   │   └── __tests__/             # Vitest test suite
│   ├── dist/                      # Production build for "Load unpacked"
│   └── vite.config.ts             # Rollup multi-entry configuration
│
├── backend/                       # Optional Companion Backend
│   ├── src/
│   │   ├── providers/             # Gemini, OpenAI, and Local-Mock providers
│   │   ├── routes/                # Express /health and /api/query routes
│   │   ├── schemas/               # Zod request validation
│   │   └── services/              # AI Router with fallback
│   ├── tests/                     # Backend test suite
│   └── .env.example               # Configuration template
│
└── docs/                          # Architecture & design documentation
```
