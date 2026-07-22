import { useEffect, useRef } from "react";

const RECONNECT_DELAY_MS = 2000;

// Live delivery for Chat.jsx - progressive enhancement, not a hard dependency. If the socket never connects or drops for good, the page still works exactly as it did before this hook existed (fetch-on-open/refresh is the correctness backstop), so failures here are silent, never user-facing.
export function useChatSocket({ enabled, onMessage }) {
  // Kept in a ref so the effect below doesn't need `onMessage` in its dependency array - an unmemoized callback identity changing on every Chat.jsx render shouldn't tear down and reopen the connection.
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let retried = false;
    let ws;

    // Opens one connection and wires up its handlers; called again once, after a short delay, on an unexpected close.
    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === "message") {
          onMessageRef.current(data.matchId, data.message);
        }
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
