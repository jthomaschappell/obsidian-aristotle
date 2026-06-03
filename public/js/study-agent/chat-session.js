import { state, els } from "./dom.js";
import { getActivePromptTemplate } from "./api-prompt.js";
import { streamClaudeText, friendlyErrorFromClaudeError } from "./claude-stream.js";
export function setChatEmptyStateVisible(visible) {
  els.emptyState.classList.toggle("hidden", !visible);
}

export function clearChat() {
  [...els.chatWrap.querySelectorAll(".msgRow, .spinner")].forEach((n) => n.remove());
}

export function createMessageBubble({ role, text, isError = false, connection = false }) {
  const row = document.createElement("div");
  row.className = "msgRow " + (role === "assistant" ? "assistant" : "user");

  const msg = document.createElement("div");
  msg.className = "msg " + (role === "user" ? "user" : "");
  if (isError) msg.classList.add("errorCard");
  if (connection) msg.classList.add("connection");

  if (connection && role === "assistant") {
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = "Connection";
    msg.appendChild(badge);
  }

  msg.textContent = text || "";
  row.appendChild(msg);
  return { row, msg };
}

export function setStreamingUI(streaming) {
  state.streaming = streaming;
  els.sendBtn.disabled = streaming;
  els.endBtn.disabled = streaming;
  els.userInput.disabled = streaming;
}

export function buildSystemPrompt(selectedNotes) {
  const NOTES_DELIMITER = "---";
  const notesBlock = selectedNotes
    .map((n) => {
      return [NOTES_DELIMITER, `Name: ${n.name}`, `Path: ${n.path}`, NOTES_DELIMITER, n.content].join("\n");
    })
    .join("\n");

  return getActivePromptTemplate().replace("{NOTES}", notesBlock);
}

function shouldHighlightConnection(assistantText) {
  return (
    assistantText.includes("I notice your note on") || assistantText.includes("connects to your note on")
  );
}

export function applyConnectionStyling(msgEl, assistantText) {
  if (!shouldHighlightConnection(assistantText)) return;
  msgEl.classList.add("connection");
  if (!msgEl.querySelector(".badge")) {
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = "Connection";
    msgEl.insertBefore(badge, msgEl.firstChild);
  }
}

export function scrollChatToBottom() {
  els.chatWrap.scrollTop = els.chatWrap.scrollHeight;
}

export function setNoteSelectionEnabled(enabled) {
  els.noteSearch.disabled = !enabled;
  els.noteSortOrder.disabled = !enabled;
  els.selectAllBtn.disabled = !enabled;
  els.deselectAllBtn.disabled = !enabled;
  [...els.mdList.querySelectorAll('input[type="checkbox"]')].forEach((cb) => {
    cb.disabled = !enabled;
  });
}
