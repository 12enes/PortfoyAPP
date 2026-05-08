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

    let updatedPriceHistory = { ...priceHistory };
    const storedPriceHistory = await AsyncStorage.getItem('@price_history');
    if (storedPriceHistory) {
      updatedPriceHistory = JSON.parse(storedPriceHistory);
    }
    Object.entries(currentAssetPrices).forEach(([symbol, price]) => {
      const numericPrice = Number(price);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) return;
      updatedPriceHistory[symbol] = {
        ...(updatedPriceHistory[symbol] || {}),
        [now]: numericPrice
      };
    });

    setPriceHistory(updatedPriceHistory);
    AsyncStorage.setItem('@price_history', JSON.stringify(updatedPriceHistory));
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

      // ONE-TIME MİGRASYON: Eski sahte chartHistory ve priceHistory verilerini temizle
      const migrationDone = await AsyncStorage.getItem('@migration_v2_clean_mock');
      if (!migrationDone) {
        // Eski mock verileri temizle — yeni gerçek veriler sıfırdan birikecek
        await AsyncStorage.removeItem('@chart_history');
        await AsyncStorage.removeItem('@price_history');
        await AsyncStorage.setItem('@migration_v2_clean_mock', 'true');
        // Temizlenmiş veriyi kullanma, boş başla
        setChartHistory([]);
        setPriceHistory({});
      } else {
        const parsedChart = sChart ? JSON.parse(sChart) : null;
        if (parsedChart) setChartHistory(parsedChart);
        if (sPriceHist) {
          setPriceHistory(JSON.parse(sPriceHist));
        } else if (parsedChart && parsedChart.length > 0) {
          const derivedPriceHistory = buildPriceHistoryFromChart(parsedChart);
          setPriceHistory(derivedPriceHistory);
          AsyncStorage.setItem('@price_history', JSON.stringify(derivedPriceHistory));
        }
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
      
      if (sPort) {
        const parsedPort = JSON.parse(sPort).map(item => ({...item, type: migrateType(item.type)}));
        refreshPortfolioPrices(parsedPort);
      }
    } catch (e) { 
      Alert.alert(t('alertWarning'), "Error loading data"); 
    }
  };

  const saveLists = async (data) => { 
    setCustomLists(data); 
    await AsyncStorage.setItem('@custom_lists', JSON.stringify(data)); 
  };

  return { saveData, loadData, saveLists, refreshPortfolioPrices, saveDailySnapshot, onRefreshMarket, getTimeframeLabel, getFilteredHistory };
};
