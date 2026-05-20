const fetch = require('node-fetch');

async function testQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    console.log(`Fetching quote for ${symbol} from ${url}...`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.quoteResponse || !data.quoteResponse.result || !data.quoteResponse.result[0]) {
      console.log('No quote result found');
      return;
    }
    const quote = data.quoteResponse.result[0];
    console.log('\n--- QUOTE OBJECT ---');
    console.log(JSON.stringify(quote, null, 2));
    console.log('-------------------\n');
  } catch (e) {
    console.error('Error fetching quote:', e);
  }
}

testQuote('AAPL');
