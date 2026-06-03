"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  friendlyErrorFromClaudeError,
  shouldHighlightConnection,
  streamClaudeText,
} from "@/lib/claude";
import {
  DEFAULT_SYSTEM_PROMPT_TEMPLATE,
  PROMPT_STORAGE,
  THEME_KEY,
  type ChatMessage,
  type SortOrder,
  type VaultNote,
} from "@/lib/constants";
import { formatFilenameAsDate, renderMarkdown } from "@/lib/markdown";
import {
  buildSystemPrompt,
  enumerateMarkdownFileHandles,
  loadNotesFromHandles,
} from "@/lib/vault";

type ChatBubble = {
  id: string;
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
  connection?: boolean;
};

type SummaryEntry = { filename: string; mtime: number };

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function StudyAgent({
  apiKeyFromEnv = "",
}: {
  apiKeyFromEnv?: string;
}) {
  const chatWrapRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [fsSupported, setFsSupported] = useState(true);
  const [secureContext, setSecureContext] = useState(true);

  const [vaultNotes, setVaultNotes] = useState<VaultNote[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [filteredQuery, setFilteredQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const [vaultStatus, setVaultStatus] = useState("");
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultLoadLabel, setVaultLoadLabel] = useState("Loading notes…");
  const [vaultProgress, setVaultProgress] = useState(0);
  const [openVaultDisabled, setOpenVaultDisabled] = useState(false);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [chatBubbles, setChatBubbles] = useState<ChatBubble[]>([]);
  const [showSpinner, setShowSpinner] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(true);

  const [apiKeyError, setApiKeyError] = useState("");

  const [promptEditing, setPromptEditing] = useState(false);
  const [promptInput, setPromptInput] = useState(DEFAULT_SYSTEM_PROMPT_TEMPLATE);
  const [hasCustomPrompt, setHasCustomPrompt] = useState(false);

  const [userInput, setUserInput] = useState("");
  const [activeTab, setActiveTab] = useState<"session" | "history">("session");

  const [historySummaries, setHistorySummaries] = useState<SummaryEntry[] | null>(
    null
  );
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [viewingHistoryDetail, setViewingHistoryDetail] = useState(false);
  const [historyDetailHtml, setHistoryDetailHtml] = useState("");
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);

  const scrollChatToBottom = useCallback(() => {
    const el = chatWrapRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollChatToBottom();
  }, [chatBubbles, showSpinner, scrollChatToBottom]);

  useEffect(() => {
    const supported = typeof window.showDirectoryPicker === "function";
    setFsSupported(supported);
    setSecureContext(window.isSecureContext);
    setOpenVaultDisabled(!supported);

    const storedTheme = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    const initialTheme = storedTheme === "light" ? "light" : "dark";
    setTheme(initialTheme);
    document.documentElement.setAttribute(
      "data-theme",
      initialTheme === "light" ? "light" : "dark"
    );

    const storedPrompt = sessionStorage.getItem(PROMPT_STORAGE) || "";
    if (storedPrompt) {
      setHasCustomPrompt(true);
      setPromptInput(storedPrompt);
    }
  }, []);

  const apiKey = apiKeyFromEnv.trim();

  const getActivePromptTemplate = () =>
    sessionStorage.getItem(PROMPT_STORAGE) || DEFAULT_SYSTEM_PROMPT_TEMPLATE;

  const selectedNotes = useMemo(
    () => vaultNotes.filter((n) => selectedPaths.has(n.path)),
    [vaultNotes, selectedPaths]
  );

  const estimatedTokens = useMemo(() => {
    let totalChars = 0;
    for (const n of vaultNotes) {
      if (selectedPaths.has(n.path)) totalChars += n.content.length;
    }
    return Math.floor(totalChars / 4);
  }, [vaultNotes, selectedPaths]);

  const tokenTooLarge = estimatedTokens > 150000;

  const visibleNotes = useMemo(() => {
    const q = filteredQuery.trim().toLowerCase();
    const filtered = vaultNotes.filter((n) => {
      if (!q) return true;
      return (n.name + " " + n.path).toLowerCase().includes(q);
    });
    return filtered.sort((a, b) => {
      const cmp = a.path.localeCompare(b.path, undefined, { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [vaultNotes, filteredQuery, sortOrder]);

  const noMdMessage = useMemo(() => {
    if (vaultNotes.length === 0) return "No notes found yet. Open a vault to begin.";
    if (visibleNotes.length === 0) return "No notes match your search.";
    return "";
  }, [vaultNotes.length, visibleNotes.length]);

  const noteSelectionEnabled = !sessionStarted;

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.setAttribute(
      "data-theme",
      next === "light" ? "light" : "dark"
    );
  };

  const missingApiKeyMessage =
    "API key not configured. Set API_KEY or OPENROUTER_API_KEY in .env and restart the dev server.";

  const commitPrompt = () => {
    const val = promptInput.trim();
    if (!val || val === DEFAULT_SYSTEM_PROMPT_TEMPLATE) {
      sessionStorage.removeItem(PROMPT_STORAGE);
      setHasCustomPrompt(false);
    } else {
      sessionStorage.setItem(PROMPT_STORAGE, val);
      setHasCustomPrompt(true);
    }
    setPromptEditing(false);
  };

  const toggleNote = (path: string, checked: boolean) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (checked) next.add(path);
      else next.delete(path);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      for (const n of visibleNotes) next.add(n.path);
      return next;
    });
  };

  const deselectAllVisible = () => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      for (const n of visibleNotes) next.delete(n.path);
      return next;
    });
  };

  const resetSessionUi = () => {
    setConversation([]);
    setChatBubbles([]);
    setShowEmptyState(true);
    setShowSpinner(false);
    setUserInput("");
  };

  const openVault = async () => {
    try {
      setVaultStatus("Opening vault…");
      setApiKeyError("");
      setVaultNotes([]);
      setSelectedPaths(new Set());
      setSessionStarted(false);
      setSessionEnded(false);
      setStreaming(false);
      resetSessionUi();

      if (typeof window.showDirectoryPicker !== "function") {
        throw new Error("File System Access API is not supported in this browser.");
      }
      const rootHandle = await window.showDirectoryPicker();
      setOpenVaultDisabled(true);
      setVaultLoading(true);
      setVaultLoadLabel("Scanning vault for markdown…");
      setVaultProgress(0);

      const items = await enumerateMarkdownFileHandles(rootHandle);
      items.sort((a, b) =>
        a.path.localeCompare(b.path, undefined, { sensitivity: "base" })
      );

      if (items.length === 0) {
        setVaultLoadLabel("No markdown files found.");
        setVaultLoading(false);
        setOpenVaultDisabled(false);
        setVaultStatus("No .md files found in that folder.");
        return;
      }

      setVaultLoadLabel(`Loading ${items.length} note${items.length === 1 ? "" : "s"}…`);
      const notes = await loadNotesFromHandles(items, (loaded, total) => {
        setVaultProgress(total > 0 ? Math.round((loaded / total) * 100) : 0);
        setVaultLoadLabel(`Loading notes ${loaded} / ${total}`);
      });

      setVaultNotes(notes);
      setSelectedPaths(new Set());
      setVaultLoading(false);
      setOpenVaultDisabled(false);
      setVaultStatus(`Loaded ${notes.length} notes. Select which to study.`);
    } catch (err) {
      setVaultLoading(false);
      setOpenVaultDisabled(false);
      const msg = err instanceof Error ? err.message : String(err);
      setVaultStatus("Vault open cancelled or failed: " + msg);
    }
  };

  const saveSessionSummary = async (notes: VaultNote[], summaryText: string) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const notesList = notes.map((n) => `- ${n.path}`).join("\n");
    const content = [
      `# Study Session — ${dateStr} at ${timeStr}`,
      "",
      "**Notes studied:**",
      notesList,
      "",
      "---",
      "",
      summaryText,
    ].join("\n");
    const filename = `${now.toISOString().replace(/:/g, "-").replace(/\..+/, "")}.md`;
    try {
      await fetch("/api/summaries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename, content }),
      });
    } catch {
      /* server unavailable */
    }
  };

  const runAssistantTurn = async (
    requestMessages: ChatMessage[],
    systemPrompt: string,
    onDone?: (assistantText: string) => void
  ) => {
    if (!apiKey) {
      setApiKeyError(missingApiKeyMessage);
      return;
    }

    setStreaming(true);
    setShowSpinner(true);
    const bubbleId = uid();
    setChatBubbles((prev) => [
      ...prev,
      { id: bubbleId, role: "assistant", text: "", connection: false },
    ]);

    let gotFirstToken = false;
    try {
      const assistantText = await streamClaudeText({
        apiKey,
        systemPrompt,
        requestMessages,
        onTextDelta: (token) => {
          if (!gotFirstToken) {
            gotFirstToken = true;
            setShowSpinner(false);
          }
          setChatBubbles((prev) =>
            prev.map((b) =>
              b.id === bubbleId ? { ...b, text: b.text + token } : b
            )
          );
        },
      });

      setShowSpinner(false);
      const isConnection = shouldHighlightConnection(assistantText);
      setChatBubbles((prev) =>
        prev.map((b) =>
          b.id === bubbleId
            ? { ...b, text: assistantText, connection: isConnection }
            : b
        )
      );

      const updated = requestMessages.concat([
        { role: "assistant", content: assistantText },
      ]);
      setConversation(updated);
      onDone?.(assistantText);
    } catch (err) {
      setShowSpinner(false);
      setChatBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
      const msg = friendlyErrorFromClaudeError(err);
      setChatBubbles((prev) => [
        ...prev,
        { id: uid(), role: "assistant", text: msg, isError: true },
      ]);
      throw err;
    } finally {
      setStreaming(false);
    }
  };

  const startSession = async () => {
    if (streaming || selectedNotes.length === 0) return;
    if (!apiKey) {
      setApiKeyError(missingApiKeyMessage);
      return;
    }
    setApiKeyError("");

    setSessionStarted(true);
    setSessionEnded(false);
    resetSessionUi();
    setShowEmptyState(false);

    const systemPrompt = buildSystemPrompt(
      selectedNotes,
      getActivePromptTemplate()
    );
    const baseMessages: ChatMessage[] = [
      { role: "user", content: "Start session" },
    ];

    try {
      await runAssistantTurn(baseMessages, systemPrompt);
      setVaultStatus("Session started. Answer the question below.");
    } catch {
      setSessionStarted(false);
      setShowEmptyState(true);
      setVaultStatus("Claude request failed. You can try again.");
    }
  };

  const sendMessage = async (overrideText?: string) => {
    if (streaming || sessionEnded) return;
    const raw = overrideText ?? userInput;
    const text = raw.trim();
    if (!text) return;

    if (!apiKey) {
      setApiKeyError(missingApiKeyMessage);
      return;
    }
    setApiKeyError("");

    const normalized = text.toLowerCase() === "end session" ? "end session" : text;
    const isEndTurn = normalized === "end session";
    if (!overrideText) setUserInput("");

    setChatBubbles((prev) => [
      ...prev,
      { id: uid(), role: "user", text: normalized },
    ]);

    const systemPrompt = buildSystemPrompt(
      selectedNotes,
      getActivePromptTemplate()
    );
    const requestMessages = conversation.concat([
      { role: "user", content: normalized },
    ]);

    try {
      await runAssistantTurn(requestMessages, systemPrompt, (assistantText) => {
        if (isEndTurn) {
          setSessionEnded(true);
          setSessionStarted(false);
          setVaultStatus("Session ended.");
          saveSessionSummary(selectedNotes, assistantText);
        }
      });
    } catch {
      /* error bubble already shown */
    }
  };

  const endSession = () => {
    if (streaming || sessionEnded) return;
    void sendMessage("end session");
  };

  const newSession = () => {
    setConversation([]);
    setSessionStarted(false);
    setSessionEnded(false);
    setUserInput("");
    resetSessionUi();
    setVaultStatus("Pick notes on the left, then start a new session.");
  };

  const loadHistoryList = async () => {
    setViewingHistoryDetail(false);
    setHistoryDetailHtml("");
    setHistoryUnavailable(false);
    setHistorySummaries(null);
    try {
      const res = await fetch("/api/summaries");
      if (!res.ok) throw new Error();
      const { summaries } = (await res.json()) as { summaries: SummaryEntry[] };
      setHistorySummaries(summaries);
    } catch {
      setHistoryUnavailable(true);
      setHistorySummaries([]);
    }
  };

  const loadHistoryDetail = async (filename: string) => {
    setViewingHistoryDetail(true);
    setHistoryDetailLoading(true);
    setHistoryDetailHtml("");
    try {
      const res = await fetch(`/api/summaries/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error();
      const text = await res.text();
      setHistoryDetailHtml(renderMarkdown(text));
    } catch {
      setHistoryDetailHtml(
        '<div class="meta" style="color:#991b1b;">Failed to load summary.</div>'
      );
    } finally {
      setHistoryDetailLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") loadHistoryList();
  }, [activeTab]);

  const showComposer = sessionStarted && !sessionEnded;
  const showNewSession = sessionEnded;

  return (
    <>
      <div
        className={`banner${!fsSupported ? " visible" : ""}`}
        id="unsupportedBanner"
      >
        This app requires Chrome or Edge (File System Access API).
      </div>

      <div
        className={`banner${fsSupported && !secureContext ? " visible" : ""}`}
        id="insecureContextBanner"
      >
        This app requires a secure context (https or http://localhost) for the
        File System Access API.
      </div>

      <header className="appHeader">
        <img
          src="https://obsidian.md/images/obsidian-logo-gradient.svg"
          alt="Obsidian"
          className="appLogo"
        />
        <div>
          <div className="appTitle">Aristotle</div>
          <div className="appSubtitle">
            Socratic study agent for your Obsidian vault
          </div>
        </div>
        <button
          type="button"
          className="themeToggle"
          aria-label="Toggle light/dark mode"
          title="Toggle theme"
          onClick={toggleTheme}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={theme === "light" ? "hidden" : undefined}
          >
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={theme === "dark" ? "hidden" : undefined}
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </header>

      <div className="layout">
        <div className="left">
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                id="openVaultBtn"
                disabled={openVaultDisabled}
                onClick={() => void openVault()}
              >
                Open Vault
              </button>
            </div>
            <div id="vaultStatus" className="meta" style={{ marginTop: 10 }}>
              {vaultStatus}
            </div>
            {vaultLoading && (
              <div
                id="vaultLoadPanel"
                className="vaultLoadPanel"
                aria-live="polite"
              >
                <div className="vaultLoadTop">
                  <div className="vaultRing" aria-hidden="true" />
                  <div
                    id="vaultLoadLabel"
                    className="meta"
                    style={{ fontWeight: 800 }}
                  >
                    {vaultLoadLabel}
                  </div>
                </div>
                <div
                  className="vaultProgressTrack"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={vaultProgress}
                >
                  <div
                    className="vaultProgressFill"
                    style={{ width: `${vaultProgress}%` }}
                  />
                </div>
              </div>
            )}
            {noMdMessage && (
              <div className="meta" style={{ marginTop: 10, fontWeight: 700 }}>
                {noMdMessage}
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <input
                id="noteSearch"
                type="text"
                placeholder="Filter notes by name or path"
                autoComplete="off"
                value={filteredQuery}
                disabled={!noteSelectionEnabled}
                onChange={(e) => setFilteredQuery(e.target.value)}
              />
            </div>

            <div className="sortRow">
              <label htmlFor="noteSortOrder">Sort</label>
              <select
                id="noteSortOrder"
                aria-label="Sort notes"
                value={sortOrder}
                disabled={!noteSelectionEnabled}
                onChange={(e) =>
                  setSortOrder(e.target.value === "desc" ? "desc" : "asc")
                }
              >
                <option value="asc">A → Z (path)</option>
                <option value="desc">Z → A (path)</option>
              </select>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button
                type="button"
                style={{ flex: 1 }}
                disabled={!noteSelectionEnabled}
                onClick={selectAllVisible}
              >
                Select all
              </button>
              <button
                type="button"
                style={{ flex: 1 }}
                disabled={!noteSelectionEnabled}
                onClick={deselectAllVisible}
              >
                Deselect all
              </button>
            </div>

            <div className="tokenRow" style={{ marginTop: 10 }}>
              <div id="noteCount" className="meta">
                {selectedPaths.size} notes selected
              </div>
              <div id="tokenEstimate" className="meta">
                Estimated tokens: {estimatedTokens}
              </div>
            </div>

            {tokenTooLarge && (
              <div className="warning" style={{ marginTop: 10 }}>
                Context may be too large — please deselect some notes.
              </div>
            )}

            <div className="list" id="mdList" aria-label="Notes list">
              {visibleNotes.map((note) => (
                <label key={note.path} className="noteItem">
                  <input
                    type="checkbox"
                    checked={selectedPaths.has(note.path)}
                    disabled={!noteSelectionEnabled}
                    onChange={(e) => toggleNote(note.path, e.target.checked)}
                  />
                  <div>
                    <div className="noteTitle">{note.name}</div>
                    <div className="notePath">{note.path}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                id="startBtn"
                className="primary"
                style={{ width: "100%" }}
                disabled={
                  selectedPaths.size === 0 || sessionStarted || streaming
                }
                onClick={() => void startSession()}
              >
                Start Session
              </button>
            </div>
          </div>
        </div>

        <div className="right">
          <div className="card">
            <div id="apiKeyStatusWrap">
              <div className="meta" style={{ marginBottom: 6 }}>
                API key
              </div>
              {apiKey ? (
                <div className="apiKeySuccessRow">
                  <span className="checkIcon" aria-hidden="true">
                    ✓
                  </span>
                  <span className="successLabel">Loaded from .env</span>
                </div>
              ) : (
                <div className="meta">
                  Set <code>API_KEY</code> or <code>OPENROUTER_API_KEY</code> in{" "}
                  <code>.env</code> (OpenRouter <code>sk-or-…</code> or Anthropic{" "}
                  <code>sk-ant-…</code>), then restart <code>npm run dev</code>.
                </div>
              )}
            </div>
            {apiKeyError && (
              <div
                id="apiKeyError"
                className="meta"
                style={{ marginTop: 10, color: "#991b1b", fontWeight: 700 }}
              >
                {apiKeyError}
              </div>
            )}

            <div className="sectionSplit">
              {promptEditing ? (
                <div id="promptEditWrap">
                  <div className="meta" style={{ marginBottom: 6 }}>
                    System prompt — use{" "}
                    <code style={{ fontFamily: "monospace", fontSize: "0.85em" }}>
                      {"{NOTES}"}
                    </code>{" "}
                    where selected notes are inserted.
                  </div>
                  <textarea
                    id="promptInput"
                    style={{ minHeight: 160, fontSize: "0.85rem" }}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.shiftKey) {
                        e.preventDefault();
                        commitPrompt();
                      }
                    }}
                  />
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="primary"
                      style={{ flex: 1 }}
                      onClick={commitPrompt}
                    >
                      Save Prompt
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1 }}
                      onClick={() => {
                        sessionStorage.removeItem(PROMPT_STORAGE);
                        setPromptInput(DEFAULT_SYSTEM_PROMPT_TEMPLATE);
                        setHasCustomPrompt(false);
                        setPromptEditing(false);
                      }}
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>
              ) : (
                <div id="promptSavedWrap">
                  <div className="meta" style={{ marginBottom: 6 }}>
                    System prompt
                  </div>
                  <div className="apiKeySuccessRow">
                    <span className="checkIcon" aria-hidden="true">
                      ✓
                    </span>
                    <span className="successLabel" id="promptSavedLabel">
                      {hasCustomPrompt
                        ? "Custom prompt active"
                        : "Default prompt active"}
                    </span>
                    <button
                      type="button"
                      id="editPromptBtn"
                      className="linkBtn"
                      onClick={() => {
                        setPromptEditing(true);
                        setPromptInput(getActivePromptTemplate());
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="tabBar" role="tablist">
            <button
              type="button"
              id="sessionTabBtn"
              className={`tabBtn${activeTab === "session" ? " active" : ""}`}
              role="tab"
              onClick={() => setActiveTab("session")}
            >
              Session
            </button>
            <button
              type="button"
              id="historyTabBtn"
              className={`tabBtn${activeTab === "history" ? " active" : ""}`}
              role="tab"
              onClick={() => setActiveTab("history")}
            >
              History
            </button>
          </div>

          {activeTab === "session" ? (
            <div id="sessionTabContent" className="tabContent">
              <div
                ref={chatWrapRef}
                id="chatWrap"
                className="chatWrap"
                aria-live="polite"
              >
                {showEmptyState && (
                  <div id="emptyState" className="emptyState">
                    Select notes on the left, then click{" "}
                    <span
                      id="emptyStateStartLink"
                      style={{
                        color: "var(--primary)",
                        cursor: "pointer",
                        textDecoration: "underline dotted",
                      }}
                      onClick={() => void startSession()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void startSession();
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      Start Session
                    </span>
                    .
                  </div>
                )}
                {chatBubbles.map((b) => (
                  <div
                    key={b.id}
                    className={`msgRow ${b.role === "assistant" ? "assistant" : "user"}`}
                  >
                    <div
                      className={[
                        "msg",
                        b.role === "user" ? "user" : "",
                        b.isError ? "errorCard" : "",
                        b.connection ? "connection" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {b.connection && b.role === "assistant" && (
                        <div className="badge">Connection</div>
                      )}
                      {b.text}
                    </div>
                  </div>
                ))}
                {showSpinner && (
                  <div className="spinner">
                    <div className="spinnerDot" />
                    <div>Thinking...</div>
                  </div>
                )}
              </div>

              {showComposer && (
                <div id="composerWrap">
                  <div className="composer">
                    <div className="composerLeft">
                      <textarea
                        id="userInput"
                        placeholder="Type your answer... (or type 'end session')"
                        value={userInput}
                        disabled={streaming}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void sendMessage();
                          }
                        }}
                      />
                      <div className="kbd" style={{ marginTop: 6 }}>
                        Tip: Enter to send · Shift+Enter for newline
                      </div>
                    </div>
                    <div className="composerActions">
                      <button
                        type="button"
                        id="sendBtn"
                        className="primary"
                        style={{ minWidth: 150 }}
                        disabled={streaming}
                        onClick={() => void sendMessage()}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      id="endBtn"
                      className="endBtn"
                      style={{ width: "100%" }}
                      disabled={streaming}
                      onClick={endSession}
                    >
                      End Session
                    </button>
                  </div>
                </div>
              )}

              {showNewSession && (
                <div id="newSessionWrap">
                  <button
                    type="button"
                    id="newSessionBtn"
                    style={{ width: "100%" }}
                    className="primary"
                    onClick={newSession}
                  >
                    New Session
                  </button>
                  <div className="meta" style={{ marginTop: 10 }}>
                    You can pick different notes and start again.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div id="historyTabContent" className="tabContent">
              {!viewingHistoryDetail ? (
                <div
                  id="historyListView"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    className="meta"
                    style={{ marginBottom: 8, fontWeight: 700 }}
                  >
                    Past Sessions
                  </div>
                  <div id="historyListInner" className="list" style={{ flex: 1 }}>
                    {historySummaries === null ? (
                      <div className="meta" style={{ padding: "10px 0" }}>
                        Loading…
                      </div>
                    ) : historySummaries.length === 0 ? (
                      <div className="historyEmpty">
                        {historyUnavailable
                          ? "History unavailable — start the local server to enable session saving."
                          : "No sessions saved yet. End a session to create your first summary."}
                      </div>
                    ) : (
                      historySummaries.map((s) => (
                        <div
                          key={s.filename}
                          className="historyItem"
                          onClick={() => void loadHistoryDetail(s.filename)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              void loadHistoryDetail(s.filename);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="historyItemDate">
                            {formatFilenameAsDate(s.filename)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div
                  id="historyDetailView"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    id="historyBackBtn"
                    style={{ alignSelf: "flex-start" }}
                    onClick={() => void loadHistoryList()}
                  >
                    ← Back to History
                  </button>
                  <div
                    id="historyDetailContent"
                    className="list mdContent"
                    style={{ flex: 1 }}
                    dangerouslySetInnerHTML={{
                      __html:
                        historyDetailLoading
                          ? '<div class="meta" style="padding:10px 0;">Loading…</div>'
                          : historyDetailHtml || "",
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
