import { HocuspocusProvider } from '@hocuspocus/provider';
import type * as Y from 'yjs';

// dev: Vite proxies /collab to the Hocuspocus server (see vite.config.ts).
// prod: put the same path behind your reverse proxy, or set VITE_COLLAB_URL.
const COLLAB_URL =
  import.meta.env.VITE_COLLAB_URL ||
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/collab`;

// auth is the httpOnly cookie sent on the WebSocket upgrade, so no token here
export function connectDoc(name: string, document: Y.Doc) {
  return new HocuspocusProvider({ url: COLLAB_URL, name, document });
}
