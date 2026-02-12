import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApiRouter } from "./routes/api.js";
import { createWebSocketServer } from "./routes/ws.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Start the web server with Express and WebSocket support
 * @param {Object} options - Server configuration
 * @returns {Object} Server instance and broadcast function
 */
export function startWebServer(options = {}) {
  const {
    dataStore,
    port = 3000,
    host = "localhost"
  } = options;

  if (!dataStore) {
    throw new Error("dataStore is required");
  }

  const app = express();

  // Middleware
  app.use(express.json());

  // CORS headers for API
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  // Serve static files from public directory
  const publicPath = path.join(__dirname, "..", "public");
  app.use(express.static(publicPath));

  // API routes
  app.use("/api", createApiRouter(dataStore));

  // Fallback to index.html for SPA routing
  app.get("*", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server
  const wsServer = createWebSocketServer(httpServer, dataStore);

  // Start listening
  httpServer.listen(port, host, () => {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Web dashboard available at http://${host}:${port}`);
    console.log(`${"=".repeat(60)}\n`);
  });

  // Error handling
  httpServer.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`\n[Web Server] Port ${port} is already in use.`);
      console.error(`Please set WEB_PORT environment variable to a different port.\n`);
    } else {
      console.error("[Web Server] Error:", error.message);
    }
  });

  return {
    app,
    httpServer,
    wsServer,
    broadcast: wsServer.broadcast,
    getClientCount: wsServer.getClientCount,
    close: () => {
      return new Promise((resolve) => {
        wsServer.wss.close(() => {
          httpServer.close(() => {
            resolve();
          });
        });
      });
    }
  };
}
