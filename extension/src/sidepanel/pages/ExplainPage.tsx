import React, { useState } from "react";
import type { ProblemContext, Settings } from "@/types";
import { queryAI, describeDataSharing } from "@/sidepanel/services/ai-service";
import { MarkdownRenderer } from "@/sidepanel/components/MarkdownRenderer";

interface Props {
  context: ProblemContext | null;
  settings: Settings;
  onNavigateToSettings: () => void;
}

export function ExplainPage({ context, settings, onNavigateToSettings }: Props) {
  const [activeTab, setActiveTab] = useState<"concepts" | "approaches">("concepts");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [approachLoading, setApproachLoading] = useState(false);
  const [approachResult, setApproachResult] = useState<string | null>(null);
  const [approachError, setApproachError] = useState<string | null>(null);

  const [showDataModal, setShowDataModal] = useState(false);
  const [modalTarget, setModalTarget] = useState<"explain" | "approaches">("explain");

  if (!context || !context.problemId) {
    return (
      <div className="animate-fade-in">
        <div className="cm-card text-center py-8">
          <p className="text-3xl mb-3">💡</p>
          <p className="text-cm-muted text-sm">
            Open a LeetCode or Codeforces problem to view the conceptual breakdown and full multi-approach solutions.
          </p>
        </div>
      </div>
    );
  }

  // Heuristic Complexity Target
  const extractComplexityTarget = (constraints: string): string => {
    if (!constraints) return "Determine bounds from problem description.";
    const hasN = /n\s*([≤<=]|to)\s*([0-9e^]+)/i.test(constraints) || /10\^5|100000/i.test(constraints);
    if (/10\^5|2\s*\*\s*10\^5|100000/i.test(constraints)) {
      return "N ≈ 10⁵ → Aim for O(N) or O(N log N). Nested O(N²) loops will Time Out (TLE).";
    }
    if (/10\^6|1000000/i.test(constraints)) {
      return "N ≈ 10⁶ → Must be O(N) or O(N log N) with small constant factors.";
    }
    if (/10\^9|1000000000/i.test(constraints)) {
      return "N ≈ 10⁹ → Aim for O(log N), O(√N), or closed-form O(1) mathematical formula.";
    }
    if (/\b(?:n|k)\s*[≤<=]\s*(?:20|18|16)\b/i.test(constraints)) {
      return "N ≤ 20 → Exponential O(2ᴺ) or bitmask dynamic programming O(N · 2ᴺ) is viable.";
    }
    if (/\b(?:n|k)\s*[≤<=]\s*(?:500|400|1000)\b/i.test(constraints)) {
      return "N ≤ 1000 → O(N²) or O(N² log N) dynamic programming or 2D matrix traversal fits the 1.0s limit.";
    }
    if (hasN) {
      return "Verify constraints against standard competitive programming limits (approx 10⁸ operations/sec).";
    }
    return "Check standard 1.0-2.0s time limit: Target ≤ 10⁸ fundamental operations.";
  };

  const identifyInvariants = (tags: string[], title: string, statement: string): string[] => {
    const list: string[] = [];
    const lower = (statement + " " + title).toLowerCase();

    if (tags.some((t) => /dynamic programming|dp/i.test(t)) || /subsequence|maximum profit|minimum steps/i.test(lower)) {
      list.push("Optimal Substructure: The solution to the problem can be constructed from solutions to its subproblems.");
      list.push("Overlapping Subproblems: State memoization avoids recalculating the same subproblem multiple times.");
    }
    if (tags.some((t) => /binary search/i.test(t)) || /monotonic|sorted|minimum maximum|predicate/i.test(lower)) {
      list.push("Monotonicity Invariant: If a condition holds for value X, it either holds for all values ≥ X or all values ≤ X, allowing binary search on the answer space.");
    }
    if (tags.some((t) => /two pointers|sliding window/i.test(t)) || /subarray|substring|contiguous/i.test(lower)) {
      list.push("Sliding Window / Monotonic Boundaries: The right pointer expands the valid window, while the left pointer shrinks it when constraints are violated.");
    }
    if (tags.some((t) => /graph|bfs|dfs/i.test(t)) || /connected|shortest path|grid|cycle/i.test(lower)) {
      list.push("Connectivity & State Space: Model each state as a node and allowable transitions as directed/undirected edges.");
    }
    if (tags.some((t) => /greedy/i.test(t)) || /interval|earliest|lexicographically/i.test(lower)) {
      list.push("Greedy-Choice Property: A locally optimal choice at each step leads to a globally optimal solution without backtracking.");
    }

    if (list.length === 0) {
      list.push("Identify what properties stay invariant as you process the input element by element.");
      list.push("Look for symmetries or conservation laws in state transitions.");
    }

    return list;
  };

  const getCommonEdgeCases = (statement: string, constraints: string): string[] => {
    const cases: string[] = [
      "Minimum input size (N = 0, N = 1, single element list/string).",
      "All elements identical (e.g. [0, 0, 0, 0] or 'aaaa').",
      "Extreme values: Max possible integer, negative values, 0.",
    ];

    if (/modulo|10\^9\s*\+\s*7|998244353/i.test(statement + constraints)) {
      cases.push("Modulo arithmetic: Take (a + b) % MOD and (a * 1LL * b) % MOD at each intermediate step to prevent overflow.");
    }
    if (/tree|graph/i.test(statement)) {
      cases.push("Disconnected components, cyclic graphs, or star/line graph degeneracies.");
    }
    if (/duplicate|distinct/i.test(statement)) {
      cases.push("Input containing duplicate numbers or duplicate characters.");
    }

    return cases;
  };

  const handleRequestAI = async () => {
    if (!settings.aiEnabled || !settings.aiConsented) {
      onNavigateToSettings();
      return;
    }

    setShowDataModal(false);
    if (modalTarget === "explain") {
      setAiLoading(true);
      setAiError(null);

      const res = await queryAI(settings, {
        type: "explain",
        problemTitle: context.title,
        problemStatement: context.statement,
        constraints: context.constraints,
        additionalContext: `Platform: ${context.platform}. Tags: ${context.tags.join(", ")}`,
      });

      setAiLoading(false);
      if (res.ok) {
        setAiResult(res.content);
      } else {
        setAiError(res.error || "Failed to receive explanation from AI backend.");
      }
    } else {
      setApproachLoading(true);
      setApproachError(null);

      const res = await queryAI(settings, {
        type: "approaches",
        problemTitle: context.title,
        problemStatement: context.statement,
        constraints: context.constraints,
        additionalContext: `Platform: ${context.platform}. Tags: ${context.tags.join(", ")}. Provide complete code for Brute Force, Better, and Optimal.`,
      });

      setApproachLoading(false);
      if (res.ok) {
        setApproachResult(res.content);
      } else {
        setApproachError(res.error || "Failed to generate multi-approach solution guide.");
      }
    }
  };

  const complexityTarget = extractComplexityTarget(context.constraints);
  const invariants = identifyInvariants(context.tags, context.title, context.statement);
  const edgeCases = getCommonEdgeCases(context.statement, context.constraints);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Sub Tabs: Conceptual vs Multi-Approach Solutions */}
      <div className="flex items-center justify-between border-b border-cm-line pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("concepts")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "concepts"
                ? "bg-cm-surface text-cm-text border border-cm-line shadow-sm"
                : "text-cm-muted hover:text-cm-text"
            }`}
          >
            💡 Concepts & Invariants
          </button>
          <button
            onClick={() => setActiveTab("approaches")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "approaches"
                ? "bg-cm-surface text-cm-text border border-cm-line shadow-sm"
                : "text-cm-muted hover:text-cm-text"
            }`}
          >
            📚 Full Solution Approaches
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cm-accent2/20 text-cm-accent border border-cm-accent2/40 font-semibold">
              Deep Dive
            </span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: CONCEPTS & INVARIANTS ─── */}
      {activeTab === "concepts" && (
        <div className="space-y-4 animate-fade-in">
          {/* Target Complexity Card */}
          <div className="cm-card space-y-1.5 border-cm-accent2/30">
            <div className="flex items-center gap-2">
              <span className="text-base">⏱️</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cm-accent">
                Complexity Target
              </h3>
            </div>
            <p className="text-xs text-cm-text/90 font-mono leading-relaxed bg-cm-bg/60 p-2.5 rounded-lg border border-cm-line">
              {complexityTarget}
            </p>
            {context.constraints && (
              <p className="text-[11px] text-cm-muted pt-1">
                <span className="font-semibold text-cm-text">Constraints given: </span>
                {context.constraints.slice(0, 180)}
                {context.constraints.length > 180 ? "..." : ""}
              </p>
            )}
          </div>

          {/* Invariants & Pattern Identification */}
          <div className="cm-card space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🧩</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cm-accent">
                Core Invariants & Patterns
              </h3>
            </div>
            <ul className="space-y-1.5">
              {invariants.map((item, idx) => (
                <li key={idx} className="text-xs text-cm-text/80 flex items-start gap-2 bg-cm-surface/30 p-2 rounded-lg">
                  <span className="text-cm-accent font-bold mt-0.5">•</span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Critical Edge Cases */}
          <div className="cm-card space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cm-orange">
                Critical Boundary & Edge Cases
              </h3>
            </div>
            <div className="space-y-1">
              {edgeCases.map((ec, idx) => (
                <div key={idx} className="text-xs text-cm-text/85 flex items-start gap-2 py-1">
                  <span className="text-cm-orange text-[10px] mt-0.5">▶</span>
                  <span className="leading-relaxed">{ec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Conceptual Breakdown */}
          <div className="cm-card border-cm-line/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
                  AI Socratic Concept Guidance
                </h3>
              </div>
              {settings.aiEnabled && settings.aiConsented ? (
                <span className="cm-pill text-cm-green border-cm-green/40">AI READY</span>
              ) : (
                <span className="cm-pill text-cm-muted">LOCAL ONLY</span>
              )}
            </div>

            {aiResult ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-cm-bg/80 border border-cm-line max-h-96 overflow-y-auto">
                  <MarkdownRenderer content={aiResult} />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setAiResult(null)}
                    className="cm-btn-secondary text-[11px] py-1 px-3"
                  >
                    Clear AI Response
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-cm-muted leading-relaxed">
                  Generate an in-depth Socratic breakdown of the problem using your private AI backend server.
                </p>

                {aiError && (
                  <div className="p-2.5 rounded-lg bg-cm-red/10 border border-cm-red/30 text-cm-red text-xs">
                    {aiError}
                  </div>
                )}

                {settings.aiEnabled && settings.aiConsented ? (
                  <button
                    onClick={() => {
                      setModalTarget("explain");
                      setShowDataModal(true);
                    }}
                    disabled={aiLoading}
                    className="cm-btn-primary w-full text-xs"
                  >
                    {aiLoading ? "Generating AI Breakdown..." : "Request AI Deep Explanation"}
                  </button>
                ) : (
                  <div className="p-3 bg-cm-surface/40 rounded-lg border border-cm-line space-y-2">
                    <p className="text-[11px] text-cm-muted">
                      AI features require configuring a local/private backend server with your consent.
                    </p>
                    <button
                      onClick={onNavigateToSettings}
                      className="cm-btn-secondary w-full text-xs"
                    >
                      Configure AI in Settings
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: MULTI-APPROACH FULL SOLUTIONS ─── */}
      {activeTab === "approaches" && (
        <div className="space-y-4 animate-fade-in">
          <div className="cm-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📖</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
                  Multi-Approach Solution Guide
                </h3>
              </div>
              <span className="cm-pill text-cm-accent border-cm-accent/40">DETAILED CODE</span>
            </div>

            <p className="text-xs text-cm-muted leading-relaxed">
              Explore how this problem can be solved across different algorithmic paradigms (Brute Force → Optimized → Peak Optimal), complete with complexity proofs and full implementations.
            </p>

            {approachResult ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-cm-bg/80 border border-cm-line max-h-[600px] overflow-y-auto">
                  <MarkdownRenderer content={approachResult} />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-cm-muted">Verified algorithmic walkthrough</span>
                  <button
                    onClick={() => setApproachResult(null)}
                    className="cm-btn-secondary text-[11px] py-1 px-3"
                  >
                    Re-generate
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {approachError && (
                  <div className="p-2.5 rounded-lg bg-cm-red/10 border border-cm-red/30 text-cm-red text-xs">
                    {approachError}
                  </div>
                )}

                <div className="p-3 bg-cm-surface/30 rounded-lg border border-cm-line space-y-2 text-xs text-cm-text/90">
                  <div className="flex items-center gap-2 text-cm-accent font-bold">
                    <span>⚡ What this guide provides:</span>
                  </div>
                  <ul className="space-y-1 text-cm-muted text-[11px]">
                    <li>• <strong>Approach 1 (Brute Force):</strong> Intuition, code, and why it TLEs</li>
                    <li>• <strong>Approach 2 (Sub-optimal):</strong> Two pointers / Sorting / Hash Map</li>
                    <li>• <strong>Approach 3 (Optimal):</strong> State-of-the-art linear or logarithmic algorithm</li>
                    <li>• <strong>Trade-off Matrix:</strong> Time, Space, Implementation Difficulty</li>
                  </ul>
                </div>

                {settings.aiEnabled && settings.aiConsented ? (
                  <button
                    onClick={() => {
                      setModalTarget("approaches");
                      setShowDataModal(true);
                    }}
                    disabled={approachLoading}
                    className="cm-btn-primary w-full text-xs font-bold py-2.5 shadow-lg shadow-cm-accent2/25 flex items-center justify-center gap-2"
                  >
                    {approachLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generating Multi-Approach Solutions (~5-10s)...</span>
                      </>
                    ) : (
                      "Generate Full Multi-Approach Solutions 🚀"
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-cm-surface/40 rounded-lg border border-cm-line space-y-2">
                    <p className="text-[11px] text-cm-muted">
                      Multi-approach code walkthroughs are powered by your configured AI companion backend.
                    </p>
                    <button
                      onClick={onNavigateToSettings}
                      className="cm-btn-secondary w-full text-xs"
                    >
                      Enable AI in Settings
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
                type: modalTarget,
                problemTitle: context.title,
                problemStatement: context.statement,
                constraints: context.constraints,
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
                onClick={handleRequestAI}
                className="cm-btn-primary text-xs py-1.5 px-3"
              >
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
