import React, { useState } from "react";
import type { NotebookEntry, ProblemContext } from "@/types";
import type { useNotebook } from "@/sidepanel/hooks";
import {
  generateAnkiTsv,
  generateObsidianMarkdown,
  generateObsidianZip,
  sanitizeFilename,
} from "@/sidepanel/services/export-service";

interface Props {
  notebook: ReturnType<typeof useNotebook>;
  context: ProblemContext | null;
}

export function NotebookPage({ notebook, context }: Props) {
  const {
    currentEntry,
    setCurrentEntry,
    allEntries,
    searchQuery,
    setSearchQuery,
    statusMessage,
    loading,
    save,
    remove,
    clearAll,
    doExport,
    doImport,
  } = notebook;

  const [activeTab, setActiveTab] = useState<"current" | "library">("current");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Multi-selection state for Library view
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"anki" | "obsidian" | "json">("anki");
  const [ankiCardType, setAnkiCardType] = useState<"split" | "comprehensive">("split");
  const [ankiDeckName, setAnkiDeckName] = useState("CodeMate::CompetitiveProgramming");
  const [obsidianIncludeIndex, setObsidianIncludeIndex] = useState(true);
  const [exportScope, setExportScope] = useState<"selected" | "all" | "current">("all");
  const [exportSuccessMessage, setExportSuccessMessage] = useState("");

  // Local state for current entry editing
  const [approach, setApproach] = useState(currentEntry?.approach || "");
  const [mistakes, setMistakes] = useState(currentEntry?.mistakes || "");
  const [observations, setObservations] = useState(currentEntry?.observations || "");
  const [complexityNotes, setComplexityNotes] = useState(currentEntry?.complexityNotes || "");
  const [reviewStatus, setReviewStatus] = useState<NotebookEntry["reviewStatus"]>(
    currentEntry?.reviewStatus || "new"
  );

  // Sync state if currentEntry changes
  React.useEffect(() => {
    if (currentEntry) {
      setApproach(currentEntry.approach || "");
      setMistakes(currentEntry.mistakes || "");
      setObservations(currentEntry.observations || "");
      setComplexityNotes(currentEntry.complexityNotes || "");
      setReviewStatus(currentEntry.reviewStatus || "new");
    }
  }, [currentEntry?.id]);

  const handleSave = async () => {
    if (!currentEntry) return;

    const updated: NotebookEntry = {
      ...currentEntry,
      approach,
      mistakes,
      observations,
      complexityNotes,
      reviewStatus,
      updatedAt: new Date().toISOString(),
    };

    await save(updated);
  };

  // Helper to trigger browser file download
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Quick export single entry to Anki
  const handleQuickExportAnki = (entry: NotebookEntry) => {
    const tsv = generateAnkiTsv([entry], { cardType: "split", deckName: ankiDeckName });
    const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8" });
    const filename = `${sanitizeFilename(entry.title || "note")}-anki.tsv`;
    triggerDownload(blob, filename);
    flashExport(`Exported Anki TSV: ${filename}`);
  };

  // Quick export single entry to Obsidian
  const handleQuickExportObsidian = (entry: NotebookEntry) => {
    const md = generateObsidianMarkdown(entry);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const filename = `${sanitizeFilename(entry.title || "note")}.md`;
    triggerDownload(blob, filename);
    flashExport(`Exported Obsidian Markdown: ${filename}`);
  };

  // Bulk or targeted export execution
  const executeExport = async () => {
    let targetEntries: NotebookEntry[] = [];

    if (exportScope === "current" && currentEntry) {
      targetEntries = [currentEntry];
    } else if (exportScope === "selected") {
      targetEntries = allEntries.filter((e) => selectedIds.has(e.id));
      if (targetEntries.length === 0) {
        targetEntries = allEntries;
      }
    } else {
      targetEntries = allEntries;
    }

    if (targetEntries.length === 0) {
      alert("No notes available to export.");
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    if (exportFormat === "anki") {
      const tsv = generateAnkiTsv(targetEntries, {
        cardType: ankiCardType,
        deckName: ankiDeckName.trim() || "CodeMate::CompetitiveProgramming",
      });
      const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8" });
      const filename = `codemate-anki-cards-${timestamp}.tsv`;
      triggerDownload(blob, filename);
      flashExport(`Exported ${targetEntries.length} notes to Anki TSV!`);
      setShowExportModal(false);
    } else if (exportFormat === "obsidian") {
      if (targetEntries.length === 1) {
        handleQuickExportObsidian(targetEntries[0]);
        setShowExportModal(false);
      } else {
        const zipBlob = await generateObsidianZip(targetEntries, {
          includeIndex: obsidianIncludeIndex,
        });
        const filename = `codemate-obsidian-vault-${timestamp}.zip`;
        triggerDownload(zipBlob, filename);
        flashExport(`Exported ${targetEntries.length} notes into Obsidian ZIP!`);
        setShowExportModal(false);
      }
    } else if (exportFormat === "json") {
      const jsonStr = JSON.stringify({ version: 1, entries: targetEntries }, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const filename = `codemate-notes-backup-${timestamp}.json`;
      triggerDownload(blob, filename);
      flashExport(`Exported ${targetEntries.length} notes to JSON!`);
      setShowExportModal(false);
    }
  };

  const flashExport = (msg: string) => {
    setExportSuccessMessage(msg);
    setTimeout(() => setExportSuccessMessage(""), 4000);
  };

  const handleImportSubmit = async () => {
    if (!importJsonText.trim()) return;
    await doImport(importJsonText);
    setImportJsonText("");
    setShowImportModal(false);
  };

  // Toggle selection for single entry
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map((e) => e.id)));
    }
  };

  const filteredList = allEntries.filter((item) => {
    if (platformFilter === "all") return true;
    return item.platform.toLowerCase() === platformFilter.toLowerCase();
  });

  return (
    <div className="animate-fade-in space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex items-center justify-between border-b border-cm-line pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("current")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "current"
                ? "bg-cm-surface text-cm-text border border-cm-line shadow-sm"
                : "text-cm-muted hover:text-cm-text"
            }`}
          >
            Current Problem Note
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "library"
                ? "bg-cm-surface text-cm-text border border-cm-line shadow-sm"
                : "text-cm-muted hover:text-cm-text"
            }`}
          >
            All Notes ({allEntries.length})
          </button>
        </div>

        {(statusMessage || exportSuccessMessage) && (
          <span className="text-xs font-semibold text-cm-green animate-fade-in">
            {exportSuccessMessage || statusMessage}
          </span>
        )}
      </div>

      {activeTab === "current" ? (
        currentEntry ? (
          <div className="space-y-4">
            {/* Note Header Details */}
            <div className="cm-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="cm-pill">{currentEntry.platform.toUpperCase()}</span>
                <span className="text-[10px] text-cm-muted">
                  Next Review: {currentEntry.nextReviewDate ? new Date(currentEntry.nextReviewDate).toLocaleDateString() : "Not scheduled"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-cm-text">{currentEntry.title}</h3>

              {currentEntry.tags && currentEntry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {currentEntry.tags.map((tag, i) => (
                    <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-cm-surface text-cm-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick-Fill Templates Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[10px] text-cm-muted font-bold uppercase tracking-wider shrink-0">
                ⚡ Quick Fill:
              </span>
              <button
                type="button"
                onClick={() => {
                  setObservations("• Invariant: Monotonicity allows binary search on answer space.\n• State depends only on previous row.");
                  setMistakes("• Integer overflow on 1LL * a * b.\n• Check bounds when N=1.");
                  setComplexityNotes("• Time: O(N log N)\n• Space: O(1) auxiliary");
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-cm-surface hover:bg-cm-accent2/20 text-cm-accent border border-cm-line whitespace-nowrap cursor-pointer transition-colors"
              >
                Binary Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setObservations("• Subproblem overlap: dp[i] depends on max dp[j] where j < i.\n• Base case: dp[0] = 0.");
                  setMistakes("• Off-by-one on array length.\n• Forgot modulo on intermediate sum.");
                  setComplexityNotes("• Time: O(N²)\n• Space: O(N)");
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-cm-surface hover:bg-cm-accent2/20 text-cm-accent border border-cm-line whitespace-nowrap cursor-pointer transition-colors"
              >
                Dynamic Prog
              </button>
              <button
                type="button"
                onClick={() => {
                  setObservations("• Window invariant: maintain valid frequency in [L, R].\n• Shrink left pointer when condition violated.");
                  setMistakes("• Decrementing count before checking boundary.");
                  setComplexityNotes("• Time: O(N)\n• Space: O(K)");
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-cm-surface hover:bg-cm-accent2/20 text-cm-accent border border-cm-line whitespace-nowrap cursor-pointer transition-colors"
              >
                Two Pointers
              </button>
            </div>

            {/* Note Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-cm-muted block mb-1">
                  Key Observations & Invariants
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="What key realization made this solvable? e.g. Monotonic answer space allows binary search..."
                  rows={3}
                  className="cm-textarea text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-cm-muted block mb-1">
                  Algorithmic Approach & Formulation
                </label>
                <textarea
                  value={approach}
                  onChange={(e) => setApproach(e.target.value)}
                  placeholder="Outline the algorithm step-by-step: states, base cases, data structures used..."
                  rows={3}
                  className="cm-textarea text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-cm-muted block mb-1">
                  Mistakes Made & Pitfalls Encountered
                </label>
                <textarea
                  value={mistakes}
                  onChange={(e) => setMistakes(e.target.value)}
                  placeholder="What caused Wrong Answer or TLE? e.g. Integer overflow on 10^9 multiplication, missed N=1 boundary..."
                  rows={2}
                  className="cm-textarea text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-cm-muted block mb-1">
                  Complexity Notes
                </label>
                <textarea
                  value={complexityNotes}
                  onChange={(e) => setComplexityNotes(e.target.value)}
                  placeholder="Time Complexity: O(N log N), Space Complexity: O(N)..."
                  rows={2}
                  className="cm-textarea text-xs"
                />
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cm-muted">Status:</span>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as NotebookEntry["reviewStatus"])}
                    className="bg-cm-card border border-cm-line text-cm-text text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="new">New</option>
                    <option value="learning">Learning</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="mastered">Mastered</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => remove(currentEntry.id)}
                    className="cm-btn-ghost text-xs text-cm-red hover:bg-red-500/10 px-3 py-1.5"
                  >
                    Delete Note
                  </button>
                  <button
                    onClick={handleSave}
                    className="cm-btn-primary text-xs px-4 py-1.5 shadow-md shadow-cm-accent2/20"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* Direct Export Strip for Current Note */}
              <div className="p-2.5 rounded-xl bg-cm-surface/30 border border-cm-line/50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-cm-muted flex items-center gap-1.5">
                  <span>🚀</span> Export Current Note:
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickExportAnki(currentEntry)}
                    className="px-2.5 py-1 rounded bg-cm-surface hover:bg-cm-accent2/20 text-cm-accent text-[11px] font-semibold border border-cm-line transition-colors flex items-center gap-1"
                    title="Export as Anki flashcards TSV"
                  >
                    <span>📇</span> Anki (.tsv)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExportObsidian(currentEntry)}
                    className="px-2.5 py-1 rounded bg-cm-surface hover:bg-cm-accent2/20 text-cm-accent text-[11px] font-semibold border border-cm-line transition-colors flex items-center gap-1"
                    title="Export as Obsidian Markdown (.md)"
                  >
                    <span>💎</span> Obsidian (.md)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="cm-card text-center py-8">
            <p className="text-3xl mb-3">📝</p>
            <p className="text-cm-muted text-sm mb-2">
              No problem currently open to take notes for.
            </p>
            <p className="text-[11px] text-cm-muted">
              Navigate to a LeetCode or Codeforces problem, or browse your saved notes.
            </p>
          </div>
        )
      ) : (
        /* Library Tab */
        <div className="space-y-3">
          {/* Controls: Search, Platform Filter, Import/Export */}
          <div className="space-y-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by title, tag, platform, or keyword..."
              className="cm-input text-xs"
            />

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <div className="flex gap-1.5">
                {(["all", "LeetCode", "Codeforces"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      platformFilter === p
                        ? "bg-cm-accent2 text-white"
                        : "bg-cm-card text-cm-muted hover:text-cm-text"
                    }`}
                  >
                    {p === "all" ? "All Platforms" : p}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setExportScope(selectedIds.size > 0 ? "selected" : "all");
                    setShowExportModal(true);
                  }}
                  className="cm-btn-primary text-[10px] py-1 px-2.5 flex items-center gap-1 font-bold"
                  title="Export notes to Anki, Obsidian, or JSON"
                >
                  <span>📤</span> Export {selectedIds.size > 0 ? `(${selectedIds.size})` : "All"}
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="cm-btn-secondary text-[10px] py-1 px-2"
                  title="Import notes from JSON backup"
                >
                  Import
                </button>
              </div>
            </div>

            {/* Select All Bar */}
            {filteredList.length > 0 && (
              <div className="flex items-center justify-between px-1 text-[11px] text-cm-muted">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredList.length}
                    onChange={toggleSelectAll}
                    className="rounded border-cm-line text-cm-accent2 focus:ring-0 cursor-pointer"
                  />
                  <span>Select all ({filteredList.length})</span>
                </label>
                {selectedIds.size > 0 && (
                  <span className="text-cm-accent font-semibold">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notes Cards List */}
          {loading ? (
            <div className="py-8 text-center text-xs text-cm-muted">Loading notes...</div>
          ) : filteredList.length === 0 ? (
            <div className="cm-card text-center py-8">
              <p className="text-cm-muted text-xs">
                {searchQuery ? "No notes matched your search query." : "No saved notes yet. Take notes on any problem to build your revision library."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredList.map((entry) => {
                const isSelected = selectedIds.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    className={`cm-card hover:border-cm-accent/40 transition-all cursor-pointer p-3 space-y-2 ${
                      isSelected ? "border-cm-accent bg-cm-accent2/10" : ""
                    }`}
                    onClick={() => {
                      setCurrentEntry(entry);
                      setActiveTab("current");
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(e) => toggleSelect(entry.id, e)}
                          onChange={() => {}}
                          className="rounded border-cm-line text-cm-accent2 focus:ring-0 cursor-pointer"
                        />
                        <span className="cm-pill">{entry.platform.toUpperCase()}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                          entry.reviewStatus === "mastered"
                            ? "bg-cm-green/20 text-cm-green"
                            : entry.reviewStatus === "reviewing"
                            ? "bg-cm-accent/20 text-cm-accent"
                            : "bg-cm-surface text-cm-muted"
                        }`}
                      >
                        {entry.reviewStatus}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-cm-text leading-snug">{entry.title}</h4>

                    {entry.observations && (
                      <p className="text-[11px] text-cm-muted line-clamp-2 leading-relaxed">
                        {entry.observations}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-cm-muted pt-1 border-t border-cm-line/50">
                      <span>
                        Review: {entry.nextReviewDate ? new Date(entry.nextReviewDate).toLocaleDateString() : "None"}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickExportAnki(entry);
                          }}
                          className="text-cm-accent hover:underline"
                          title="Export single Anki note"
                        >
                          Anki
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickExportObsidian(entry);
                          }}
                          className="text-cm-accent hover:underline"
                          title="Export single Obsidian note"
                        >
                          Obsidian
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(entry.id);
                          }}
                          className="text-cm-red hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {allEntries.length > 0 && (
            <div className="pt-2 flex justify-between items-center text-xs text-cm-muted">
              <span>{allEntries.length} total note entries saved</span>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-cm-red text-[11px] hover:underline"
              >
                Clear all notes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Export Hub Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cm-card border border-cm-line rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cm-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">📤</span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Export Problem Notes
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-cm-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Scope Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-cm-muted block">Export Scope</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={`p-2 rounded-lg border font-semibold text-left transition-colors ${
                    exportScope === "all"
                      ? "border-cm-accent bg-cm-accent2/15 text-white"
                      : "border-cm-line bg-cm-surface/50 text-cm-muted hover:text-white"
                  }`}
                >
                  All Notes ({allEntries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope("selected")}
                  className={`p-2 rounded-lg border font-semibold text-left transition-colors ${
                    exportScope === "selected"
                      ? "border-cm-accent bg-cm-accent2/15 text-white"
                      : "border-cm-line bg-cm-surface/50 text-cm-muted hover:text-white"
                  }`}
                >
                  Selected Notes ({selectedIds.size})
                </button>
              </div>
            </div>

            {/* Format Selection Tabs */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-cm-muted block">Destination Format</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-cm-surface border border-cm-line text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setExportFormat("anki")}
                  className={`py-1.5 rounded-md transition-all ${
                    exportFormat === "anki"
                      ? "bg-cm-accent2 text-white shadow"
                      : "text-cm-muted hover:text-white"
                  }`}
                >
                  📇 Anki Flashcards
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("obsidian")}
                  className={`py-1.5 rounded-md transition-all ${
                    exportFormat === "obsidian"
                      ? "bg-cm-accent2 text-white shadow"
                      : "text-cm-muted hover:text-white"
                  }`}
                >
                  💎 Obsidian Vault
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("json")}
                  className={`py-1.5 rounded-md transition-all ${
                    exportFormat === "json"
                      ? "bg-cm-accent2 text-white shadow"
                      : "text-cm-muted hover:text-white"
                  }`}
                >
                  📄 JSON Backup
                </button>
              </div>
            </div>

            {/* Format Specific Configuration */}
            {exportFormat === "anki" && (
              <div className="p-3 rounded-lg bg-cm-surface/30 border border-cm-line space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold text-cm-muted block mb-1">
                    Card Template Structure
                  </label>
                  <select
                    value={ankiCardType}
                    onChange={(e) => setAnkiCardType(e.target.value as "split" | "comprehensive")}
                    className="cm-input text-xs w-full"
                  >
                    <option value="split">
                      Split Cards (Separate Observation, Algorithm & Pitfall cards)
                    </option>
                    <option value="comprehensive">
                      Comprehensive Card (1 single card per problem with all notes)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-cm-muted block mb-1">
                    Target Anki Deck Name
                  </label>
                  <input
                    type="text"
                    value={ankiDeckName}
                    onChange={(e) => setAnkiDeckName(e.target.value)}
                    placeholder="CodeMate::CompetitiveProgramming"
                    className="cm-input text-xs font-mono w-full"
                  />
                </div>
                <p className="text-[10px] text-cm-muted leading-relaxed">
                  💡 Generates a TSV file with HTML styling, KaTeX math compatibility, and tags. Import via Anki: <strong>File → Import → select TSV</strong>.
                </p>
              </div>
            )}

            {exportFormat === "obsidian" && (
              <div className="p-3 rounded-lg bg-cm-surface/30 border border-cm-line space-y-2.5">
                <label className="flex items-center gap-2 text-xs text-cm-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={obsidianIncludeIndex}
                    onChange={(e) => setObsidianIncludeIndex(e.target.checked)}
                    className="rounded border-cm-line text-cm-accent2 focus:ring-0"
                  />
                  <span>Generate <code>00_Index.md</code> Table of Contents with wiki-links</span>
                </label>
                <p className="text-[10px] text-cm-muted leading-relaxed">
                  💎 Generates Markdown notes with YAML frontmatter (tags, platform, difficulty, review dates). Simply extract the downloaded ZIP into your Obsidian vault!
                </p>
              </div>
            )}

            {exportFormat === "json" && (
              <div className="p-3 rounded-lg bg-cm-surface/30 border border-cm-line text-[11px] text-cm-muted">
                Complete raw JSON export of your problem notes, attempt records, and revision schedules for full portability and backup.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="cm-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeExport}
                className="cm-btn-primary text-xs py-2 px-4 shadow-lg shadow-cm-accent2/25 font-bold flex items-center gap-1.5"
              >
                <span>💾</span> Download Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-cm-card border border-cm-line rounded-xl max-w-xs w-full p-4 space-y-3 shadow-2xl">
            <h4 className="text-xs font-bold text-cm-red">Clear All Notes?</h4>
            <p className="text-xs text-cm-muted">
              This action cannot be undone. All saved problem notes and revision schedules will be permanently deleted.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="cm-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await clearAll();
                  setShowClearConfirm(false);
                }}
                className="cm-btn-danger text-xs py-1.5 px-3"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-cm-card border border-cm-line rounded-xl max-w-sm w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-cm-text">Import Notes Backup</h4>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-cm-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste exported JSON content here..."
              rows={6}
              className="cm-textarea text-xs font-mono"
            />
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setShowImportModal(false)}
                className="cm-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!importJsonText.trim()}
                className="cm-btn-primary text-xs py-1.5 px-3"
              >
                Import Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
