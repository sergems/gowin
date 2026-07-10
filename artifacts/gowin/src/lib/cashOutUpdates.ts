/**
 * Singleton WebSocket listener for live Cash-Out push updates.
 *
 * Manages a single WS connection shared by all CashOutButton instances on the
 * page. When the server broadcasts CASH_OUT_UPDATE (a privacy-safe sequence
 * signal with no bet IDs) the event is re-dispatched as a window CustomEvent
 * so every mounted CashOutButton immediately re-fetches its own offer.
 *
 * Usage in a component:
 *   useEffect(() => {
 *     const unsub = subscribeCashOutUpdates();
 *     const unlisten = onCashOutUpdate(() => refetch());
 *     return () => { unlisten(); unsub(); };
 *   }, [refetch]);
 */

const WS_EVENT = "co_update";

let ws: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let refCount = 0;

function connect() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${proto}//${window.location.host}/ws`);

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string) as { type: string; payload: { seq?: number; ts?: number } };
      if (msg.type === "CASH_OUT_UPDATE") {
        window.dispatchEvent(new CustomEvent(WS_EVENT, { detail: msg.payload }));
      }
    } catch {
      // ignore malformed frames
    }
  };

  ws.onclose = () => {
    ws = null;
    if (refCount > 0) {
      retryTimer = setTimeout(connect, 3000);
    }
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function disconnect() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (ws) {
    ws.onclose = null; // prevent auto-retry on intentional close
    ws.close();
    ws = null;
  }
}

/** Increment the connection ref-count; returns a cleanup function that decrements it. */
export function subscribeCashOutUpdates(): () => void {
  refCount++;
  if (refCount === 1) connect();
  return () => {
    refCount--;
    if (refCount === 0) disconnect();
  };
}

/**
 * Register a callback that fires whenever the server pushes a CASH_OUT_UPDATE
 * signal. The callback should re-fetch the component's own cash-out offer.
 * Returns an unsubscribe function.
 */
export function onCashOutUpdate(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(WS_EVENT, handler);
  return () => window.removeEventListener(WS_EVENT, handler);
}
