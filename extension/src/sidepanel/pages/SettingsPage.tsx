import React, { useState } from "react";
import type { Settings } from "@/types";
import { checkBackendHealth } from "@/sidepanel/services/ai-service";
import { clearAllNotes } from "@/storage";

interface Props {
  settings: Settings;
  onUpdateSettings: (updates: Partial<Settings>) => Promise<void>;
}

export function SettingsPage({ settings, onUpdateSettings }: Props) {
  const [backendUrl, setBackendUrl] = useState(settings.backendUrl || "http://localhost:3001");
  const [apiKey, setApiKey] = useState(settings.apiKey || "");
  const [healthStatus, setHealthStatus] = useState<"idle" | "checking" | "online" | "offline">("idle");
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleToggleAi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    await onUpdateSettings({ aiEnabled: enabled });
    flashSaved();
  };

  const handleToggleConsent = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const consented = e.target.checked;
    await onUpdateSettings({ aiConsented: consented });
    flashSaved();
  };

  const handleToggleAutoExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const auto = e.target.checked;
    await onUpdateSettings({ autoExtract: auto });
    flashSaved();
  };

  const handleSaveUrl = async () => {
    await onUpdateSettings({ backendUrl: backendUrl.trim() });
    flashSaved();
  };

  const handleSaveApiKey = async () => {
    await onUpdateSettings({ apiKey: apiKey.trim() });
    flashSaved("API Key saved ✓");
  };

  const handleTestBackend = async () => {
    setHealthStatus("checking");
    const ok = await checkBackendHealth(backendUrl.trim());
    setHealthStatus(ok ? "online" : "offline");
  };

  const handleClearAllStorage = async () => {
    await clearAllNotes();
    try {
      await chrome.storage.local.clear();
    } catch {
      // fallback
    }
    setShowClearConfirm(false);
    flashSaved("All local storage data reset ✓");
    setTimeout(() => window.location.reload(), 1000);
  };

  const flashSaved = (msg = "Settings saved ✓") => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(""), 2500);
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-cm-text">Configuration & Settings</h2>
          <p className="text-[11px] text-cm-muted">
            Manage your AI connection, heuristics, and privacy preferences.
          </p>
        </div>
        {saveStatus && (
          <span className="text-xs font-semibold text-cm-green animate-fade-in">
            {saveStatus}
          </span>
        )}
      </div>

      {/* AI Assistant Configuration */}
      <div className="cm-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
              AI Assistant Integration
            </h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.aiEnabled}
              onChange={handleToggleAi}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-cm-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cm-accent2"></div>
          </label>
        </div>

        <p className="text-xs text-cm-muted leading-relaxed">
          Enable optional LLM integration for Socratic explanations, logic diagnoses, and dynamic hinting.
        </p>

        {settings.aiEnabled && (
          <div className="space-y-3 pt-2 border-t border-cm-line/50 animate-fade-in">
            {/* Consent Agreement */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-cm-surface/40 border border-cm-line/60 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={settings.aiConsented}
                onChange={handleToggleConsent}
                className="mt-0.5 accent-cm-accent2 rounded cursor-pointer"
              />
              <span className="text-cm-text/90 leading-relaxed text-[11px]">
                <strong className="text-white block mb-0.5">Privacy & Explicit Consent</strong>
                I authorize CodeMate to send problem metadata and active code snippets to my private backend server only upon clicking an action button. No cookies or account tokens will ever be transmitted.
              </span>
            </label>

            {/* Direct Gemini API Key (Serverless Mode) */}
            <div className="space-y-1.5 p-3 rounded-lg bg-gradient-to-r from-cm-surface/60 to-cm-card border border-cm-accent2/30">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-cm-text flex items-center gap-1.5">
                  <span>✨</span> Direct Gemini API Key (Zero Setup / Serverless)
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cm-accent hover:underline font-semibold"
                >
                  Get free key ↗
                </a>
              </div>
              <p className="text-[10px] text-cm-muted leading-tight">
                Enter your free Google Gemini API key to run without running a local backend server.
              </p>
              <div className="flex gap-2 pt-1">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="cm-input text-xs font-mono flex-1"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="cm-btn-primary text-xs px-3 py-1.5"
                >
                  Save Key
                </button>
              </div>

              {/* Model selection */}
              <div className="flex items-center justify-between pt-1 text-[10px]">
                <span className="text-cm-muted font-medium">Model:</span>
                <select
                  value={settings.model || "gemini-2.0-flash"}
                  onChange={(e) => onUpdateSettings({ model: e.target.value })}
                  className="bg-cm-surface border border-cm-line text-cm-text text-[11px] rounded px-2 py-0.5 outline-none cursor-pointer font-mono"
                >
                  <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended / Fast)</option>
                  <option value="gemini-flash-lite-latest">gemini-flash-lite-latest</option>
                  <option value="gemini-1.5-flash-latest">gemini-1.5-flash-latest</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Reasoning)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 border-t border-cm-line/40" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-cm-muted">
                or use local backend
              </span>
              <div className="flex-1 border-t border-cm-line/40" />
            </div>

            {/* Backend URL Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-cm-muted block">
                Backend Server Endpoint URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="http://localhost:3001"
                  className="cm-input text-xs font-mono flex-1"
                />
                <button
                  onClick={handleSaveUrl}
                  className="cm-btn-secondary text-xs px-3 py-1.5"
                >
                  Save URL
                </button>
              </div>
            </div>

            {/* Health Test */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-cm-surface/20 border border-cm-line/40">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestBackend}
                  disabled={healthStatus === "checking"}
                  className="cm-btn-secondary text-[11px] py-1 px-2.5"
                >
                  {healthStatus === "checking" ? "Testing..." : "Test Connection"}
                </button>
                <span className="text-[11px] text-cm-muted">
                  GET {backendUrl}/health
                </span>
              </div>

              {healthStatus === "online" && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cm-green">
                  <span className="w-2 h-2 rounded-full bg-cm-green inline-block animate-pulse" />
                  Online
                </span>
              )}
              {healthStatus === "offline" && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cm-red">
                  <span className="w-2 h-2 rounded-full bg-cm-red inline-block" />
                  Unreachable
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Auto-Extract Setting */}
      <div className="cm-card space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
              Auto Context Detection
            </h3>
            <p className="text-[11px] text-cm-muted">
              Automatically extract problem statements when navigating problem pages.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoExtract}
              onChange={handleToggleAutoExtract}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-cm-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cm-accent2"></div>
          </label>
        </div>
      </div>

      {/* Data Management & Privacy */}
      <div className="cm-card space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cm-text">
          Local Storage & Data Privacy
        </h3>
        <p className="text-[11px] text-cm-muted leading-relaxed">
          CodeMate stores all your notes, revision queues, and problem stats inside your browser's private <code className="text-cm-accent font-mono text-[10px]">chrome.storage.local</code>. No telemetry or analytics are collected.
        </p>
        <div className="pt-1">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="cm-btn-danger text-xs py-1.5 px-3"
          >
            Clear All Local Storage Data
          </button>
        </div>
      </div>

      {/* About Box */}
      <div className="cm-card space-y-1.5 bg-cm-card/50">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-cm-text">CodeMate</span>
          <span className="cm-pill">v1.0.0 · MV3</span>
        </div>
        <p className="text-[11px] text-cm-muted leading-relaxed">
          The Competitive Programming Companion for LeetCode & Codeforces. Built for Chrome Side Panel with progressive hints, spaced repetition, and heuristic code reviews.
        </p>
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-cm-card border border-cm-line rounded-xl max-w-xs w-full p-4 space-y-3 shadow-2xl">
            <h4 className="text-xs font-bold text-cm-red">Reset All CodeMate Data?</h4>
            <p className="text-xs text-cm-muted">
              This will wipe all notebook entries, revision logs, and preferences from Chrome local storage.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="cm-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllStorage}
                className="cm-btn-danger text-xs py-1.5 px-3"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
