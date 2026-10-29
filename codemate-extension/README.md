# CodeMate — Chrome Coding Companion

A local-first Chrome extension for LeetCode and Codeforces. Version 0.1 includes a persistent side panel, progressive heuristic hints, a problem notebook, and basic pattern-based code checks.

## What works in this starter

- Opens the side panel when you click the extension icon.
- Attempts to read the title and statement from LeetCode and Codeforces problem pages.
- Generates four progressive **heuristic** hints locally.
- Saves approach and mistake notes in `chrome.storage.local`, keyed by problem URL.
- Provides a lightweight pattern-based code review. It is not a compiler and cannot prove correctness.
- Does not send code or problem content to a server.

## Folder structure

```text
codemate-extension/
├── manifest.json
├── background.js
├── content.js
├── sidepanel.html
├── sidepanel.css
├── sidepanel.js
└── README.md
```

## Install in Chrome

1. Extract this folder somewhere permanent.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `codemate-extension` folder (the one containing `manifest.json`).
6. Open a LeetCode problem such as `https://leetcode.com/problems/two-sum/` or a Codeforces problem page.
7. Refresh that problem tab once after installation so Chrome injects the content script.
8. Click the CodeMate puzzle-piece/extension icon. If it is not visible, pin CodeMate from Chrome's Extensions menu.
9. Use **Read page** if the current problem is not detected.

## Testing checklist

- [ ] Extension loads without an error on `chrome://extensions`.
- [ ] Clicking the extension opens the side panel.
- [ ] LeetCode problem title appears.
- [ ] Codeforces problem title appears.
- [ ] Hint levels 1–4 change the displayed hint.
- [ ] Notes remain after closing/reopening the side panel.
- [ ] Pasted code triggers the common-issue checklist.

## Known limitations

- Website DOM selectors can change; problem statement and editor extraction are best-effort.
- CodeMirror/Monaco editor internals are not consistently readable. Paste code manually if extraction fails.
- The current hint engine uses simple keyword heuristics. It does **not** solve the problem or guarantee the intended algorithm.
- Code review checks a few recognizable patterns; it is not a compiler, static analyzer, or correctness verifier.
- This starter does not yet call an AI API. An optional AI provider should be added through a backend so secrets are never embedded in extension files.

## Next upgrades

1. Improve platform-specific selectors and add a manual statement input fallback.
2. Add topic/difficulty tags and a searchable notebook.
3. Add an optional backend endpoint for AI-powered hint levels, with explicit user action before sending code or statements.
4. Add tests and a privacy notice before Chrome Web Store publication.
