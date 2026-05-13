import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Animated } from 'react-native';

export const usePortfolioData = (deps) => {
  const {
    portfolio, setPortfolio, watchlist, setWatchlist, history, setHistory, 
    chartHistory, setChartHistory, priceHistory, setPriceHistory,
    setLang, setCurrency, setTheme, customLists, setCustomLists, setCashBalance, setUsdToTryRate,
    setIsRefreshing, flashAnim, lang, timeFilter,
    t, MarketService, migrateType
  } = deps;

  const saveData = async (key, data) => { 
    await AsyncStorage.setItem(key, JSON.stringify(data)); 
  };

  const buildPriceHistoryFromChart = (historyData) => {
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

  const fillMissingDays = async (history, portfolioData) => {
    if (!history || history.length === 0) return history;
    
    const lastSnap = history[history.length - 1];
    const lastDate = new Date(lastSnap.timestamp);
    const today = new Date();
    
    // Gün farkını hesapla
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const dayDiff = Math.floor((today - lastDate) / (24 * 60 * 60 * 1000));
    
    // 1 günden az fark varsa doldurma
    if (dayDiff <= 1) return history;
    
    // Maksimum 30 gün doldur
    const daysToFill = Math.min(dayDiff - 1, 30);
    const newHistory = [...history];
    
    for (let i = 1; i <= daysToFill; i++) {
      const fillDate = new Date(lastDate);
      fillDate.setDate(fillDate.getDate() + i);
      
      // Hafta sonu atla (0=Pazar, 6=Cumartesi)
      if (fillDate.getDay() === 0 || fillDate.getDay() === 6) continue;
      
      // O günün timestamp'i (öğlen 12:00)
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
  };

  const refreshPortfolioPrices = async (portfolioData, force = false) => {
    const data = portfolioData || portfolio;
    if (!data || data.length === 0) return;
    
    try {
      if (!force) {
        const lastFetch = await AsyncStorage.getItem('@last_fetch_time');
        if (lastFetch && Date.now() - Number(lastFetch) < 15 * 60 * 1000) {
          return; // 15 dakika dolmamışsa API'ye gitme
        }
      }

      const updated = await MarketService.fetchMultiple(data);
      const merged = data.map(a => {
        const fresh = updated.find(u => u.id === a.id);
        if (fresh && fresh.currentPrice !== undefined) {
          return {
            ...a,
            currentPrice: fresh.currentPrice,
            changePercent: fresh.changePercent || 0,
            previousClose: fresh.previousClose ?? a.previousClose
          };
        }
        return a;
      });
      setPortfolio(merged);
      saveData('@portfolio', merged);
      await AsyncStorage.setItem('@last_fetch_time', Date.now().toString());
    } catch (e) { 
      // Hata yönetimi
    }
  };

  const saveDailySnapshot = async (currentTotal, currentCost, portfolioSnapshot = portfolio) => {
    let currentHistory = [...chartHistory];
    const storedHistory = await AsyncStorage.getItem('@chart_history');
    if (storedHistory) {
      currentHistory = JSON.parse(storedHistory);
    }

    const lastSaved = currentHistory[currentHistory.length - 1];
    const now = Date.now();
    // 1 dakika geçmemişse kaydetme
    if (lastSaved && now - lastSaved.timestamp < 60000) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const currentAssetPrices = {};
    portfolioSnapshot.forEach(a => {
        currentAssetPrices[a.name] = a.currentPrice !== undefined ? a.currentPrice : a.price;
    });

    const newData = { 
      date: todayStr, 
      timestamp: now, 
      value: Math.max(0, currentTotal), 
      cost: Math.max(0, currentCost),
      prices: currentAssetPrices
    };

    currentHistory.push(newData); 

    // --- AKILLI VERİ YÖNETİMİ (CLEANUP) ---
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const hourlyMap = new Map();
    const dailyMap = new Map();
    const recentData = [];

    currentHistory.forEach(snap => {
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

    const finalHistory = [
      ...Array.from(dailyMap.values()),
      ...Array.from(hourlyMap.values()),
      ...recentData
    ].sort((a, b) => a.timestamp - b.timestamp);

    setChartHistory(finalHistory);
    AsyncStorage.setItem('@chart_history', JSON.stringify(finalHistory));

    // NOT: priceHistory artık burada güncellenmez.
    // priceHistory yalnızca fetchHistoricalPrices (Yahoo/Binance API) tarafından doldurulur.
    // Bu, para birimi kirlenmesini (TL vs USD karışması) önler.
  };

  const onRefreshMarket = async () => {
    setIsRefreshing(true);
    setWatchlist(currentWatchlist => {
      if (!currentWatchlist || currentWatchlist.length === 0) {
        setIsRefreshing(false);
        return currentWatchlist;
      }
      
      MarketService.fetchMultiple(currentWatchlist).then(updated => {
        setWatchlist(updated);
        saveData('@watchlist', updated);
        AsyncStorage.setItem('@last_fetch_time', Date.now().toString());
        
        flashAnim.setValue(1);
        Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: false }).start();
        setIsRefreshing(false);
      }).catch(e => {
        setIsRefreshing(false);
      });
      
      return currentWatchlist;
    });
  };

  const getTimeframeLabel = () => {
    if (lang === 'tr') { switch(timeFilter) { case '1D': return 'Son 24 Saat'; case '1W': return 'Son 1 Hafta'; case '1M': return 'Son 1 Ay'; case '3M': return 'Son 3 Ay'; case '6M': return 'Son 6 Ay'; case 'YTD': return 'Yılbaşından Beri'; case '1Y': return 'Son 1 Yıl'; case 'ALL': return 'Tüm Zamanlar'; default: return ''; } } 
    else { switch(timeFilter) { case '1D': return 'Last 24 Hours'; case '1W': return 'Last 1 Week'; case '1M': return 'Last 1 Month'; case '3M': return 'Last 3 Months'; case '6M': return 'Last 6 Months'; case 'YTD': return 'Year to Date'; case '1Y': return 'Last 1 Year'; case 'ALL': return 'All Time'; default: return ''; } }
  };

  const getFilteredHistory = () => {
    const now = Date.now(); let cutoff = 0;
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
    return history.filter(tx => {
      if (tx.netProfit === undefined || tx.netProfit === null || tx.netProfit === 0) return false;
      const txTime = tx.timestamp || Date.parse(tx.date) || 0;
      return txTime >= cutoff;
    });
  };

  const loadData = async () => {
    try {
      const sPort = await AsyncStorage.getItem('@portfolio');
      const sWatch = await AsyncStorage.getItem('@watchlist');
      const sHist = await AsyncStorage.getItem('@history');
      const sChart = await AsyncStorage.getItem('@chart_history');
      const sPriceHist = await AsyncStorage.getItem('@price_history');
      const sCash = await AsyncStorage.getItem('@cash_balance');
      const sLang = await AsyncStorage.getItem('@language'); 
      const sCurr = await AsyncStorage.getItem('@currency');
      const sTheme = await AsyncStorage.getItem('@theme'); 
      const sLists = await AsyncStorage.getItem('@custom_lists');

      // ONE-TIME MİGRASYON v2: Eski sahte chartHistory ve priceHistory verilerini temizle
      const migrationDone = await AsyncStorage.getItem('@migration_v2_clean_mock');
      if (!migrationDone) {
        await AsyncStorage.removeItem('@chart_history');
        await AsyncStorage.removeItem('@price_history');
        await AsyncStorage.setItem('@migration_v2_clean_mock', 'true');
        setChartHistory([]);
        setPriceHistory({});
      } else {
        let parsedChart = sChart ? JSON.parse(sChart) : [];
        const parsedPort = sPort ? JSON.parse(sPort) : [];
        
        // EKSİK GÜN DOLDURMA MEKANİZMASI
        const filledHistory = await fillMissingDays(parsedChart, parsedPort);
        parsedChart = filledHistory;
        
        setChartHistory(parsedChart);
        if (sChart !== JSON.stringify(parsedChart)) {
          AsyncStorage.setItem('@chart_history', JSON.stringify(parsedChart));
        }

        // priceHistory: Sadece fetchHistoricalPrices'tan gelen temiz veriyi yükle
        if (sPriceHist) {
          setPriceHistory(JSON.parse(sPriceHist));
        }
      }

      // ONE-TIME MİGRASYON v3: Eski snapshot kaynaklı kirli priceHistory'yi temizle
      // Bu veriler TL ve USD karışık olduğu için performans yüzdelerini bozuyordu.
      // Temizlendikten sonra fetchAllHistory saf API verileriyle dolduracak.
      const migrationV3 = await AsyncStorage.getItem('@migration_v3_clean_price_history');
      if (!migrationV3) {
        await AsyncStorage.removeItem('@price_history');
        await AsyncStorage.setItem('@migration_v3_clean_price_history', 'true');
        setPriceHistory({});
      }
      
      if (sPort) setPortfolio(JSON.parse(sPort).map(item => ({...item, type: migrateType(item.type)})));
      if (sWatch) setWatchlist(JSON.parse(sWatch).map(item => ({ ...item, type: migrateType(item.type), changePercent: item.changePercent || 0 })));
      if (sHist) setHistory(JSON.parse(sHist));
      if (sCash) setCashBalance(Number(JSON.parse(sCash)) || 0);
      if (sLang) setLang(sLang);
      if (sCurr) setCurrency(sCurr);
      if (sTheme) setTheme(sTheme);
      if (sLists) setCustomLists(JSON.parse(sLists));
      
      try {
        const rates = await MarketService._fetchForexRates();
        if (rates?.TRY) setUsdToTryRate(rates.TRY);
      } catch (e) { }
      
      if (sPort || sWatch) {
        const parsedPort = sPort ? JSON.parse(sPort).map(item => ({...item, type: migrateType(item.type)})) : [];
        const parsedWatch = sWatch ? JSON.parse(sWatch).map(item => ({ ...item, type: migrateType(item.type) })) : [];

        if (parsedPort.length > 0) refreshPortfolioPrices(parsedPort);
        
        // BUGÜNÜN VERİSİ YOKSA GÜN İÇİ GEÇMİŞİ ÇEK
        const parsedChart = sChart ? JSON.parse(sChart) : [];
        const todayStr = new Date().toISOString().split('T')[0];
        const hasTodaySnap = (parsedChart || []).some(s => s.date === todayStr);
        if (!hasTodaySnap && parsedPort.length > 0) {
          fetchIntradaySnapshots(parsedPort, parsedChart);
        }

        // HER VARLIK İÇİN 1 YILLIK GEÇMİŞ VERİSİ ÇEK
        const fetchAllHistory = async () => {
          let updatedHistory = { ...priceHistory };
          let changed = false;
          
          // Portfolio ve watchlist varlıklarını birleştir
          const allAssets = [...(parsedPort || []), ...(parsedWatch || [])];
          // Mükerrer sembolleri temizle
          const uniqueAssets = allAssets.filter((asset, index, self) => 
            index === self.findIndex(a => (a.symbol || a.name) === (asset.symbol || asset.name))
          );

          await Promise.all(uniqueAssets.map(async (asset) => {
            const sym = asset.symbol || asset.name;
            const historyData = await MarketService.fetchHistoricalPrices(sym, asset.type, 365);
            if (historyData && Object.keys(historyData).length > 0) {
              const isUsdBased = asset.type === 'USA' || asset.type === 'CRYPTO';
              
              if (isUsdBased) {
                // KRİTİK: USD varlıklar için ESKİ (muhtemelen TL olan) verileri sil, 
                // SADECE yeni gelen temiz USD verisini kullan.
                updatedHistory[sym] = historyData;
              } else {
                updatedHistory[sym] = { ...(updatedHistory[sym] || {}), ...historyData };
              }
              changed = true;
            }
          }));

          if (changed) {
            setPriceHistory(updatedHistory);
            saveData('@price_history', updatedHistory);
          }
        };
        fetchAllHistory();
      }
    } catch (e) { 
      Alert.alert(t('alertWarning'), "Error loading data"); 
    }
  };

  const fetchIntradaySnapshots = async (targetPortfolio = portfolio, currentChartHistory = chartHistory) => {
    try {
      const activeAssets = targetPortfolio.filter(a => a.quantity > 0 && a.type !== 'TEFAS');
      if (activeAssets.length === 0) return;

      const results = {}; // symbol -> { timestamp: price }
      const allTimestamps = new Set();

      await Promise.all(activeAssets.map(async (asset) => {
        let url = '';
        let type = asset.type;
        let symbol = asset.symbol || asset.name;

        if (type === 'BIST' || type === 'INDEX') {
          url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent((type === 'BIST' && !symbol.endsWith('.IS')) ? symbol + '.IS' : symbol)}?interval=5m&range=1d`;
        } else if (type === 'USA') {
          url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`;
        } else if (type === 'CRYPTO') {
          url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}USDT&interval=5m&limit=200`;
        } else if (type === 'GOLD' || type === 'FOREX') {
          // Altın ve Emtia için Yahoo eşleşmesi
          let yahooSymbol = symbol;
          if (symbol.includes('ALTIN') || symbol.includes('XAU')) yahooSymbol = 'GC=F';
          else if (symbol.includes('GUMUS') || symbol.includes('XAG')) yahooSymbol = 'SI=F';
          else if (symbol.includes('BRENT')) yahooSymbol = 'BZ=F';
          else if (symbol.includes('PLATIN')) yahooSymbol = 'PL=F';
          else return; // Desteklenmeyenler için pas geç
          url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=5m&range=1d`;
        } else {
          return;
        }

        try {
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
          });
          if (!res.ok) return;
          const data = await res.json();

          const assetPrices = {};
          if (type === 'CRYPTO') {
             // Binance Format: [ [ts, o, h, l, c, ...], ... ]
             (data || []).forEach(k => {
               const ts = Math.floor(k[0] / 60000) * 60000; // Dakikaya yuvarla
               const price = parseFloat(k[4]);
               assetPrices[ts] = price;
               allTimestamps.add(ts);
             });
          } else {
             // Yahoo Format
             const result = data.chart?.result?.[0];
             if (!result || !result.timestamp) return;
             const tsArr = result.timestamp;
             const priceArr = result.indicators.quote[0].close;
             tsArr.forEach((ts, idx) => {
               const fullTs = Math.floor((ts * 1000) / 60000) * 60000;
               const p = priceArr[idx];
               if (p !== null && p !== undefined) {
                 assetPrices[fullTs] = p;
                 allTimestamps.add(fullTs);
               }
             });
          }
          results[asset.name] = assetPrices;
        } catch (err) { /* sessiz hata */ }
      }));

      if (allTimestamps.size === 0) return;

      // Tüm timestamp'ler için portföy değerini hesapla
      const sortedTs = Array.from(allTimestamps).sort((a, b) => a - b);
      const todayStr = new Date().toISOString().split('T')[0];
      const newSnaps = [];

      sortedTs.forEach(ts => {
        let totalVal = 0;
        let totalCost = 0;
        const pricesAtT = {};

        targetPortfolio.forEach(asset => {
          const qty = asset.quantity || 0;
          if (qty <= 0) return;

          // Bu an için fiyat bul (veya en yakın önceki fiyatı bul)
          let priceAtT = results[asset.name]?.[ts];
          
          // Eğer o an için fiyat yoksa, önceki noktalara bak (Forward fill)
          if (priceAtT === undefined) {
             const prevTs = sortedTs.filter(t => t < ts && results[asset.name]?.[t] !== undefined).pop();
             priceAtT = prevTs ? results[asset.name][prevTs] : (asset.currentPrice || asset.price);
          }

          const rate = 1; // Basitlik için 1, istenirse anlık kur eklenebilir
          // Not: Kur değişimi gün içinde çok dramatik olmadığı için anlık kur yeterli olacaktır.
          // Ancak AssetRateToTry mantığına sadık kalmak için:
          const isUsd = (asset.type === 'CRYPTO' || asset.type === 'USA' || (asset.symbol || '').includes('USD'));
          const finalRate = isUsd ? (deps.usdToTryRate || 1) : 1;

          totalVal += priceAtT * qty * finalRate;
          totalCost += (asset.price || 0) * qty * finalRate;
          pricesAtT[asset.name] = priceAtT;
        });

        if (totalVal > 0) {
          newSnaps.push({
            timestamp: ts,
            date: todayStr,
            value: totalVal,
            cost: totalCost,
            prices: pricesAtT
          });
        }
      });

      if (newSnaps.length > 0) {
        const mergedHistory = [...currentChartHistory, ...newSnaps].sort((a, b) => a.timestamp - b.timestamp);
        // De-clustering: Çok yakın noktaları (5dk'dan az) temizle
        const finalHistory = mergedHistory.filter((snap, i) => {
          if (i === 0) return true;
          return snap.timestamp - mergedHistory[i-1].timestamp >= 4 * 60 * 1000;
        });

        setChartHistory(finalHistory);
        saveData('@chart_history', finalHistory);
        
        // Price History'i de güncelle
        const updatedPriceHistory = { ...priceHistory };
        newSnaps.forEach(s => {
          Object.entries(s.prices).forEach(([sym, p]) => {
            if (!updatedPriceHistory[sym]) updatedPriceHistory[sym] = {};
            updatedPriceHistory[sym][s.timestamp] = p;
          });
        });
        setPriceHistory(updatedPriceHistory);
        saveData('@price_history', updatedPriceHistory);
      }
    } catch (e) {
      console.error('fetchIntradaySnapshots error:', e);
    }
  };

  const saveLists = async (data) => { 
    setCustomLists(data); 
    await AsyncStorage.setItem('@custom_lists', JSON.stringify(data)); 
  };

  return { saveData, loadData, saveLists, refreshPortfolioPrices, saveDailySnapshot, onRefreshMarket, getTimeframeLabel, getFilteredHistory };
};
