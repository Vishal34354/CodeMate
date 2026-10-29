import React, { useState } from "react";
import type { useProgress } from "@/sidepanel/hooks";

interface Props {
  progressData: ReturnType<typeof useProgress>;
  onOpenUrl?: (url: string) => void;
}

export function ProgressPage({ progressData, onOpenUrl }: Props) {
  const {
    progress,
    revisionQueue,
    solvedProblems,
    inProgressProblems,
    loading,
    markReviewed,
  } = progressData;

  const [subTab, setSubTab] = useState<"queue" | "history" | "stats">("queue");

  const attempts = progress?.attempts ? Object.values(progress.attempts) : [];
  const totalAttempted = attempts.length;
  const totalSolved = solvedProblems.length;
  const totalWithNotes = attempts.filter((a) => a.hasNotes).length;

  // Calculate hint distribution
  const hintCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  attempts.forEach((a) => {
    if (a.hintLevelReached >= 1 && a.hintLevelReached <= 4) {
      hintCounts[a.hintLevelReached as 1 | 2 | 3 | 4]++;
    }
  });

  // Platform breakdown
  const lcCount = attempts.filter((a) => a.platform === "LeetCode").length;
  const cfCount = attempts.filter((a) => a.platform === "Codeforces").length;
  const lcPercent = totalAttempted > 0 ? Math.round((lcCount / totalAttempted) * 100) : 50;

  // Top tags
  const tagCounts: Record<string, number> = {};
  attempts.forEach((a) => {
    (a.tags || []).forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxTagCount = sortedTags.length > 0 ? sortedTags[0][1] : 1;

  const handleOpenProblem = (url: string) => {
    if (onOpenUrl) {
      onOpenUrl(url);
    } else if (chrome?.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Sub Tabs: Queue / Systematic History / Stats */}
      <div className="flex items-center justify-between border-b border-cm-line pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab("queue")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === "queue"
                ? "bg-cm-surface text-cm-text border border-cm-line shadow-sm"
                : "text-cm-muted hover:text-cm-text"
            }`}
          >
            <span>SRS Due</span>
            {revisionQueue.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-cm-orange text-black text-[9px] font-black flex items-center justify-center">
                {revisionQueue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab("history")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === "history"
                ? "bg-cm-surface text-cm-text border border-cm-line shadow-sm"
                : "text-cm-muted hover:text-cm-text"
            }`}
          >
            <span>Solved History</span>
            <span className="text-[10px] text-cm-green font-mono">({totalSolved})</span>
          </button>
          <button
            onClick={() => setSubTab("stats")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              subTab === "stats"
                ? "bg-cm-surface text-cm-text border border-cm-line shadow-sm"
                : "text-cm-muted hover:text-cm-text"
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* SUB TAB 1: REVISION QUEUE (SRS DUE) */}
      {subTab === "queue" && (
        <div className="space-y-3">
          <div className="cm-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⏰</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
                  Due For Revision Today ({revisionQueue.length})
                </h3>
              </div>
              {revisionQueue.length > 0 && (
                <span className="text-[10px] font-bold text-cm-orange bg-cm-orange/10 px-2 py-0.5 rounded-full border border-cm-orange/20">
                  Review Scheduled
                </span>
              )}
            </div>

            {loading ? (
              <div className="text-center py-4 text-xs text-cm-muted">Checking revision schedule...</div>
            ) : revisionQueue.length === 0 ? (
              <div className="text-center py-5 bg-cm-surface/30 rounded-lg border border-cm-line/50 space-y-1">
                <p className="text-xl">🎉</p>
                <p className="text-xs font-semibold text-cm-green">All caught up!</p>
                <p className="text-[11px] text-cm-muted">
                  No problems are due for spaced repetition today. Submit problems to schedule them!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {revisionQueue.map((entry) => {
                  const due = new Date(entry.nextReviewDate);
                  const isPast = due <= new Date();

                  return (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-lg bg-cm-surface/40 border border-cm-line/70 flex items-center justify-between gap-2 hover:border-cm-accent/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cm-card text-cm-accent border border-cm-line">
                            {entry.platform}
                          </span>
                          <span className="text-[10px] text-cm-muted">
                            Stage #{entry.reviewCount + 1}
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenProblem(entry.url)}
                          className="text-xs font-bold text-cm-text hover:text-cm-accent text-left truncate block w-full transition-colors"
                          title={entry.title}
                        >
                          {entry.title}
                        </button>
                        <span className="text-[10px] text-cm-muted">
                          {isPast ? "Overdue" : "Due today"}
                        </span>
                      </div>

                      <button
                        onClick={() => markReviewed(entry.id)}
                        className="cm-btn-primary text-[10px] py-1 px-2.5 shrink-0"
                        title="Mark reviewed to bump spaced repetition interval"
                      >
                        Reviewed ✓
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB TAB 2: SYSTEMATIC SOLVED HISTORY */}
      {subTab === "history" && (
        <div className="space-y-3">
          <div className="cm-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🏆</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
                  Systematic Solved History ({totalSolved})
                </h3>
              </div>
              <span className="cm-pill text-cm-green border-cm-green/40">SUBMISSIONS ONLY</span>
            </div>

            <p className="text-[11px] text-cm-muted leading-relaxed">
              Problems are permanently recorded here only when submitted and <strong>Accepted</strong> on LeetCode/Codeforces.
            </p>

            {solvedProblems.length === 0 ? (
              <div className="text-center py-6 bg-cm-surface/20 rounded-lg border border-cm-line/40 space-y-2">
                <p className="text-2xl">📝</p>
                <p className="text-xs font-semibold text-cm-text">No solved problems recorded yet.</p>
                <p className="text-[11px] text-cm-muted">
                  Submit code on LeetCode or Codeforces. When "Accepted" appears, it will automatically log here and enter your spaced repetition schedule.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {solvedProblems.map((prob) => (
                  <div
                    key={prob.problemId}
                    className="p-2.5 rounded-lg bg-cm-surface/30 border border-cm-line/60 flex items-center justify-between gap-2 hover:border-cm-green/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cm-card text-cm-green border border-cm-green/30">
                          {prob.platform}
                        </span>
                        <span className="text-[10px] text-cm-green font-semibold">
                          Accepted ✓
                        </span>
                        {prob.runtime && (
                          <span className="text-[9px] text-cm-muted font-mono">
                            {prob.runtime}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-cm-text truncate block">
                        {prob.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-cm-muted mt-0.5">
                        <span>Solved: {prob.solvedAt ? new Date(prob.solvedAt).toLocaleDateString() : "Recent"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In-Progress Problems (Attempted but not yet Accepted) */}
          {inProgressProblems.length > 0 && (
            <div className="cm-card space-y-2.5 bg-cm-card/60">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-cm-muted uppercase tracking-wider">
                  In Progress / Attempted ({inProgressProblems.length})
                </h4>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {inProgressProblems.map((prob) => (
                  <div
                    key={prob.problemId}
                    className="p-2 rounded-lg bg-cm-surface/20 flex items-center justify-between text-xs"
                  >
                    <span className="truncate text-cm-text/80 font-medium">{prob.title}</span>
                    <span className="text-[10px] text-cm-orange font-semibold shrink-0">In Progress</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB TAB 3: ANALYTICS & STATS */}
      {subTab === "stats" && (
        <div className="space-y-3">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="cm-card space-y-1 p-3">
              <span className="text-[10px] font-bold text-cm-muted uppercase tracking-wider">
                Problems Solved
              </span>
              <p className="text-2xl font-extrabold text-cm-green">{totalSolved}</p>
              <span className="text-[10px] text-cm-muted">
                {totalAttempted} total encountered
              </span>
            </div>

            <div className="cm-card space-y-1 p-3">
              <span className="text-[10px] font-bold text-cm-muted uppercase tracking-wider">
                Due for Review
              </span>
              <p className="text-2xl font-extrabold text-cm-accent">{revisionQueue.length}</p>
              <span className="text-[10px] text-cm-muted">
                {totalWithNotes} with personal notes
              </span>
            </div>
          </div>

          {/* Platform Balance */}
          <div className="cm-card space-y-2 p-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-cm-text">Platform Distribution</span>
              <span className="text-[11px] text-cm-muted font-mono">
                {lcCount} LC · {cfCount} CF
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-cm-surface overflow-hidden flex">
              <div
                style={{ width: `${lcPercent}%` }}
                className="bg-cm-accent transition-all duration-500"
                title={`LeetCode: ${lcPercent}%`}
              />
              <div
                style={{ width: `${100 - lcPercent}%` }}
                className="bg-cm-green transition-all duration-500"
                title={`Codeforces: ${100 - lcPercent}%`}
              />
            </div>

            <div className="flex justify-between text-[10px] text-cm-muted pt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cm-accent inline-block" /> LeetCode ({lcPercent}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cm-green inline-block" /> Codeforces ({100 - lcPercent}%)
              </span>
            </div>
          </div>

          {/* Top Topics / Tags */}
          {sortedTags.length > 0 && (
            <div className="cm-card space-y-2.5 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
                Top Problem Topics
              </h3>
              <div className="space-y-1.5">
                {sortedTags.map(([tag, count]) => {
                  const pct = Math.round((count / maxTagCount) * 100);
                  return (
                    <div key={tag} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-cm-text/90 font-medium">{tag}</span>
                        <span className="text-cm-muted font-mono">{count}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-cm-surface overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-cm-accent2 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hint Level Dependence */}
          <div className="cm-card space-y-2 p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
              Hint Progression Dependence
            </h3>
            <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
              <div className="bg-cm-surface/40 p-2 rounded-lg border border-cm-line/50">
                <span className="text-xs font-bold text-cm-green block">{hintCounts[1]}</span>
                <span className="text-[9px] text-cm-muted">L1 Direction</span>
              </div>
              <div className="bg-cm-surface/40 p-2 rounded-lg border border-cm-line/50">
                <span className="text-xs font-bold text-cm-accent block">{hintCounts[2]}</span>
                <span className="text-[9px] text-cm-muted">L2 Approach</span>
              </div>
              <div className="bg-cm-surface/40 p-2 rounded-lg border border-cm-line/50">
                <span className="text-xs font-bold text-cm-orange block">{hintCounts[3]}</span>
                <span className="text-[9px] text-cm-muted">L3 Details</span>
              </div>
              <div className="bg-cm-surface/40 p-2 rounded-lg border border-cm-line/50">
                <span className="text-xs font-bold text-cm-red block">{hintCounts[4]}</span>
                <span className="text-[9px] text-cm-muted">L4 Complexity</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
