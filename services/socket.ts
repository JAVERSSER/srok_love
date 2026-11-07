import { Platform } from "react-native";
import { SOCKETS_AVAILABLE, SOCKET_ORIGIN } from "@/constants/api";
import { checkSession, ensureFreshSession, expireSession } from "@/services/api";

// A WebSocket to the Django Channels backend that reconnects with backoff
// until closed. Auth rides on the session cookies, which the browser and
// React Native's native WebSocket send automatically.

// "ended": the server closed a chat for good (unmatch or block). Don't stay on it.
export type SocketStatus = "connecting" | "open" | "closed" | "unavailable" | "ended";

export interface LiveSocket {
  /** Sends a JSON payload. Returns false if the socket isn't open. */
  send: (payload: unknown) => boolean;
  close: () => void;
}

const MAX_BACKOFF_MS = 30000;

// Close codes from the backend. Neither is worth reconnecting after.
const CLOSE_LOGGED_OUT = 4001; // new login elsewhere, logout, or password reset
const CLOSE_CHAT_ENDED = 4003; // unmatch or block

// Browsers set Origin themselves; the backend refuses native apps without one.
function createSocket(url: string): WebSocket {
  if (Platform.OS === "web") return new WebSocket(url);
  const NativeWebSocket = WebSocket as unknown as new (
    url: string,
    protocols: string[] | null,
    options: { headers: Record<string, string> }
  ) => WebSocket;
  return new NativeWebSocket(url, null, { headers: { origin: SOCKET_ORIGIN } });
}

export function openSocket(
  url: string,
  onMessage: (data: Record<string, unknown>) => void,
  onStatus?: (status: SocketStatus) => void
): LiveSocket {
  if (!SOCKETS_AVAILABLE) {
    onStatus?.("unavailable");
    return { send: () => false, close: () => {} };
  }

  let ws: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const connect = async () => {
    onStatus?.("connecting");
    const sessionValid = await ensureFreshSession();
    if (!sessionValid || closed) return;
    let opened = false;
    try {
      ws = createSocket(url);
    } catch {
      onStatus?.("unavailable");
      return;
    }
    ws.onopen = () => {
      opened = true;
      attempt = 0;
      onStatus?.("open");
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(String(e.data));
        if (data && typeof data === "object") onMessage(data);
      } catch {
        // ignore non-JSON frames
      }
    };
    ws.onclose = (e) => {
      ws = null;
      if (closed) return;
      if (e.code === CLOSE_LOGGED_OUT) {
        closed = true;
        expireSession();
        return;
      }
      if (e.code === CLOSE_CHAT_ENDED) {
        closed = true;
        onStatus?.("ended");
        return;
      }
      // A refused handshake looks like any other drop here, and an expired
      // access cookie is one cause. An API call refreshes the cookies so the
      // retry below can succeed, or logs out if the session is really gone.
      if (!opened) checkSession();
      onStatus?.("closed");
      const delay = Math.min(1000 * 2 ** attempt++, MAX_BACKOFF_MS);
      retry = setTimeout(connect, delay);
    };
  };

  connect();

  return {
    send: (payload) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify(payload));
      return true;
    },
    close: () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    },
  };
}
