export const buildPriceHistoryFromChart = (historyData) => {
  const derived = {};
  (historyData || []).forEach(point => {
    const timestamp = point.timestamp;
    if (!timestamp || !point.prices) return;

    Object.entries(point.prices).forEach(([symbol, price]) => {
      const numericPrice = Number(price);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) return;
      derived[symbol] = {
        ...(derived[symbol] || {}),
        [timestamp]: numericPrice
      };
    });
  });
  return derived;
};

export const getTimeframeLabel = (timeFilter, lang) => {
  if (lang === 'tr') {
    switch(timeFilter) {
      case '1D': return 'Son 24 Saat';
      case '1W': return 'Son 1 Hafta';
      case '1M': return 'Son 1 Ay';
      case '3M': return 'Son 3 Ay';
      case '6M': return 'Son 6 Ay';
      case 'YTD': return 'Yılbaşından Beri';
      case '1Y': return 'Son 1 Yıl';
      case 'ALL': return 'Tüm Zamanlar';
      default: return '';
    }
  } else {
    switch(timeFilter) {
      case '1D': return 'Last 24 Hours';
      case '1W': return 'Last 1 Week';
      case '1M': return 'Last 1 Month';
      case '3M': return 'Last 3 Months';
      case '6M': return 'Last 6 Months';
      case 'YTD': return 'Year to Date';
      case '1Y': return 'Last 1 Year';
      case 'ALL': return 'All Time';
      default: return '';
    }
  }
};

export const getFilteredHistory = (history, timeFilter) => {
  const now = Date.now();
  let cutoff = 0;
  switch (timeFilter) {
    case '1D': cutoff = now - 24 * 60 * 60 * 1000; break;
    case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
    case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
    case '3M': cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
    case '6M': cutoff = now - 180 * 24 * 60 * 60 * 1000; break;
    case 'YTD': cutoff = new Date(new Date().getFullYear(), 0, 1).getTime(); break;
    case '1Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
    case 'ALL': default: cutoff = 0; break;
  }
  return (history || []).filter(tx => {
    if (tx.netProfit === undefined || tx.netProfit === null || tx.netProfit === 0) return false;
    const txTime = tx.timestamp || Date.parse(tx.date) || 0;
    return txTime >= cutoff;
  });
};

export const fillMissingDays = (history, portfolio = [], priceHistory = {}, usdToTryRate = 32.5) => {
  // Eğer portföy veya varlık yoksa, geriye dönük rekonstrüksiyon yapamayız, eski basit mantığa fallback yap.
  if (!portfolio || portfolio.length === 0) {
    if (!history || history.length === 0) return history || [];
    
    const lastSnap = history[history.length - 1];
    const lastDate = new Date(lastSnap.timestamp);
    const today = new Date();
    
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const dayDiff = Math.floor((today - lastDate) / (24 * 60 * 60 * 1000));
    
    if (dayDiff <= 1) return history;
    
    const daysToFill = Math.min(dayDiff - 1, 30);
    const newHistory = [...history];
    
    for (let i = 1; i <= daysToFill; i++) {
      const fillDate = new Date(lastDate);
      fillDate.setDate(fillDate.getDate() + i);
      if (fillDate.getDay() === 0 || fillDate.getDay() === 6) continue;
      
      fillDate.setHours(12, 0, 0, 0);
      newHistory.push({
        timestamp: fillDate.getTime(),
        date: fillDate.toISOString().split('T')[0],
        value: lastSnap.value,
        cost: lastSnap.cost,
        prices: lastSnap.prices
      });
    }
    return newHistory.sort((a, b) => a.timestamp - b.timestamp);
  }

  const activeAssets = portfolio.filter(a => a.quantity > 0);
  if (activeAssets.length === 0) {
    return history || [];
  }

  // 1. Portföydeki en eski varlığın eklenme tarihini bul (Bundan geriye ASLA gitmeyeceğiz)
  const earliestTs = Math.min(...activeAssets.map(a => Number(a.addedDate) || Date.now()));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mevcut gerçek snapshot'ları korumak için gün bazında grupla
  const historyMap = new Map();
  (history || []).forEach(snap => {
    if (snap.date) {
      if (!historyMap.has(snap.date)) {
        historyMap.set(snap.date, []);
      }
      historyMap.get(snap.date).push(snap);
    }
  });

  const startDay = new Date(earliestTs);
  startDay.setHours(0, 0, 0, 0);

  const filledHistory = [];
  let currentDay = new Date(startDay);

  while (currentDay <= today) {
    const dayStr = currentDay.toISOString().split('T')[0];
    const dayTs = currentDay.getTime();

    // Eğer o güne ait GERÇEK bir anlık snapshot varsa onu koru
    const daySnaps = historyMap.get(dayStr);
    const hasRealSnap = daySnaps && daySnaps.some(s => !s.isAutofilled);

    if (hasRealSnap) {
      // Tüm gerçek snapshot'ları koru (gün içi 5 dakikalık veriler silinmez)
      filledHistory.push(...daySnaps.filter(s => !s.isAutofilled));
    } else {
      // O gün için varlık bazında tarihsel rekonstrüksiyon yap
      let totalVal = 0;
      let totalCost = 0;
      const pricesAtDay = {};

      activeAssets.forEach(asset => {
        const addedTs = Number(asset.addedDate) || 0;
        // Eğer bu tarihte varlığa sahipsek hesaba kat (12 saatlik tölerans)
        if (dayTs >= (addedTs - 12 * 60 * 60 * 1000)) {
          const sym = asset.symbol || asset.name;
          const assetHistory = priceHistory[sym] || {};

          // O günün sonuna kadar olan en güncel kapanış fiyatını bul
          const dayEndTs = dayTs + 24 * 60 * 60 * 1000 - 1;
          const historyTimestamps = Object.keys(assetHistory)
            .map(Number)
            .filter(ts => ts <= dayEndTs && assetHistory[ts] > 0)
            .sort((a, b) => b - a); // En yeni tarihten en eskiye

          let priceAtDay = asset.price; // Varsayılan alış fiyatı (fallback)
          if (historyTimestamps.length > 0) {
            priceAtDay = assetHistory[historyTimestamps[0]];
          }

          const isUsd = asset.type === 'CRYPTO' || asset.type === 'USA' || sym.toUpperCase().includes('USD');
          const rate = isUsd ? (usdToTryRate || 32.5) : 1;

          totalVal += priceAtDay * asset.quantity * rate;
          totalCost += asset.price * asset.quantity * rate;
          pricesAtDay[asset.name] = priceAtDay;
        }
      });

      if (totalVal > 0) {
        filledHistory.push({
          date: dayStr,
          timestamp: dayTs + 12 * 60 * 60 * 1000, // Öğlen 12:00
          value: totalVal,
          cost: totalCost,
          prices: pricesAtDay,
          isAutofilled: true // Sonradan otomatik doldurulduğunu belirtmek için bayrak
        });
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  return filledHistory.sort((a, b) => a.timestamp - b.timestamp);
};

export const cleanChartHistory = (history) => {
  if (!history || history.length === 0) return [];
  
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const hourlyMap = new Map();
  const dailyMap = new Map();
  const recentData = [];

  history.forEach(snap => {
    const ts = snap.timestamp;
    if (ts >= oneDayAgo) {
      // Son 24 saat: Tüm kayıtları koru
      recentData.push(snap);
    } else if (ts >= oneWeekAgo) {
      // 1 gün - 1 hafta arası: Saatte bir tut (İlk kaydı koru)
      const hourKey = new Date(ts).toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
      if (!hourlyMap.has(hourKey)) hourlyMap.set(hourKey, snap);
    } else {
      // 1 haftadan eski: Günde bir tut (Son kaydı koru)
      const dayKey = new Date(ts).toISOString().split('T')[0]; // "YYYY-MM-DD"
      dailyMap.set(dayKey, snap);
    }
  });

  return [
    ...Array.from(dailyMap.values()),
    ...Array.from(hourlyMap.values()),
    ...recentData
  ].sort((a, b) => a.timestamp - b.timestamp);
};


