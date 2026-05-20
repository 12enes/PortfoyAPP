const fetch = require('node-fetch');

async function getStockExtendedData(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d&includePrePost=true`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.chart || !data.chart.result || !data.chart.result[0]) return null;

    const result = data.chart.result[0];
    const meta = result.meta;
    
    // Standard regular market closing/last price
    const regularMarketPrice = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose || regularMarketPrice;
    const regularChangePct = previousClose ? ((regularMarketPrice - previousClose) / previousClose) * 100 : 0;

    // Extract the absolute latest price in the active chart (could be pre/post market)
    let latestPrice = regularMarketPrice;
    if (result.timestamp && result.timestamp.length > 0) {
      const prices = result.indicators.quote[0].close;
      // Go backwards to find the last non-null close price
      for (let i = prices.length - 1; i >= 0; i--) {
        if (prices[i] !== null && prices[i] !== undefined && prices[i] > 0) {
          latestPrice = prices[i];
          break;
        }
      }
    }

    // Determine market session state
    let session = 'REGULAR';
    const now = Math.floor(Date.now() / 1000);
    const periods = meta.currentTradingPeriod;
    
    if (periods) {
      const pre = periods.pre;
      const regular = periods.regular;
      const post = periods.post;
      
      if (pre && now >= pre.start && now < pre.end) {
        session = 'PRE';
      } else if (regular && now >= regular.start && now < regular.end) {
        session = 'REGULAR';
      } else if (regular && now >= regular.end) {
        session = 'POST';
      } else if (pre && now < pre.start) {
        // Early morning before pre-market, show POST from previous day
        session = 'POST';
      }
    }

    const hasExtended = latestPrice !== regularMarketPrice && session !== 'REGULAR';
    let extendedPrice = null;
    let extendedChangePct = null;

    if (hasExtended) {
      extendedPrice = latestPrice;
      extendedChangePct = regularMarketPrice ? ((extendedPrice - regularMarketPrice) / regularMarketPrice) * 100 : 0;
    }

    return {
      symbol: meta.symbol,
      price: regularMarketPrice,
      changePct: regularChangePct,
      previousClose,
      session,
      extendedPrice,
      extendedChangePct
    };
  } catch (e) {
    console.error('Error:', e);
    return null;
  }
}

async function run() {
  const data = await getStockExtendedData('AAPL');
  console.log('Parsed stock data:', JSON.stringify(data, null, 2));
}

run();
