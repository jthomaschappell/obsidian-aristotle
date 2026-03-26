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

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

const ROOT_DIR = __dirname;
const HTML_PATH = path.join(ROOT_DIR, "study-agent.html");
const ENV_PATH = path.join(ROOT_DIR, ".env");

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

/**
 * Injects `ANTHROPIC_API_KEY` from the environment into the served HTML.
 */
function injectAnthropicKeyIntoHtml(html) {
  const v = process.env.ANTHROPIC_API_KEY || "";
  return html.replace(
    /window\.__ANTHROPIC_API_KEY_FROM_ENV__\s*=\s*"";/,
    `window.__ANTHROPIC_API_KEY_FROM_ENV__ = ${JSON.stringify(v)};`
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

function sendFile(res, statusCode, filePath) {
  const mime = safeMimeType(filePath);
  res.writeHead(statusCode, { "content-type": mime });
  fs.createReadStream(filePath).pipe(res);
}

function sendStudyAgentHtml(res) {
  let html = fs.readFileSync(HTML_PATH, "utf8");
  html = injectAnthropicKeyIntoHtml(html);
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
  if (process.env.ANTHROPIC_API_KEY) {
    // eslint-disable-next-line no-console
    console.log("ANTHROPIC_API_KEY loaded (from .env or environment); will prefill the Study Agent UI.");
  }
});

