/**
 * Minimal HTTP server to host `study-agent.html`.
 *
 * Why: the File System Access API requires a secure context. `http://localhost`
 * is treated as secure by browsers, so serving locally enables the "Open Vault"
 * flow to work reliably.
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

    // Serve main page.
    if (pathname === "/" || pathname === "/study-agent.html") {
      if (!fs.existsSync(HTML_PATH)) {
        send(res, 500, "Missing study-agent.html");
        return;
      }
      sendFile(res, 200, HTML_PATH);
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
});

