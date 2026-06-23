import { WebSocketServer } from "ws";
import { fileURLToPath } from "url";
import { setupWSConnection } from "@y/websocket-server/utils";
import dotenv from "dotenv";
import path from "path";
 
// load env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({path: path.resolve(__dirname,"../../.env")});

// config websocket
const WEBSOCKET_PORT: number = Number(process.env.VITE_WEBSOCKET_PORT);
const wss: WebSocketServer = new WebSocketServer({port: WEBSOCKET_PORT});

// make connection
wss.on("connection", (conn, req) => {
    setupWSConnection(conn, req)
});

// log
console.log(`WebSocket server listening on ws://localhost:${WEBSOCKET_PORT}`);