export const MarketService = {
  // TEFAS API: Doğrudan Native Fetch
  _fetchTefas: async (symbol: string) => {
    try {
      const res = await fetch('https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({fonKodu: symbol, dil: 'TR', periyod: 1})
      });
      if (!res.ok) throw new Error(`TEFAS HTTP ${res.status}`);
      const data = await res.json();
      
      if (data && data.resultList && data.resultList.length > 0) {
        const prices = data.resultList.map((item: any) => item.fiyat);
        const latestPrice = prices[prices.length - 1];
        let changePct = 0;
        let previousClose = null; 
        
        if (prices.length > 1) {
           previousClose = prices[prices.length - 2];
           if (previousClose > 0) changePct = ((latestPrice - previousClose) / previousClose) * 100;
        }
        return { price: latestPrice, changePct, previousClose };
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  // Yahoo Finance: BIST (.IS), ABD (AAPL vs), Emtia
  _fetchYahooFinance: async (symbol: string) => {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
      if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
      const data = await res.json();
      if (!data.chart || !data.chart.result || !data.chart.result[0]) return null;
      
      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose || price;
      const changePct = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
      return { price, changePct, previousClose };
    } catch (e) {
      return null;
    }
  },

  // Binance: Kripto fiyatları
  _fetchCryptoPrice: async (symbol: string) => {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`);
      if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
      const data = await res.json();
      return { 
        price: parseFloat(data.lastPrice), 
        changePct: parseFloat(data.priceChangePercent),
        previousClose: parseFloat(data.prevClosePrice) || parseFloat(data.lastPrice)
      };
    } catch (e) { return null; }
  },

  // Binance PAXG: Ons altın proxy
  _fetchGoldUSD: async () => {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT');
      if (!res.ok) throw new Error(`Binance PAXG HTTP ${res.status}`);
      const data = await res.json();
      return { 
        price: parseFloat(data.lastPrice), 
        changePct: parseFloat(data.priceChangePercent),
        previousClose: parseFloat(data.prevClosePrice) || parseFloat(data.lastPrice)
      };
    } catch (e) { return null; }
  },

  // Frankfurter API: Döviz kurları
  _fetchForexRates: async () => {
    try {
      const currencies = 'TRY,EUR,GBP,JPY,CHF,AUD';
      const todayRes = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currencies}`);
      if (!todayRes.ok) throw new Error('Frankfurter Today failed');
      const todayData = await todayRes.json();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 2);
      if (yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().split('T')[0];
      
      const yRes = await fetch(`https://api.frankfurter.app/${yDate}?from=USD&to=${currencies}`);
      const yData = yRes.ok ? await yRes.json() : todayData;
      
      return {
        rates: todayData.rates,
        previousRates: yData.rates || todayData.rates
      };
    } catch (e) {
      return null;
    }
  },

  fetchAsset: async (asset: any) => { 
    try {
      const results = await MarketService.fetchMultiple([asset]);
      return results[0] || asset;
    } catch (e) {
      return asset;
    }
  },

  fetchMultiple: async (assets: any[]) => {
    const needsCrypto = assets.some(a => a.type === 'CRYPTO');
    const needsGold = assets.some(a => a.type === 'GOLD' || ['XAU/USD', 'GRAM/TL'].includes(a.symbol || a.name));
    const needsForex = assets.some(a => a.type === 'GOLD' || ['DOLAR/TL', 'EURO/TL', 'GBP', 'STERLIN', 'YEN', 'FRANK', 'AUD', 'GRAM/TL'].some(s => (a.symbol || a.name || '').includes(s)));
    const needsYahoo = assets.some(a => a.type === 'BIST' || a.type === 'USA' || ['BRENT', 'BZ', 'SILVER', 'XAG/USD', 'GUMUS', 'GLD/AG', 'PLATINUM', 'PLATIN', 'PL', 'NATURALGAZ', 'PALADYUM', 'PALADIUM', 'PALLADIUM', 'PA'].some(s => (a.symbol || a.name || '').includes(s)));
    const needsTefas = assets.some(a => a.type === 'TEFAS');
    
    const cryptoSymbols = [...new Set(assets.filter(a => a.type === 'CRYPTO').map(a => a.symbol || a.name))];
    const cryptoPromises = needsCrypto
      ? cryptoSymbols.map(sym => MarketService._fetchCryptoPrice(sym).then(r => [sym, r]))
      : [];

    const yahooSymbolsMap: Record<string, string> = {}; 
    assets.filter(a => a.type === 'BIST' || a.type === 'USA' || ['BRENT', 'BZ', 'SILVER', 'XAG/USD', 'GUMUS', 'GLD/AG', 'PLATINUM', 'PLATIN', 'PL', 'NATURALGAZ', 'PALADYUM', 'PALADIUM', 'PALLADIUM', 'PA'].some(s => (a.symbol || a.name || '').includes(s))).forEach(a => {
      let fetchSymbol = a.symbol || a.name;
      if (a.type === 'BIST' && fetchSymbol && !fetchSymbol.endsWith('.IS')) {
        fetchSymbol = `${fetchSymbol}.IS`;
      } else if (['BRENT', 'BZ'].some(s => fetchSymbol.includes(s))) {
        fetchSymbol = 'BZ=F';
      } else if (['SILVER', 'XAG/USD', 'GUMUS', 'GLD/AG'].some(s => fetchSymbol.includes(s))) {
        fetchSymbol = 'SI=F';
      } else if (['PLATINUM', 'PLATIN', 'PL'].some(s => fetchSymbol.includes(s))) {
        fetchSymbol = 'PL=F';
      } else if (fetchSymbol === 'NATURALGAZ') {
        fetchSymbol = 'NG=F';
      } else if (['PALADYUM', 'PALADIUM', 'PALLADIUM', 'PA'].some(s => fetchSymbol.includes(s))) {
        fetchSymbol = 'PA=F';
      }
      yahooSymbolsMap[a.symbol || a.name] = fetchSymbol;
    });
    
    const uniqueYahooSymbols = [...new Set(Object.values(yahooSymbolsMap))];
    const yahooPromises = needsYahoo
      ? uniqueYahooSymbols.map(sym => MarketService._fetchYahooFinance(sym).then(r => [sym, r]))
      : [];

    const tefasSymbols = [...new Set(assets.filter(a => a.type === 'TEFAS').map(a => a.symbol || a.name))];
    const tefasPromises = needsTefas
      ? tefasSymbols.map(sym => MarketService._fetchTefas(sym).then(r => [sym, r]))
      : [];

    const goldPromise = needsGold ? MarketService._fetchGoldUSD() : Promise.resolve(null);
    const forexPromise = needsForex ? MarketService._fetchForexRates() : Promise.resolve(null);

    const [cryptoResults, yahooResults, tefasResults, goldData, forexData] = await Promise.all([
      Promise.all(cryptoPromises),
      Promise.all(yahooPromises),
      Promise.all(tefasPromises),
      goldPromise,
      forexPromise
    ]);

    const dataMap: any = {};
    cryptoResults.forEach(([sym, result]) => { if (result) dataMap[sym] = result; });
    yahooResults.forEach(([sym, result]) => { if (result) dataMap[sym] = result; });
    tefasResults.forEach(([sym, result]) => { if (result) dataMap[sym] = result; });

    const todayRates = forexData?.rates || null;
    const prevRates = forexData?.previousRates || null;
    const usdTry = todayRates?.TRY || null;
    const eurUsd = todayRates?.EUR || null; 
    const xauUsd = (goldData as any)?.price || null;

    const updated = assets.map(a => {
      const sym = a.symbol || a.name;
      
      if (a.type === 'BIST' || a.type === 'USA' || sym === 'BRENT') {
        const querySymbol = yahooSymbolsMap[sym];
        if (dataMap[querySymbol]) {
          const { price, changePct, previousClose } = dataMap[querySymbol];
          return { ...a, currentPrice: price, changePercent: changePct, previousClose: previousClose || a.previousClose };
        }
      }

      if (a.type === 'CRYPTO' && dataMap[sym]) {
        const { price, changePct, previousClose } = dataMap[sym];
        return { ...a, currentPrice: price, changePercent: changePct, previousClose: previousClose || a.previousClose };
      }

      if (a.type === 'TEFAS' && dataMap[sym]) {
        const { price, changePct, previousClose } = dataMap[sym];
        return { ...a, currentPrice: price, changePercent: changePct, previousClose: previousClose || a.previousClose };
      }

      if (a.type === 'GOLD' || ['DOLAR', 'EURO', 'GBP', 'STERLIN', 'YEN', 'FRANK', 'AUD', 'XAU', 'GRAM/TL'].some(s => sym.includes(s))) {
        if (['DOLAR/TL', 'USD/TRY', 'USD/TL', 'DOLAR'].some(s => sym.includes(s)) && usdTry) {
          const currentPrice = usdTry;
          const previousClose = (prevRates && prevRates.TRY) ? prevRates.TRY : (a.previousClose || currentPrice);
          const pct = ((currentPrice - previousClose) / previousClose) * 100;
          return { ...a, currentPrice, changePercent: pct, previousClose };
        }
        if (['EURO/TL', 'EUR/TRY', 'EUR/TL', 'EURO'].some(s => sym.includes(s)) && usdTry && eurUsd) {
          const currentPrice = usdTry / eurUsd;
          const prevEurUsd = (prevRates && prevRates.EUR) ? prevRates.EUR : eurUsd;
          const prevTry = (prevRates && prevRates.TRY) ? prevRates.TRY : null;
          const previousClose = prevTry ? (prevTry / prevEurUsd) : (a.previousClose || currentPrice);
          const pct = ((currentPrice - previousClose) / previousClose) * 100;
          return { ...a, currentPrice: parseFloat(currentPrice.toFixed(4)), changePercent: pct, previousClose };
        }
        if (['XAU/USD', 'GLD/USD', 'ONS'].some(s => sym.includes(s)) && xauUsd) {
          return { ...a, currentPrice: xauUsd, changePercent: (goldData as any).changePct, previousClose: (goldData as any).previousClose };
        }
        if (['GRAM/TL', 'GLD/TRY', 'ALTIN/TL', 'ALTIN'].some(s => sym.includes(s)) && xauUsd && usdTry) {
          const currentPrice = (xauUsd * usdTry) / 31.1035;
          const prevGold = (goldData as any)?.previousClose || xauUsd;
          const prevTry = (prevRates && prevRates.TRY) ? prevRates.TRY : null;
          const previousClose = prevTry ? (prevGold * prevTry) / 31.1035 : (a.previousClose || currentPrice);
          const pct = ((currentPrice - previousClose) / previousClose) * 100;
          return { ...a, currentPrice: parseFloat(currentPrice.toFixed(2)), changePercent: pct, previousClose };
        }

        if (todayRates) {
          let targetRate = null;
          let prevTargetRate = null;
          
          if (['GBP/TL', 'GBP/TRY', 'STERLIN'].some(s => sym.includes(s))) {
            targetRate = todayRates.TRY / todayRates.GBP;
            prevTargetRate = (prevRates && prevRates.TRY && prevRates.GBP) ? (prevRates.TRY / prevRates.GBP) : a.previousClose;
          }
          else if (['JPY/TL', 'JPY/TRY', 'YEN'].some(s => sym.includes(s))) {
            targetRate = todayRates.TRY / todayRates.JPY;
            prevTargetRate = (prevRates && prevRates.TRY && prevRates.JPY) ? (prevRates.TRY / prevRates.JPY) : a.previousClose;
          }
          else if (['CHF/TL', 'CHF/TRY', 'FRANK'].some(s => sym.includes(s))) {
            targetRate = todayRates.TRY / todayRates.CHF;
            prevTargetRate = (prevRates && prevRates.TRY && prevRates.CHF) ? (prevRates.TRY / prevRates.CHF) : a.previousClose;
          }
          else if (['AUD/TL', 'AUD/TRY', 'AUD'].some(s => sym.includes(s))) {
            targetRate = todayRates.TRY / todayRates.AUD;
            prevTargetRate = (prevRates && prevRates.TRY && prevRates.AUD) ? (prevRates.TRY / prevRates.AUD) : a.previousClose;
          }

          if (targetRate) {
            const finalPrevClose = prevTargetRate || a.previousClose || targetRate;
            const pct = ((targetRate - finalPrevClose) / finalPrevClose) * 100;
            return { ...a, currentPrice: parseFloat(targetRate.toFixed(4)), changePercent: pct, previousClose: finalPrevClose };
          }
        }
        
        const querySymbol = yahooSymbolsMap[sym];
        if (querySymbol && dataMap[querySymbol]) {
          const { price, changePct, previousClose } = dataMap[querySymbol];
          return { ...a, currentPrice: price, changePercent: changePct, previousClose };
        }
      }

      return { ...a, changePercent: a.changePercent || 0 };
    });
    return updated;
  }
};
