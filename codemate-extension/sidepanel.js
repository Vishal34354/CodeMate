const $ = (id) => document.getElementById(id);
let pageContext = null;
let currentLevel = 1;
let hints = [];
let currentNoteKey = "";

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === button));
    ["hints", "notes", "review"].forEach((name) => $(`${name}-panel`).classList.toggle("hidden", name !== button.dataset.tab));
  });
});

document.querySelectorAll(".hint-level").forEach((button) => {
  button.addEventListener("click", () => showHint(Number(button.dataset.level)));
});

$("refresh-context").addEventListener("click", loadContext);
$("next-hint").addEventListener("click", () => showHint(Math.min(4, currentLevel + 1)));
$("save-notes").addEventListener("click", saveNotes);
$("analyze-code").addEventListener("click", analyzeCode);

async function loadContext() {
  $("problem-title").textContent = "Reading current page…";
  const response = await chrome.runtime.sendMessage({ type: "CODEMATE_GET_TAB_CONTEXT" });
  if (!response?.ok) {
    pageContext = null;
    $("problem-title").textContent = "No problem detected";
    $("problem-subtitle").textContent = response?.error || "Try refreshing the problem page.";
    $("platform").textContent = "WAITING FOR A SUPPORTED PAGE";
    $("open-problem").href = "#";
    hints = [];
    $("hint-output").textContent = "Open a LeetCode or Codeforces problem page, then click Read page.";
    return;
  }

  pageContext = response.context;
  $("platform").textContent = `${pageContext.platform.toUpperCase()} · CURRENT PROBLEM`;
  $("problem-title").textContent = pageContext.title || "Problem title not detected";
  $("problem-subtitle").textContent = pageContext.statement
    ? `${pageContext.statement.length.toLocaleString()} characters of statement captured`
    : "Title found, but statement extraction was limited. You can still use notes and paste code.";
  $("open-problem").href = pageContext.url || response.tab.url || "#";
  $("code-input").value = pageContext.editorText || "";
  currentNoteKey = makeNoteKey(pageContext);
  await loadNotes();
  hints = buildHints(pageContext);
  currentLevel = 1;
  showHint(1);
}

function makeNoteKey(context) {
  return `codemate-note:${context.url || context.title || "unknown"}`;
}

function buildHints(context) {
  const statement = (context.statement || "").toLowerCase();
  const title = context.title || "this problem";
  const hasArray = /array|subarray|subsequence|element|integer sequence|vector/.test(statement);
  const hasString = /string|substring|character|palindrome/.test(statement);
  const hasGraph = /graph|vertex|vertices|edge|tree|connected|shortest path/.test(statement);
  const hasRange = /range|interval|segment|subarray|substring/.test(statement);
  const hasOptimization = /minimum|maximum|minimize|maximize|fewest|largest|smallest/.test(statement);
  const hasConstraints = /constraints|1e[0-9]|\u2264|10\^/.test(statement);
  let direction = "Restate the goal in one sentence. Identify exactly what must be returned, and try a tiny example by hand before choosing a data structure.";
  let approach = "Look for a simple baseline solution first. Then ask what repeated work it performs and whether that work can be cached, counted, or avoided.";
  let details = "Test the smallest valid input, repeated values, already sorted/reversed data (if relevant), and the largest allowed values. Make sure every loop boundary matches the problem's indexing.";
  let complexity = "Use the constraints to estimate the maximum number of operations. A nested scan is often O(n²); sorting is usually O(n log n); a single pass is O(n). Confirm the choice against the actual input limits.";

  if (hasArray) {
    direction = "Focus on the sequence: do you need a contiguous range, a subsequence, a frequency, or a pair? Write down what information you need to remember while scanning.";
    approach = "Consider a frequency map, sorting, two pointers, prefix sums, or a sliding window. The key question is whether the condition can be maintained as you move through the array.";
  }
  if (hasString) {
    direction = "Identify whether order, character counts, or a contiguous substring matters. Try a short string with repeated characters and one with all distinct characters.";
    approach = "Consider character frequencies, two pointers, a sliding window, or a prefix/suffix property. Define clearly what each pointer or state represents.";
  }
  if (hasGraph) {
    direction = "Model the input explicitly: what are the vertices and edges, and is the graph directed or undirected? Determine whether you need reachability, a path, or a tree property.";
    approach = "Consider DFS/BFS for reachability and unweighted shortest paths, or a suitable shortest-path algorithm for weighted edges. Track visited states to avoid revisiting nodes.";
  }
  if (hasRange) {
    direction = "Clarify whether endpoints are inclusive and whether the ranges overlap. Draw two or three intervals and test boundary-touching cases.";
    approach = "Consider sorting by a range endpoint, prefix sums, difference arrays, or a sliding window, depending on whether the task asks about overlap, sums, or a contiguous region.";
  }
  if (hasOptimization) {
    direction += " Because the statement asks for an optimum, check whether a greedy choice can be justified or whether choices interact and require dynamic programming.";
    approach += " If using greedy, try to find a counterexample to your local choice. If using DP, define the state and transition before coding.";
  }
  if (hasConstraints) {
    complexity += " Re-read the constraints carefully: they usually rule out at least one tempting brute-force approach.";
  }

  return [
    `Hint 1 — Direction\nFor “${title}”:\n${direction}`,
    `Hint 2 — Candidate approach\n${approach}\n\nThese are candidate techniques inferred from keywords, not a guaranteed intended solution.`,
    `Hint 3 — Implementation checks\n${details}\n\nWrite down your invariant: what is guaranteed to be true before and after each iteration?`,
    `Hint 4 — Complexity and validation\n${complexity}\n\nValidate your approach with a hand-worked example and compare the result with the expected output.`
  ];
}

function showHint(level) {
  currentLevel = Math.max(1, Math.min(4, level));
  document.querySelectorAll(".hint-level").forEach((b) => b.classList.toggle("selected", Number(b.dataset.level) === currentLevel));
  $("hint-output").textContent = hints[currentLevel - 1] || "Read a supported problem page to generate hints.";
  $("next-hint").textContent = currentLevel === 4 ? "You're at the final hint" : "Reveal next hint →";
  $("next-hint").disabled = currentLevel === 4;
  $("next-hint").style.opacity = currentLevel === 4 ? ".6" : "1";
}

async function loadNotes() {
  if (!currentNoteKey) return;
  const stored = await chrome.storage.local.get(currentNoteKey);
  const note = stored[currentNoteKey] || {};
  $("approach").value = note.approach || "";
  $("mistakes").value = note.mistakes || "";
  $("notes-status").textContent = "";
}

async function saveNotes() {
  if (!currentNoteKey) {
    $("notes-status").textContent = "Read a problem page first so notes can be linked to its URL.";
    return;
  }
  await chrome.storage.local.set({
    [currentNoteKey]: {
      title: pageContext?.title || "",
      url: pageContext?.url || "",
      approach: $("approach").value,
      mistakes: $("mistakes").value,
      updatedAt: new Date().toISOString()
    }
  });
  $("notes-status").textContent = "Saved on this browser ✓";
}

function analyzeCode() {
  const code = $("code-input").value.trim();
  if (!code) {
    $("review-output").textContent = "Paste your code here, or click Read page to try extracting the editor contents.";
    return;
  }
  const findings = [];
  if (/using\s+namespace\s+std/.test(code) && /#include\s*<bits\/stdc\+\+\.h>/.test(code)) {
    findings.push("Style: using namespace std is common in contests, but avoid it in larger projects.");
  }
  if (/\bint\s+\w+\s*=\s*1e9|\bint\s+\w+\s*=\s*1e18/.test(code)) {
    findings.push("Potential overflow: check whether a large sentinel or calculation should use long long.");
  }
  if (/\b(?:for|while)\s*\([^)]*<=\s*\w+\.size\(\)/.test(code)) {
    findings.push("Possible off-by-one: an index loop using <= size() may access one past the end.");
  }
  if (/long long/.test(code)) {
    findings.push("Good: long long appears in your code. Still check intermediate products and input bounds.");
  }
  if (/\b(?:dfs|bfs)\s*\(/i.test(code)) {
    findings.push("Graph check: confirm visited-state handling and recursion depth (iterative DFS may be safer for deep graphs).");
  }
  if (/\b(?:sort|stable_sort)\s*\(/.test(code)) {
    findings.push("Sorting check: verify the comparator is a strict weak ordering and that sorting does not destroy needed original indices.");
  }
  if (!findings.length) {
    findings.push("No obvious pattern-based warning found. This is not proof of correctness.");
  }
  findings.push("\nManual checklist:\n• Empty/minimum input\n• Duplicate values and boundary cases\n• Integer overflow\n• Required time and memory complexity\n• Does the code match the problem's exact input/output format?");
  $("review-output").textContent = findings.join("\n\n");
}

loadContext();