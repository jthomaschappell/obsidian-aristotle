import { state, els, DEFAULT_SYSTEM_PROMPT_TEMPLATE } from "./dom.js";
import { THEME_KEY, applyTheme } from "./theme.js";
import {
  enumerateMarkdownFileHandles,
  loadNotesFromHandles,
  setVaultLoadingVisible,
  setVaultProgress,
} from "./vault-fs.js";
import {
  renderNotesList,
  setSelectionCountUI,
  selectAllVisible,
  deselectAllVisible,
  getSelectedNotes,
} from "./notes-ui.js";
import {
  getEnvPrefillKey,
  setStoredApiKey,
  showApiKeySavedUI,
  showApiKeyEditUI,
  setApiKeyUIForEditing,
  showInlineApiKeyError,
  clearInlineApiKeyError,
  getStoredApiKey,
  getApiKey,
  setApiKeyUIForSessionStarted,
  commitApiKeyFromInput,
  cancelApiKeyEdit,
  showPromptSavedUI,
  showPromptEditUI,
  commitPrompt,
  clearStoredPromptTemplate,
} from "./api-prompt.js";
import {
  setChatEmptyStateVisible,
  clearChat,
  createMessageBubble,
  setStreamingUI,
  buildSystemPrompt,
  applyConnectionStyling,
  scrollChatToBottom,
  setNoteSelectionEnabled,
  streamClaudeText,
  friendlyErrorFromClaudeError,
} from "./chat-session.js";
import { switchTab, loadHistoryList, saveSessionSummary } from "./history.js";
import { initHearth } from "./hearth.js";

function refreshOpenVaultButton() {
  els.openVaultBtn.disabled = typeof window.showDirectoryPicker !== "function";
}

function detectUnsupported() {
  const supported = typeof window.showDirectoryPicker === "function";
  const secure = !!window.isSecureContext;

  els.unsupportedBanner.style.display = supported ? "none" : "block";
  els.openVaultBtn.disabled = !supported;

  els.insecureContextBanner.style.display = supported && !secure ? "block" : "none";
}

function initUI() {
  applyTheme(localStorage.getItem(THEME_KEY) || "dark");

  els.themeToggleBtn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  detectUnsupported();

  const envKey = getEnvPrefillKey();
  if (envKey) {
    setStoredApiKey(envKey);
    showApiKeySavedUI();
  } else if (getStoredApiKey().trim()) {
    showApiKeySavedUI();
  } else {
    showApiKeyEditUI();
  }

  els.editKeyBtn.addEventListener("click", () => {
    setApiKeyUIForEditing();
  });

  els.saveApiKeyBtn.addEventListener("click", () => {
    commitApiKeyFromInput();
  });

  els.cancelApiKeyBtn.addEventListener("click", () => {
    cancelApiKeyEdit();
  });

  showPromptSavedUI();

  els.editPromptBtn.addEventListener("click", () => {
    showPromptEditUI();
  });

  els.savePromptBtn.addEventListener("click", () => {
    commitPrompt();
  });

  els.resetPromptBtn.addEventListener("click", () => {
    clearStoredPromptTemplate();
    els.promptInput.value = DEFAULT_SYSTEM_PROMPT_TEMPLATE;
    showPromptSavedUI();
  });

  els.promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      commitPrompt();
    }
  });

  els.apiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitApiKeyFromInput();
    }
  });

  els.openVaultBtn.addEventListener("click", () => {
    (async () => {
      try {
        els.vaultStatus.textContent = "Opening vault…";
        clearInlineApiKeyError();

        state.vaultNotes = [];
        state.selectedPaths = new Set();
        state.sessionStarted = false;
        state.sessionEnded = false;
        state.streaming = false;
        state.conversation = [];
        state.assistantTextLast = "";
        state.activeAssistantBubble = null;

        clearChat();
        setChatEmptyStateVisible(true);
        els.composerWrap.classList.add("hidden");
        els.newSessionWrap.classList.add("hidden");

        els.startBtn.disabled = true;
        setNoteSelectionEnabled(true);
        renderNotesList();
        setSelectionCountUI();

        const rootHandle = await window.showDirectoryPicker();
        els.openVaultBtn.disabled = true;
        setVaultLoadingVisible(true);
        els.vaultLoadLabel.textContent = "Scanning vault for markdown…";
        setVaultProgress(0, 0);

        const items = await enumerateMarkdownFileHandles(rootHandle);
        items.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }));

        if (items.length === 0) {
          els.vaultLoadLabel.textContent = "No markdown files found.";
          setVaultProgress(0, 0);
          setVaultLoadingVisible(false);
          refreshOpenVaultButton();

          state.vaultNotes = [];
          renderNotesList();
          setSelectionCountUI();
          els.vaultStatus.textContent = "No .md files found in that folder.";
          els.startBtn.disabled = true;
          return;
        }

        els.vaultLoadLabel.textContent = `Loading ${items.length} note${items.length === 1 ? "" : "s"}…`;
        setVaultProgress(0, items.length);

        const notes = await loadNotesFromHandles(items, (loaded, total) => {
          setVaultProgress(loaded, total);
          els.vaultLoadLabel.textContent = `Loading notes ${loaded} / ${total}`;
        });

        state.vaultNotes = notes;
        state.selectedPaths = new Set();

        setVaultLoadingVisible(false);
        refreshOpenVaultButton();

        renderNotesList();
        setSelectionCountUI();

        els.vaultStatus.textContent = `Loaded ${notes.length} notes. Select which to study.`;
        els.startBtn.disabled = state.selectedPaths.size === 0 || state.sessionStarted;
      } catch (err) {
        setVaultLoadingVisible(false);
        refreshOpenVaultButton();
        const msg = err && err.message ? err.message : String(err);
        els.vaultStatus.textContent = "Vault open cancelled or failed: " + msg;
      }
    })();
  });

  els.noteSearch.addEventListener("input", () => {
    state.filteredQuery = els.noteSearch.value || "";
    renderNotesList();
  });

  els.noteSortOrder.value = state.sortOrder;
  els.noteSortOrder.addEventListener("change", () => {
    state.sortOrder = els.noteSortOrder.value === "desc" ? "desc" : "asc";
    renderNotesList();
  });

  els.selectAllBtn.addEventListener("click", () => selectAllVisible());
  els.deselectAllBtn.addEventListener("click", () => deselectAllVisible());

  els.startBtn.addEventListener("click", () => {
    (async () => {
      let spinner = null;
      let assistantRow = null;

      try {
        if (state.streaming) return;
        const selectedNotes = getSelectedNotes();
        if (selectedNotes.length === 0) return;

        const apiKey = getApiKey();
        if (!apiKey) {
          setApiKeyUIForEditing();
          showInlineApiKeyError("Missing API key. Paste it into the field above.");
          return;
        }
        clearInlineApiKeyError();
        setStoredApiKey(apiKey);
        setApiKeyUIForSessionStarted();

        state.sessionStarted = true;
        state.sessionEnded = false;
        state.conversation = [];

        clearChat();
        setChatEmptyStateVisible(false);
        els.composerWrap.classList.remove("hidden");
        els.newSessionWrap.classList.add("hidden");

        setNoteSelectionEnabled(false);
        els.startBtn.disabled = true;

        const systemPrompt = buildSystemPrompt(selectedNotes);
        const baseMessages = [{ role: "user", content: "Start session" }];

        setStreamingUI(true);
        spinner = document.createElement("div");
        spinner.className = "spinner";
        spinner.innerHTML = '<div class="spinnerDot"></div><div>Thinking...</div>';
        els.chatWrap.appendChild(spinner);

        const { row: assistantRowLocal, msg: assistantMsg } = createMessageBubble({
          role: "assistant",
          text: "",
          connection: false,
        });
        assistantRow = assistantRowLocal;
        els.chatWrap.appendChild(assistantRowLocal);
        scrollChatToBottom();

        let gotFirstToken = false;
        const assistantText = await streamClaudeText({
          apiKey,
          systemPrompt,
          requestMessages: baseMessages,
          onTextDelta: (token) => {
            if (!gotFirstToken) {
              gotFirstToken = true;
              spinner.remove();
            }
            assistantMsg.textContent += token;
            scrollChatToBottom();
          },
        });

        if (spinner.isConnected) spinner.remove();
        applyConnectionStyling(assistantMsg, assistantText);

        state.conversation = baseMessages.concat([{ role: "assistant", content: assistantText }]);

        setStreamingUI(false);
        els.userInput.disabled = false;
        els.userInput.value = "";
        els.userInput.focus();

        els.vaultStatus.textContent = `Session started. Answer the question below.`;
        els.sendBtn.disabled = false;
        els.endBtn.disabled = false;
      } catch (err) {
        setStreamingUI(false);
        if (spinner && spinner.isConnected) spinner.remove();
        if (assistantRow && assistantRow.isConnected) assistantRow.remove();
        const msg = friendlyErrorFromClaudeError(err);
        const { row } = createMessageBubble({
          role: "assistant",
          text: msg,
          isError: true,
        });
        els.chatWrap.appendChild(row);
        scrollChatToBottom();
        els.vaultStatus.textContent = "Claude request failed. You can try again.";
        state.sessionStarted = false;
        setNoteSelectionEnabled(true);
        els.composerWrap.classList.add("hidden");
        els.newSessionWrap.classList.add("hidden");
        els.startBtn.disabled = state.selectedPaths.size === 0;
      }
    })();
  });

  els.userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      els.sendBtn.click();
    }
  });

  els.sendBtn.addEventListener("click", () => {
    (async () => {
      if (state.streaming || state.sessionEnded) return;
      const text = els.userInput.value.trim();
      if (!text) return;

      const normalized = text.toLowerCase() === "end session" ? "end session" : text;
      const isEndTurn = normalized === "end session";

      const apiKey = getApiKey();
      if (!apiKey) {
        setApiKeyUIForEditing();
        showInlineApiKeyError("Missing API key. Edit and paste it again.");
        return;
      }
      clearInlineApiKeyError();
      setStoredApiKey(apiKey);

      els.userInput.value = "";

      const { row: userRow } = createMessageBubble({
        role: "user",
        text: normalized,
      });
      els.chatWrap.appendChild(userRow);
      scrollChatToBottom();

      const selectedNotes = getSelectedNotes();
      const systemPrompt = buildSystemPrompt(selectedNotes);
      const requestMessages = state.conversation.concat([{ role: "user", content: normalized }]);

      setStreamingUI(true);
      const spinner = document.createElement("div");
      spinner.className = "spinner";
      spinner.innerHTML = '<div class="spinnerDot"></div><div>Thinking...</div>';
      els.chatWrap.appendChild(spinner);

      const { row: assistantRow, msg: assistantMsg } = createMessageBubble({
        role: "assistant",
        text: "",
        connection: false,
      });
      els.chatWrap.appendChild(assistantRow);
      scrollChatToBottom();

      let gotFirstToken = false;
      try {
        const assistantText = await streamClaudeText({
          apiKey,
          systemPrompt,
          requestMessages,
          onTextDelta: (token) => {
            if (!gotFirstToken) {
              gotFirstToken = true;
              spinner.remove();
            }
            assistantMsg.textContent += token;
            scrollChatToBottom();
          },
        });

        if (spinner.isConnected) spinner.remove();
        applyConnectionStyling(assistantMsg, assistantText);

        state.conversation = requestMessages.concat([{ role: "assistant", content: assistantText }]);

        setStreamingUI(false);

        if (isEndTurn) {
          state.sessionEnded = true;
          state.sessionStarted = false;
          setNoteSelectionEnabled(true);
          els.composerWrap.classList.add("hidden");
          els.newSessionWrap.classList.remove("hidden");
          els.startBtn.disabled = state.selectedPaths.size === 0;
          els.vaultStatus.textContent = "Session ended.";
          saveSessionSummary({ notes: getSelectedNotes(), summaryText: assistantText });
        } else {
          els.userInput.disabled = false;
          els.userInput.focus();
        }
      } catch (err) {
        if (spinner.isConnected) spinner.remove();
        if (assistantRow.isConnected) assistantRow.remove();
        setStreamingUI(false);
        const msg = friendlyErrorFromClaudeError(err);
        const { row } = createMessageBubble({
          role: "assistant",
          text: msg,
          isError: true,
        });
        els.chatWrap.appendChild(row);
        scrollChatToBottom();
      }
    })();
  });

  els.endBtn.addEventListener("click", () => {
    (async () => {
      if (state.streaming || state.sessionEnded) return;
      els.userInput.value = "end session";
      els.sendBtn.click();
    })();
  });

  els.newSessionBtn.addEventListener("click", () => {
    state.conversation = [];
    state.sessionStarted = false;
    state.sessionEnded = false;
    els.userInput.value = "";

    clearChat();
    setChatEmptyStateVisible(true);
    els.composerWrap.classList.add("hidden");
    els.newSessionWrap.classList.add("hidden");

    setNoteSelectionEnabled(true);
    els.startBtn.disabled = state.selectedPaths.size === 0;
    els.vaultStatus.textContent = "Pick notes on the left, then start a new session.";
  });

  document.getElementById("emptyStateStartLink").addEventListener("click", () => {
    els.startBtn.click();
  });

  els.sessionTabBtn.addEventListener("click", () => switchTab("session"));
  els.historyTabBtn.addEventListener("click", () => switchTab("history"));
  els.historyBackBtn.addEventListener("click", () => {
    els.historyDetailView.classList.add("hidden");
    els.historyListView.classList.remove("hidden");
  });

  els.startBtn.disabled = true;
  setSelectionCountUI();
  renderNotesList();
}

initUI();
initHearth();
