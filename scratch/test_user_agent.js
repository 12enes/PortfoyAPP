const fetch = require('node-fetch');

async function testFetch(userAgent) {
  try {
    const headers = { 'Accept': 'application/json' };
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d`, { headers });
    console.log(`User-Agent: [${userAgent || 'NONE'}] -> Status: ${res.status}`);
    if (res.status !== 200) {
      const text = await res.text();
      console.log(`Response snippet: ${text.slice(0, 150)}`);
    } else {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      console.log(`Success! Price: ${meta?.regularMarketPrice}`);
    }
  } catch (e) {
    console.error(`Error:`, e.message);
  }
}

async function run() {
  console.log("1. Testing with valid browser User-Agent...");
  await testFetch('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  
  console.log("\n2. Testing with NO User-Agent...");
  await testFetch(null);

  console.log("\n3. Testing with typical mobile User-Agent...");
  await testFetch('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1');

  console.log("\n4. Testing with custom/generic node/expo-like User-Agent...");
  await testFetch('PostmanRuntime/7.39.0');
}

run();
