const fetch = require('node-fetch');

const MarketService = {
  _fetchYahooFinance: async (symbol) => {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`);
      if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
      const data = await res.json();
      if (!data.chart || !data.chart.result || !data.chart.result[0]) return null;
      
      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose || price;
      const changePct = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
      return { price, changePct, previousClose };
    } catch (e) {
      console.log('Yahoo Error:', e.message);
      return null;
    }
  },

  fetchMultiple: async (assets) => {
    const needsYahoo = assets.some(a => a.type === 'BIST' || a.type === 'USA' || a.type === 'INDEX' || ['BRENT'].some(s => (a.symbol || a.name || '').includes(s)));
    
    const yahooSymbolsMap = {}; 
    assets.filter(a => a.type === 'BIST' || a.type === 'USA' || a.type === 'INDEX' || ['BRENT'].some(s => (a.symbol || a.name || '').includes(s))).forEach(a => {
      let fetchSymbol = a.symbol || a.name;
      if (a.type === 'BIST' && fetchSymbol && !fetchSymbol.endsWith('.IS')) {
        fetchSymbol = `${fetchSymbol}.IS`;
      }
      yahooSymbolsMap[a.symbol || a.name] = fetchSymbol;
    });
    
    const uniqueYahooSymbols = [...new Set(Object.values(yahooSymbolsMap))];
    const yahooPromises = needsYahoo
      ? uniqueYahooSymbols.map(sym => MarketService._fetchYahooFinance(sym).then(r => [sym, r]))
      : [];

    const [yahooResults] = await Promise.all([
      Promise.all(yahooPromises)
    ]);

    const dataMap = {};
    yahooResults.forEach(([sym, result]) => { if (result) dataMap[sym] = result; });

    const updated = assets.map(a => {
      const sym = a.symbol || a.name;
      
      if (a.type === 'BIST' || a.type === 'USA' || a.type === 'INDEX' || sym === 'BRENT') {
        const querySymbol = yahooSymbolsMap[sym];
        if (dataMap[querySymbol]) {
          const { price, changePct, previousClose } = dataMap[querySymbol];
          return { ...a, currentPrice: price, changePercent: changePct, previousClose: previousClose || a.previousClose };
        }
      }

      return { ...a, changePercent: a.changePercent || 0 };
    });
    return updated;
  }
};

async function run() {
  const assets = [
    { symbol: '^NDX', type: 'INDEX' },
    { symbol: 'XU100.IS', type: 'INDEX' },
    { symbol: 'THYAO', type: 'BIST' }
  ];
  const updated = await MarketService.fetchMultiple(assets);
  console.log(JSON.stringify(updated, null, 2));
}

run();
