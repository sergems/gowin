import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { logger } from "./logger";
import { liveCache } from "./liveCache";

let wss: WebSocketServer | null = null;

export type WsMessageType =
  | "LIVE_FIXTURE_UPDATE"
  | "LIVE_ODDS_UPDATE"
  | "LIVE_STATS_UPDATE"
  | "CONNECTED"
  | "CASH_OUT_ACCEPTED"
  | "CASH_OUT_UPDATE";

export interface WsMessage {
  type: WsMessageType;
  payload: unknown;
  ts: number;
}

export function attachWebSocketServer(server: Server): void {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    liveCache.setWsConnections(wss!.clients.size);
    logger.debug({ clients: wss!.clients.size }, "WS client connected");

    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        payload: { fixtures: liveCache.getFixtures() },
        ts: Date.now(),
      } satisfies WsMessage),
    );

    ws.on("close", () => {
      liveCache.setWsConnections(wss!.clients.size);
      logger.debug({ clients: wss!.clients.size }, "WS client disconnected");
    });

    ws.on("error", (err) => {
      logger.warn({ err }, "WS client error");
    });
  });

  logger.info("WebSocket server attached on /ws");
}

export function broadcast(type: WsMessageType, payload: unknown): void {
  if (!wss) return;
  const msg = JSON.stringify({ type, payload, ts: Date.now() } satisfies WsMessage);
  let sent = 0;
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
      sent++;
    }
  }
  if (sent > 0) logger.debug({ type, sent }, "WS broadcast");
}

export function getWsClientCount(): number {
  return wss?.clients.size ?? 0;
}
