const fetch = require('node-fetch');

async function testYahoo(symbol) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
    const data = await res.json();
    if (data.chart && data.chart.result && data.chart.result[0]) {
      const meta = data.chart.result[0].meta;
      console.log(`${symbol}: Price = ${meta.regularMarketPrice}, PrevClose = ${meta.chartPreviousClose}`);
    } else {
      console.log(`${symbol}: Not found or error`, data.chart?.error);
    }
  } catch (e) {
    console.log(`${symbol}: Error`, e.message);
  }
}

async function run() {
  const symbols = ['XU100.IS', 'XU030.IS', 'XBANK.IS', 'XUTEK.IS', '^IXIC', '^NDX', '^GSPC', '^DJI'];
  for (const sym of symbols) {
    await testYahoo(sym);
  }
}

run();
