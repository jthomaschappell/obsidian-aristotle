# Serving the Study Agent

This repo contains a single-page app rooted at [`study-agent.html`](study-agent.html). Styles live in [`public/css/study-agent.css`](public/css/study-agent.css) and application logic in ES modules under [`public/js/study-agent/`](public/js/study-agent/) (entry: `main.js`). The HTTP server serves those paths under `/public/...`.

The File System Access API used by the "Open Vault" button works best in a secure context; serving from `http://localhost` is considered secure by modern browsers. **Use `node server.js` and open the app URL** — opening `study-agent.html` via `file://` will not load `/public/` assets.

## Quick start

1. Make sure you have Node.js installed (`node --version`).
2. Create a `.env` file in the project root and add your key:
   - `API_KEY=sk-or-...` (OpenRouter key for the default chat endpoint)
3. From the repo directory:
   - `node server.js`
4. Open in Chrome/Edge:
   - `http://127.0.0.1:3000`

The server injects the key from `.env` into the served page automatically — no need to paste it each session.

## Custom host/port

- `HOST=127.0.0.1 PORT=3000 node server.js`

## API key UX
- After you paste and save your key, the input is replaced by a “saved for this session” indicator.
- Clicking **Edit** opens a blank masked (`password`) input: it never pre-fills or displays your existing key.
- Use **Save** to replace the key, or **Cancel** to return without changing it.
- If running via the local server with a `.env` key set, the key is pre-loaded and the indicator shows immediately on page load.

## Vault loading
- Opening a vault shows a scan spinner and a determinate progress bar while all `.md` files are read from the chosen folder.
- Once loaded, the notes list is scrollable and constrained — it does not extend the full page.

## Notes list controls
- **Sort order**: toggle between A→Z and Z→A by file path.
- **Filter**: type to narrow the visible notes list.
- **Select/Deselect All** operates only on the currently filtered set.

## Manual QA

1. Load `http://127.0.0.1:3000` and confirm the page renders.
2. If `.env` is configured, confirm the API key indicator shows "saved for this session" without any input.
3. Click **Open Vault** and confirm the directory picker opens.
4. Select a folder with `.md` notes and confirm the scan spinner and progress bar appear, then notes render.
5. Use the sort dropdown and filter field; confirm list order and that **Select/Deselect All** respects the filter.
6. Confirm the notes list scrolls when there are many notes.
7. Start a session and confirm Claude streaming output appears.
8. Verify `GET /healthz` returns `{ "ok": true }`.

