import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // Helper to extract client IP address
  function getClientIp(req: express.Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",");
      const clientIp = ips[0].trim();
      if (clientIp) return clientIp;
    }
    const realIp = req.headers["x-real-ip"];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    const reqIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
    // Normalize IPv6 mapped IPv4 like ::ffff:127.0.0.1
    return reqIp.replace(/^::ffff:/, "");
  }

  const STORAGE_FILE = path.join(process.cwd(), "data", "ip_preferences.json");

  function ensureStorageDir() {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  function readAllPreferences(): Record<string, any> {
    try {
      ensureStorageDir();
      if (fs.existsSync(STORAGE_FILE)) {
        const content = fs.readFileSync(STORAGE_FILE, "utf-8");
        return JSON.parse(content);
      }
    } catch (err) {
      console.error("Error reading IP preferences store:", err);
    }
    return {};
  }

  function saveIpPreferences(ip: string, prefs: any) {
    try {
      ensureStorageDir();
      const all = readAllPreferences();
      const existing = all[ip] || {};
      all[ip] = {
        ...existing,
        ...prefs,
        ip,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(all, null, 2), "utf-8");
      return all[ip];
    } catch (err) {
      console.error("Error saving IP preferences store:", err);
      return null;
    }
  }

  // --- API Endpoints ---

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Get detected client IP address
  app.get("/api/ip", (req, res) => {
    const ip = getClientIp(req);
    res.json({ ip, userAgent: req.headers["user-agent"] });
  });

  // Get preferences stored for a specific IP or current request IP
  app.get("/api/preferences", (req, res) => {
    const detectedIp = getClientIp(req);
    const targetIp = (req.query.ip as string) || detectedIp;
    const all = readAllPreferences();
    const prefs = all[targetIp] || all[detectedIp] || null;

    res.json({
      success: true,
      detectedIp,
      queriedIp: targetIp,
      preferences: prefs,
    });
  });

  // Save/update preferences by IP address
  app.post("/api/preferences", (req, res) => {
    const detectedIp = getClientIp(req);
    const targetIp = req.body.ip || detectedIp;
    const preferencesData = req.body.preferences || req.body;

    // Remove top-level 'ip' from payload data if merged
    const cleanPrefs = { ...preferencesData };
    delete cleanPrefs.ip;

    const saved = saveIpPreferences(targetIp, cleanPrefs);
    if (saved) {
      res.json({
        success: true,
        ip: targetIp,
        preferences: saved,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to persist preferences for IP",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
