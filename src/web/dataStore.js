/**
 * Ring buffer data store for real-time bot snapshots
 * Stores a fixed number of most recent snapshots in memory
 */
export class DataStore {
  constructor(maxSize = 3600) {
    this.maxSize = maxSize;
    this.buffer = [];
    this.startTime = Date.now();
  }

  /**
   * Add a new snapshot to the buffer
   * @param {Object} snapshot - Complete state snapshot from the bot
   */
  add(snapshot) {
    const timestampedSnapshot = {
      ...snapshot,
      timestamp: Date.now(),
      _addedAt: new Date().toISOString()
    };

    this.buffer.push(timestampedSnapshot);

    // Remove oldest if buffer exceeds max size
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * Get the most recent N snapshots
   * @param {number} count - Number of snapshots to retrieve
   * @returns {Array} Array of snapshots (most recent last)
   */
  getRecent(count = 100) {
    if (count >= this.buffer.length) {
      return [...this.buffer];
    }
    return this.buffer.slice(-count);
  }

  /**
   * Get all snapshots in the buffer
   * @returns {Array} All snapshots
   */
  getAll() {
    return [...this.buffer];
  }

  /**
   * Get the most recent snapshot
   * @returns {Object|null} Latest snapshot or null if buffer is empty
   */
  getLast() {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  /**
   * Get buffer statistics
   * @returns {Object} Stats about the buffer
   */
  getStats() {
    return {
      count: this.buffer.length,
      maxSize: this.maxSize,
      utilization: (this.buffer.length / this.maxSize) * 100,
      uptimeMs: Date.now() - this.startTime,
      oldestTimestamp: this.buffer.length > 0 ? this.buffer[0].timestamp : null,
      newestTimestamp: this.buffer.length > 0 ? this.buffer[this.buffer.length - 1].timestamp : null
    };
  }

  /**
   * Clear all data from the buffer
   */
  clear() {
    this.buffer = [];
  }
}
