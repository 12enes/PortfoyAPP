const fetch = require('node-fetch');

async function testChart(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=true`;
    console.log(`Fetching chart data with includePrePost=true for ${symbol} from ${url}...`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      console.log('No chart result found');
      return;
    }
    const meta = data.chart.result[0].meta;
    console.log('\n--- META OBJECT WITH includePrePost=true ---');
    console.log(JSON.stringify(meta, null, 2));
    console.log('-------------------\n');
  } catch (e) {
    console.error('Error fetching chart data:', e);
  }
}

testChart('AAPL');
