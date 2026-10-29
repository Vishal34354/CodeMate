import React from "react";
import type { ProblemContext } from "@/types";

interface Props {
  context: ProblemContext | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onMarkAccepted?: () => void;
  manualStatement: string;
  setManualStatement: (v: string) => void;
  manualCode: string;
  setManualCode: (v: string) => void;
}

export function ProblemPage({
  context,
  loading,
  error,
  onRefresh,
  onMarkAccepted,
  manualStatement,
  setManualStatement,
  manualCode,
  setManualCode,
}: Props) {
  const qualityLabel = context?.extractionQuality
    ? {
        full: { text: "Full extraction", color: "text-cm-green" },
        partial: { text: "Partial extraction", color: "text-cm-orange" },
        "title-only": { text: "Title only", color: "text-cm-yellow" },
        failed: { text: "Extraction failed", color: "text-cm-red" },
      }[context.extractionQuality]
    : null;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Problem Card */}
      <div className="cm-card relative overflow-hidden">
        {/* Decorative gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cm-accent2 via-cm-accent to-cm-green opacity-60" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="cm-pill">
              {context?.platform?.toUpperCase() || "WAITING"} · CURRENT PROBLEM
            </span>
            {context?.isSolved && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cm-green/20 text-cm-green border border-cm-green/40 flex items-center gap-1">
                <span>✓</span> Solved (Accepted)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!context?.isSolved && context?.problemId && onMarkAccepted && (
              <button
                onClick={onMarkAccepted}
                className="text-[10px] font-semibold text-cm-muted hover:text-cm-green px-2 py-0.5 rounded border border-cm-line hover:border-cm-green/50 transition-colors"
                title="Mark this problem as accepted and schedule for spaced repetition review"
              >
                Mark Solved ✓
              </button>
            )}
            {qualityLabel && (
              <span className={`text-[10px] font-semibold ${qualityLabel.color}`}>
                {qualityLabel.text}
              </span>
            )}
          </div>
        </div>

        <h2 className="text-[15px] font-bold mt-2 mb-1 leading-snug break-words">
          {loading ? (
            <span className="cm-shimmer inline-block w-48 h-5" />
          ) : (
            context?.title || "No problem detected yet"
          )}
        </h2>

        <p className="text-cm-muted text-[11px] mb-3">
          {loading
            ? "Reading current page…"
            : error
              ? error
              : context?.statement
                ? `${context.statement.length.toLocaleString()} chars captured${context.editorCode ? " · editor code found" : ""}`
                : "Open a LeetCode or Codeforces problem page."}
        </p>

        {/* Meta info */}
        {context && (
          <div className="flex flex-wrap gap-2 mb-3">
            {context.difficulty && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  context.difficulty.toLowerCase() === "easy"
                    ? "bg-green-500/15 text-green-400"
                    : context.difficulty.toLowerCase() === "medium"
                      ? "bg-yellow-500/15 text-yellow-400"
                      : context.difficulty.toLowerCase() === "hard"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-cm-surface text-cm-muted"
                }`}
              >
                {context.difficulty}
              </span>
            )}
            {context.tags.slice(0, 5).map((tag, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-cm-surface text-cm-muted border border-cm-line/50">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="cm-btn-secondary text-xs"
            id="refresh-context"
          >
            {loading ? (
              <>
                <span className="animate-spin text-sm">⟳</span> Reading…
              </>
            ) : (
              <>↻ Read page</>
            )}
          </button>

          {context?.url && (
            <a
              href={context.url}
              target="_blank"
              rel="noreferrer"
              className="text-cm-accent/80 text-[11px] hover:text-cm-accent transition-colors"
            >
              Open page ↗
            </a>
          )}
        </div>
      </div>

      {/* Instant Complexity & Constraint Heuristics */}
      {context?.problemId && (
        <div className="cm-card space-y-2.5 border-cm-accent2/30 bg-gradient-to-br from-cm-card to-[#0d1424]/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⏱️</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cm-accent">
                Complexity & Constraints Target
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-cm-surface border border-cm-line text-cm-muted">
              Standard ≤ 10⁸ ops/sec
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-cm-bg/80 border border-cm-line text-xs font-mono text-cm-text/90 leading-relaxed">
            {(() => {
              const c = context.constraints || "";
              if (/10\^5|2\s*\*\s*10\^5|100000/i.test(c)) {
                return "🎯 N ≈ 10⁵ → Target O(N) or O(N log N). Nested O(N²) loops will Time Out (TLE).";
              }
              if (/10\^6|1000000/i.test(c)) {
                return "🎯 N ≈ 10⁶ → Must be strict O(N) or O(N log N) with small constant factors.";
              }
              if (/10\^9|1000000000/i.test(c)) {
                return "🎯 N ≈ 10⁹ → Target O(log N), O(√N), or closed-form O(1) mathematical formula.";
              }
              if (/\b(?:n|k)\s*[≤<=]\s*(?:20|18|16)\b/i.test(c)) {
                return "🎯 N ≤ 20 → Exponential O(2ᴺ) or bitmask dynamic programming O(N · 2ᴺ) is viable.";
              }
              if (/\b(?:n|k)\s*[≤<=]\s*(?:500|400|1000)\b/i.test(c)) {
                return "🎯 N ≤ 1000 → O(N²) or O(N² log N) 2D dynamic programming or matrix traversal fits the 1.0s limit.";
              }
              return "🎯 Check limits: Target total fundamental operations ≤ 10⁸ for standard 1.0-2.0s time limit.";
            })()}
          </div>

          {context.constraints && (
            <p className="text-[11px] text-cm-muted/90 leading-relaxed px-1">
              <strong className="text-cm-text">Constraints: </strong>
              {context.constraints.slice(0, 160)}
              {context.constraints.length > 160 ? "..." : ""}
            </p>
          )}

          {/* Quick Boundary Checks */}
          <div className="pt-1.5 border-t border-cm-line/40 grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-1.5 rounded bg-cm-surface/40 border border-cm-line/40 text-cm-muted">
              <span className="text-cm-orange font-bold mr-1">⚠️ Limits:</span> N = 0, 1, or single element
            </div>
            <div className="p-1.5 rounded bg-cm-surface/40 border border-cm-line/40 text-cm-muted">
              <span className="text-cm-orange font-bold mr-1">⚠️ Duplicates:</span> All identical or negative keys
            </div>
          </div>
        </div>
      )}

      {/* Problem Statement Preview */}
      {context?.statement && (
        <div className="cm-card">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-cm-muted uppercase tracking-wider">
              Extracted Statement
            </h3>
            <span className="text-[10px] text-cm-muted">
              {context.statement.length > 500 ? "Showing preview" : "Full statement"}
            </span>
          </div>
          <div className="cm-output text-xs max-h-60 overflow-y-auto">
            {context.statement.slice(0, 1500)}
            {context.statement.length > 1500 && "\n\n[Statement truncated for display]"}
          </div>
        </div>
      )}

      {/* Manual Input Fallback */}
      <div className="cm-card">
        <h3 className="text-xs font-bold text-cm-muted uppercase tracking-wider mb-3">
          Manual Input
        </h3>
        <p className="text-[11px] text-cm-muted mb-3">
          If automatic extraction failed or is incomplete, paste the problem statement or your code here.
        </p>

        <label className="block text-[11px] font-semibold text-cm-muted/80 mb-1.5">
          Problem Statement
        </label>
        <textarea
          className="cm-textarea text-xs"
          rows={4}
          placeholder="Paste the problem statement here if extraction failed…"
          value={manualStatement}
          onChange={(e) => setManualStatement(e.target.value)}
        />

        <label className="block text-[11px] font-semibold text-cm-muted/80 mb-1.5 mt-3">
          Your Code
        </label>
        <textarea
          className="cm-textarea text-xs font-mono"
          rows={4}
          placeholder="Paste your code here if the editor couldn't be read…"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
