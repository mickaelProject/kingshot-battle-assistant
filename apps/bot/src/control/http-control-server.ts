import http from "node:http";
import {
  controlPauseRun,
  controlResumeRun,
  controlStopRun,
  controlTriggerNextPhase,
} from "../services/run-control-service.js";
import type { ReminderScheduler } from "../services/reminder-scheduling-service.js";
import { log } from "../util/log.js";

type ControlAction = "pause" | "resume" | "stop" | "next_phase";

let activeServer: http.Server | null = null;

function json(
  res: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function resolveListenPort(): string | null {
  const explicit = process.env.BOT_CONTROL_PORT?.trim();
  if (explicit) return explicit;
  const platform = process.env.PORT?.trim();
  if (platform) return platform;
  return null;
}

function resolveBindHost(): string {
  const fromEnv = process.env.BOT_CONTROL_HOST?.trim();
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
}

/**
 * HTTP API pour que l’admin web pilote pause / reprise / arrêt / phase suivante.
 * - Dev : 127.0.0.1 + BOT_CONTROL_PORT (ex. 3847).
 * - Prod (Railway, etc.) : 0.0.0.0 + PORT ou BOT_CONTROL_PORT.
 */
export function startHttpControlServer(scheduler: ReminderScheduler): void {
  const portRaw = resolveListenPort();
  const secret = process.env.BOT_CONTROL_SECRET?.trim();
  if (!portRaw || !secret) {
    log.info(
      "control",
      "HTTP désactivé (définir BOT_CONTROL_SECRET + BOT_CONTROL_PORT ou PORT).",
    );
    return;
  }
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    log.warn("control", "port invalide", { portRaw });
    return;
  }

  const bindHost = resolveBindHost();

  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host ?? "localhost";
      const url = new URL(req.url ?? "/", `http://${host}`);

      if (req.method === "GET" && url.pathname === "/health") {
        json(res, 200, { ok: true, service: "kingshot-bot" });
        return;
      }

      if (req.method !== "POST" || url.pathname !== "/internal/run-control") {
        json(res, 404, { ok: false, error: "Not found." });
        return;
      }

      const auth = req.headers.authorization?.trim() ?? "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      if (!token || token !== secret) {
        json(res, 401, { ok: false, error: "Unauthorized." });
        return;
      }

      const raw = await readBody(req);
      let body: { action?: string; runId?: string };
      try {
        body = JSON.parse(raw) as { action?: string; runId?: string };
      } catch {
        json(res, 400, { ok: false, error: "Invalid JSON." });
        return;
      }

      const action = body.action as ControlAction;
      const runId = String(body.runId ?? "").trim();
      if (!runId) {
        json(res, 400, { ok: false, error: "runId requis." });
        return;
      }

      let result: Awaited<ReturnType<typeof controlPauseRun>>;
      switch (action) {
        case "pause":
          result = await controlPauseRun(runId, scheduler);
          break;
        case "resume":
          result = await controlResumeRun(runId, scheduler);
          break;
        case "stop":
          result = await controlStopRun(runId, scheduler);
          break;
        case "next_phase":
          result = await controlTriggerNextPhase(runId, scheduler);
          break;
        default:
          json(res, 400, { ok: false, error: "action invalide." });
          return;
      }

      if (result.ok) {
        json(res, 200, { ok: true });
      } else {
        json(res, 400, { ok: false, error: result.error });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log.warn("control", "handler error", {
        message,
        stack: e instanceof Error ? e.stack : undefined,
      });
      const safe = message.replace(/[\r\n]+/g, " ").slice(0, 280);
      json(res, 500, {
        ok: false,
        error:
          safe.length > 0
            ? `Erreur serveur bot · ${safe}`
            : "Internal error.",
      });
    }
  });

  server.on("error", (err) => {
    log.error("control", "HTTP server error", {
      message: err instanceof Error ? err.message : String(err),
    });
  });

  server.listen(port, bindHost, () => {
    log.info("control", "API prête (run-control + GET /health)", {
      port,
      bind: bindHost,
    });
  });

  activeServer = server;
}

export function stopHttpControlServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!activeServer) {
      resolve();
      return;
    }
    activeServer.close(() => {
      activeServer = null;
      resolve();
    });
  });
}
