const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
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
  try {
    const decoded = decodeURIComponent(urlPath.split("?")[0]).replaceAll("\\", "/");
    const relativePath = decoded.replace(/^\/+/, "") || "index.html";
    const resolved = path.resolve(root, relativePath);
    const relative = path.relative(root, resolved);
    return relative && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)
      ? resolved
      : relative === "" ? path.join(root, "index.html") : null;
  } catch {
    return null;
  }
}

function responseHeaders(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const relative = path.relative(root, filePath).replaceAll("\\", "/");
  const immutableAsset = /^assets\/.+-[A-Za-z0-9_-]{8,}\.[^.]+$/.test(relative);
  return {
    "Content-Type": mime[extension] || "application/octet-stream",
    "Cache-Control": immutableAsset
      ? "public, max-age=31536000, immutable"
      : "no-cache",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
  };
}

function sendFile(req, res, filePath, data) {
  const headers = responseHeaders(filePath);
  const compressible = /\.(?:css|html|js|json|svg)$/i.test(filePath);
  const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(req.headers["accept-encoding"] || "");

  if (req.method === "HEAD") {
    res.writeHead(200, { ...headers, "Content-Length": data.length });
    res.end();
    return;
  }

  if (!compressible || !acceptsGzip || data.length < 1024) {
    res.writeHead(200, { ...headers, "Content-Length": data.length });
    res.end(data);
    return;
  }

  zlib.gzip(data, { level: zlib.constants.Z_BEST_SPEED }, (error, compressed) => {
    if (error) {
      res.writeHead(200, { ...headers, "Content-Length": data.length });
      res.end(data);
      return;
    }
    res.writeHead(200, {
      ...headers,
      "Content-Encoding": "gzip",
      "Content-Length": compressed.length,
      Vary: "Accept-Encoding",
    });
    res.end(compressed);
  });
}

function createServer(port) {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, version: "0.12.0" }));
      return;
    }

    let filePath = safePath(req.url || "/");
    if (!filePath) {
      res.writeHead(403); res.end("Forbidden"); return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!fs.existsSync(filePath)) filePath = path.join(root, "index.html");

    fs.readFile(filePath, (error, data) => {
      if (error) { res.writeHead(500); res.end(String(error)); return; }
      sendFile(req, res, filePath, data);
    });
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < startPort + 20) return createServer(port + 1);
    console.error(error); process.exit(1);
  });

  server.listen(port, host, () => {
    const url = `http://${host}:${port}`;
    console.log(`UMBRAFORGE 0.12 READY: ${url}`);
    console.log("Keep this window open while playing.");
    if (process.platform === "win32" && process.env.UMBRAFORGE_NO_OPEN !== "1") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    }
  });
}

createServer(startPort);
