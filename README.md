# Aristotle — Study Agent

<<<<<<< HEAD
<<<<<<< HEAD
Socratic study agent for your Obsidian vault, built with **Next.js**.
=======
This repo contains a single-page app rooted at [`study-agent.html`](study-agent.html). Styles live in [`public/css/study-agent.css`](public/css/study-agent.css) and application logic in ES modules under [`public/js/study-agent/`](public/js/study-agent/) (entry: `main.js`). The HTTP server serves those paths under `/public/...`.
>>>>>>> 31e36d9d81339a96ed31a505e4dda1d8852f4ed2
=======
This repo contains a single-page app rooted at [`study-agent.html`](study-agent.html). Styles live in [`public/css/study-agent.css`](public/css/study-agent.css) and application logic in ES modules under [`public/js/study-agent/`](public/js/study-agent/) (entry: `main.js`). The HTTP server serves those paths under `/public/...`.
>>>>>>> 31e36d9d81339a96ed31a505e4dda1d8852f4ed2

The File System Access API used by the "Open Vault" button works best in a secure context; serving from `http://localhost` is considered secure by modern browsers. **Use `node server.js` and open the app URL** — opening `study-agent.html` via `file://` will not load `/public/` assets.

## Quick start

<<<<<<< HEAD
1. Install Node.js (`node --version`).
2. Create a `.env` file in the project root:
   - `API_KEY=sk-or-...` (OpenRouter) or `API_KEY=sk-ant-...` (Anthropic direct)
3. Install dependencies and run the dev server:
=======
1. Make sure you have Node.js installed (`node --version`).
2. Create a `.env` file in the project root and add your key:
   - `API_KEY=sk-or-...` (OpenRouter key for the default chat endpoint)
3. From the repo directory:
   - `node server.js`
4. Open in Chrome/Edge:
   - `http://127.0.0.1:3010`
<<<<<<< HEAD
>>>>>>> 31e36d9d81339a96ed31a505e4dda1d8852f4ed2
=======
>>>>>>> 31e36d9d81339a96ed31a505e4dda1d8852f4ed2

```bash
npm install
npm run dev
```

4. Open in Chrome or Edge: **http://127.0.0.1:3000**

The server passes `API_KEY` from `.env` into the page on load — no need to paste it each session.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Development server       |
| `npm run build`| Production build         |
| `npm run start`| Serve production build   |

## Custom host/port

<<<<<<< HEAD
<<<<<<< HEAD
```bash
HOST=127.0.0.1 PORT=3000 npm run dev
```
=======
- `HOST=127.0.0.1 PORT=3010 node server.js`
>>>>>>> 31e36d9d81339a96ed31a505e4dda1d8852f4ed2
=======
- `HOST=127.0.0.1 PORT=3010 node server.js`
>>>>>>> 31e36d9d81339a96ed31a505e4dda1d8852f4ed2

## API key UX

- After you paste and save your key, the input is replaced by a “saved for this session” indicator.
- **Edit** opens a blank masked input — it never pre-fills your existing key.
- With `API_KEY` in `.env`, the key is pre-loaded on page load.

## Vault loading

- Opening a vault shows a scan spinner and progress bar while `.md` files are read.
- The notes list is scrollable and does not extend the full page.

## Notes list controls

- **Sort**: A→Z or Z→A by file path.
- **Filter**: narrow the visible list.
- **Select/Deselect All**: only the filtered set.

## Session history

Ended sessions are saved under `session-summaries/` (gitignored) via `/api/summaries`.

## Manual QA

<<<<<<< HEAD
<<<<<<< HEAD
1. Load `http://127.0.0.1:3000` and confirm the page renders.
2. If `.env` has `API_KEY`, confirm the API key indicator shows without input.
=======
=======
>>>>>>> 31e36d9d81339a96ed31a505e4dda1d8852f4ed2
1. Load `http://127.0.0.1:3010` and confirm the page renders.
2. If `.env` is configured, confirm the API key indicator shows "saved for this session" without any input.
>>>>>>> 31e36d9d81339a96ed31a505e4dda1d8852f4ed2
3. Click **Open Vault** and confirm the directory picker opens.
4. Select a folder with `.md` notes; confirm spinner and progress bar, then notes render.
5. Use sort and filter; confirm **Select/Deselect All** respects the filter.
6. Confirm the notes list scrolls with many notes.
7. Start a session and confirm streaming assistant output.
8. Verify `GET /healthz` returns `{ "ok": true }`.
