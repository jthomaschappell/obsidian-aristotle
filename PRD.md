# Study Agent — V1 Spec

## Overview

A browser study agent powered by Claude. The user opens the app from the local server in Chrome, points it at their Obsidian vault folder, selects notes to study, and enters a Socratic Q&A session where Claude asks questions, evaluates answers, corrects misconceptions, and surfaces connections between notes.

The app is a **Next.js** application (`app/` routes, React components in `components/`, shared logic in `lib/`). Run `npm run dev` so `http://localhost` provides a secure context for the File System Access API.

---

## Core User Flow

1. User opens the app from the dev server (e.g. `http://127.0.0.1:3000/`) in Chrome
2. User clicks "Open Vault" — browser folder picker opens (`showDirectoryPicker()`)
3. App reads all `.md` files recursively from the selected folder
4. User selects which notes to study (multi-select list with search/filter)
5. User clicks "Start Session"
6. App sends note contents + system prompt to the Claude API
7. Claude asks the first question
8. User types an answer
9. Claude evaluates the answer, corrects if wrong, asks the next question
10. Repeat until user ends the session
11. Session summary shown at the end (topics covered, any noted misconceptions)

---

## Technical Constraints

- **Next.js app**: pages and API routes under `app/`, React components in `components/`, shared logic in `lib/`
- **Dev server**: `npm run dev` serves the app, passes `API_KEY` (or `OPENROUTER_API_KEY`) from `.env` into the page, and exposes session summary APIs under `/api/summaries` — required for normal operation (not `file://`)
- **Chrome required**: uses `showDirectoryPicker()` (File System Access API), which is Chrome/Edge only — display a clear warning if running in an unsupported browser
- **Claude API**: calls `https://api.anthropic.com/v1/messages` directly from the browser using `fetch()`
- **No in-app API key entry**: the key comes from `.env` only (`API_KEY` or `OPENROUTER_API_KEY`); it is never stored in `localStorage`/`sessionStorage`
- **Streaming responses**: use `stream: true` on the Claude API call and render tokens as they arrive so responses feel fast

---

## API Details

### Endpoint
```
POST https://api.anthropic.com/v1/messages
```

### Headers
```json
{
  "x-api-key": "<user-provided key>",
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
  "content-type": "application/json"
}
```

> The `anthropic-dangerous-direct-browser-access` header is required for direct browser calls.

### Model
```
claude-sonnet-4-20250514
```

### Request shape
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "stream": true,
  "system": "<system prompt — see below>",
  "messages": [
    { "role": "user", "content": "<conversation turn>" },
    { "role": "assistant", "content": "<previous response>" }
  ]
}
```

Maintain the full conversation history in a JS array and append each turn before sending. This gives Claude memory of the session.

---

## System Prompt

Inject this at session start. The `{NOTES}` placeholder is replaced with the full text of all selected notes, each separated by a clear delimiter.

```
You are a personal study agent. Your job is to help the user recall and deeply understand the material in their notes through Socratic questioning.

Here are the notes you will use for this session:

---
{NOTES}
---

Rules:
- Ask one question at a time. Never ask multiple questions in a single message.
- Questions should require the user to retrieve and explain, not just recognize. Avoid yes/no questions.
- After each answer, do three things: (1) affirm what was correct, (2) clearly correct anything wrong or incomplete, (3) ask the next question.
- When correcting, explain *why* the user's answer was wrong using the content of their notes.
- Every 4–5 questions, proactively surface a connection between two notes that the user may not have explicitly linked. Frame it as an observation, not a question: "I notice your note on X connects to your note on Y because..."
- Keep your tone encouraging but honest. Don't accept vague or incomplete answers — push for specificity.
- When the user ends the session (they type "end session" or click the end button), output a brief summary: topics covered, any persistent misconceptions to revisit, and the strongest connection you found across notes.
- If the user asks a question instead of answering, answer it briefly and return to the quiz.
```

---

## Note Ingestion

### Reading the vault
- Use `showDirectoryPicker()` to get a `FileSystemDirectoryHandle`
- Recursively walk all subdirectories
- Collect every file ending in `.md`
- Read each file's text content using `file.text()`
- Store as an array of objects: `{ name, path, content }`

### Note selection UI
- Show a scrollable list of all notes with checkboxes
- Include a text search box that filters the list in real time (match on file name and path)
- "Select all" / "Deselect all" buttons
- Show a count: "X notes selected"
- Disable "Start Session" if 0 notes selected

### Context window budget
- Before sending, calculate the approximate token count of all selected notes (rough estimate: `totalChars / 4`)
- If the estimated token count exceeds 150,000 tokens (safe limit for Claude's context window), warn the user and suggest selecting fewer notes
- Display the estimated token count in the UI next to the selected note count

---

## Session UI

### Layout
Two-panel layout:

**Left panel (30% width)** — note list
- Shows all notes in the vault
- Checkboxes for selection
- Search filter input at top
- Token estimate and note count at bottom
- "Start Session" button

**Right panel (70% width)** — study session
- API key input at top (hidden after entry, with an "edit" icon to reveal it again)
- Chat-style message thread
- Claude messages on the left, user messages on the right
- Input textarea at bottom with a "Send" button (also submits on Shift+Enter)
- "End Session" button appears once the session has started

### States
- **Empty**: right panel shows instructions ("Select notes on the left, then click Start Session")
- **Loading**: spinner while waiting for first Claude response
- **Active**: chat thread with input
- **Streaming**: Claude's current message renders token-by-token as it arrives
- **Session ended**: summary message shown, "New Session" button to start over

---

## Connection Surfacing (V1 implementation)

V1 does not use embeddings. Connection surfacing is handled entirely by Claude's in-context reasoning.

The system prompt already instructs Claude to surface connections every 4–5 questions. No extra implementation needed beyond sending all selected notes in the context window.

Connections are rendered inline in the chat thread with a distinct visual treatment — a subtle highlighted block with a "Connection" label — so they stand out from regular Q&A turns.

To detect a connection block: if Claude's response contains the phrase "I notice your note on" or "connects to your note on", wrap the entire response in the highlighted block style.

---

## Visual Design

Keep it simple and functional. No frameworks — plain CSS only.

- Background: `#f9f9f7` (off-white)
- Font: system-ui stack
- Claude messages: white card, light border, left-aligned
- User messages: slightly tinted card (e.g. `#eef3ff`), right-aligned
- Connection highlight block: `#fffbe6` background, `#b8860b` left border, "Connection" badge in amber
- "End Session" button: subtle red outline
- Responsive down to 900px wide minimum — no need for mobile

---

## Error Handling

- **API key missing**: show inline error, focus the API key input
- **API error (4xx/5xx)**: show the error message from the API response in the chat thread in a red error card; do not crash
- **Rate limit (429)**: show friendly message: "Claude is a bit busy — wait a moment and try again"
- **No `.md` files found**: show message in the note list panel
- **Browser not supported**: detect absence of `showDirectoryPicker` on load and show a banner: "This app requires Chrome or Edge"
- **Context too large**: if the API returns a context length error, surface it clearly and prompt the user to deselect some notes

---

## What V1 Does NOT Include

These are intentionally out of scope. Do not implement them.

- Spaced repetition or session history persistence
- Embeddings or semantic similarity search
- Tracking which questions were asked or which answers were wrong
- Any backend API, server-side processing, or database
- Mobile support
- Export or save functionality
- Obsidian plugin integration
- OAuth or any auth beyond an API key in `.env`

---

## File Deliverable

Next.js app: routes under `app/`, components in `components/`, shared logic in `lib/`. Run `npm run dev` and open the served URL in Chrome.

See [`README.md`](README.md) for layout and setup.
