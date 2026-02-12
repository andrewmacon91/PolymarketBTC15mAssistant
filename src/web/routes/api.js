import express from "express";
import { readLastCsvRows, readCsvWithPagination } from "../csvReader.js";

export function createApiRouter(dataStore) {
  const router = express.Router();

  /**
   * GET /api/status
   * Returns bot running status, uptime, and last update time
   */
  router.get("/status", (req, res) => {
    const stats = dataStore.getStats();
    const last = dataStore.getLast();

    res.json({
      status: "running",
      uptime: stats.uptimeMs,
      uptimeFormatted: formatUptime(stats.uptimeMs),
      lastUpdate: last ? last._addedAt : null,
      bufferSize: stats.count,
      bufferMaxSize: stats.maxSize,
      bufferUtilization: stats.utilization.toFixed(2) + "%"
    });
  });

  /**
   * GET /api/current
   * Returns the latest market state, indicators, and recommendation
   */
  router.get("/current", (req, res) => {
    const snapshot = dataStore.getLast();

    if (!snapshot) {
      return res.status(404).json({
        error: "No data available yet"
      });
    }

    res.json(snapshot);
  });

  /**
   * GET /api/history?limit=100&offset=0
   * Returns historical signals from the in-memory data store
   */
  router.get("/history", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;

    const allData = dataStore.getAll();
    const total = allData.length;

    // Apply pagination (offset from the end)
    const start = Math.max(0, total - offset - limit);
    const end = total - offset;
    const rows = allData.slice(start, end);

    res.json({
      rows,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    });
  });

  /**
   * GET /api/history/csv?limit=100
   * Returns historical signals from the CSV file
   */
  router.get("/history/csv", async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;

    try {
      const result = await readCsvWithPagination("./logs/signals.csv", { limit, offset });
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Failed to read CSV file",
        message: error.message
      });
    }
  });

  /**
   * GET /api/performance
   * Returns aggregated performance metrics
   */
  router.get("/performance", (req, res) => {
    const data = dataStore.getAll();

    if (data.length === 0) {
      return res.json({
        totalSignals: 0,
        buyUpCount: 0,
        buyDownCount: 0,
        noTradeCount: 0,
        averageEdgeUp: null,
        averageEdgeDown: null,
        maxEdgeUp: null,
        maxEdgeDown: null,
        positiveEdgeCount: 0,
        regimeDistribution: {}
      });
    }

    let buyUpCount = 0;
    let buyDownCount = 0;
    let noTradeCount = 0;

    let edgeUpSum = 0;
    let edgeUpCount = 0;
    let edgeDownSum = 0;
    let edgeDownCount = 0;

    let maxEdgeUp = -Infinity;
    let maxEdgeDown = -Infinity;
    let positiveEdgeCount = 0;

    const regimeCount = {};

    for (const snapshot of data) {
      // Count signals
      const signal = snapshot.signal;
      if (signal === "BUY UP") buyUpCount++;
      else if (signal === "BUY DOWN") buyDownCount++;
      else noTradeCount++;

      // Aggregate edges
      if (snapshot.edge) {
        if (typeof snapshot.edge.edgeUp === "number" && isFinite(snapshot.edge.edgeUp)) {
          edgeUpSum += snapshot.edge.edgeUp;
          edgeUpCount++;
          maxEdgeUp = Math.max(maxEdgeUp, snapshot.edge.edgeUp);
          if (snapshot.edge.edgeUp > 0) positiveEdgeCount++;
        }

        if (typeof snapshot.edge.edgeDown === "number" && isFinite(snapshot.edge.edgeDown)) {
          edgeDownSum += snapshot.edge.edgeDown;
          edgeDownCount++;
          maxEdgeDown = Math.max(maxEdgeDown, snapshot.edge.edgeDown);
          if (snapshot.edge.edgeDown > 0) positiveEdgeCount++;
        }
      }

      // Count regimes
      const regime = snapshot.regime || snapshot.regimeInfo?.regime || "UNKNOWN";
      regimeCount[regime] = (regimeCount[regime] || 0) + 1;
    }

    res.json({
      totalSignals: data.length,
      buyUpCount,
      buyDownCount,
      noTradeCount,
      averageEdgeUp: edgeUpCount > 0 ? edgeUpSum / edgeUpCount : null,
      averageEdgeDown: edgeDownCount > 0 ? edgeDownSum / edgeDownCount : null,
      maxEdgeUp: maxEdgeUp > -Infinity ? maxEdgeUp : null,
      maxEdgeDown: maxEdgeDown > -Infinity ? maxEdgeDown : null,
      positiveEdgeCount,
      regimeDistribution: regimeCount
    });
  });

  return router;
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
