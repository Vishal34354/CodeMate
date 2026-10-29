import React, { useState } from "react";
import type { HintState, HintLevel } from "@/types";

interface Props {
  hintState: HintState;
  onRevealLevel: (level: HintLevel) => void;
  onReset: () => void;
  hasProblem: boolean;
}

const LEVEL_LABELS: Record<HintLevel, { name: string; subtitle: string; icon: string }> = {
  1: { name: "Direction", subtitle: "Problem category & mental model", icon: "🧭" },
  2: { name: "Approach", subtitle: "Core invariant & technique", icon: "🔧" },
  3: { name: "Structure", subtitle: "State transitions & data structures", icon: "⚙️" },
  4: { name: "Complexity", subtitle: "Exact bounds & boundary constraints", icon: "📊" },
};

export function HintsPage({ hintState, onRevealLevel, onReset, hasProblem }: Props) {
  const { currentLevel, hints, unlockedLevels } = hintState;
  const currentHint = hints[currentLevel - 1];
  const canAdvance = currentLevel < 4;
  const nextLevel = Math.min(4, currentLevel + 1) as HintLevel;
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!hasProblem) {
    return (
      <div className="animate-fade-in">
        <div className="cm-card text-center py-10 space-y-3 border-dashed border-cm-line/80">
          <div className="w-12 h-12 rounded-2xl bg-cm-surface flex items-center justify-center mx-auto text-2xl shadow-inner">
            🧭
          </div>
          <div>
            <h3 className="text-sm font-bold text-cm-text">No Problem Active</h3>
            <p className="text-cm-muted text-xs mt-1 max-w-xs mx-auto">
              Open a problem on LeetCode or Codeforces to unlock step-by-step Socratic hints.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleCopyHint = async () => {
    if (!currentHint) return;
    try {
      await navigator.clipboard.writeText(currentHint.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleFeedback = (type: string) => {
    setFeedback(type);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header & Reset */}
      <div className="flex justify-between items-center bg-gradient-to-r from-cm-card to-cm-card2 p-3 rounded-xl border border-cm-line/70">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🎯</span>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Socratic Hint Ladder
            </h2>
          </div>
          <p className="text-[11px] text-cm-muted mt-0.5">
            Level {currentLevel} of 4 unlocked · Reveal gradually without spoiling
          </p>
        </div>
        <button
          onClick={onReset}
          className="cm-btn-secondary text-[10px] px-2.5 py-1 flex items-center gap-1 rounded-md"
          title="Reset hints to level 1"
        >
          <span>↻</span> Reset
        </button>
      </div>

      {/* Visual Stepper Bar */}
      <div className="grid grid-cols-4 gap-1.5">
        {([1, 2, 3, 4] as HintLevel[]).map((level) => {
          const isUnlocked = unlockedLevels.includes(level);
          const isActive = currentLevel === level;
          const info = LEVEL_LABELS[level];

          return (
            <button
              key={level}
              onClick={() => {
                if (isUnlocked || level === nextLevel) {
                  onRevealLevel(level);
                }
              }}
              disabled={!isUnlocked && level !== nextLevel}
              className={`p-2 rounded-xl text-left transition-all duration-200 border cursor-pointer select-none relative ${
                isActive
                  ? "bg-gradient-to-b from-cm-accent2/25 to-cm-card border-cm-accent shadow-md shadow-cm-accent2/15 scale-[1.02]"
                  : isUnlocked
                    ? "bg-cm-card/90 border-cm-line hover:border-cm-accent/40 text-cm-muted"
                    : "bg-cm-bg/40 border-cm-line/30 opacity-40 cursor-not-allowed text-cm-muted/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs">{info.icon}</span>
                <span className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded ${
                  isActive ? "bg-cm-accent text-white" : isUnlocked ? "bg-cm-surface text-cm-accent" : "text-cm-muted"
                }`}>
                  L{level}
                </span>
              </div>
              <div className="mt-1 font-bold text-[11px] truncate text-white/90">
                {info.name}
              </div>
              <div className="text-[8px] text-cm-muted truncate hidden sm:block">
                {isUnlocked ? "Unlocked" : "Locked"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Hint Card */}
      <div className="cm-card border-cm-accent2/40 bg-gradient-to-b from-cm-card to-[#0d1424] space-y-3 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cm-accent2 via-cm-accent to-cm-green" />

        <div className="flex items-center justify-between pb-2 border-b border-cm-line/60">
          <div className="flex items-center gap-2">
            <span className="text-base">{LEVEL_LABELS[currentLevel].icon}</span>
            <div>
              <span className="text-[10px] font-bold text-cm-accent uppercase tracking-wider block">
                Level {currentLevel}: {LEVEL_LABELS[currentLevel].name}
              </span>
              <span className="text-[10px] text-cm-muted block">
                {LEVEL_LABELS[currentLevel].subtitle}
              </span>
            </div>
          </div>

          <button
            onClick={handleCopyHint}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 ${
              copied
                ? "bg-cm-green/20 text-cm-green border-cm-green/50"
                : "bg-cm-surface hover:bg-cm-surface/80 text-cm-muted hover:text-white border-cm-line"
            }`}
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
        </div>

        {/* Hint Content */}
        <div className="text-xs leading-relaxed text-cm-text/95 font-sans bg-cm-bg/70 p-3.5 rounded-xl border border-cm-line/60 min-h-[70px]">
          {currentHint ? currentHint.content : "Click a level button to inspect hint."}
        </div>

        {/* Hint Utility Actions & Feedback */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[10px] text-cm-muted">
            <span>Did this nudge help?</span>
            <button
              onClick={() => handleFeedback("helped")}
              className="px-2 py-0.5 rounded bg-cm-surface hover:bg-cm-green/20 hover:text-cm-green border border-cm-line transition-colors"
            >
              👍 Yes
            </button>
            <button
              onClick={() => handleFeedback("spoiled")}
              className="px-2 py-0.5 rounded bg-cm-surface hover:bg-cm-red/20 hover:text-cm-red border border-cm-line transition-colors"
            >
              👎 Too much
            </button>
            {feedback && (
              <span className="text-cm-green text-[10px] font-bold animate-fade-in">
                Feedback noted ✓
              </span>
            )}
          </div>

          <span className="text-[9px] text-cm-muted font-mono">
            {currentLevel}/4 levels
          </span>
        </div>
      </div>

      {/* Reveal Next Hint Button */}
      {canAdvance ? (
        <button
          onClick={() => onRevealLevel(nextLevel)}
          className="w-full cm-btn-primary py-2.5 text-xs font-bold shadow-lg shadow-cm-accent2/25 flex items-center justify-center gap-2"
        >
          <span>Need more help? Reveal Level {nextLevel}: {LEVEL_LABELS[nextLevel].name}</span>
          <span>→</span>
        </button>
      ) : (
        <div className="p-2.5 rounded-xl bg-cm-surface/30 border border-cm-line/50 text-center text-xs text-cm-muted">
          🎉 You've unlocked all 4 progressive hints for this problem!
        </div>
      )}

      {/* Unlocked History Carousel/List */}
      {unlockedLevels.length > 1 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cm-muted block">
            Previously Unlocked Clues
          </span>
          <div className="space-y-1.5">
            {unlockedLevels
              .filter((lvl) => lvl !== currentLevel)
              .map((lvl) => (
                <div
                  key={lvl}
                  onClick={() => onRevealLevel(lvl)}
                  className="p-2 rounded-lg bg-cm-surface/20 hover:bg-cm-surface/50 border border-cm-line/40 flex items-center justify-between cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{LEVEL_LABELS[lvl].icon}</span>
                    <span className="text-[11px] font-medium text-cm-text/80">
                      Level {lvl} ({LEVEL_LABELS[lvl].name})
                    </span>
                  </div>
                  <span className="text-[10px] text-cm-accent font-semibold">Review ↗</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
