import { WebSocketServer } from "ws";
// @ts-ignore - y-websocket@1.5 ships no .d.ts for bin/utils (runtime is fine, yjs@13)
import { setupWSConnection } from "y-websocket/bin/utils";
import { env } from "./config/env.js";
import app from "./app.js";

// ── Express HTTP server ────────────────
app.listen(env.PORT, () => {
  console.log(`HTTP  server listening on http://localhost:${env.PORT}`);
});

// ── WebSocket server ───────────────────
const wss: WebSocketServer = new WebSocketServer({ port: env.WEBSOCKET_PORT });

wss.on("connection", (conn, req) => {
  setupWSConnection(conn, req);
});

console.log(`WS    server listening on ws://localhost:${env.WEBSOCKET_PORT}`);