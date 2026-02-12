#!/usr/bin/env node
/**
 * Smoke Test for PolymarketBTC15mAssistant
 * Tests core functionality to ensure the bot is working correctly
 */

import { CONFIG } from "../src/config.js";
import { fetchKlines, fetchLastPrice } from "../src/data/binance.js";
import { fetchChainlinkBtcUsd } from "../src/data/chainlink.js";
import { fetchLiveEventsBySeriesId, flattenEventMarkets, pickLatestLiveMarket } from "../src/data/polymarket.js";
import { computeRsi } from "../src/indicators/rsi.js";
import { computeMacd } from "../src/indicators/macd.js";
import { computeSessionVwap } from "../src/indicators/vwap.js";
import { DataStore } from "../src/web/dataStore.js";
import { startWebServer } from "../src/web/server.js";

// ANSI colors for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

let testsPassed = 0;
let testsFailed = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.cyan}[TEST] ${name}${colors.reset}`);
}

function logPass(message) {
  testsPassed++;
  log(`  ✓ ${message}`, colors.green);
}

function logFail(message, error) {
  testsFailed++;
  log(`  ✗ ${message}`, colors.red);
  if (error) {
    log(`    Error: ${error.message}`, colors.red);
  }
}

function logInfo(message) {
  log(`  ℹ ${message}`, colors.blue);
}

async function testBinanceAPI() {
  logTest("Binance API");

  try {
    // Test fetching last price
    const lastPrice = await fetchLastPrice();
    if (lastPrice && typeof lastPrice === "number" && lastPrice > 0) {
      logPass(`Fetch last price: $${lastPrice.toLocaleString()}`);
    } else {
      logFail("Fetch last price returned invalid data");
    }

    // Test fetching klines
    const klines = await fetchKlines({ interval: "1m", limit: 10 });
    if (Array.isArray(klines) && klines.length > 0) {
      logPass(`Fetch klines: ${klines.length} candles received`);
      logInfo(`Latest close: $${klines[klines.length - 1].close.toLocaleString()}`);
    } else {
      logFail("Fetch klines returned invalid data");
    }
  } catch (error) {
    logFail("Binance API test failed", error);
  }
}

async function testChainlinkAPI() {
  logTest("Chainlink API");

  try {
    const result = await fetchChainlinkBtcUsd();
    if (result && result.price && typeof result.price === "number" && result.price > 0) {
      logPass(`Fetch BTC/USD price: $${result.price.toLocaleString()}`);
      logInfo(`Source: ${result.source || "unknown"}`);
      if (result.updatedAt) {
        logInfo(`Updated: ${new Date(result.updatedAt).toISOString()}`);
      }
    } else {
      logFail("Chainlink API returned invalid data");
    }
  } catch (error) {
    logFail("Chainlink API test failed", error);
  }
}

async function testPolymarketAPI() {
  logTest("Polymarket API");

  try {
    // Test fetching live events
    const events = await fetchLiveEventsBySeriesId({
      seriesId: CONFIG.polymarket.seriesId,
      limit: 5
    });

    if (Array.isArray(events) && events.length > 0) {
      logPass(`Fetch live events: ${events.length} events found`);

      // Test flattening markets
      const markets = flattenEventMarkets(events);
      if (Array.isArray(markets) && markets.length > 0) {
        logPass(`Flatten markets: ${markets.length} markets found`);

        // Test picking latest market
        const latest = pickLatestLiveMarket(markets);
        if (latest) {
          logPass(`Pick latest market: ${latest.question || latest.slug || "unknown"}`);
          logInfo(`Market slug: ${latest.slug || "N/A"}`);
          logInfo(`End time: ${latest.endDate || "N/A"}`);
        } else {
          logFail("Pick latest market returned null");
        }
      } else {
        logFail("Flatten markets returned invalid data");
      }
    } else {
      logFail("Fetch live events returned no data");
    }
  } catch (error) {
    logFail("Polymarket API test failed", error);
  }
}

async function testIndicators() {
  logTest("Technical Indicators");

  try {
    // Generate sample price data
    const closes = Array.from({ length: 50 }, (_, i) => 67000 + Math.sin(i / 5) * 500 + Math.random() * 100);

    // Test RSI
    const rsi = computeRsi(closes, 14);
    if (rsi !== null && typeof rsi === "number" && rsi >= 0 && rsi <= 100) {
      logPass(`RSI calculation: ${rsi.toFixed(2)}`);
    } else {
      logFail("RSI calculation failed");
    }

    // Test MACD
    const macd = computeMacd(closes, 12, 26, 9);
    if (macd && typeof macd.hist === "number") {
      logPass(`MACD calculation: hist=${macd.hist.toFixed(2)}`);
    } else {
      logFail("MACD calculation failed");
    }

    // Test VWAP
    const candles = closes.map((close, i) => ({
      open: close - 50,
      high: close + 50,
      low: close - 50,
      close,
      volume: 100 + Math.random() * 50
    }));

    const vwap = computeSessionVwap(candles);
    if (vwap && typeof vwap === "number" && vwap > 0) {
      logPass(`VWAP calculation: $${vwap.toFixed(2)}`);
    } else {
      logFail("VWAP calculation failed");
    }
  } catch (error) {
    logFail("Indicators test failed", error);
  }
}

async function testDataStore() {
  logTest("Data Store (Ring Buffer)");

  try {
    const store = new DataStore(100);

    // Test adding data
    for (let i = 0; i < 10; i++) {
      store.add({ value: i, timestamp: Date.now() });
    }

    // Test retrieval
    const last = store.getLast();
    if (last && last.value === 9) {
      logPass("Add and retrieve data");
    } else {
      logFail("Data store retrieval failed");
    }

    // Test getRecent
    const recent = store.getRecent(5);
    if (recent.length === 5 && recent[4].value === 9) {
      logPass(`Get recent data: ${recent.length} items`);
    } else {
      logFail("Get recent data failed");
    }

    // Test stats
    const stats = store.getStats();
    if (stats.count === 10 && stats.maxSize === 100) {
      logPass(`Get stats: ${stats.count}/${stats.maxSize} (${stats.utilization.toFixed(1)}% full)`);
    } else {
      logFail("Get stats failed");
    }

    // Test buffer overflow
    for (let i = 10; i < 150; i++) {
      store.add({ value: i, timestamp: Date.now() });
    }

    const statsAfter = store.getStats();
    if (statsAfter.count === 100) {
      logPass(`Ring buffer overflow handling: maintained max size ${statsAfter.count}`);
    } else {
      logFail(`Ring buffer overflow: expected 100, got ${statsAfter.count}`);
    }
  } catch (error) {
    logFail("Data store test failed", error);
  }
}

async function testWebServer() {
  logTest("Web Server");

  let server = null;

  try {
    const dataStore = new DataStore(100);

    // Add some test data
    dataStore.add({
      timestamp: Date.now(),
      market: { question: "Test Market" },
      prices: { binanceSpot: 67000 },
      signal: "NO TRADE"
    });

    // Start server on a different port to avoid conflicts
    const testPort = 3333;
    server = startWebServer({
      dataStore,
      port: testPort,
      host: "localhost"
    });

    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test API endpoints
    const testEndpoint = async (endpoint, expectedFields) => {
      try {
        const response = await fetch(`http://localhost:${testPort}${endpoint}`);
        if (response.ok) {
          const data = await response.json();
          const hasFields = expectedFields.every(field => {
            const keys = field.split('.');
            let value = data;
            for (const key of keys) {
              if (value && typeof value === 'object' && key in value) {
                value = value[key];
              } else {
                return false;
              }
            }
            return true;
          });

          if (hasFields) {
            logPass(`${endpoint} - OK`);
            return true;
          } else {
            logFail(`${endpoint} - Missing expected fields`);
            return false;
          }
        } else {
          logFail(`${endpoint} - HTTP ${response.status}`);
          return false;
        }
      } catch (error) {
        logFail(`${endpoint} - Request failed`, error);
        return false;
      }
    };

    await testEndpoint("/api/status", ["status", "uptime"]);
    await testEndpoint("/api/current", ["timestamp"]);
    await testEndpoint("/api/history", ["rows", "total"]);
    await testEndpoint("/api/performance", ["totalSignals"]);

    // Test static file serving
    try {
      const htmlResponse = await fetch(`http://localhost:${testPort}/`);
      if (htmlResponse.ok) {
        const html = await htmlResponse.text();
        if (html.includes("PolymarketBTC15m") || html.includes("<!DOCTYPE html>")) {
          logPass("Static file serving (index.html) - OK");
        } else {
          logFail("Static file serving returned unexpected content");
        }
      } else {
        logFail(`Static file serving - HTTP ${htmlResponse.status}`);
      }
    } catch (error) {
      logFail("Static file serving test failed", error);
    }

  } catch (error) {
    logFail("Web server test failed", error);
  } finally {
    // Clean up
    if (server) {
      try {
        await server.close();
        logInfo("Web server stopped");
      } catch (error) {
        logInfo("Failed to stop web server cleanly");
      }
    }
  }
}

async function testConfiguration() {
  logTest("Configuration");

  try {
    // Test that config is loaded
    if (CONFIG) {
      logPass("Config loaded");
    } else {
      logFail("Config not loaded");
      return;
    }

    // Test required fields
    const requiredFields = [
      "symbol",
      "binanceBaseUrl",
      "pollIntervalMs",
      "candleWindowMinutes"
    ];

    let allFieldsPresent = true;
    for (const field of requiredFields) {
      if (!(field in CONFIG)) {
        logFail(`Missing config field: ${field}`);
        allFieldsPresent = false;
      }
    }

    if (allFieldsPresent) {
      logPass("All required config fields present");
    }

    // Display key settings
    logInfo(`Symbol: ${CONFIG.symbol}`);
    logInfo(`Poll interval: ${CONFIG.pollIntervalMs}ms`);
    logInfo(`Candle window: ${CONFIG.candleWindowMinutes} minutes`);
    logInfo(`Web enabled: ${CONFIG.web?.enabled ?? "N/A"}`);
    logInfo(`Web port: ${CONFIG.web?.port ?? "N/A"}`);

  } catch (error) {
    logFail("Configuration test failed", error);
  }
}

async function runAllTests() {
  console.log("\n" + "=".repeat(60));
  log("PolymarketBTC15mAssistant - Smoke Test Suite", colors.cyan);
  console.log("=".repeat(60));

  // Run all tests
  await testConfiguration();
  await testDataStore();
  await testIndicators();
  await testBinanceAPI();
  await testChainlinkAPI();
  await testPolymarketAPI();
  await testWebServer();

  // Summary
  console.log("\n" + "=".repeat(60));
  log("Test Summary", colors.cyan);
  console.log("=".repeat(60));

  const total = testsPassed + testsFailed;
  log(`Total tests: ${total}`, colors.blue);
  log(`Passed: ${testsPassed}`, colors.green);
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? colors.red : colors.green);

  const successRate = total > 0 ? ((testsPassed / total) * 100).toFixed(1) : 0;
  log(`Success rate: ${successRate}%`, successRate >= 80 ? colors.green : colors.yellow);

  console.log("=".repeat(60) + "\n");

  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error("\n" + colors.red + "Fatal error running smoke tests:" + colors.reset);
  console.error(error);
  process.exit(1);
});
