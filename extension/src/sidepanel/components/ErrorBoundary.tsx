import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[CodeMate] Uncaught sidepanel error:", error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleResetStorage = async (): Promise<void> => {
    try {
      await chrome.storage.local.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cm-bg text-cm-text p-4 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-2xl mb-3">
            ⚠️
          </div>
          <h2 className="text-base font-bold text-white mb-1">Something went wrong</h2>
          <p className="text-xs text-cm-muted mb-4 max-w-xs">
            {this.state.error?.message || "An unexpected error occurred in CodeMate."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={this.handleReload}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cm-accent2 text-white hover:bg-cm-accent3 transition-colors"
            >
              Reload Panel
            </button>
            <button
              onClick={this.handleResetStorage}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cm-surface border border-cm-line text-cm-muted hover:text-white transition-colors"
            >
              Reset Storage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

