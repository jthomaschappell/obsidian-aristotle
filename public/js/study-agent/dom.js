/** Application state and DOM element refs */

export const state = {
  vaultNotes: [], // { name, path, content }
  selectedPaths: new Set(),
  filteredQuery: "",
  sortOrder: "asc", // "asc" | "desc" — by path
  sessionStarted: false,
  sessionEnded: false,
  streaming: false,
  conversation: [], // { role: "user"|"assistant", content: string }
  assistantTextLast: "",
  activeAssistantBubble: null,
};

export const DEFAULT_SYSTEM_PROMPT_TEMPLATE = `You are a personal study agent. Your job is to help the user recall and deeply understand the material in their notes through Socratic questioning.

Here are the notes you will use for this session:

---
{NOTES}
---

Rules:
- Ask one question at a time. Never ask multiple questions in a single message.
- Questions should require the user to retrieve and explain, not just recognize. Avoid yes/no questions.
- After each answer, do three things: (1) affirm what was correct, (2) clearly correct anything wrong or incomplete, (3) ask the next question.
- When correcting, explain *why* the user's answer was wrong using the content of their notes.
- Every 4-5 questions, proactively surface a connection between two notes that the user may not have explicitly linked. Frame it as an observation, not a question: "I notice your note on X connects to your note on Y because..."
- Keep your tone encouraging but honest. Don't accept vague or incomplete answers - push for specificity.
- When the user ends the session (they type "end session" or click the end button), output a brief summary: topics covered, any persistent misconceptions to revisit, and the strongest connection you found across notes.
- If the user asks a question instead of answering, answer it briefly and return to the quiz.`;

export const els = {
  unsupportedBanner: document.getElementById("unsupportedBanner"),
  insecureContextBanner: document.getElementById("insecureContextBanner"),
  openVaultBtn: document.getElementById("openVaultBtn"),
  vaultStatus: document.getElementById("vaultStatus"),
  vaultLoadPanel: document.getElementById("vaultLoadPanel"),
  vaultLoadLabel: document.getElementById("vaultLoadLabel"),
  vaultProgressTrack: document.getElementById("vaultProgressTrack"),
  vaultProgressFill: document.getElementById("vaultProgressFill"),
  noMdFound: document.getElementById("noMdFound"),
  noteSearch: document.getElementById("noteSearch"),
  noteSortOrder: document.getElementById("noteSortOrder"),
  selectAllBtn: document.getElementById("selectAllBtn"),
  deselectAllBtn: document.getElementById("deselectAllBtn"),
  mdList: document.getElementById("mdList"),
  noteCount: document.getElementById("noteCount"),
  tokenEstimate: document.getElementById("tokenEstimate"),
  tokenWarning: document.getElementById("tokenWarning"),
  startBtn: document.getElementById("startBtn"),

  apiKeyEditWrap: document.getElementById("apiKeyEditWrap"),
  apiKeySavedWrap: document.getElementById("apiKeySavedWrap"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  saveApiKeyBtn: document.getElementById("saveApiKeyBtn"),
  cancelApiKeyBtn: document.getElementById("cancelApiKeyBtn"),
  editKeyBtn: document.getElementById("editKeyBtn"),
  apiKeyError: document.getElementById("apiKeyError"),

  promptEditWrap: document.getElementById("promptEditWrap"),
  promptSavedWrap: document.getElementById("promptSavedWrap"),
  promptInput: document.getElementById("promptInput"),
  savePromptBtn: document.getElementById("savePromptBtn"),
  resetPromptBtn: document.getElementById("resetPromptBtn"),
  editPromptBtn: document.getElementById("editPromptBtn"),
  promptSavedLabel: document.getElementById("promptSavedLabel"),

  chatWrap: document.getElementById("chatWrap"),
  emptyState: document.getElementById("emptyState"),
  composerWrap: document.getElementById("composerWrap"),
  userInput: document.getElementById("userInput"),
  sendBtn: document.getElementById("sendBtn"),
  endBtn: document.getElementById("endBtn"),
  newSessionWrap: document.getElementById("newSessionWrap"),
  newSessionBtn: document.getElementById("newSessionBtn"),

  sessionTabBtn: document.getElementById("sessionTabBtn"),
  historyTabBtn: document.getElementById("historyTabBtn"),
  sessionTabContent: document.getElementById("sessionTabContent"),
  historyTabContent: document.getElementById("historyTabContent"),
  historyListView: document.getElementById("historyListView"),
  historyListInner: document.getElementById("historyListInner"),
  historyDetailView: document.getElementById("historyDetailView"),
  historyDetailContent: document.getElementById("historyDetailContent"),
  historyBackBtn: document.getElementById("historyBackBtn"),

  themeToggleBtn: document.getElementById("themeToggleBtn"),
  themeSunIcon: document.getElementById("themeSunIcon"),
  themeMoonIcon: document.getElementById("themeMoonIcon"),
};

export const API = {
  endpoint: "https://openrouter.ai/api/v1/chat/completions",
  model: "anthropic/claude-sonnet-4-5",
  maxTokens: 1024,
};
