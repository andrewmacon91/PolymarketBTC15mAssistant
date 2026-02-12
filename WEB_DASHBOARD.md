# Web Dashboard for PolymarketBTC15mAssistant

## Overview

The web dashboard provides real-time visualization of the bot's trading signals, market data, and performance metrics. It features:

- **Real-time updates** via WebSocket (1-second refresh rate)
- **Interactive charts** powered by Chart.js
- **Signal history** tracking
- **Performance metrics** aggregation
- **Dark theme** optimized for extended viewing

## Quick Start

1. **Start the bot** (the web server starts automatically):
   ```bash
   npm start
   ```

2. **Access the dashboard**:
   - Open your browser to: `http://localhost:3000`
   - The dashboard will automatically connect and start displaying live data

## Configuration

Optional environment variables (add to `.env` file):

```env
# Web Server Configuration
WEB_ENABLED=true          # Enable/disable web server (default: true)
WEB_PORT=3000             # Port for web server (default: 3000)
WEB_HOST=localhost        # Host to bind to (default: localhost)
WEB_BUFFER_SIZE=3600      # Number of snapshots to keep in memory (default: 3600 = 1 hour)
```

## Dashboard Features

### 1. **Current Market Section**
- Market question and slug
- Time remaining countdown
- Liquidity information
- Price comparison (Binance vs Current vs Price to Beat)

### 2. **Recommendation Card**
- **BUY UP** / **BUY DOWN** / **NO TRADE** signal
- Entry phase (EARLY, MID, LATE)
- Signal strength
- Color-coded for quick recognition

### 3. **Technical Indicators**
- **TA Predict**: Model probabilities for UP/DOWN
- **Market Prices**: Current Polymarket odds
- **Edge Calculation**: Expected value for each side
- **RSI**: Relative Strength Index with trend arrow
- **MACD**: Bullish/Bearish histogram
- **VWAP**: Volume-Weighted Average Price with slope
- **Heiken Ashi**: Candlestick pattern analysis

### 4. **Interactive Charts** (1-hour rolling window)
- **Price Chart**:
  - Binance spot price
  - Chainlink current price
  - Price to Beat (dashed line)
  - VWAP (orange line)

- **RSI Chart**:
  - RSI value (0-100)
  - Overbought (70) and Oversold (30) levels

- **Probability Chart**:
  - Model predictions vs Market prices
  - Horizontal bar chart for easy comparison

- **MACD Histogram**:
  - Bullish (green) / Bearish (red) momentum

### 5. **Signal History Table**
- Last 50 signals with timestamps
- Model predictions and market prices
- Edge calculations
- Market regime (TREND_UP, TREND_DOWN, RANGE, CHOP)

### 6. **Performance Metrics**
- Total signals count
- BUY UP vs BUY DOWN distribution
- Average edge (UP/DOWN)
- Positive edge count

## API Endpoints

The dashboard uses the following REST API endpoints:

### `GET /api/status`
Bot status, uptime, and buffer information.

**Example response:**
```json
{
  "status": "running",
  "uptime": 3600000,
  "uptimeFormatted": "1h 0m",
  "lastUpdate": "2024-01-15T10:30:45.123Z",
  "bufferSize": 3600,
  "bufferMaxSize": 3600,
  "bufferUtilization": "100.00%"
}
```

### `GET /api/current`
Latest market state, indicators, and recommendation.

### `GET /api/history?limit=100&offset=0`
Historical signals from in-memory buffer.

**Query parameters:**
- `limit` (default: 100, max: 1000) - Number of rows to return
- `offset` (default: 0) - Number of rows to skip from the end

### `GET /api/history/csv?limit=100`
Historical signals from CSV file.

### `GET /api/performance`
Aggregated performance metrics.

**Example response:**
```json
{
  "totalSignals": 1500,
  "buyUpCount": 650,
  "buyDownCount": 550,
  "noTradeCount": 300,
  "averageEdgeUp": 0.045,
  "averageEdgeDown": 0.038,
  "maxEdgeUp": 0.15,
  "maxEdgeDown": 0.12,
  "positiveEdgeCount": 890,
  "regimeDistribution": {
    "TREND_UP": 450,
    "TREND_DOWN": 380,
    "RANGE": 520,
    "CHOP": 150
  }
}
```

## WebSocket Connection

The dashboard connects to WebSocket at `ws://localhost:3000` (or `wss://` for HTTPS).

**Message format:**
```json
{
  "type": "update",
  "data": {
    "timestamp": 1705315845123,
    "market": { ... },
    "prices": { ... },
    "indicators": { ... },
    "probabilities": { ... },
    "edge": { ... },
    "recommendation": { ... },
    "regime": "TREND_UP",
    "signal": "BUY UP"
  },
  "timestamp": 1705315845123
}
```

**Features:**
- Automatic reconnection with exponential backoff
- Connection status indicator (green/yellow/red dot)
- Heartbeat/ping-pong for connection health
- Graceful degradation on disconnect

## Architecture

### Data Flow

```
Bot Main Loop (1s) → DataStore.add(snapshot) → WebSocket.broadcast(snapshot)
       ↓                      ↓                          ↓
   CSV append          In-memory buffer          Dashboard updates
       ↓                      ↓                          ↓
Historical data      Last 3600 snapshots      Real-time visualization
```

### Components

1. **Backend** (`src/web/`)
   - `dataStore.js` - Ring buffer for real-time data (3600 items)
   - `server.js` - Express HTTP server
   - `routes/api.js` - REST API endpoints
   - `routes/ws.js` - WebSocket handler
   - `csvReader.js` - Historical data reader

2. **Frontend** (`src/public/`)
   - `index.html` - Dashboard layout
   - `css/dashboard.css` - Dark theme styling
   - `js/dashboard.js` - Main application logic
   - `js/charts.js` - Chart.js configurations
   - `js/wsClient.js` - WebSocket client with reconnection
   - `js/utils.js` - Helper functions

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
# Set a different port
export WEB_PORT=3001
npm start
```

Or add to `.env`:
```env
WEB_PORT=3001
```

### WebSocket Connection Failed
- Check firewall settings
- Ensure bot is running
- Verify correct URL in browser
- Check browser console for errors

### Dashboard Not Updating
- Check WebSocket connection status (top-right indicator)
- Verify bot is running without errors
- Check browser console for JavaScript errors
- Try hard refresh (Ctrl+Shift+R)

### Charts Not Rendering
- Ensure Chart.js CDN is accessible
- Check browser console for errors
- Verify JavaScript is enabled

### Memory Issues
If the bot uses too much memory:
```env
# Reduce buffer size (default: 3600 = 1 hour)
WEB_BUFFER_SIZE=1800  # 30 minutes
```

## Performance Considerations

- **Memory usage**: ~2-4 MB per 1000 snapshots
- **CPU usage**: Minimal (<1% on modern hardware)
- **Network**: ~1-2 KB per WebSocket update
- **Browser**: Tested on Chrome, Firefox, Safari
- **Concurrent users**: Supports 100+ simultaneous connections

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Security Notes

- Dashboard binds to `localhost` by default (local access only)
- To allow remote access, set `WEB_HOST=0.0.0.0` (use with caution)
- No authentication implemented (add reverse proxy with auth if needed)
- Consider using HTTPS for production deployments

## Customization

### Change Theme Colors
Edit `src/public/css/dashboard.css`:
```css
:root {
  --bg-primary: #1a1a2e;     /* Background */
  --color-up: #00d4aa;        /* UP/Long color */
  --color-down: #ff5252;      /* DOWN/Short color */
  --color-accent: #0091ff;    /* Accent color */
}
```

### Adjust Chart Window
Edit `src/public/js/charts.js`:
```javascript
this.visibleDataPoints = 60;  // Show last 60 points (1 minute)
```

### Change Signal History Limit
Edit `src/public/js/dashboard.js`:
```javascript
this.maxSignalHistory = 50;  // Keep last 50 signals
```

## Future Enhancements (Not Implemented)

- User authentication
- Trade execution UI
- Email/Discord alerts
- Backtesting interface
- Dark/light theme toggle
- Multi-market monitoring
- Export data (CSV, Excel)
- Historical data analysis tools

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Check bot logs for server errors
4. Verify all dependencies are installed (`npm install`)

---

**Created by @krajekis** | PolymarketBTC15m Assistant Dashboard v1.0
