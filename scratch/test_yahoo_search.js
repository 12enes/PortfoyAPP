const fetch = require('node-fetch');

async function testSearch(text) {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(text)}&lang=en&region=US&quotesCount=10&newsCount=0`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    console.log(`\nSearch results for: "${text}"`);
    (data.quotes || []).slice(0, 5).forEach(q => {
      console.log(`- Symbol: ${q.symbol}, Name: ${q.longname || q.shortname}, Type: ${q.quoteType}, Exchange: ${q.exchange}`);
    });
  } catch (e) {
    console.error(`Search error for ${text}:`, e.message);
  }
}

async function run() {
  await testSearch('APPL');
  await testSearch('AAPL');
}

run();
