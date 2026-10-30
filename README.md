# CodeMate — AI Competitive Programming Companion

CodeMate is a production-quality Chrome extension (Manifest V3) that provides a persistent side-panel companion for competitive programmers on **LeetCode** and **Codeforces**.

It features progressive Socratic hints, conceptual problem explanations, static code inspection, a personal learning notebook with spaced repetition (SRS), clean comment-less multi-approach code generation, and direct serverless Gemini API or private companion backend support.

---

## ⚡ Quick Start: Load in Chrome

### Step 1: Build the Extension Locally
The extension source is in `extension/`. To build from source:
```bash
cd extension
npm ci
npm run build
```
This produces the verified, unpacked extension bundle in `extension/dist/`.

### Step 2: Load into Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Turn on the **Developer mode** toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the **`extension/dist`** directory.
5. You will see **CodeMate — AI CP Companion** appear in your extensions list.
6. Click the extension puzzle icon in Chrome's toolbar and **pin** CodeMate for instant access.

### Step 3: Start the Backend Companion Service (Optional)
CodeMate runs completely offline using its built-in heuristic engine, or serverless via your own Gemini API key in Settings. If you prefer running your own local backend:
```bash
cd backend
npm ci
npm run dev
```
The server will start at `http://localhost:3001` (health check at `http://localhost:3001/health`).

---

## 🛠️ Local Developer Commands

### Extension (`cd extension`)
```bash
npm ci              # Clean, reproducible dependency install
npm run typecheck   # Type-check TypeScript with zero emit (tsc --noEmit)
npm test            # Run all 18 Vitest unit tests
npm run build       # Build production extension to dist/
npm run validate    # Validate Manifest V3 compliance and asset integrity
npm run package     # Validate and package into codemate-v<version>.zip
```

### Backend (`cd backend`)
```bash
npm ci              # Clean dependency install
npm run typecheck   # Type-check TypeScript backend
npm test            # Run Fastify API tests
npm run build       # Compile backend TypeScript
npm start           # Run compiled backend
```

---

## 🚀 GitHub Actions CI/CD Pipeline

CodeMate features a fully automated, production-grade GitHub Actions CI/CD pipeline:

### 1. Continuous Integration (`.github/workflows/ci.yml`)
- **Triggers**: On pushes and pull requests to `main`, plus manual `workflow_dispatch`.
- **Jobs**:
  - `backend-checks`: Installs dependencies (`npm ci`), runs TypeScript type-checking, and executes API test suites.
  - `extension-pipeline`: Installs dependencies, runs all 18 Vitest unit tests, compiles the production build with Vite/esbuild, validates all Manifest V3 references, packages the extension, and uploads `codemate-extension-build` as a GitHub Actions artifact (retained for 14 days).

### 2. Automated Releases (`.github/workflows/release.yml`)
- **Triggers**: When a semantic version tag (e.g. `v1.0.0`) is pushed to GitHub, or via manual `workflow_dispatch`.
- **Process**:
  1. Checks out repository and sets up Node 20 LTS.
  2. Runs type checks, automated tests, and production build.
  3. Executes `validate-build.cjs` to verify that all assets and manifest mappings are 100% sound.
  4. Packages the production build into `codemate-v<version>.zip`.
  5. Automatically creates a GitHub Release and attaches the ZIP as a release asset using `GITHUB_TOKEN` with least-privilege `contents: write`.

### How to Create a New Release:
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions will automatically build, validate, package, and publish the release with downloadable ZIP assets.

---

## 📦 How to Download & Install Pre-built CI Artifacts

1. Go to your GitHub repository: [https://github.com/Vishal34354/CodeMate](https://github.com/Vishal34354/CodeMate)
2. Click on the **Actions** tab.
3. Select the latest **CI Pipeline** workflow run.
4. Scroll to the **Artifacts** section at the bottom.
5. Download **`codemate-extension-build`**.
6. Unzip the file and select the unzipped directory in `chrome://extensions` via **Load unpacked** (or upload the `.zip` to the Chrome Web Store).

---

## 📚 Spaced Repetition Export: Anki & Obsidian

CodeMate features production-quality export tools directly inside the **Notes** tab for seamless integration with Anki and Obsidian.

### 📇 Anki Flashcards Export (.tsv)
CodeMate exports an Anki-compatible Tab-Separated Values (`.tsv`) file formatted with native HTML styling, MathJax mathematical formula support, and automatic hierarchical tags.

#### Card Templates Generated:
1. **Key Observation / Invariant Card**:
   - **Front**: Problem Title, Platform, Problem Link + "What is the core key observation or invariant for this problem?"
   - **Back**: Key realization, monotonicity properties, or state definitions.
2. **Optimal Algorithm & Complexity Card**:
   - **Front**: Problem Title, Platform + "What is the peak optimal algorithm and asymptotic complexity?"
   - **Back**: Step-by-step algorithmic formulation and $O(...)$ Time/Space bounds.
3. **Mistakes & Edge Cases Card** *(generated when notes are present)*:
   - **Front**: Problem Title + "What mistakes or edge cases should you watch out for?"
   - **Back**: Exact pitfall explanations (integer overflow, off-by-one bounds, zero corner-cases).

#### How to Import into Anki:
1. In CodeMate's **Notes** tab, click **Export** (or quick-export from the current note) and choose **Anki Flashcards**.
2. Download the `.tsv` file (e.g. `codemate-anki-cards-2026-10-29.tsv`).
3. Open **Anki** desktop application.
4. Click **File → Import...** (or press `Ctrl+I` / `Cmd+I`).
5. Select the downloaded `.tsv` file.
6. Verify settings:
   - **Field separator**: Tab
   - **Allow HTML in fields**: Checked (Enabled)
   - **Target Deck**: `CodeMate::CompetitiveProgramming` (or your preferred deck)
7. Click **Import**. Your cards are ready for spaced repetition review!

---

### 💎 Obsidian Vault Export (.zip / .md)
Export your problem notes into rich Markdown documents formatted with Obsidian-compatible YAML frontmatter.

#### Note Structure:
- **YAML Frontmatter**: Includes `title`, `platform`, `url`, `difficulty`, `review_status`, `review_count`, `next_review_date`, and topic `tags`.
- **Markdown Body**: Clean headings for `💡 Key Observations & Invariants`, `🚀 Algorithmic Approach`, `⏱️ Complexity Analysis`, and `⚠️ Mistakes & Pitfalls`.
- **00_Index.md Table of Contents**: Generates an overview dashboard with internal Obsidian wiki-links (`[[Problem Name]]`), difficulty indicators, and review dates.

#### How to Import into Obsidian:
1. In CodeMate's **Notes** tab, click **Export** and choose **Obsidian Vault**.
2. Download the `.zip` archive (e.g. `codemate-obsidian-vault-2026-10-29.zip`).
3. Extract the contents directly into your Obsidian vault folder (e.g. `MyVault/LeetCode/` or `MyVault/CodeMate/`).
4. Open Obsidian: all notes and the `00_Index.md` dashboard will link seamlessly.

---

## 🧪 Automated Test Verification

All tests run cleanly in both local and CI environments:

### Extension Unit Tests (28 tests passing)
```bash
cd extension
npm test
```
- `src/__tests__/export.test.ts` (10 tests): Anki TSV generation, card template separation, YAML escaping, Unicode & emoji safety, path traversal prevention, and Obsidian ZIP packaging.
- `src/__tests__/utils.test.ts` (7 tests): URL normalization for LeetCode, Codeforces problemsets, contests, gyms; platform detection; SRS intervals.
- `src/__tests__/hints.test.ts` (3 tests): 4-stage progressive hint unlock logic and resets.
- `src/__tests__/code-review.test.ts` (4 tests): Static AST heuristics (integer overflow, unsigned loops, recursion bounds).
- `src/__tests__/storage.test.ts` (4 tests): Chrome storage CRUD, notebook lifecycle, attempt tracking, and schema migrations.

### Backend Tests (3 tests passing)
```bash
cd backend
npm test
```
- Tests health endpoints, request payload schema validation, and fallback handlers.

---

## 🛡️ Privacy & Security Guarantees

1. **Local-First**: All notes, attempt histories, and revision queues are saved locally in your browser (`chrome.storage.local`).
2. **Zero Telemetry**: No tracking scripts, analytics, or third-party cookies.
3. **Explicit Consent**: Problem statements and code are **never** transmitted to any server unless you explicitly enable AI in Settings and provide consent.
4. **Zero Secret Leakage**: No API keys are bundled into client code. The CI build pipeline actively validates that `.env` files and source maps are excluded from production archives.

---

## 📁 Repository Structure

```text
CodeMate/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI Pipeline (Type-check, Test, Build, Validate, Artifact Upload)
│       └── release.yml            # Release Workflow (Build, Validate, GitHub Release on v* tags)
│
├── extension/                     # Chrome Extension (Manifest V3)
│   ├── public/                    # Manifest V3 & icons (16, 48, 128)
│   ├── scripts/
│   │   ├── generate-icons.cjs     # Programmatic icon generator
│   │   ├── validate-build.cjs     # Manifest V3 asset validator
│   │   └── package-extension.cjs  # Cross-platform zip archiver
│   ├── src/
│   │   ├── background/            # Background service worker (SidePanel + injection)
│   │   ├── content/               # Multi-platform content scripts & adapters
│   │   │   ├── adapters/          # LeetCode & Codeforces resilient extractors
│   │   ├── sidepanel/             # React 18 + Tailwind CSS dark-mode side panel
│   │   │   ├── components/        # Header, Navigation, ErrorBoundary, MarkdownRenderer
│   │   │   ├── pages/             # Problem, Hints, Explain, Debug, Notes, Progress, Settings
│   │   │   ├── services/          # Multi-model AI fallback, hint engine, code review, Anki/Obsidian export
│   │   │   └── hooks/             # Reactive context & storage hooks
│   │   ├── storage/               # Schema-versioned chrome.storage manager
│   │   ├── types/                 # Shared TypeScript interfaces
│   │   └── __tests__/             # Vitest test suite (28 tests)
│   ├── dist/                      # Production build for "Load unpacked"
│   └── vite.config.ts             # Rollup multi-entry with relative base & esbuild bundling
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
└── docs/                          # Architecture & Chrome Web Store listing documentation
    ├── ARCHITECTURE.md
    └── STORE_LISTING.md
```
