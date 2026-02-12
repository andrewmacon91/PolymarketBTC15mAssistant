/**
 * WebSocket client with automatic reconnection
 */
class WSClient {
  constructor(url, options = {}) {
    this.url = url || this.getWebSocketUrl();
    this.options = {
      reconnectInterval: 1000,
      maxReconnectInterval: 30000,
      reconnectDecay: 1.5,
      maxReconnectAttempts: Infinity,
      ...options
    };

    this.ws = null;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.forcedClose = false;
    this.listeners = new Map();

    this.connect();
  }

  /**
   * Generate WebSocket URL from current window location
   */
  getWebSocketUrl() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.emit("connecting");

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("[WebSocket] Connected");
        this.reconnectAttempts = 0;
        this.emit("connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log("[WebSocket] Disconnected", event.code, event.reason);
        this.emit("disconnected");

        if (!this.forcedClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        this.emit("error", error);
      };
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      this.emit("error", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error("[WebSocket] Max reconnection attempts reached");
      this.emit("max_reconnect_attempts");
      return;
    }

    this.reconnectAttempts++;

    const timeout = Math.min(
      this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts - 1),
      this.options.maxReconnectInterval
    );

    console.log(`[WebSocket] Reconnecting in ${Math.round(timeout / 1000)}s (attempt ${this.reconnectAttempts})...`);
    this.emit("reconnecting", { attempt: this.reconnectAttempts, timeout });

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, timeout);
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(message) {
    const { type, data } = message;

    if (type === "snapshot" || type === "update") {
      this.emit("data", data);
    } else if (type === "pong") {
      this.emit("pong", data);
    } else {
      this.emit("message", message);
    }
  }

  /**
   * Send message to server
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("[WebSocket] Cannot send, not connected");
    }
  }

  /**
   * Send ping to server
   */
  ping() {
    this.send({ type: "ping", timestamp: Date.now() });
  }

  /**
   * Close WebSocket connection
   */
  close() {
    this.forcedClose = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.emit("closed");
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);

    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;

    this.listeners.get(event).forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WebSocket] Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Get connection state
   */
  getState() {
    if (!this.ws) return "CLOSED";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "OPEN";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "CLOSED";
      default:
        return "UNKNOWN";
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}
