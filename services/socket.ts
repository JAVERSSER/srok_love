import { SOCKETS_AVAILABLE } from "@/constants/api";

// A WebSocket to the Django Channels backend that reconnects with backoff
// until closed. Auth rides on the session cookies, which the browser and
// React Native's native WebSocket send automatically.

export type SocketStatus = "connecting" | "open" | "closed" | "unavailable";

export interface LiveSocket {
  /** Sends a JSON payload. Returns false if the socket isn't open. */
  send: (payload: unknown) => boolean;
  close: () => void;
}

const MAX_BACKOFF_MS = 30000;

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

  const connect = () => {
    onStatus?.("connecting");
    try {
      ws = new WebSocket(url);
    } catch {
      onStatus?.("unavailable");
      return;
    }
    ws.onopen = () => {
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
    ws.onclose = () => {
      ws = null;
      if (closed) return;
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
