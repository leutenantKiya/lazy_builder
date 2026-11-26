import app from "./app.ts";
import { closeCollab, collabWs } from "./collab/server.ts";
import { env } from "./config/env.ts";
import { sql } from "./db/client.ts";

// ── HTTP API (Hono on Bun) ─────────────
const http = Bun.serve({ port: env.PORT, fetch: app.fetch });
console.log(`HTTP    listening on ${http.url}`);

// ── Collaboration (Hocuspocus / Yjs) ───
const collab = Bun.serve({
  port: env.COLLAB_PORT,
  // cap what a single (possibly unauthenticated) socket can make us buffer
  websocket: { ...collabWs.websocket, maxPayloadLength: 8 * 1024 * 1024 },
  async fetch(req, server) {
    // undefined means Bun took over the socket
    if (req.headers.get("upgrade")?.toLowerCase() === "websocket") return collabWs.handleUpgrade(req, server);
    return new Response("Upgrade required.", { status: 426 });
  },
});
console.log(`Collab  listening on ws://localhost:${collab.port}`);

async function shutdown() {
  // flush pending Yjs writes before the DB pool closes
  await closeCollab();
  collab.stop();
  http.stop();
  await sql.end({ timeout: 5 });
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
