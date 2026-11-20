import { useState } from "react";
import { LayoutPanelLeft, Code2, X, Play } from "lucide-react";

export type PanelTab = "artifact" | "kernel-code";

interface Props {
  open: boolean;
  tab: PanelTab;
  artifact: { code: string; lang: string } | null;
  onSetTab: (t: PanelTab) => void;
  onClose: () => void;
}

export function SidePanel({ open, tab, artifact, onSetTab, onClose }: Props) {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState<"html" | "js">("html");
  const [runSrc, setRunSrc] = useState("");

  const run = () => {
    if (lang === "html") {
      setRunSrc(code);
    } else {
      setRunSrc(
        `<!DOCTYPE html><html><body><script>try { ${code} } catch (e) { document.body.innerHTML = '<pre style="color:red">' + e + '</pre>'; }</script></body></html>`
      );
    }
  };

  if (!open) return null;

  const artifactSrcDoc =
    artifact?.lang === "html"
      ? artifact.code
      : artifact
        ? `<!DOCTYPE html><html><head>
      <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      </head><body><div id="root"></div>
      <script type="text/babel">${artifact.code}</script>
      </body></html>`
        : "";

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg)] max-md:fixed max-md:inset-0 max-md:z-[25]">
      <div className="flex shrink-0 items-center gap-1.5 bg-[var(--bg)] px-4 pb-2.5 pt-3.5">
        <button
          onClick={() => onSetTab("artifact")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors ${
            tab === "artifact" ? "bg-[var(--bg-elevated)] text-[var(--text)]" : "text-[var(--text-tertiary)]"
          }`}
        >
          <LayoutPanelLeft size={16} /> Artifact
        </button>
        <button
          onClick={() => onSetTab("kernel-code")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors ${
            tab === "kernel-code" ? "bg-[var(--bg-elevated)] text-[var(--text)]" : "text-[var(--text-tertiary)]"
          }`}
        >
          <Code2 size={16} /> Kernel Code
        </button>
        <button onClick={onClose} className="ml-auto rounded-[10px] p-[7px] hover:bg-[var(--bg-glass-strong)]" aria-label="Close panel">
          <X size={18} strokeWidth={1.6} />
        </button>
      </div>

      {tab === "artifact" ? (
        <>
          <div className="shrink-0 px-4 pb-2.5 text-xs text-[var(--text-tertiary)]">
            {artifact ? `Artifact — ${artifact.lang}` : "Artifact"}
          </div>
          <iframe sandbox="allow-scripts" srcDoc={artifactSrcDoc} className="flex-1 rounded-t-[18px] border-0 bg-white" title="artifact" />
        </>
      ) : (
        <>
          <div className="flex shrink-0 gap-2 px-4 pb-2.5">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as "html" | "js")}
              className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--text)]"
            >
              <option value="html">HTML</option>
              <option value="js">JavaScript</option>
            </select>
            <button
              onClick={run}
              className="flex items-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-85"
            >
              <Play size={13} /> Run
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder="// write or paste code here, then Run"
            className="min-h-20 flex-1 resize-none rounded-t-[18px] border-0 bg-[var(--bg-elevated)] p-3.5 font-mono text-[13px] text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />
          <iframe sandbox="allow-scripts" srcDoc={runSrc} className="flex-1 border-0 bg-white" title="kernel-code-run" />
        </>
      )}
    </div>
  );
}
