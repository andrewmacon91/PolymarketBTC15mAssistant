/**
 * Chart.js configurations and chart management
 */

// Chart.js default configuration for dark theme
Chart.defaults.color = "#a0a0a0";
Chart.defaults.borderColor = "#2d4059";
Chart.defaults.backgroundColor = "#0f3460";

const chartColors = {
  up: "#00d4aa",
  down: "#ff5252",
  accent: "#0091ff",
  vwap: "#ffa726",
  neutral: "#a0a0a0"
};

/**
 * Chart manager class
 */
class ChartManager {
  constructor() {
    this.charts = {};
    this.maxDataPoints = 3600; // 1 hour at 1 second intervals
    this.visibleDataPoints = 60; // Show last 60 data points (1 minute)
  }

  /**
   * Initialize all charts
   */
  initCharts() {
    this.createPriceChart();
    this.createRsiChart();
    this.createProbabilityChart();
    this.createMacdChart();
  }

  /**
   * Create price chart
   */
  createPriceChart() {
    const ctx = document.getElementById("priceChart");
    if (!ctx) return;

    this.charts.price = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Binance Spot",
            data: [],
            borderColor: chartColors.accent,
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
          },
          {
            label: "Current Price",
            data: [],
            borderColor: chartColors.up,
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
          },
          {
            label: "Price to Beat",
            data: [],
            borderColor: chartColors.down,
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: 0,
            borderDash: [5, 5],
            tension: 0.1
          },
          {
            label: "VWAP",
            data: [],
            borderColor: chartColors.vwap,
            backgroundColor: "transparent",
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: "#2d4059"
            }
          },
          y: {
            display: true,
            grid: {
              color: "#2d4059"
            },
            ticks: {
              callback: function(value) {
                return "$" + value.toLocaleString();
              }
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: "top"
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ": $" + context.parsed.y.toLocaleString();
              }
            }
          }
        },
        animation: {
          duration: 300
        }
      }
    });
  }

  /**
   * Create RSI chart
   */
  createRsiChart() {
    const ctx = document.getElementById("rsiChart");
    if (!ctx) return;

    this.charts.rsi = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "RSI",
            data: [],
            borderColor: chartColors.accent,
            backgroundColor: "rgba(0, 145, 255, 0.1)",
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: "#2d4059"
            }
          },
          y: {
            min: 0,
            max: 100,
            display: true,
            grid: {
              color: "#2d4059"
            },
            ticks: {
              callback: function(value) {
                return value;
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          annotation: {
            annotations: {
              oversold: {
                type: "line",
                yMin: 30,
                yMax: 30,
                borderColor: chartColors.down,
                borderWidth: 1,
                borderDash: [5, 5]
              },
              overbought: {
                type: "line",
                yMin: 70,
                yMax: 70,
                borderColor: chartColors.up,
                borderWidth: 1,
                borderDash: [5, 5]
              }
            }
          }
        },
        animation: {
          duration: 300
        }
      }
    });
  }

  /**
   * Create probability chart (horizontal bar)
   */
  createProbabilityChart() {
    const ctx = document.getElementById("probabilityChart");
    if (!ctx) return;

    this.charts.probability = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Model", "Market"],
        datasets: [
          {
            label: "UP",
            data: [0, 0],
            backgroundColor: chartColors.up,
            borderColor: chartColors.up,
            borderWidth: 1
          },
          {
            label: "DOWN",
            data: [0, 0],
            backgroundColor: chartColors.down,
            borderColor: chartColors.down,
            borderWidth: 1
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            min: 0,
            max: 1,
            display: true,
            grid: {
              color: "#2d4059"
            },
            ticks: {
              callback: function(value) {
                return (value * 100).toFixed(0) + "%";
              }
            }
          },
          y: {
            display: true,
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: "top"
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ": " + (context.parsed.x * 100).toFixed(1) + "%";
              }
            }
          }
        },
        animation: {
          duration: 300
        }
      }
    });
  }

  /**
   * Create MACD histogram chart
   */
  createMacdChart() {
    const ctx = document.getElementById("macdChart");
    if (!ctx) return;

    this.charts.macd = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "MACD Histogram",
            data: [],
            backgroundColor: [],
            borderColor: [],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: "#2d4059"
            }
          },
          y: {
            display: true,
            grid: {
              color: "#2d4059"
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        },
        animation: {
          duration: 300
        }
      }
    });
  }

  /**
   * Update price chart with new data
   */
  updatePriceChart(data) {
    const chart = this.charts.price;
    if (!chart) return;

    const timestamp = formatTimestamp(data.timestamp);

    // Add new data point
    chart.data.labels.push(timestamp);
    chart.data.datasets[0].data.push(data.prices?.binanceSpot);
    chart.data.datasets[1].data.push(data.prices?.chainlinkCurrent);
    chart.data.datasets[2].data.push(data.prices?.priceToBeat);
    chart.data.datasets[3].data.push(data.prices?.vwap);

    // Keep only last N points
    if (chart.data.labels.length > this.visibleDataPoints) {
      chart.data.labels.shift();
      chart.data.datasets.forEach(dataset => dataset.data.shift());
    }

    chart.update("none");
  }

  /**
   * Update RSI chart with new data
   */
  updateRsiChart(data) {
    const chart = this.charts.rsi;
    if (!chart) return;

    const timestamp = formatTimestamp(data.timestamp);
    const rsi = data.indicators?.rsi;

    chart.data.labels.push(timestamp);
    chart.data.datasets[0].data.push(rsi);

    if (chart.data.labels.length > this.visibleDataPoints) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.update("none");
  }

  /**
   * Update probability chart with new data
   */
  updateProbabilityChart(data) {
    const chart = this.charts.probability;
    if (!chart) return;

    const modelUp = data.probabilities?.modelUp || 0;
    const modelDown = data.probabilities?.modelDown || 0;
    const marketUp = (data.probabilities?.marketUp || 0) / 100; // Convert cents to decimal
    const marketDown = (data.probabilities?.marketDown || 0) / 100;

    chart.data.datasets[0].data = [modelUp, marketUp];
    chart.data.datasets[1].data = [modelDown, marketDown];

    chart.update("none");
  }

  /**
   * Update MACD chart with new data
   */
  updateMacdChart(data) {
    const chart = this.charts.macd;
    if (!chart) return;

    const timestamp = formatTimestamp(data.timestamp);
    const macdHist = data.indicators?.macd?.hist || 0;

    chart.data.labels.push(timestamp);
    chart.data.datasets[0].data.push(macdHist);

    // Set color based on positive/negative
    const color = macdHist >= 0 ? chartColors.up : chartColors.down;
    chart.data.datasets[0].backgroundColor.push(color);
    chart.data.datasets[0].borderColor.push(color);

    if (chart.data.labels.length > this.visibleDataPoints) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
      chart.data.datasets[0].backgroundColor.shift();
      chart.data.datasets[0].borderColor.shift();
    }

    chart.update("none");
  }

  /**
   * Update all charts with new data
   */
  updateAll(data) {
    this.updatePriceChart(data);
    this.updateRsiChart(data);
    this.updateProbabilityChart(data);
    this.updateMacdChart(data);
  }

  /**
   * Destroy all charts
   */
  destroyAll() {
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.charts = {};
  }
}
