import { Database } from "@hocuspocus/extension-database";
import { Hocuspocus, type WebSocketLike } from "@hocuspocus/server";
import crossws from "crossws/adapters/bun";
import { db } from "../db/client.ts";
import { documents } from "../db/schema.ts";
import { tokenFromCookieHeader, verifyToken, type TokenPayload } from "../lib/auth.ts";
import { atLeast, getRole, parseDocName } from "../lib/workspaces.ts";
import { eq } from "drizzle-orm";

type Context = { user: TokenPayload; workspaceId: string };

// Yjs collaboration server. Replaces the old y-websocket relay:
// every connection is authenticated and every doc is persisted to Postgres.
// Hocuspocus' own Server class is Node-only, so we run the core on Bun.serve via crossws.
export const hocuspocus = new Hocuspocus<Context>({
  quiet: true,

  async onAuthenticate({ token, requestHeaders, documentName, connectionConfig }) {
    const doc = parseDocName(documentName);
    if (!doc) throw new Error("Unknown document.");

    // browsers send the httpOnly cookie on the upgrade; agents pass a token
    const raw = tokenFromCookieHeader(requestHeaders.get("cookie")) ?? token;
    if (!raw) throw new Error("Authentication required.");
    const user = await verifyToken(raw);

    const role = await getRole(doc.workspaceId, user.sub);
    if (!role) throw new Error("Not a member of this workspace.");
    connectionConfig.readOnly = !atLeast(role, "editor");

    return { user, workspaceId: doc.workspaceId } satisfies Context;
  },

  extensions: [
    new Database({
      async fetch({ documentName }) {
        const row = await db.query.documents.findFirst({
          where: eq(documents.name, documentName),
          columns: { state: true },
        });
        return row?.state ?? null;
      },
      async store({ documentName, state }) {
        const doc = parseDocName(documentName);
        if (!doc) return;
        const bytes = new Uint8Array(state);
        await db
          .insert(documents)
          .values({ name: documentName, workspaceId: doc.workspaceId, kind: doc.kind, state: bytes })
          .onConflictDoUpdate({ target: documents.name, set: { state: bytes, updatedAt: new Date() } });
      },
    }),
  ],
});

type HocuspocusPeer = { _hocuspocus?: ReturnType<typeof hocuspocus.handleConnection> };

// same wiring as Hocuspocus' Server, with the Bun adapter instead of Node's
export const collabWs = crossws({
  hooks: {
    open(peer) {
      // crossws' peer.websocket is a proxy whose methods lose Bun's `this`,
      // so hand Hocuspocus a small adapter that goes through the peer instead
      const socket: WebSocketLike = {
        send: (data) => void peer.send(data),
        close: (code, reason) => peer.close(code, reason),
        get readyState() {
          return peer.websocket.readyState ?? WebSocket.CLOSED;
        },
      };
      (peer as HocuspocusPeer)._hocuspocus = hocuspocus.handleConnection(socket, peer.request);
    },
    message(peer, message) {
      (peer as HocuspocusPeer)._hocuspocus?.handleMessage(message.uint8Array());
    },
    // Bun pings idle sockets; a pong keeps quiet-but-alive clients from timing out
    pong(peer) {
      (peer as HocuspocusPeer)._hocuspocus?.touch();
    },
    close(peer, event) {
      (peer as HocuspocusPeer)._hocuspocus?.handleClose({ code: event.code ?? 1000, reason: event.reason ?? "" });
    },
    error(peer, error) {
      console.error(`[collab] socket error for peer ${peer.id}`, error);
    },
  },
});

export async function closeCollab() {
  hocuspocus.closeConnections();
  hocuspocus.flushPendingStores();
  await Promise.all([...hocuspocus.unloadingDocuments.values()]);
}
