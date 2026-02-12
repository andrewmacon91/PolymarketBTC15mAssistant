import fs from "node:fs";
import readline from "node:readline";

/**
 * Read the last N rows from a CSV file efficiently
 * @param {string} filePath - Path to the CSV file
 * @param {number} limit - Number of rows to read (default: 100)
 * @returns {Promise<Array>} Array of parsed CSV rows as objects
 */
export async function readLastCsvRows(filePath, limit = 100) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return [];
    }

    const lines = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let header = null;
    let lineCount = 0;

    for await (const line of rl) {
      if (lineCount === 0) {
        header = line.split(",").map(h => h.trim());
        lineCount++;
        continue;
      }

      lines.push(line);
      lineCount++;
    }

    if (!header) {
      return [];
    }

    // Get last N lines
    const lastLines = lines.slice(-limit);

    // Parse into objects
    return lastLines.map(line => {
      const values = line.split(",");
      const obj = {};

      header.forEach((key, index) => {
        const value = values[index] ? values[index].trim() : null;

        // Try to parse as number
        if (value !== null && value !== "" && !isNaN(value)) {
          obj[key] = Number(value);
        } else {
          obj[key] = value;
        }
      });

      return obj;
    });
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Read CSV with pagination support
 * @param {string} filePath - Path to the CSV file
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Object with rows and metadata
 */
export async function readCsvWithPagination(filePath, options = {}) {
  const { limit = 100, offset = 0 } = options;

  try {
    if (!fs.existsSync(filePath)) {
      return { rows: [], total: 0, limit, offset };
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return { rows: [], total: 0, limit, offset };
    }

    const lines = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let header = null;
    let lineCount = 0;

    for await (const line of rl) {
      if (lineCount === 0) {
        header = line.split(",").map(h => h.trim());
        lineCount++;
        continue;
      }

      lines.push(line);
      lineCount++;
    }

    if (!header) {
      return { rows: [], total: 0, limit, offset };
    }

    const total = lines.length;

    // Apply pagination
    const start = Math.max(0, total - offset - limit);
    const end = total - offset;
    const paginatedLines = lines.slice(start, end);

    // Parse into objects
    const rows = paginatedLines.map(line => {
      const values = line.split(",");
      const obj = {};

      header.forEach((key, index) => {
        const value = values[index] ? values[index].trim() : null;

        if (value !== null && value !== "" && !isNaN(value)) {
          obj[key] = Number(value);
        } else {
          obj[key] = value;
        }
      });

      return obj;
    });

    return {
      rows,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error.message);
    return { rows: [], total: 0, limit, offset };
  }
}
