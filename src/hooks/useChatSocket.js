import { useEffect, useRef } from "react";

const RECONNECT_DELAY_MS = 2000;

// Live delivery for Chat.jsx - progressive enhancement, not a hard dependency. If the socket never connects or drops for good, the page still works exactly as it did before this hook existed (fetch-on-open/refresh is the correctness backstop), so failures here are silent, never user-facing.
export function useChatSocket({ enabled, onMessage, onDateAccepted, onRead }) {
  // Kept in a ref so the effect below doesn't need these in its dependency array - unmemoized callback identities changing on every Chat.jsx render shouldn't tear down and reopen the connection.
  const handlersRef = useRef({ onMessage, onDateAccepted, onRead });
  handlersRef.current = { onMessage, onDateAccepted, onRead };

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let retried = false;
    let ws;

    // Opens one connection and wires up its handlers; called again once, after a short delay, on an unexpected close.
    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // WebSocket Deilverable: Frontend makes WebSocket connection
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        // Every handler is optional so a caller can subscribe to only the frames it cares about, and an unrecognised type is simply ignored rather than throwing.
        const { onMessage, onDateAccepted, onRead } = handlersRef.current;
        if (data.type === "message") onMessage?.(data.matchId, data.message);
        else if (data.type === "dateAccepted") onDateAccepted?.(data.matchId, data.messageId, data.acceptedBy);
        else if (data.type === "read") onRead?.(data.matchId);
      };

      ws.onclose = () => {
        if (cancelled || retried) return;
        retried = true;
        setTimeout(() => {
          if (!cancelled) connect();
        }, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [enabled]);
}
