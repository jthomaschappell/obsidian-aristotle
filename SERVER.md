# Serving the Study Agent

This repo contains a single-page app: `study-agent.html`.

The File System Access API used by the "Open Vault" button works best in a secure context; serving from `http://localhost` is considered secure by modern browsers.

## Quick start

1. Make sure you have Node.js installed (`node --version`).
2. From the repo directory:
   - `node server.js`
3. Open in Chrome/Edge:
   - `http://127.0.0.1:3000`

## Custom host/port

- `HOST=127.0.0.1 PORT=3000 node server.js`

## Manual QA

1. Load `http://127.0.0.1:3000` and confirm the page renders.
2. Click **Open Vault** and confirm the directory picker opens.
3. Select a folder with a few `.md` notes and confirm note loading works.
4. Start a session (requires your Anthropic API key) and confirm Claude streaming output appears.
5. Verify `GET /healthz` returns `{ "ok": true }`.

