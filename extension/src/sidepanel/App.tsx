import React, { useState, useEffect } from "react";
import {
  useProblemContext,
  useHints,
  useNotebook,
  useProgress,
  useSettings,
  useActiveTab,
} from "@/sidepanel/hooks";
import { Header } from "@/sidepanel/components/Header";
import { Navigation } from "@/sidepanel/components/Navigation";
import { ProblemPage } from "@/sidepanel/pages/ProblemPage";
import { HintsPage } from "@/sidepanel/pages/HintsPage";
import { ExplainPage } from "@/sidepanel/pages/ExplainPage";
import { DebugPage } from "@/sidepanel/pages/DebugPage";
import { NotebookPage } from "@/sidepanel/pages/NotebookPage";
import { ProgressPage } from "@/sidepanel/pages/ProgressPage";
import { SettingsPage } from "@/sidepanel/pages/SettingsPage";

export function App() {
  const { context, loading: contextLoading, error: contextError, loadContext, markCurrentAccepted } = useProblemContext();
  const { hintState, revealLevel, resetHints } = useHints(context);
  const notebook = useNotebook(context);
  const progressData = useProgress();
  const { settings, updateSettings } = useSettings();
  const { activeTab, setActiveTab } = useActiveTab();

  // Manual fallback inputs (persisted across tab changes in side panel)
  const [manualStatement, setManualStatement] = useState("");
  const [manualCode, setManualCode] = useState("");

  // Load context on initial mount
  useEffect(() => {
    loadContext();
  }, [loadContext]);

  // Keep manual inputs updated if context arrives
  useEffect(() => {
    if (context?.statement && !manualStatement) {
      setManualStatement(context.statement);
    }
    if (context?.editorCode && !manualCode) {
      setManualCode(context.editorCode);
    }
  }, [context]);

  return (
    <div className="min-h-screen bg-cm-bg text-cm-text font-sans flex flex-col selection:bg-cm-accent2/30">
      <Header
        context={context}
        loading={contextLoading}
        onRefresh={loadContext}
      />

      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        queueCount={progressData.revisionQueue.length}
      />

      <main className="flex-1 p-3 pb-8 max-w-md mx-auto w-full">
        {activeTab === "problem" && (
          <ProblemPage
            context={context}
            loading={contextLoading}
            error={contextError}
            onRefresh={loadContext}
            onMarkAccepted={markCurrentAccepted}
            manualStatement={manualStatement}
            setManualStatement={setManualStatement}
            manualCode={manualCode}
            setManualCode={setManualCode}
          />
        )}

        {activeTab === "hints" && (
          <HintsPage
            hintState={hintState}
            onRevealLevel={revealLevel}
            onReset={resetHints}
            hasProblem={Boolean(context?.problemId || manualStatement)}
          />
        )}

        {activeTab === "explain" && (
          <ExplainPage
            context={context}
            settings={settings}
            onNavigateToSettings={() => setActiveTab("settings")}
          />
        )}

        {activeTab === "debug" && (
          <DebugPage
            context={context}
            settings={settings}
            onNavigateToSettings={() => setActiveTab("settings")}
            manualCode={manualCode}
            setManualCode={setManualCode}
          />
        )}

        {activeTab === "notebook" && (
          <NotebookPage
            notebook={notebook}
            context={context}
          />
        )}

        {activeTab === "progress" && (
          <ProgressPage
            progressData={progressData}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPage
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        )}
      </main>
    </div>
  );
}
