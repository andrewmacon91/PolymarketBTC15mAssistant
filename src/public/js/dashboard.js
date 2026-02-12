/**
 * Main dashboard application
 */

class Dashboard {
  constructor() {
    this.wsClient = null;
    this.chartManager = null;
    this.signalHistory = [];
    this.maxSignalHistory = 50;
    this.lastUpdateTime = null;
    this.performanceCache = null;
  }

  /**
   * Initialize the dashboard
   */
  async init() {
    console.log("[Dashboard] Initializing...");

    // Initialize chart manager
    this.chartManager = new ChartManager();
    this.chartManager.initCharts();

    // Initialize WebSocket client
    this.wsClient = new WSClient();
    this.setupWebSocketListeners();

    // Fetch initial data
    await this.fetchInitialData();

    // Start update timer
    this.startUpdateTimer();

    // Fetch performance metrics periodically
    setInterval(() => this.fetchPerformanceMetrics(), 10000); // Every 10 seconds

    console.log("[Dashboard] Initialized successfully");
  }

  /**
   * Setup WebSocket event listeners
   */
  setupWebSocketListeners() {
    this.wsClient.on("connecting", () => {
      this.updateConnectionStatus("connecting");
    });

    this.wsClient.on("connected", () => {
      this.updateConnectionStatus("connected");
    });

    this.wsClient.on("disconnected", () => {
      this.updateConnectionStatus("disconnected");
    });

    this.wsClient.on("reconnecting", (data) => {
      this.updateConnectionStatus("reconnecting", data);
    });

    this.wsClient.on("data", (data) => {
      this.handleDataUpdate(data);
    });

    this.wsClient.on("error", (error) => {
      console.error("[Dashboard] WebSocket error:", error);
    });
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(status, data = null) {
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");

    if (!statusDot || !statusText) return;

    statusDot.className = "status-dot";

    switch (status) {
      case "connected":
        statusDot.classList.add("connected");
        statusText.textContent = "Connected";
        break;
      case "disconnected":
        statusDot.classList.add("disconnected");
        statusText.textContent = "Disconnected";
        break;
      case "reconnecting":
        statusDot.classList.add("reconnecting");
        const attempt = data?.attempt || 0;
        statusText.textContent = `Reconnecting... (${attempt})`;
        break;
      default:
        statusText.textContent = "Connecting...";
    }
  }

  /**
   * Handle incoming data update from WebSocket
   */
  handleDataUpdate(data) {
    this.lastUpdateTime = Date.now();

    // Update market info
    this.updateMarketInfo(data);

    // Update prices
    this.updatePrices(data);

    // Update recommendation
    this.updateRecommendation(data);

    // Update indicators
    this.updateIndicators(data);

    // Update charts
    this.chartManager.updateAll(data);

    // Add to signal history if it's a new signal
    this.addToSignalHistory(data);
  }

  /**
   * Fetch initial data from API
   */
  async fetchInitialData() {
    try {
      // Fetch current state
      const response = await fetch("/api/current");
      if (response.ok) {
        const data = await response.json();
        this.handleDataUpdate(data);
      }

      // Fetch recent history
      const historyResponse = await fetch("/api/history?limit=50");
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        this.signalHistory = historyData.rows || [];
        this.renderSignalTable();
      }

      // Fetch performance metrics
      await this.fetchPerformanceMetrics();
    } catch (error) {
      console.error("[Dashboard] Error fetching initial data:", error);
    }
  }

  /**
   * Update market info section
   */
  updateMarketInfo(data) {
    const question = data.market?.question || "-";
    const slug = data.market?.slug || "-";
    const timeLeftMin = data.market?.timeLeftMin;
    const liquidity = data.market?.liquidity;

    this.updateElement("marketQuestion", question);
    this.updateElement("marketSlug", slug);

    if (timeLeftMin !== null && timeLeftMin !== undefined) {
      const timeLeftEl = document.getElementById("timeLeft");
      if (timeLeftEl) {
        timeLeftEl.textContent = formatTimeRemaining(timeLeftMin);
        timeLeftEl.className = "time-left " + getTimeLeftColor(timeLeftMin);
      }
    }

    if (liquidity !== null && liquidity !== undefined) {
      this.updateElement("liquidity", formatCurrency(liquidity, 0));
    }
  }

  /**
   * Update prices section
   */
  updatePrices(data) {
    const binancePrice = data.prices?.binanceSpot;
    const currentPrice = data.prices?.chainlinkCurrent;
    const priceToBeat = data.prices?.priceToBeat;

    if (binancePrice !== null && binancePrice !== undefined) {
      this.updateElement("binancePrice", formatCurrency(binancePrice, 0));
    }

    if (currentPrice !== null && currentPrice !== undefined) {
      this.updateElement("currentPrice", formatCurrency(currentPrice, 2));

      // Calculate difference from price to beat
      if (priceToBeat !== null && priceToBeat !== undefined) {
        const diff = currentPrice - priceToBeat;
        const diffText = diff >= 0 ? `+${formatCurrency(diff, 2)}` : formatCurrency(diff, 2);
        const diffClass = diff >= 0 ? "up" : "down";
        this.updateElement("currentPriceVsPTB", diffText, diffClass);
      }
    }

    if (priceToBeat !== null && priceToBeat !== undefined) {
      this.updateElement("priceToBeat", formatCurrency(priceToBeat, 0));
    }
  }

  /**
   * Update recommendation section
   */
  updateRecommendation(data) {
    const rec = data.recommendation || {};
    const action = rec.action || "NO_TRADE";
    const side = rec.side || "-";
    const phase = rec.phase || "-";
    const strength = rec.strength || "-";

    const recActionEl = document.getElementById("recAction");
    const recCard = document.getElementById("recommendationCard");

    if (action === "ENTER") {
      const signal = side === "UP" ? "BUY UP" : side === "DOWN" ? "BUY DOWN" : "ENTER";
      recActionEl.textContent = signal;
      recActionEl.className = "recommendation-action " + (side === "UP" ? "buy-up" : "buy-down");
    } else {
      recActionEl.textContent = "NO TRADE";
      recActionEl.className = "recommendation-action no-trade";
    }

    this.updateElement("recSide", side);
    this.updateElement("recPhase", phase);
    this.updateElement("recStrength", strength);
  }

  /**
   * Update indicators section
   */
  updateIndicators(data) {
    const indicators = data.indicators || {};
    const probabilities = data.probabilities || {};
    const edge = data.edge || {};

    // Model predictions
    this.updateElement("modelUp", formatProbability(probabilities.modelUp), "up");
    this.updateElement("modelDown", formatProbability(probabilities.modelDown), "down");

    // Market prices
    if (probabilities.marketUp !== null && probabilities.marketUp !== undefined) {
      this.updateElement("marketUp", probabilities.marketUp + "¢", "up");
    }
    if (probabilities.marketDown !== null && probabilities.marketDown !== undefined) {
      this.updateElement("marketDown", probabilities.marketDown + "¢", "down");
    }

    // Edge
    if (edge.edgeUp !== null && edge.edgeUp !== undefined) {
      const edgeUpClass = edge.edgeUp > 0 ? "up" : edge.edgeUp < 0 ? "down" : "neutral";
      this.updateElement("edgeUp", formatPercentage(edge.edgeUp, 2), edgeUpClass);
    }
    if (edge.edgeDown !== null && edge.edgeDown !== undefined) {
      const edgeDownClass = edge.edgeDown > 0 ? "up" : edge.edgeDown < 0 ? "down" : "neutral";
      this.updateElement("edgeDown", formatPercentage(edge.edgeDown, 2), edgeDownClass);
    }

    // Technical indicators
    if (indicators.rsi !== null && indicators.rsi !== undefined) {
      const rsiText = formatNumber(indicators.rsi, 1);
      const rsiArrow = indicators.rsiSlope > 0 ? " ↑" : indicators.rsiSlope < 0 ? " ↓" : "";
      this.updateElement("rsi", rsiText + rsiArrow);
    }

    if (indicators.macd) {
      const macd = indicators.macd;
      const macdText = macd.hist < 0 ? "Bearish" : "Bullish";
      const macdClass = macd.hist < 0 ? "down" : "up";
      this.updateElement("macd", macdText, macdClass);
    }

    if (indicators.vwap !== null && indicators.vwap !== undefined) {
      const vwapText = formatCurrency(indicators.vwap, 0);
      const slopeText = indicators.vwapSlope > 0 ? " ↑" : indicators.vwapSlope < 0 ? " ↓" : "";
      this.updateElement("vwap", vwapText + slopeText);
    }

    if (indicators.heikenAshi) {
      const ha = indicators.heikenAshi;
      const haText = `${ha.color || "-"} x${ha.count || 0}`;
      const haClass = (ha.color || "").toLowerCase() === "green" ? "up" : (ha.color || "").toLowerCase() === "red" ? "down" : "neutral";
      this.updateElement("heikenAshi", haText, haClass);
    }
  }

  /**
   * Add data to signal history
   */
  addToSignalHistory(data) {
    // Only add if signal is not NO TRADE or if it's a new entry
    const signal = data.signal || "NO TRADE";

    const historyEntry = {
      timestamp: data.timestamp,
      signal,
      modelUp: data.probabilities?.modelUp,
      modelDown: data.probabilities?.modelDown,
      marketUp: data.probabilities?.marketUp,
      marketDown: data.probabilities?.marketDown,
      edgeUp: data.edge?.edgeUp,
      edgeDown: data.edge?.edgeDown,
      regime: data.regime
    };

    // Add to beginning of array
    this.signalHistory.unshift(historyEntry);

    // Keep only last N entries
    if (this.signalHistory.length > this.maxSignalHistory) {
      this.signalHistory.pop();
    }

    // Re-render table (debounced)
    if (!this.renderTableTimeout) {
      this.renderTableTimeout = setTimeout(() => {
        this.renderSignalTable();
        this.renderTableTimeout = null;
      }, 1000);
    }
  }

  /**
   * Render signal history table
   */
  renderSignalTable() {
    const tbody = document.getElementById("signalTableBody");
    if (!tbody) return;

    if (this.signalHistory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center">No signals yet</td></tr>';
      return;
    }

    tbody.innerHTML = this.signalHistory
      .map((entry) => {
        const signalClass = entry.signal === "BUY UP" ? "signal-buy-up" : entry.signal === "BUY DOWN" ? "signal-buy-down" : "signal-no-trade";

        return `
          <tr>
            <td>${formatTimestamp(entry.timestamp)}</td>
            <td class="${signalClass}">${entry.signal}</td>
            <td class="up">${formatProbability(entry.modelUp)}</td>
            <td class="down">${formatProbability(entry.modelDown)}</td>
            <td class="up">${entry.marketUp !== null ? entry.marketUp + "¢" : "-"}</td>
            <td class="down">${entry.marketDown !== null ? entry.marketDown + "¢" : "-"}</td>
            <td>${formatPercentage(entry.edgeUp, 2)}</td>
            <td>${formatPercentage(entry.edgeDown, 2)}</td>
            <td>${entry.regime || "-"}</td>
          </tr>
        `;
      })
      .join("");
  }

  /**
   * Fetch and display performance metrics
   */
  async fetchPerformanceMetrics() {
    try {
      const response = await fetch("/api/performance");
      if (!response.ok) return;

      const data = await response.json();
      this.performanceCache = data;

      this.updateElement("totalSignals", formatNumber(data.totalSignals, 0));
      this.updateElement("buyUpCount", formatNumber(data.buyUpCount, 0));
      this.updateElement("buyDownCount", formatNumber(data.buyDownCount, 0));
      this.updateElement("avgEdgeUp", formatPercentage(data.averageEdgeUp, 2));
      this.updateElement("avgEdgeDown", formatPercentage(data.averageEdgeDown, 2));
      this.updateElement("positiveEdgeCount", formatNumber(data.positiveEdgeCount, 0));
    } catch (error) {
      console.error("[Dashboard] Error fetching performance metrics:", error);
    }
  }

  /**
   * Start update timer for "last updated" text
   */
  startUpdateTimer() {
    setInterval(() => {
      if (this.lastUpdateTime) {
        const lastUpdatedEl = document.getElementById("lastUpdated");
        if (lastUpdatedEl) {
          lastUpdatedEl.textContent = timeAgo(this.lastUpdateTime);
        }
      }
    }, 1000);
  }

  /**
   * Update DOM element with text and optional class
   */
  updateElement(id, text, className = null) {
    const el = document.getElementById(id);
    if (!el) return;

    el.textContent = text;

    if (className) {
      el.className = className;
    }
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = new Dashboard();
  dashboard.init();
});
