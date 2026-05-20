const fetch = require('node-fetch'); // wait, if node-fetch is not installed, we can use built-in fetch of node (Node 18+) or dynamic import

async function testYahoo(symbol) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    console.log(`Status for ${symbol}:`, res.status);
    if (!res.ok) {
      console.log(`Error fetching ${symbol}: ${res.statusText}`);
      return;
    }
    const data = await res.json();
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      console.log(`No results for ${symbol}`);
      return;
    }
    const meta = data.chart.result[0].meta;
    console.log(`Meta for ${symbol}:`, {
      regularMarketPrice: meta.regularMarketPrice,
      chartPreviousClose: meta.chartPreviousClose,
      symbol: meta.symbol,
      instrumentType: meta.instrumentType
    });
  } catch (e) {
    console.error(`Error for ${symbol}:`, e.message);
  }
}

async function run() {
  await testYahoo('AAPL');
  await testYahoo('APPL');
  await testYahoo('AAPL.IS');
}

run();
