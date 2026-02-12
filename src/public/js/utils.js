/**
 * Utility functions for the dashboard
 */

/**
 * Format a number with commas and decimals
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined || !isFinite(num)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * Format a currency value
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted currency
 */
function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined || !isFinite(value)) {
    return "-";
  }

  return "$" + formatNumber(value, decimals);
}

/**
 * Format a percentage
 * @param {number} value - Value as decimal (0.15 = 15%)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || !isFinite(value)) {
    return "-";
  }

  return (value * 100).toFixed(decimals) + "%";
}

/**
 * Format probability as percentage
 * @param {number} prob - Probability (0-1)
 * @returns {string} Formatted probability
 */
function formatProbability(prob) {
  if (prob === null || prob === undefined || !isFinite(prob)) {
    return "-";
  }

  return Math.round(prob * 100) + "%";
}

/**
 * Format time remaining as MM:SS
 * @param {number} minutes - Minutes remaining
 * @returns {string} Formatted time
 */
function formatTimeRemaining(minutes) {
  if (minutes === null || minutes === undefined || !isFinite(minutes)) {
    return "-";
  }

  const totalSeconds = Math.max(0, Math.floor(minutes * 60));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Format a timestamp
 * @param {string|number} timestamp - ISO string or Unix timestamp
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return "-";

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

/**
 * Get color class based on narrative (UP/DOWN)
 * @param {string} narrative - LONG, SHORT, or NEUTRAL
 * @returns {string} CSS class name
 */
function getNarrativeColor(narrative) {
  if (!narrative) return "neutral";

  const n = String(narrative).toUpperCase();
  if (n === "LONG" || n === "UP") return "up";
  if (n === "SHORT" || n === "DOWN") return "down";
  return "neutral";
}

/**
 * Get time left color class based on minutes
 * @param {number} minutes - Minutes remaining
 * @returns {string} CSS class name
 */
function getTimeLeftColor(minutes) {
  if (minutes === null || minutes === undefined || !isFinite(minutes)) {
    return "";
  }

  if (minutes >= 10) return "good";
  if (minutes >= 5) return "warning";
  return "danger";
}

/**
 * Calculate time ago from timestamp
 * @param {number} timestamp - Unix timestamp in ms
 * @returns {string} Time ago string
 */
function timeAgo(timestamp) {
  if (!timestamp) return "-";

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return "just now";

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Safely get nested property from object
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot-separated path (e.g., "market.prices.up")
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Value at path or default
 */
function getNestedProperty(obj, path, defaultValue = null) {
  if (!obj || !path) return defaultValue;

  const keys = path.split(".");
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current;
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
