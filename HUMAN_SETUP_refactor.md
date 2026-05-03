# Human setup (Study Agent refactor)

1. **Use the local server** — After this refactor, CSS and JavaScript load from `/public/...`. Open the app at `http://127.0.0.1:<PORT>/` (see server console for `PORT`, default `3000`). Opening `study-agent.html` directly from disk (`file://`) will not load styles or modules reliably.

2. **Environment** — Keep a `.env` at the project root if you want OpenRouter key injection into the page (`API_KEY=...`). Same behavior as before; the server still replaces `window.__API_KEY_FROM_ENV__` in the served HTML.

3. **Browser** — Chrome or Edge is required for File System Access (`Open Vault`).
