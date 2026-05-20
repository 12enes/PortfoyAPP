const fetch = require('node-fetch');

async function testSpark(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbol)}&range=1d&interval=5m&includePrePost=true`;
    console.log(`Fetching spark data for ${symbol} from ${url}...`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('\n--- SPARK DATA ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('-------------------\n');
  } catch (e) {
    console.error('Error fetching spark data:', e);
  }
}

testSpark('AAPL');
