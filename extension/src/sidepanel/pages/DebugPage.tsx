import React, { useState, useEffect } from "react";
import type { ProblemContext, Settings, CodeFinding } from "@/types";
import { analyzeCode, detectLanguage } from "@/sidepanel/services/code-review";
import { queryAI, describeDataSharing } from "@/sidepanel/services/ai-service";
import { MarkdownRenderer } from "@/sidepanel/components/MarkdownRenderer";

interface Props {
  context: ProblemContext | null;
  settings: Settings;
  onNavigateToSettings: () => void;
  manualCode: string;
  setManualCode: (code: string) => void;
}

const DEFAULT_CHECKLIST = [
  { id: "overflow", text: "Prevented integer overflow? (Used long long / modulo operations at intermediate steps)" },
  { id: "edge_min", text: "Tested minimum boundary? (N = 0, N = 1, single node, empty string)" },
  { id: "edge_dups", text: "Handled identical / duplicate elements or all negative values?" },
  { id: "multi_test", text: "Cleared all global structures & memo tables for multiple test cases (T cases)?" },
  { id: "fast_io", text: "Enabled fast I/O for C++ (cin.tie(NULL)) or Python (sys.stdin.readline)?" },
  { id: "time_bound", text: "Estimated worst-case operations fits within ~10⁸ operations / second?" },
];

const COMMON_COUNTER_EXAMPLES = [
  { label: "N = 1 Boundary", example: "nums = [1], target = 1", note: "Does loops like i < n - 1 or j = i + 1 crash or skip?" },
  { label: "All Identical", example: "nums = [2, 2, 2, 2, 2]", note: "Check strictly less vs less-or-equal in comparisons" },
  { label: "Extreme Values", example: "nums = [10^9, 10^9]", note: "Check intermediate sums: a + b exceeds 2.14 × 10^9" },
  { label: "Negative Modulo", example: "(-5) % 3 == -2 in C++", note: "Ensure positive remainder: ((a % MOD) + MOD) % MOD" },
];

export function DebugPage({
  context,
  settings,
  onNavigateToSettings,
  manualCode,
  setManualCode,
}: Props) {
  const [activeCode, setActiveCode] = useState<string>(manualCode || context?.editorCode || "");
  const [findings, setFindings] = useState<CodeFinding[]>([]);
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Targeted Debugging Mode
  const [debugMode, setDebugMode] = useState<"general" | "wa" | "tle" | "re">("general");
  const [failingInput, setFailingInput] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [actualOutput, setActualOutput] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);

  // Sync active code if editor code becomes available and activeCode is empty
  useEffect(() => {
    if (!activeCode && context?.editorCode) {
      setActiveCode(context.editorCode);
      setManualCode(context.editorCode);
    }
  }, [context?.editorCode]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setActiveCode(val);
    setManualCode(val);
  };

  const handleSyncEditor = () => {
    if (context?.editorCode) {
      setActiveCode(context.editorCode);
      setManualCode(context.editorCode);
      const results = analyzeCode(context.editorCode);
      setFindings(results);
      setHasRunAnalysis(true);
    }
  };

  const handleRunReview = () => {
    const results = analyzeCode(activeCode);
    setFindings(results);
    setHasRunAnalysis(true);
  };

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRequestAIDebug = async () => {
    if (!settings.aiEnabled || !settings.aiConsented) {
      onNavigateToSettings();
      return;
    }

    setShowDataModal(false);
    setAiLoading(true);
    setAiError(null);

    let debugDetails = `Targeted Issue: ${debugMode.toUpperCase()}\n`;
    if (failingInput) debugDetails += `Failing Input:\n${failingInput}\n`;
    if (expectedOutput) debugDetails += `Expected Output: ${expectedOutput}\n`;
    if (actualOutput) debugDetails += `Actual Output: ${actualOutput}\n`;

    const res = await queryAI(settings, {
      type: "debug",
      problemTitle: context?.title || "Code Review",
      problemStatement: context?.statement || "No statement provided",
      constraints: context?.constraints,
      userCode: activeCode,
      additionalContext: debugDetails,
    });

    setAiLoading(false);
    if (res.ok) {
      setAiResult(res.content);
    } else {
      setAiError(res.error || "Failed to diagnose code via AI backend.");
    }
  };

  const detected = detectLanguage(activeCode);
  const langLabel = detected === "cpp" ? "C++" : detected === "java" ? "Java" : detected === "python" ? "Python" : "Generic";

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-cm-text">Interactive Code Debugger</h2>
          <p className="text-[11px] text-cm-muted">
            Static heuristics, WA/TLE diagnostics, and counter-example sandboxing.
          </p>
        </div>
        <span className="cm-pill">{langLabel}</span>
      </div>

      {/* Code Input */}
      <div className="cm-card space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-cm-muted uppercase tracking-wider">
            Your Implementation
          </label>
          <div className="flex gap-2">
            {context?.editorCode && (
              <button
                onClick={handleSyncEditor}
                className="cm-btn-secondary text-[10px] py-1 px-2.5"
                title="Sync from the platform's code editor"
              >
                Sync Page Editor
              </button>
            )}
            <button
              onClick={() => {
                setActiveCode("");
                setManualCode("");
                setFindings([]);
                setHasRunAnalysis(false);
              }}
              className="cm-btn-ghost text-[10px] py-1 px-2"
            >
              Clear
            </button>
          </div>
        </div>

        <textarea
          value={activeCode}
          onChange={handleCodeChange}
          placeholder="Paste or write your C++, Python, or Java solution here to inspect for common pitfalls..."
          rows={7}
          className="cm-textarea text-xs font-mono leading-relaxed"
          spellCheck={false}
        />

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleRunReview}
            disabled={!activeCode.trim()}
            className="cm-btn-secondary flex-1 text-xs"
          >
            Run Heuristic Review
          </button>
        </div>
      </div>

      {/* Static Analysis Findings */}
      {hasRunAnalysis && (
        <div className="cm-card space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-cm-text">Analysis Findings</span>
              {errorCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cm-red/20 text-cm-red">
                  {errorCount} Error{errorCount > 1 ? "s" : ""}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cm-orange/20 text-cm-orange">
                  {warningCount} Warning{warningCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <span className="cm-pill">OFFLINE ENGINE</span>
          </div>

          <div className="space-y-2">
            {findings.map((item, idx) => {
              const severityClass = {
                error: "cm-severity-error bg-red-500/5",
                warning: "cm-severity-warning bg-orange-500/5",
                info: "cm-severity-info bg-blue-500/5",
                suggestion: "cm-severity-suggestion bg-green-500/5",
              }[item.severity];

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-r-lg text-xs font-mono whitespace-pre-wrap leading-relaxed ${severityClass}`}
                >
                  <div className="flex justify-between text-[10px] font-sans font-semibold mb-1 opacity-75">
                    <span className="uppercase">{item.severity}</span>
                    <span className="capitalize">{item.source}</span>
                  </div>
                  <div className="text-cm-text/90 font-sans">{item.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Targeted AI Debugging Suite */}
      <div className="cm-card border-cm-accent2/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🔬</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
              Targeted Bug Diagnosis
            </h3>
          </div>
          {settings.aiEnabled && settings.aiConsented ? (
            <span className="cm-pill text-cm-green border-cm-green/40">AI READY</span>
          ) : (
            <span className="cm-pill text-cm-muted">LOCAL ONLY</span>
          )}
        </div>

        {/* Failure Mode Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-cm-muted block">
            What verdict did you receive?
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: "general", label: "General" },
              { id: "wa", label: "WA (Wrong)" },
              { id: "tle", label: "TLE (Timeout)" },
              { id: "re", label: "RE (Crash)" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setDebugMode(m.id as typeof debugMode)}
                className={`text-[10px] py-1 px-1.5 rounded-md font-semibold transition-colors ${
                  debugMode === m.id
                    ? "bg-cm-accent2 text-white"
                    : "bg-cm-surface text-cm-muted hover:text-cm-text"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Failing Input Box */}
        {(debugMode === "wa" || debugMode === "re") && (
          <div className="space-y-2 pt-1 animate-fade-in">
            <div>
              <label className="text-[10px] font-bold text-cm-muted block mb-1">
                Failing Test Input (Optional)
              </label>
              <textarea
                value={failingInput}
                onChange={(e) => setFailingInput(e.target.value)}
                placeholder="e.g., [2, 7, 11, 15], target = 9"
                rows={2}
                className="cm-textarea text-[11px] font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-cm-muted block mb-1">
                  Expected Output
                </label>
                <input
                  type="text"
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder="e.g., [0, 1]"
                  className="cm-input text-[11px] font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-cm-muted block mb-1">
                  Your Output
                </label>
                <input
                  type="text"
                  value={actualOutput}
                  onChange={(e) => setActualOutput(e.target.value)}
                  placeholder="e.g., []"
                  className="cm-input text-[11px] font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {aiResult ? (
          <div className="space-y-2 pt-2 border-t border-cm-line/50">
            <div className="p-3.5 rounded-xl bg-cm-bg/80 border border-cm-line max-h-[450px] overflow-y-auto">
              <MarkdownRenderer content={aiResult} />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setAiResult(null)}
                className="cm-btn-secondary text-[11px] py-1 px-3"
              >
                Clear Diagnosis
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {aiError && (
              <div className="p-2.5 rounded-lg bg-cm-red/10 border border-cm-red/30 text-cm-red text-xs">
                {aiError}
              </div>
            )}

            {settings.aiEnabled && settings.aiConsented ? (
              <button
                onClick={() => setShowDataModal(true)}
                disabled={aiLoading || !activeCode.trim()}
                className="cm-btn-primary w-full text-xs font-bold py-2 shadow-lg shadow-cm-accent2/20"
              >
                {aiLoading ? "Diagnosing Logic Root Cause..." : "Diagnose Logic Root Cause 🔬"}
              </button>
            ) : (
              <div className="p-2.5 bg-cm-surface/40 rounded-lg border border-cm-line flex items-center justify-between">
                <span className="text-[11px] text-cm-muted">AI diagnostic assistant disabled</span>
                <button
                  onClick={onNavigateToSettings}
                  className="text-xs text-cm-accent font-semibold hover:underline"
                >
                  Configure
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Common Counter-Examples Sandbox */}
      <div className="cm-card space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">🧪</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
            Common CP Counter-Examples
          </h3>
        </div>
        <p className="text-[11px] text-cm-muted leading-relaxed">
          Test your code mentally or locally against these classic trap inputs:
        </p>

        <div className="space-y-1.5">
          {COMMON_COUNTER_EXAMPLES.map((ce, i) => (
            <div key={i} className="p-2 rounded-lg bg-cm-surface/30 border border-cm-line/50 text-[11px]">
              <div className="flex justify-between font-bold text-cm-text mb-0.5">
                <span>{ce.label}</span>
                <span className="text-cm-accent font-mono">{ce.example}</span>
              </div>
              <p className="text-cm-muted text-[10px] leading-snug">{ce.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pre-Submission Verification Checklist */}
      <div className="cm-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
              Pre-Submission Checklist
            </h3>
          </div>
          <span className="text-[10px] font-mono text-cm-muted">
            {Object.values(checkedItems).filter(Boolean).length}/{DEFAULT_CHECKLIST.length}
          </span>
        </div>

        <div className="space-y-2">
          {DEFAULT_CHECKLIST.map((item) => (
            <label
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className="flex items-start gap-2.5 p-2 rounded-lg bg-cm-surface/30 hover:bg-cm-surface/60 cursor-pointer transition-colors text-xs select-none"
            >
              <input
                type="checkbox"
                checked={!!checkedItems[item.id]}
                onChange={() => {}}
                className="mt-0.5 accent-cm-accent2 rounded cursor-pointer"
              />
              <span
                className={`leading-snug transition-colors ${
                  checkedItems[item.id] ? "text-cm-muted line-through" : "text-cm-text/90"
                }`}
              >
                {item.text}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Data Disclosure Modal */}
      {showDataModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-cm-card border border-cm-line rounded-xl max-w-sm w-full p-4 space-y-3 animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-cm-text">Data Privacy Disclosure</h4>
              <button
                onClick={() => setShowDataModal(false)}
                className="text-cm-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-[11px] text-cm-muted whitespace-pre-wrap font-mono bg-cm-bg p-3 rounded-lg border border-cm-line/60">
              {describeDataSharing({
                type: "debug",
                problemTitle: context?.title || "Code Review",
                problemStatement: context?.statement || "",
                constraints: context?.constraints,
                userCode: activeCode,
              })}
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setShowDataModal(false)}
                className="cm-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestAIDebug}
                className="cm-btn-primary text-xs py-1.5 px-3"
              >
                Confirm & Diagnose
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
