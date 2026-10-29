import React from "react";
import type { SidePanelTab } from "@/types";

interface Props {
  activeTab: SidePanelTab;
  onSelectTab: (tab: SidePanelTab) => void;
  queueCount?: number;
}

interface TabItem {
  id: SidePanelTab;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: "problem", label: "Problem", icon: "📄" },
  { id: "hints", label: "Hints", icon: "🧭" },
  { id: "explain", label: "Explain", icon: "💡" },
  { id: "debug", label: "Debug", icon: "🔬" },
  { id: "notebook", label: "Notes", icon: "📝" },
  { id: "progress", label: "SRS", icon: "📈" },
  { id: "settings", label: "Config", icon: "⚙️" },
];

export function Navigation({ activeTab, onSelectTab, queueCount = 0 }: Props) {
  return (
    <nav className="sticky top-[53px] z-30 bg-cm-bg/95 backdrop-blur-md px-3 py-2 border-b border-cm-line">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === "progress" && queueCount > 0;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer select-none border-0 ${
                isActive
                  ? "bg-cm-surface text-white shadow-sm border border-cm-line"
                  : "bg-transparent text-cm-muted hover:text-cm-text hover:bg-cm-surface/50"
              }`}
            >
              <span className="text-xs">{tab.icon}</span>
              <span>{tab.label}</span>
              {showBadge && (
                <span className="w-4 h-4 rounded-full bg-cm-orange text-black text-[9px] font-black flex items-center justify-center -ml-0.5">
                  {queueCount > 9 ? "9+" : queueCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
