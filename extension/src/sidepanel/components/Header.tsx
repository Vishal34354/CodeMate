import React from "react";
import type { ProblemContext } from "@/types";

interface Props {
  context: ProblemContext | null;
  loading: boolean;
  onRefresh: () => void;
}

export function Header({ context, loading, onRefresh }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-cm-bg/90 backdrop-blur-md border-b border-cm-line px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cm-accent2 to-cm-accent flex items-center justify-center shadow-md shadow-cm-accent2/20">
          <span className="text-white text-xs font-black">C</span>
        </div>
        <div>
          <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5 leading-none">
            CodeMate
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cm-surface text-cm-accent border border-cm-line font-mono">
              v1.0
            </span>
          </h1>
          <span className="text-[10px] text-cm-muted block mt-0.5 font-medium">
            CP Learning Companion
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {context?.platform && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cm-surface text-cm-text border border-cm-line flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cm-green animate-pulse" />
            {context.platform}
          </span>
        )}

        <button
          onClick={onRefresh}
          disabled={loading}
          className="cm-btn-secondary p-1.5 text-xs rounded-lg hover:border-cm-accent transition-all"
          title="Extract current page context"
        >
          <span className={`inline-block ${loading ? "animate-spin" : ""}`}>
            🔄
          </span>
        </button>
      </div>
    </header>
  );
}
