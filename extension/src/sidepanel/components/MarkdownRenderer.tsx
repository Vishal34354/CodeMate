import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface CodeBlockProps {
  language: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  const getLanguageLabel = (lang: string) => {
    const l = (lang || "").toLowerCase().trim();
    if (l === "cpp" || l === "c++") return "C++";
    if (l === "java") return "Java";
    if (l === "python" || l === "py" || l === "python3") return "Python 3";
    if (l === "javascript" || l === "js") return "JavaScript";
    if (l === "typescript" || l === "ts") return "TypeScript";
    if (l === "go" || l === "golang") return "Go";
    if (l === "rust" || l === "rs") return "Rust";
    return lang.toUpperCase() || "CODE";
  };

  const getLanguageBadgeColor = (lang: string) => {
    const l = (lang || "").toLowerCase().trim();
    if (l === "cpp" || l === "c++") return "text-blue-300 bg-blue-500/15 border-blue-500/40";
    if (l === "java") return "text-amber-300 bg-amber-500/15 border-amber-500/40";
    if (l === "python" || l === "py" || l === "python3") return "text-emerald-300 bg-emerald-500/15 border-emerald-500/40";
    if (l === "javascript" || l === "js") return "text-yellow-300 bg-yellow-500/15 border-yellow-500/40";
    if (l === "typescript" || l === "ts") return "text-sky-300 bg-sky-500/15 border-sky-500/40";
    return "text-cm-accent bg-cm-accent2/15 border-cm-accent2/40";
  };

  return (
    <div className="my-3.5 rounded-xl overflow-hidden border border-cm-line/80 bg-[#0c1017] shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-cm-line/60">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getLanguageBadgeColor(language)}`}>
            {getLanguageLabel(language)}
          </span>
          <span className="text-[10px] text-cm-muted font-mono">
            {value.split("\n").length} lines
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all active:scale-95 cursor-pointer border ${
            copied
              ? "bg-cm-green/20 text-cm-green border-cm-green/50"
              : "bg-cm-surface hover:bg-cm-surface/80 text-cm-text hover:text-white border-cm-line"
          }`}
          title="Copy full code to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-cm-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Full Code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-[#e6edf3] leading-relaxed selection:bg-cm-accent2/40">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function preprocessMarkdown(raw: string): string {
  if (!raw) return "";

  // 1. Ensure a blank line before markdown tables so remark-gfm parses them cleanly
  let text = raw.replace(/([^\n])\n(\|[^\n]+\|)/g, "$1\n\n$2");

  // 2. Ensure a blank line before headers if attached to previous line
  text = text.replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2");

  // 3. Balance unclosed single dollar signs if response cut off
  const dollarCount = (text.match(/\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    text += "$";
  }

  return text;
}

export function MarkdownRenderer({ content }: { content: string }) {
  const processedContent = preprocessMarkdown(content);

  return (
    <div className="cm-markdown-container text-xs text-cm-text/90 leading-relaxed break-words">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            const textContent = String(children || "");
            const isMultiLine = textContent.includes("\n");

            if (!match && !isMultiLine) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-cm-surface text-cm-accent font-mono text-[11px] border border-cm-line/50"
                  {...rest}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                language={match ? match[1] : ""}
                value={textContent.replace(/\n$/, "")}
              />
            );
          },
          h1: ({ children }) => (
            <h1 className="text-sm font-extrabold text-white mt-5 mb-2.5 pb-1.5 border-b border-cm-line flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-cm-accent mt-4 mb-2 pb-1 border-b border-cm-line/40 flex items-center gap-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-white mt-3 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-cm-accent2 mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-xs text-cm-text/90 leading-relaxed mb-2.5">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-1 mb-2.5 text-xs text-cm-text/85">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 mb-2.5 text-xs text-cm-text/85">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">
              {children}
            </li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-cm-line bg-cm-bg/40">
              <table className="w-full text-xs text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-cm-surface text-cm-accent font-bold border-b border-cm-line text-[11px]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-cm-line/30">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-cm-surface/20 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="p-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-2 text-cm-text/90 font-mono text-[11px]">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cm-accent pl-3 py-1 my-2 bg-cm-surface/30 rounded-r text-xs text-cm-muted italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3.5 border-cm-line/50" />,
          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
}
