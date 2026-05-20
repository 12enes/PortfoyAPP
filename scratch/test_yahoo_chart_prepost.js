const fetch = require('node-fetch');

async function testChart(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d&includePrePost=true`;
    console.log(`Fetching 1m chart data for ${symbol} with includePrePost=true from ${url}...`);
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
    const result = data.chart.result[0];
    const meta = result.meta;
    console.log('\n--- META OBJECT ---');
    console.log(JSON.stringify(meta, null, 2));
    
    if (result.timestamp && result.timestamp.length > 0) {
      console.log(`\nFound ${result.timestamp.length} data points.`);
      const lastIdx = result.timestamp.length - 1;
      const firstTs = result.timestamp[0];
      const lastTs = result.timestamp[lastIdx];
      
      console.log(`First point timestamp: ${firstTs} (${new Date(firstTs * 1000).toLocaleString()})`);
      console.log(`Last point timestamp: ${lastTs} (${new Date(lastTs * 1000).toLocaleString()})`);
      
      const prices = result.indicators.quote[0].close;
      console.log(`First price: ${prices[0]}`);
      console.log(`Last price: ${prices[lastIdx]}`);
      
      // Let's print the last 5 points to see if they are active
      console.log('\nLast 5 points:');
      for (let i = Math.max(0, lastIdx - 4); i <= lastIdx; i++) {
        console.log(`- TS: ${result.timestamp[i]} (${new Date(result.timestamp[i] * 1000).toLocaleTimeString()}) Close: ${prices[i]}`);
      }
    } else {
      console.log('No timestamps returned');
    }
  } catch (e) {
    console.error('Error fetching chart data:', e);
  }
}

testChart('AAPL');
