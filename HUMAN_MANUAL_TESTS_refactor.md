# Manual QA — Study Agent split (`study-agent.html` refactor)

Run `node server.js` from the repo root and complete these checks in Chrome or Edge.

1. **Assets load** — DevTools Network: `/public/css/study-agent.css` and `/public/js/study-agent/main.js` return 200; page styling matches the previous single-file look.

2. **API key injection** — With `API_KEY` in `.env`, loaded HTML contains a non-empty `window.__API_KEY_FROM_ENV__` and the UI shows the key as saved (or pre-filled behavior unchanged).

3. **Hearth** — Greeting and quote appear; heatmap or empty state renders; **Begin New Session** dismisses the overlay.

4. **Vault** — **Open Vault** opens the folder picker; notes list fills with progress UI; sort/filter/select behave as before.

5. **Session** — **Start Session** streams assistant text; Send / End session / “end session” text behave as before; **New Session** resets chat.

6. **History** — History tab lists summaries when the server is up; opening an item shows markdown content.

7. **Theme** — Header theme toggle switches light/dark and persists across reload.
