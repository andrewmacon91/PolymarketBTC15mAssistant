import { WebSocketServer } from "ws";

/**
 * Create and configure WebSocket server for real-time updates
 * @param {Object} httpServer - HTTP server instance
 * @param {Object} dataStore - Data store instance
 * @returns {Object} WebSocket server with broadcast function
 */
export function createWebSocketServer(httpServer, dataStore) {
  const wss = new WebSocketServer({ server: httpServer });

  const clients = new Set();

  wss.on("connection", (ws, req) => {
    console.log(`[WebSocket] Client connected from ${req.socket.remoteAddress}`);
    clients.add(ws);

    // Send current state immediately on connection
    const current = dataStore.getLast();
    if (current) {
      try {
        ws.send(JSON.stringify({
          type: "snapshot",
          data: current
        }));
      } catch (error) {
        console.error("[WebSocket] Error sending initial data:", error.message);
      }
    }

    // Setup heartbeat/ping-pong
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Handle incoming messages
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle ping
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (error) {
        console.error("[WebSocket] Error handling message:", error.message);
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      console.log("[WebSocket] Client disconnected");
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("[WebSocket] Client error:", error.message);
      clients.delete(ws);
    });
  });

  // Heartbeat interval - ping clients every 30 seconds
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  /**
   * Broadcast data to all connected clients
   * @param {Object} data - Data to broadcast
   */
  function broadcast(data) {
    const message = JSON.stringify({
      type: "update",
      data,
      timestamp: Date.now()
    });

    let successCount = 0;
    let failCount = 0;

    clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          console.error("[WebSocket] Error broadcasting to client:", error.message);
          failCount++;
        }
      }
    });

    if (failCount > 0) {
      console.log(`[WebSocket] Broadcast: ${successCount} success, ${failCount} failed`);
    }
  }

  return {
    wss,
    broadcast,
    getClientCount: () => clients.size
  };
}
