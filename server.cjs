const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "dist");
const host = "127.0.0.1";
const startPort = 4280;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
};

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("ERROR: dist/index.html is missing. Run npm run build.");
  process.exit(1);
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return path.join(root, normalized === path.sep ? "index.html" : normalized);
}

function createServer(port) {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, version: "0.11.0" }));
      return;
    }

    let filePath = safePath(req.url || "/");
    if (!filePath.startsWith(root)) {
      res.writeHead(403); res.end("Forbidden"); return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!fs.existsSync(filePath)) filePath = path.join(root, "index.html");

    fs.readFile(filePath, (error, data) => {
      if (error) { res.writeHead(500); res.end(String(error)); return; }
      res.writeHead(200, {
        "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < startPort + 20) return createServer(port + 1);
    console.error(error); process.exit(1);
  });

  server.listen(port, host, () => {
    const url = `http://${host}:${port}`;
    console.log(`PUBLIC DEMO 0.11 READY: ${url}`);
    console.log("Keep this window open while playing.");
    if (process.platform === "win32") spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  });
}

createServer(startPort);
