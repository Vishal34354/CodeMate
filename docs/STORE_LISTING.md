# CodeMate — Chrome Web Store Listing & Deployment Guide

## Store Metadata

- **Name**: CodeMate — AI CP Companion
- **Summary / Tagline**: AI competitive programming companion with progressive hints, invariant breakdowns, code inspection, and spaced repetition for LeetCode & Codeforces.
- **Category**: Developer Tools / Productivity
- **Primary Language**: English
- **Version**: 1.0.0
- **Manifest**: Manifest V3 (MV3 compliant)

---

## Detailed Description

### "Get unstuck, master the invariants, and remember what you learned — without leaving your problem page."

CodeMate is a learning-first Chrome extension purpose-built for competitive programmers on **LeetCode** and **Codeforces**. Unlike generic AI tools that simply output full answers, CodeMate acts as a patient coach that preserves your learning process and trains your algorithmic intuition.

### Key Features

1. **4-Stage Progressive Socratic Hints**
   - **Level 1 (Nudge)**: A subtle observation pointing toward key constraints and invariants.
   - **Level 2 (Mental Model)**: The core data structure or paradigm without giving away code.
   - **Level 3 (Algorithm Outline)**: High-level pseudocode and transition logic.
   - **Level 4 (Pseudocode / Invariants)**: Detailed invariant breakdown before revealing full implementations.

2. **Multi-Approach Solutions with Zero Comment Clutter**
   - Clean, copy-pasteable implementations across **C++**, **Java**, and **Python 3**.
   - Structured breakdown: Brute Force / Simulation $\rightarrow$ Optimized $\rightarrow$ Peak Optimal.
   - Rigorous $O(...)$ time and space complexity proofs.
   - **Comment-less code**: No tutorial commentary inside code blocks to keep editor code pure and clean.

3. **In-Page Invariant & Concept Deep Dive**
   - Socratic breakdown of core mental models, state transitions, and critical boundary edge cases.
   - Integrated LaTeX mathematics ($\LaTeX$) and GitHub Flavored Markdown (GFM) comparison tables.

4. **Code Inspection & Bug Diagnosis**
   - Diagnoses Wrong Answer (WA), Time Limit Exceeded (TLE), Integer Overflow, and off-by-one errors.
   - Concrete minimal counter-examples to reproduce failing test cases.

5. **Competitive Programming Notebook & Spaced Repetition (SRS)**
   - Automatically tracks your solved problems and attempts.
   - Built-in Spaced Repetition System (SRS) calculates optimal revision dates (1d, 3d, 7d, 14d, 30d).
   - Export and import your personal notes as JSON for safekeeping and portability.

---

## Privacy & Security Disclosures

- **Data Minimization**: CodeMate only extracts the problem title, statement, constraints, and current editor code upon user request.
- **Zero Background Tracking**: No browsing activity outside LeetCode and Codeforces is ever monitored or collected.
- **Zero Third-Party Telemetry**: CodeMate does not track user identities, session recordings, or analytics.
- **Serverless or Self-Hosted**: Users can provide their own direct Google Gemini API key or connect to a local private backend server. API keys are stored solely in Chrome's encrypted `chrome.storage.local` and are never transmitted to any third party.

---

## Chrome Permissions Justification

| Permission | Justification |
| :--- | :--- |
| `sidePanel` | Displays the companion interface persistently alongside the problem page. |
| `storage` | Stores user notes, settings, progress, and spaced repetition queues locally. |
| `activeTab` & `tabs` | Identifies the active problem tab URL to extract problem context. |
| `scripting` | Programmatically injects the content extractor on dynamically rendered SPA problem pages. |
| `host_permissions` | Restricted strictly to `leetcode.com`, `codeforces.com`, and `http://localhost:3001`. |

---

## Installation & Development Setup

1. Open `chrome://extensions/` in Chrome.
2. Toggle on **Developer mode** in the top right.
3. Click **Load unpacked** and select the `extension/dist` folder (or unzip `extension/codemate-v1.0.0.zip`).
4. Pin CodeMate and click the icon while browsing any LeetCode or Codeforces problem page.

