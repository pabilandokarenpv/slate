import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, RotateCcw, Pencil, Play } from "lucide-react";
import type { ChatMessage } from "../lib/types";

interface Props {
  message: ChatMessage;
  index: number;
  isLast: boolean;
  streaming: boolean;
  onOpenArtifact: (code: string, lang: string) => void;
  onRegenerate: () => void;
  onEditResend: (index: number, newText: string) => void;
}

export function Message({ message, index, isLast, streaming, onOpenArtifact, onRegenerate, onEditResend }: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const copy = () => {
    void navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (message.role === "user") {
    if (editing) {
      return (
        <div className="flex w-full flex-col items-end gap-2 self-end">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full max-w-[85%] resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-[14.5px] text-[var(--text)] focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="rounded-xl bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold">
              Cancel
            </button>
            <button
              onClick={() => {
                setEditing(false);
                onEditResend(index, draft);
              }}
              className="rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)]"
            >
              Save &amp; submit
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="group flex max-w-[85%] flex-col items-end gap-1 self-end">
        <div className="animate-msg-in whitespace-pre-wrap rounded-[20px] rounded-br-[4px] bg-[var(--bubble-user-bg)] px-4 py-[11px] text-[14.5px] leading-[1.55] text-[var(--bubble-user-text)]">
          {message.content}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] text-[var(--text-tertiary)] opacity-0 transition-opacity hover:bg-[var(--bg-glass-strong)] group-hover:opacity-100"
        >
          <Pencil size={11} /> Edit
        </button>
      </div>
    );
  }

  return (
    <div className="group flex max-w-[85%] flex-col gap-1 self-start">
      <div className="animate-msg-in whitespace-pre-wrap px-0.5 text-[14.5px] leading-[1.55] text-[var(--text)]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code(props) {
              const { className, children, ...rest } = props as { className?: string; children?: React.ReactNode };
              const lang = /language-(\w+)/.exec(className || "")?.[1] ?? "";
              const isInline = !className;
              if (!isInline && lang.startsWith("artifact-")) {
                const realLang = lang.replace("artifact-", "");
                return (
                  <button
                    onClick={() => onOpenArtifact(String(children), realLang)}
                    className="my-1.5 inline-flex items-center gap-[7px] rounded-[14px] bg-[var(--accent)] px-3.5 py-[7px] text-[13px] font-medium text-[var(--accent-contrast)] transition-opacity hover:opacity-80"
                  >
                    <Play size={12} /> Open artifact ({realLang})
                  </button>
                );
              }
              if (isInline) {
                return (
                  <code className="rounded bg-[var(--bg-elevated)] px-1 py-0.5 font-mono text-[12.5px]" {...rest}>
                    {children}
                  </code>
                );
              }
              return (
                <pre className="my-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3.5">
                  <code className={`font-mono text-[12.5px] ${className ?? ""}`} {...rest}>
                    {children}
                  </code>
                </pre>
              );
            },
          }}
        >
          {message.content || " "}
        </ReactMarkdown>
      </div>
      {(!streaming || !isLast) && message.content && (
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={copy} className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] text-[var(--text-tertiary)] hover:bg-[var(--bg-glass-strong)]">
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
          </button>
          {isLast && (
            <button onClick={onRegenerate} className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] text-[var(--text-tertiary)] hover:bg-[var(--bg-glass-strong)]">
              <RotateCcw size={12} /> Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-0.5 py-1.5">
      {[0, 0.15, 0.3].map((delay) => (
        <span
          key={delay}
          className="animate-typing-wave h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}
