/**
 * Minimal HTTP server to host `study-agent.html`.
 *
 * Why: the File System Access API requires a secure context. `http://localhost`
 * is treated as secure by browsers, so serving locally enables the "Open Vault"
 * flow to work reliably.
 *
 * Loads optional `.env` from the project root (see `.env.example`) so
 * `ANTHROPIC_API_KEY` can be injected into the page — no extra npm packages.
 *
 * No dependencies; uses Node's built-in modules only.
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const url = require("node:url");

const ROOT_DIR = __dirname;
const HTML_PATH = path.join(ROOT_DIR, "study-agent.html");
const ENV_PATH = path.join(ROOT_DIR, ".env");
const SUMMARIES_DIR = path.join(ROOT_DIR, "session-summaries");

/**
 * Minimal `.env` parser (KEY=value, # comments, optional quotes).
 */
function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return;
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3010);
const HOST = process.env.HOST || "127.0.0.1";

/**
 * Injects `OPENROUTER_API_KEY` from the environment into the served HTML.
 */
function injectApiKeyIntoHtml(html) {
  const v = process.env.OPENROUTER_API_KEY || "";
  return html.replace(
    /window\.__OPENROUTER_API_KEY_FROM_ENV__\s*=\s*"";/,
    `window.__OPENROUTER_API_KEY_FROM_ENV__ = ${JSON.stringify(v)};`
  );
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function safeMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8", ...headers });
  res.end(body);
}

function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
}

/** Read the full request body as a string. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/** Return true if the filename is safe (no path traversal, only allowed chars). */
function isSafeFilename(name) {
  return typeof name === "string" &&
    name.length > 0 &&
    name.length <= 80 &&
    /^[\w\-\.]+$/.test(name) &&
    !name.includes("..");
}

function sendFile(res, statusCode, filePath) {
  const mime = safeMimeType(filePath);
  res.writeHead(statusCode, { "content-type": mime });
  fs.createReadStream(filePath).pipe(res);
}

function sendStudyAgentHtml(res) {
  let html = fs.readFileSync(HTML_PATH, "utf8");
  html = injectApiKeyIntoHtml(html);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = url.parse(req.url || "/");
    const pathname = decodeURIComponent(parsed.pathname || "/");

    // Simple health check for tooling.
    if (pathname === "/healthz") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // ------- Summaries API -------

    // GET /api/summaries — list all saved session summaries
    if (req.method === "GET" && pathname === "/api/summaries") {
      if (!fs.existsSync(SUMMARIES_DIR)) {
        sendJson(res, 200, { summaries: [] });
        return;
      }
      const files = fs.readdirSync(SUMMARIES_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((filename) => {
          const stat = fs.statSync(path.join(SUMMARIES_DIR, filename));
          return { filename, mtime: stat.mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);
      sendJson(res, 200, { summaries: files });
      return;
    }

    // POST /api/summaries — save a new session summary
    if (req.method === "POST" && pathname === "/api/summaries") {
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw); } catch {
        send(res, 400, "Invalid JSON");
        return;
      }
      const { filename, content } = body;
      if (!isSafeFilename(filename) || typeof content !== "string") {
        send(res, 400, "Invalid filename or content");
        return;
      }
      if (!fs.existsSync(SUMMARIES_DIR)) {
        fs.mkdirSync(SUMMARIES_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(SUMMARIES_DIR, filename), content, "utf8");
      sendJson(res, 201, { ok: true, filename });
      return;
    }

    // GET /api/summaries/:filename — read one summary
    const summaryMatch = pathname.match(/^\/api\/summaries\/(.+)$/);
    if (req.method === "GET" && summaryMatch) {
      const filename = summaryMatch[1];
      if (!isSafeFilename(filename)) {
        send(res, 400, "Invalid filename");
        return;
      }
      const filePath = path.join(SUMMARIES_DIR, filename);
      if (!fs.existsSync(filePath)) {
        send(res, 404, "Not found");
        return;
      }
      const content = fs.readFileSync(filePath, "utf8");
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end(content);
      return;
    }

    // ------- End Summaries API -------

    // Serve main page (with optional ANTHROPIC_API_KEY from .env).
    if (pathname === "/" || pathname === "/study-agent.html") {
      if (!fs.existsSync(HTML_PATH)) {
        send(res, 500, "Missing study-agent.html");
        return;
      }
      sendStudyAgentHtml(res);
      return;
    }

    // No other assets exist in this repo, but keep a safe 404.
    send(res, 404, `Not found: ${pathname}`);
  } catch (err) {
    console.error(err);
    send(res, 500, "Internal server error");
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Study Agent server running at http://${HOST}:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Open http://${HOST}:${PORT} in Chrome/Edge (secure-context required).`);
  if (process.env.OPENROUTER_API_KEY) {
    // eslint-disable-next-line no-console
    console.log("OPENROUTER_API_KEY loaded (from .env or environment); will prefill the Study Agent UI.");
  }
});

