import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/app/store';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SectionList, Modal, Alert, SafeAreaView, ScrollView, StatusBar, KeyboardAvoidingView, Platform, FlatList, LayoutAnimation, UIManager, Animated, PanResponder, Dimensions, RefreshControl, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { G, Circle, Path } from 'react-native-svg';
import { SafeAreaProvider, SafeAreaView as SafeAreaContext } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { LineChart } from 'react-native-gifted-charts';
import PerformanceChartSection from './PerformanceChartSection';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { calculateAssetPnL, calculateTotalPortfolio, getTopGainersAndLosers, isUsdType, getPieChartDistribution, getPortfolioPerformanceByTimeframe, calculateAdvancedChartData, calculateAssetPnLForTimeframe } from './portfolioEngine';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { DARK_THEME, LIGHT_THEME, PIE_COLORS } from './src/shared/constants/themes';
import { TRANSLATIONS } from './src/shared/constants/translations';
import { MOCK_ASSETS, ASSET_TYPES, CATEGORY_ORDER } from './src/shared/constants/mockData';
import { usePortfolioData } from './src/features/portfolio/usePortfolioData';
import { useWatchlist } from './src/features/watchlist/useWatchlist';
import { usePortfolio } from './src/features/portfolio/usePortfolio';
import { useSearch } from './src/features/search/useSearch';
import { useSettings } from './src/features/settings/useSettings';
import { getAssetIcon, getConvertedValue, createTranslationFunction } from './src/uiUtils';
import { PortfolioScreen } from './src/features/portfolio/PortfolioScreen';
import AssetIcon from './src/components/AssetIcon';
import { MarketScreen } from './src/features/market/MarketScreen';
import { SwipeableModal } from './src/shared/components/SwipeableModal';
import { SettingsModal } from './src/shared/components/SettingsModal';
import { AddAssetModal } from './src/features/portfolio/AddAssetModal';
import { DetailModal } from './src/features/portfolio/DetailModal';
import { ListOptionsModal } from './src/features/watchlist/ListOptionsModal';
import { PriceUpdateModal } from './src/features/portfolio/PriceUpdateModal';
import { SellModal } from './src/features/portfolio/SellModal';
import { CashModal } from './src/features/portfolio/CashModal';
import { ListModal } from './src/features/market/ListModal';
import { ProfitModal } from './src/features/portfolio/ProfitModal';
import { DistributionModal } from './src/features/portfolio/DistributionModal';













// ============================================================================
// 1. DİNAMİK TEMA PALETLERİ & SABİTLER (DIŞARI TAŞINDI)
// ============================================================================


const migrateType = (type) => {
  switch(type) { 
    case 'Hisse': return 'BIST'; 
    case 'Fon': return 'TEFAS'; 
    case 'Altın/Döviz': return 'GOLD'; 
    case 'Kripto': return 'CRYPTO'; 
    case 'ABD Hisse': return 'USA'; 
    case 'Endeks': case 'INDEX': return 'INDEX';
    default: return type || 'BIST'; 
  }
};

const getCurrencySymbol = (type, symbolOrName) => {
  // Varlık bazlı doğal para birimi tespiti
  if (symbolOrName) {
    const s = symbolOrName.toUpperCase();
    const tlAssets = ['GRAM/TL', 'DOLAR/TL', 'EURO/TL', 'GRAM ALTIN', 'ALTIN'];
    if (tlAssets.some(a => s.includes(a)) || s.includes('/TL')) return '₺';
    if (s.includes('XAU') || s.includes('BRENT') || s.includes('XAG') || s.includes('SILVER') || s.includes('PLATINUM') || s.includes('ONS')) return '$';
  }
  
  switch(type) { 
    case 'BIST': case 'TEFAS': return '₺'; 
    case 'CRYPTO': return '$'; 
    case 'USA': return '$'; 
    case 'INDEX':
      if (symbolOrName && symbolOrName.startsWith('^')) return '$';
      return '₺';
    case 'GOLD': 
      if (symbolOrName && symbolOrName.includes('USD')) return '$';
      return '₺';
    case 'FOREX': return '₺';
    default: return '₺'; 
  }
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const MarketService = {
  // TEFAS API: Doğrudan Native Fetch
  _fetchTefas: async (symbol) => {
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
        const prices = data.resultList.map(item => item.fiyat);
        const latestPrice = prices[prices.length - 1];
        let changePct = 0;
        let previousClose = null; // Varsayılan null, merge sırasında korunması için
        
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

  _fetchYahooFinance: async (symbol) => {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
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

  // Binance: Kripto fiyatları (BTC, ETH, BNB, SOL, XRP → USDT paritesi)
  _fetchCryptoPrice: async (symbol) => {
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

  // Binance PAXG: Ons altın proxy (XAU/USD ≈ PAXG/USDT)
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

  // Frankfurter API: Döviz kurları (Anlık ve Dünkü Kapanış)
  _fetchForexRates: async () => {
    try {
      const currencies = 'TRY,EUR,GBP,JPY,CHF,AUD';
      
      // Bugünkü kurlar
      const todayRes = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currencies}`);
      if (!todayRes.ok) throw new Error('Frankfurter Today failed');
      const todayData = await todayRes.json();
      
      // Dünkü kurlar (previousClose için)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      // Hafta sonu kontrolü: 0=Pazar, 6=Cumartesi
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

  fetchAsset: async (asset) => { 
    try {
      const results = await MarketService.fetchMultiple([asset]);
      return results[0] || asset;
    } catch (e) {
      return asset;
    }
  },

  fetchHistoricalPrices: async (symbol, type, daysBack = 365) => {
    try {
      if (type === 'TEFAS') {
        const res = await fetch('https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir', {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({fonKodu: symbol, dil: 'TR', periyod: 12})
        });
        if (!res.ok) return {};
        const data = await res.json();
        const history = {};
        if (data && data.resultList) {
          data.resultList.forEach(item => {
            if (item.fiyat > 0 && item.tarih) {
              // Gece yarısı olacak şekilde milisaniyeye çeviriyoruz
              const ts = new Date(item.tarih).getTime();
              history[ts] = item.fiyat;
            }
          });
        }
        return history;
      }

      let url = '';
      if (type === 'BIST' || type === 'USA' || type === 'INDEX') {
        const fetchSymbol = (type === 'BIST' && !symbol.endsWith('.IS')) ? `${symbol}.IS` : symbol;
        url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(fetchSymbol)}?interval=1d&range=1y`;
      } else if (type === 'CRYPTO') {
        url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}USDT&interval=1d&limit=365`;
      } else if (type === 'GOLD' || type === 'FOREX') {
        let yahooSymbol = symbol;
        if (symbol.includes('ALTIN') || symbol.includes('XAU')) yahooSymbol = 'GC=F';
        else if (symbol.includes('GUMUS') || symbol.includes('XAG')) yahooSymbol = 'SI=F';
        else if (symbol.includes('BRENT')) yahooSymbol = 'BZ=F';
        else if (symbol.includes('PLATIN')) yahooSymbol = 'PL=F';
        else return {};
        url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1y`;
      } else {
        return {};
      }

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
      });
      if (!res.ok) return {};
      const data = await res.json();
      const history = {};

      if (type === 'CRYPTO') {
        (data || []).forEach(k => {
          const ts = k[0];
          const price = parseFloat(k[4]);
          if (price > 0) history[ts] = price;
        });
      } else {
        const result = data.chart?.result?.[0];
        if (!result || !result.timestamp) return {};
        const tsArr = result.timestamp;
        const priceArr = result.indicators.quote[0].close;
        tsArr.forEach((ts, idx) => {
          const fullTs = ts * 1000;
          const p = priceArr[idx];
          if (p !== null && p !== undefined && p > 0) {
            history[fullTs] = p;
          }
        });
      }
      return history;
    } catch (e) {
      return {};
    }
  },

  fetchMultiple: async (assets) => {
    const needsCrypto = assets.some(a => a.type === 'CRYPTO');
    const needsGold = assets.some(a => a.type === 'GOLD' || ['XAU/USD', 'GRAM/TL'].includes(a.symbol || a.name));
    const needsForex = assets.some(a => a.type === 'GOLD' || ['DOLAR/TL', 'EURO/TL', 'GBP', 'STERLIN', 'YEN', 'FRANK', 'AUD', 'GRAM/TL'].some(s => (a.symbol || a.name || '').includes(s)));
    const needsYahoo = assets.some(a => a.type === 'BIST' || a.type === 'USA' || a.type === 'INDEX' || ['BRENT', 'BZ', 'SILVER', 'XAG/USD', 'GUMUS', 'GLD/AG', 'PLATINUM', 'PLATIN', 'PL', 'NATURALGAZ', 'PALADYUM', 'PALADIUM', 'PALLADIUM', 'PA'].some(s => (a.symbol || a.name || '').includes(s)));
    const needsTefas = assets.some(a => a.type === 'TEFAS');
    
    // 1. Kripto İstekleri
    const cryptoSymbols = [...new Set(assets.filter(a => a.type === 'CRYPTO').map(a => a.symbol || a.name))];
    const cryptoPromises = needsCrypto
      ? cryptoSymbols.map(sym => MarketService._fetchCryptoPrice(sym).then(r => [sym, r]))
      : [];

    // 2. Yahoo Finance İstekleri (BIST ve ABD)
    const yahooSymbolsMap = {}; // Ekranda görünen ad ile Yahoo sorgu adını eşleştir
    assets.filter(a => a.type === 'BIST' || a.type === 'USA' || a.type === 'INDEX' || ['BRENT', 'BZ', 'SILVER', 'XAG/USD', 'GUMUS', 'GLD/AG', 'PLATINUM', 'PLATIN', 'PL', 'NATURALGAZ', 'PALADYUM', 'PALADIUM', 'PALLADIUM', 'PA'].some(s => (a.symbol || a.name || '').includes(s))).forEach(a => {
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
    const yahooResults = [];
    if (needsYahoo) {
      for (let i = 0; i < uniqueYahooSymbols.length; i += 3) {
        const batch = uniqueYahooSymbols.slice(i, i + 3);
        const batchPromises = batch.map(sym => MarketService._fetchYahooFinance(sym).then(r => [sym, r]));
        const batchResults = await Promise.all(batchPromises);
        yahooResults.push(...batchResults);
        if (i + 3 < uniqueYahooSymbols.length) {
          await new Promise(res => setTimeout(res, 200));
        }
      }
    }

    // 3. TEFAS İstekleri
    const tefasSymbols = [...new Set(assets.filter(a => a.type === 'TEFAS').map(a => a.symbol || a.name))];
    const tefasPromises = needsTefas
      ? tefasSymbols.map(sym => MarketService._fetchTefas(sym).then(r => [sym, r]))
      : [];

    // 4. Altın ve Döviz
    const goldPromise = needsGold ? MarketService._fetchGoldUSD() : Promise.resolve(null);
    const forexPromise = needsForex ? MarketService._fetchForexRates() : Promise.resolve(null);

    const [cryptoResults, tefasResults, goldData, forexData] = await Promise.all([
      Promise.all(cryptoPromises),
      Promise.all(tefasPromises),
      goldPromise,
      forexPromise
    ]);

    const dataMap = {};
    cryptoResults.forEach(([sym, result]) => { if (result) dataMap[sym] = result; });
    yahooResults.forEach(([sym, result]) => { if (result) dataMap[sym] = result; });
    tefasResults.forEach(([sym, result]) => { if (result) dataMap[sym] = result; });

    const todayRates = forexData?.rates || null;
    const prevRates = forexData?.previousRates || null;
    const usdTry = todayRates?.TRY || null;
    const eurUsd = todayRates?.EUR || null; 
    const xauUsd = goldData?.price || null;

    const updated = assets.map(a => {
      const sym = a.symbol || a.name;
      
      // BIST, ABD Hisse, INDEX ve BRENT Eşleştirmesi
      if (a.type === 'BIST' || a.type === 'USA' || a.type === 'INDEX' || sym === 'BRENT') {
        const querySymbol = yahooSymbolsMap[sym];
        if (dataMap[querySymbol]) {
          const { price, changePct, previousClose } = dataMap[querySymbol];
          
          let normalizedAsset = { ...a, currentPrice: price, changePercent: changePct, previousClose: previousClose || a.previousClose };

          // DATA NORMALIZATION FIX FOR INDEX
          if (a.type === 'INDEX') {
            const originalMock = MOCK_ASSETS.INDEX.find(m => m.symbol === sym || m.name === sym);
            if (originalMock) {
              normalizedAsset.name = originalMock.name;
              normalizedAsset.symbol = originalMock.symbol;
            }
          }

          return normalizedAsset;
        }
      }

      // Kripto Eşleştirmesi
      if (a.type === 'CRYPTO' && dataMap[sym]) {
        const { price, changePct, previousClose } = dataMap[sym];
        return { ...a, currentPrice: price, changePercent: changePct, previousClose: previousClose || a.previousClose };
      }

      // TEFAS Eşleştirmesi
      if (a.type === 'TEFAS' && dataMap[sym]) {
        const { price, changePct, previousClose } = dataMap[sym];
        return { ...a, currentPrice: price, changePercent: changePct, previousClose: previousClose || a.previousClose };
      }

      // Altın/Döviz Eşleştirmesi
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
          return { ...a, currentPrice: xauUsd, changePercent: goldData.changePct, previousClose: goldData.previousClose };
        }
        if (['GRAM/TL', 'GLD/TRY', 'ALTIN/TL', 'ALTIN'].some(s => sym.includes(s)) && xauUsd && usdTry) {
          const currentPrice = (xauUsd * usdTry) / 31.1035;
          const prevGold = goldData?.previousClose || xauUsd;
          const prevTry = (prevRates && prevRates.TRY) ? prevRates.TRY : null;
          const previousClose = prevTry ? (prevGold * prevTry) / 31.1035 : (a.previousClose || currentPrice);
          const pct = ((currentPrice - previousClose) / previousClose) * 100;
          return { ...a, currentPrice: parseFloat(currentPrice.toFixed(2)), changePercent: pct, previousClose };
        }

        // Esnek Döviz Eşleştirmeleri (GBP, JPY, CHF, AUD)
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
        
        // Yahoo Finance tabanlı emtialar (Gümüş, Platin, Petrol, Paladyum vb.)
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

export default function App() {
  return (
    <Provider store={store}>
      <AppRoot />
    </Provider>
  );
}

function AppRoot() {
  const [portfolio, setPortfolio] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [history, setHistory] = useState([]);
  const [chartHistory, setChartHistory] = useState([]); // FAZ 3: Gerçek Zamanlı Grafik Veritabanı
  const [priceHistory, setPriceHistory] = useState({}); // FAZ 1: Varlıkların Geçmiş Fiyat Veritabanı
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  // Uygulama açılışında gizlilik ayarını yükle
  useEffect(() => {
    const loadVisibility = async () => {
      const saved = await AsyncStorage.getItem('@balance_visibility');
      if (saved !== null) setIsBalanceVisible(saved === 'true');
    };
    loadVisibility();
  }, []);

  const toggleBalanceVisibility = async () => {
    const newVal = !isBalanceVisible;
    setIsBalanceVisible(newVal);
    await AsyncStorage.setItem('@balance_visibility', newVal.toString());
  };

  const [activeTab, setActiveTab] = useState('PORTFOLIO');


  
  const [lang, setLang] = useState('tr'); 
  const [currency, setCurrency] = useState('₺');
  const [theme, setTheme] = useState('dark'); 

  const COLORS = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
  const styles = useMemo(() => getStyles(COLORS), [COLORS]);
  const t = createTranslationFunction(TRANSLATIONS, lang);
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [chartViewMode, setChartViewMode] = useState('PERFORMANCE'); // 'PERFORMANCE' veya 'ASSET_FLOW'
  const [usdToTryRate, setUsdToTryRate] = useState(32.50);

  const netWorthScale = useRef(new Animated.Value(1)).current;
  const profitScale = useRef(new Animated.Value(1)).current;
  const pagerRef = useRef(null);
  const pageScrollPos = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const portfolioOpacity = pageScrollPos.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const marketOpacity = pageScrollPos.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, { toValue: 0.98, duration: 2000, useNativeDriver: true }),
        Animated.timing(fabScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  
  const [marketTabMode, setMarketTabMode] = useState('GRID');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [customLists, setCustomLists] = useState([]); 
  const [selectedListId, setSelectedListId] = useState(null); 
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listNameInput, setListNameInput] = useState('');
  const [editingListId, setEditingListId] = useState(null); 
  // NAKİT KASA SİSTEMİ
  const [cashBalance, setCashBalance] = useState(0); // Kasadaki boşta duran TL
  const [cashModalVisible, setCashModalVisible] = useState(false); // Para Ekle/Çek penceresi
  const [cashInput, setCashInput] = useState(''); // Kullanıcının girdiği tutar
  // YENİ: Modalda gösterilecek Input Hatası için
  const [listError, setListError] = useState('');

  const [isMarketEditMode, setIsMarketEditMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingPortfolio, setIsRefreshingPortfolio] = useState(false);
  const [isPagerDisabled, setIsPagerDisabled] = useState(false);



  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  // YENİ: Input'u titretmek için Animasyon Değeri
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isMarketEditMode) {
      Animated.loop(Animated.sequence([ Animated.timing(wiggleAnim, { toValue: 1, duration: 120, useNativeDriver: true }), Animated.timing(wiggleAnim, { toValue: -1, duration: 120, useNativeDriver: true }), Animated.timing(wiggleAnim, { toValue: 0, duration: 120, useNativeDriver: true }) ])).start();
    } else {
      wiggleAnim.stopAnimation(); wiggleAnim.setValue(0);
    }
  }, [isMarketEditMode]);
  const wiggleStyle = { transform: [{ rotate: wiggleAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-1.5deg', '1.5deg'] }) }] };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handleNetWorthPressIn = () => Animated.spring(netWorthScale, { toValue: 0.97, useNativeDriver: true }).start();
  const handleNetWorthPressOut = () => Animated.spring(netWorthScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();
  const handleProfitPressIn = () => Animated.spring(profitScale, { toValue: 0.97, useNativeDriver: true }).start();
  const handleProfitPressOut = () => Animated.spring(profitScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();

  const [modalVisible, setModalVisible] = useState(false);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [distributionModalVisible, setDistributionModalVisible] = useState(false);
  const [profitModalVisible, setProfitModalVisible] = useState(false);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  
  const [isAddMoreMode, setIsAddMoreMode] = useState(false);
  const [selectedAssetInfo, setSelectedAssetInfo] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const [assetType, setAssetType] = useState('BIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchAsset, setSelectedSearchAsset] = useState(null);
  const [selectedPieSlice, setSelectedPieSlice] = useState(null);
  const [listOptionsVisible, setListOptionsVisible] = useState(false);
  const [selectedOptionList, setSelectedOptionList] = useState(null);

  const [inputMode, setInputMode] = useState('AMOUNT'); 
  const [primaryInput, setPrimaryInput] = useState(''); 
  const [buyPrice, setBuyPrice] = useState(''); 
  const [note, setNote] = useState('');

  const [currentPriceInput, setCurrentPriceInput] = useState('');
  const [sellQuantityInput, setSellQuantityInput] = useState('');


  const { changeTheme, changeLanguage, changeCurrency, handleResetAllData, logTransaction } = useSettings({
    setTheme, setLang, setCurrency, setPortfolio, setWatchlist, setHistory,
    setChartHistory, setCustomLists, setCashBalance, setSettingsVisible,
    history, saveData: (key, data) => AsyncStorage.setItem(key, JSON.stringify(data)), // Inline helper since saveData comes from usePortfolioData
    t
  });

  const { saveData, loadData, saveLists, refreshPortfolioPrices, saveDailySnapshot, onRefreshMarket, getTimeframeLabel, getFilteredHistory } = usePortfolioData({
    portfolio, setPortfolio, watchlist, setWatchlist, history, setHistory, 
    chartHistory, setChartHistory, priceHistory, setPriceHistory,
    setLang, setCurrency, setTheme, customLists, setWatchlist, setCustomLists, setCashBalance, setUsdToTryRate,
    setIsRefreshing, flashAnim, lang, timeFilter,
    t, MarketService, migrateType
  });

  const { createOrUpdateList, openListOptions, removeWatchlistAsset, removeCustomListAsset } = useWatchlist({
    listNameInput, customLists, editingListId, watchlist,
    saveLists, saveData, setListModalVisible, setListNameInput,
    setEditingListId, setListError, setSelectedListId, triggerShake, t,
    setWatchlist, setIsMarketEditMode, selectedListId, setListOptionsVisible, setSelectedOptionList
  });

  const livePriceMap = useMemo(() => {
    const map = {};
    [...portfolio, ...watchlist].forEach(a => {
      const sym = a.symbol || a.name;
      if (sym && (a.currentPrice || a.price)) {
        map[sym] = a.currentPrice || a.price;
      }
    });
    return map;
  }, [portfolio, watchlist]);

  const { handleSearch, handleCategoryChange, handleAssetSelect, resetAddModal } = useSearch({
    assetType, MOCK_ASSETS, activeTab, marketTabMode, watchlist, customLists, selectedListId,
    searchQuery, setSearchQuery, setSearchResults, setAssetType, setSelectedSearchAsset, setBuyPrice,
    setPrimaryInput, setNote, setInputMode, setIsAddMoreMode, setModalVisible,
    setWatchlist, saveLists, saveData, t, MarketService,
    setListNameInput, setEditingListId, setListError, setListModalVisible,
    livePriceMap // Canlı fiyat haritasını geçiyoruz
  });

  const handleCenterButton = () => {
    setIsAddMoreMode(false);
    // Piyasa ekranındayken ve belirli bir kategori seçiliyse, arama modalını o kategoriye kilitle
    if (activeTab === 'MARKET' && marketTabMode === 'GRID' && selectedCategory !== 'ALL') {
      const catTypeMap = { BIST: 'BIST', USA: 'USA', CRYPTO: 'CRYPTO', GOLD: 'GOLD', TEFAS: 'TEFAS', INDEX: 'INDEX' };
      const mappedType = catTypeMap[selectedCategory] || 'BIST';
      handleCategoryChange(mappedType);
    } else {
      setSearchResults(MOCK_ASSETS[assetType]);
    }
    if (activeTab === 'MARKET' && marketTabMode === 'LISTS' && !selectedListId) {
       setListNameInput(''); setEditingListId(null); setListError(''); setListModalVisible(true);
    } else {
       setModalVisible(true); 
    }
  };

  const { addAsset, deleteAsset, sellAsset, updateCurrentPrice } = usePortfolio({
    activeTab, primaryInput, buyPrice, selectedSearchAsset, portfolio, watchlist,
    customLists, selectedListId, assetType, note, inputMode,
    selectedAssetId, currentPriceInput, sellQuantityInput, usdToTryRate,
    setPortfolio, setWatchlist, setCashBalance, setPriceHistory,
    saveData, saveLists, logTransaction, resetAddModal,
    setModalVisible, setSellModalVisible, setDetailModalVisible,
    setPrimaryInput, setBuyPrice, setNote, setSellQuantityInput, setCurrentPriceInput,
    t, MarketService, onRefreshMarket
  });

  useEffect(() => { loadData(); }, []);

  // Otomatik fiyat güncelleme (Polling) - her 60 saniyede bir
  const portfolioRef = useRef(portfolio);
  const watchlistRef = useRef(watchlist);
  useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);
  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        if (portfolioRef.current.length > 0) {
          await refreshPortfolioPrices(portfolioRef.current, false);
        }
        if (watchlistRef.current.length > 0) {
          // Watchlist cache kontrolü `onRefreshMarket` içinde tam olmadığı için burada doğrudan fetch kullanmak yerine
          // 15 dakikada bir çalıştığı için güvenle fetch edebiliriz.
          const lastFetch = await AsyncStorage.getItem('@last_fetch_time');
          if (!lastFetch || Date.now() - Number(lastFetch) >= 15 * 60 * 1000) {
            await onRefreshMarket();
          }
        }
      } catch (e) { /* Hata yok sayılır */ }
    }, 15 * 60 * 1000); // 15 dakika

    return () => clearInterval(pollInterval);
  }, []);

  const onRefreshPortfolio = async () => {
    setIsRefreshingPortfolio(true);
    // USD/TRY kurunu da güncelle
    try {
      const rates = await MarketService._fetchForexRates();
      if (rates?.TRY) setUsdToTryRate(rates.TRY);
    } catch (e) { /* Mevcut kur kullanılır */ }
    await refreshPortfolioPrices(portfolio, true);
    setIsRefreshingPortfolio(false);
  };

  const numInput = parseFloat(primaryInput.toString().replace(',', '.')) || 0;
  const numPrice = parseFloat(buyPrice.toString().replace(',', '.')) || 0;
  const decimals = assetType === 'CRYPTO' ? 8 : 2; 

  let calculatedQty = 0; let calculatedTotalAmount = 0;
  if (inputMode === 'AMOUNT') { calculatedTotalAmount = numInput; calculatedQty = numPrice > 0 ? (numInput / numPrice) : 0; } 
  else { calculatedQty = numInput; calculatedTotalAmount = numInput * numPrice; }

  const realizedStats = useMemo(() => {
    const now = Date.now(); let cutoff = 0;
    switch (timeFilter) { case '1D': cutoff = now - 24 * 60 * 60 * 1000; break; case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break; case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break; case '1Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break; case 'ALL': default: cutoff = 0; break; }
    
    let totalProfit = 0;
    let totalVolume = 0;

    history.forEach(tx => {
      if (tx.netProfit !== undefined && tx.netProfit !== null) {
        const txTime = tx.timestamp || Date.parse(tx.date) || 0;
        if (txTime >= cutoff) {
          const txType = tx.assetType || 'BIST';
          const rate = isUsdType(txType, tx.name) ? usdToTryRate : 1;
          totalProfit += (tx.netProfit * rate);
          const qty = tx.qty || 0;
          const price = tx.price || 0;
          totalVolume += (qty * price * rate);
        }
      }
    });

    const costBasis = totalVolume - totalProfit;
    let pct = 0;
    if (costBasis > 0) pct = (totalProfit / costBasis) * 100;
    else if (totalVolume > 0) pct = (totalProfit / totalVolume) * 100;

    return { value: totalProfit, pct };
  }, [history, timeFilter, usdToTryRate]);

  // getTimeframeLabel moved to usePortfolioData

  let profitColor = COLORS.textSub; let profitPrefix = ''; let profitIcon = 'remove';
  if (realizedStats.value > 0) { profitColor = COLORS.primary; profitPrefix = '+'; profitIcon = 'trending-up'; } 
  else if (realizedStats.value < 0) { profitColor = COLORS.error; profitIcon = 'trending-down'; }

  // Hesaplama Motoru (Portfolio Engine) devrede
  const { totalCost, totalNetCurrentValue, totalUnrealizedPnL, unrealizedPnLPct } = calculateTotalPortfolio(portfolio, usdToTryRate, cashBalance);

  const snapshotStateRef = useRef({ totalNetCurrentValue: 0, totalCost: 0, portfolio: [] });
  const saveDailySnapshotRef = useRef(saveDailySnapshot);

  useEffect(() => {
    snapshotStateRef.current = { totalNetCurrentValue, totalCost: totalCost + cashBalance, portfolio };
    saveDailySnapshotRef.current = saveDailySnapshot;
  }, [totalNetCurrentValue, totalCost, cashBalance, portfolio, saveDailySnapshot]);

  const persistPortfolioSnapshot = useCallback(() => {
    const snapshot = snapshotStateRef.current;
    if (snapshot.totalNetCurrentValue > 0) {
      saveDailySnapshotRef.current(snapshot.totalNetCurrentValue, snapshot.totalCost, snapshot.portfolio);
    }
  }, []);

  useEffect(() => {
    persistPortfolioSnapshot();
    const timer = setInterval(persistPortfolioSnapshot, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [persistPortfolioSnapshot]);

  let unrealizedColor = COLORS.textSub; let unrealizedPrefix = ''; let unrealizedIcon = null;
  if (totalUnrealizedPnL > 0) { unrealizedColor = COLORS.primary; unrealizedPrefix = '+'; unrealizedIcon = 'trending-up'; }
  else if (totalUnrealizedPnL < 0) { unrealizedColor = COLORS.error; unrealizedIcon = 'trending-down'; }

  // Hesaplama Motoru: En Çok Kazandıranlar / Kaybettirenler (Özel Geçmiş Veri İle)
  const { topPerformers, worstPerformers } = getTopGainersAndLosers(portfolio, usdToTryRate, timeFilter, priceHistory);
  // getFilteredHistory moved to usePortfolioData
  const filteredHistory = getFilteredHistory();

// --- FAZ 3 BÜYÜSÜ: MIDAS TWR VE VARLIK AKIŞI MOTORU ---
  const { allChartData, timeframePerformance } = useMemo(() => {
    const results = calculateAdvancedChartData(chartHistory, timeFilter, totalNetCurrentValue, totalUnrealizedPnL, unrealizedPnLPct, portfolio, usdToTryRate);
    
    return {
      allChartData: results,
      timeframePerformance: results.pnl
    };
  }, [chartHistory, timeFilter, totalNetCurrentValue, totalUnrealizedPnL, unrealizedPnLPct]);

  // Ekranda o an hangi grafiğin gösterileceğine karar verir
  const stableChartData = useMemo(() => {
    if (!allChartData) return [];
    return chartViewMode === 'PERFORMANCE' ? allChartData.performanceData : allChartData.assetFlowData;
  }, [allChartData, chartViewMode]);
  // -----------------------------------------------------------


  const getGroupedData = (sourceData) => {
    const grouped = []; CATEGORY_ORDER.forEach(type => { const items = sourceData.filter(a => (a.type || 'BIST') === type); if (items.length > 0) { grouped.push({ title: type, data: items }); } }); return grouped;
  };

  // YENİ: PORTFÖY İÇİN DİNAMİK DÖVİZ ÇEVİRİCİ MOTOR
  // getConvertedValue moved to uiHelpers.js
  const getConvertedValueLocal = (val, assetOrType) => getConvertedValue(val, assetOrType, currency, usdToTryRate, isUsdType);

  // Hesaplama Motoru: Pasta Grafik (Varlık Dağılımı)
  const pieData = useMemo(() => {
    return getPieChartDistribution(portfolio, usdToTryRate, totalNetCurrentValue, t('others'));
  }, [portfolio, usdToTryRate, totalNetCurrentValue, lang]);

  const renderCompactItem = useCallback(({ item }) => {
    const cPrice = (item.currentPrice && item.currentPrice > 0) ? item.currentPrice : item.price;
    const avgPrice = item.price || 0;
    const quantity = item.quantity || 0;
    
    // Birim fiyat için doğal para birimi (varlığın kendi birimi)
    const nativeCur = getCurrencySymbol(item.type, item.symbol || item.name);
    
    // Portföy toplam değeri ve kâr/zarar HER ZAMAN TL
    const isNativeUsd = nativeCur === '$';
    const rateTL = isNativeUsd ? usdToTryRate : 1;
    const totalValueTL = cPrice * quantity * rateTL;
    
    const pnl = calculateAssetPnLForTimeframe(item, timeFilter, usdToTryRate, priceHistory[item.name]);
    let profitTL = pnl.amount;
    let profitPercentage = pnl.percentage;
    
    // Floating point gürültüsünü temizle (0.000001 gibi değerleri 0 yap)
    if (Math.abs(profitTL) < 0.01) profitTL = 0;
    if (Math.abs(profitPercentage) < 0.01) profitPercentage = 0;

    const isProfit = profitPercentage > 0;
    const isLoss = profitPercentage < 0;
    const pnlColor = isProfit ? '#00E87A' : (isLoss ? '#FF4757' : COLORS.textSub);

    return (
      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: 16,
          minHeight: 64,
        }} 
        activeOpacity={0.6} 
        onPress={() => { setSelectedAssetInfo(item); setSelectedAssetId(item.id); setDetailModalVisible(true); }}
      >
        {/* SOL TARAF */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ alignItems: 'flex-start' }}>
            <View style={{ marginBottom: 6 }}>
              <AssetIcon asset={item} size={40} />
            </View>
            <Text style={{ color: '#8A8A9A', fontSize: 11, fontWeight: '500' }}>
              {nativeCur}{cPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: 12, marginBottom: 15 }}>
            {item.name}
          </Text>
        </View>

        {/* SAĞ TARAF - Her zaman TL */}
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
            {isBalanceVisible ? `₺${totalValueTL.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '***'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: pnlColor, fontSize: 13, fontWeight: '700' }}>
              {isBalanceVisible ? (isProfit ? '+' : '') + '₺' + Math.abs(profitTL).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '***'}
            </Text>
            <Text style={{ color: pnlColor, fontSize: 13, fontWeight: '700', marginLeft: 6 }}>
              {isBalanceVisible ? `(${isProfit ? '+' : ''}${profitPercentage.toFixed(2)}%)` : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [timeFilter, usdToTryRate, priceHistory, setSelectedAssetInfo, setSelectedAssetId, setDetailModalVisible, isBalanceVisible]);

  const renderGridItem = useCallback(({ item }) => {
    let cPrice = 0; let pct = 0;
    const itemSymbol = typeof item === 'string' ? item : (item.name || item.symbol);
    const itemType = typeof item === 'object' ? item.type : null;

    if (marketTabMode === 'GRID') {
      cPrice = item.currentPrice !== undefined ? item.currentPrice : item.price; pct = item.changePercent || 0;
    } else {
      let foundAsset = null;
      if (typeof item === 'object' && item.currentPrice) {
        cPrice = item.currentPrice;
        pct = item.changePercent || 0;
      } else {
        Object.values(MOCK_ASSETS).forEach(arr => { 
          const a = arr.find(x => x.symbol === itemSymbol || x.name === itemSymbol); 
          if (a) foundAsset = a; 
        });
        cPrice = foundAsset ? foundAsset.price : 0; 
        pct = 0;
      }
      item = typeof item === 'object' ? item : { 
        name: itemSymbol, id: itemSymbol, symbol: itemSymbol,
        type: itemType || (foundAsset ? foundAsset.type : 'BIST')
      };
    }

    const isProfit = pct > 0; const isLoss = pct < 0;
    const changeColor = isProfit ? COLORS.primary : (isLoss ? COLORS.error : COLORS.textSub);
    const arrowIcon = isProfit ? 'arrow-upward' : (isLoss ? 'arrow-downward' : 'remove');

    const assetName = (item?.name || '').toUpperCase();
    const assetSymbol = (item?.symbol || '').toUpperCase();
    const isIndex = item.type === 'INDEX';

    const getDisplayName = (target) => {
      const isMarketIndex = 
        target.type === 'INDEX' || 
        target.category === 'indices' || 
        target.assetClass === 'INDEX';
      
      const dName = isMarketIndex ? (target.name || target.symbol) : (target.symbol || target.name);
      return dName;
    };

    const isUsdBased = 
      item.type === 'USA' || 
      item.type === 'CRYPTO' ||
      assetName.includes('USD') || assetName.includes('XAU') ||
      assetName.includes('XAG') || assetName.includes('BRENT') ||
      assetSymbol.includes('USD');

    return (
      <AnimatedTouchableOpacity 
        style={[styles.gridCard, isMarketEditMode && styles.gridCardEditMode, isMarketEditMode && wiggleStyle]} 
        activeOpacity={0.7} 
        onPress={() => { if (!isMarketEditMode && (marketTabMode === 'GRID' || marketTabMode === 'LISTS')) { setSelectedAssetInfo(item); setSelectedAssetId(item.id); setDetailModalVisible(true); } }}
        onLongPress={() => { if (marketTabMode === 'GRID' || marketTabMode === 'LISTS') setIsMarketEditMode(true); }}
      >
        <View style={{ marginBottom: 12 }}>
          <AssetIcon asset={item} size={32} />
        </View>
        <Text 
          style={[
            styles.gridSymbol, 
            isIndex && { fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' }
          ]} 
          numberOfLines={1}
        >
          {getDisplayName(item)}
        </Text>
        <Text style={styles.gridPrice}>
          {isIndex ? '' : (isUsdBased ? '$' : '₺')}
          {cPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name={arrowIcon} size={12} color={changeColor} style={{ marginRight: 2 }} />
          <Text style={[styles.gridChange, { color: changeColor }]}>
            {Math.abs(pct).toFixed(2)}%
          </Text>
        </View>

        {isMarketEditMode && (
          <TouchableOpacity 
            style={{ position: 'absolute', top: -10, right: -10, backgroundColor: COLORS.error, borderRadius: 15, padding: 3 }}
            onPress={() => marketTabMode === 'GRID' ? removeWatchlistAsset(item.id) : removeCustomListAsset(item.name)}
          >
             <MaterialIcons name="close" size={17} color="#FFF" />
          </TouchableOpacity>
        )}
      </AnimatedTouchableOpacity>
    );
  }, [marketTabMode, isMarketEditMode, wiggleStyle, COLORS, styles, t, removeWatchlistAsset, removeCustomListAsset, setSelectedAssetInfo, setSelectedAssetId, setDetailModalVisible, setIsMarketEditMode, isBalanceVisible]);

  const currentDetailAsset = (portfolio.find(a => a.id === selectedAssetId) || watchlist.find(a => a.id === selectedAssetId)) || selectedAssetInfo;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaContext style={styles.container}>
        <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={COLORS.bg} />
        


      <PagerView
        ref={pagerRef}
        style={{flex: 1}}
        initialPage={0}
        overdrag={true}
        scrollEnabled={false}
        onPageScroll={(e) => { pageScrollPos.setValue(e.nativeEvent.position + e.nativeEvent.offset); }}
        onPageSelected={(e) => { setActiveTab(e.nativeEvent.position === 0 ? 'PORTFOLIO' : 'MARKET'); }}
      >
        <PortfolioScreen 
          styles={styles}
          COLORS={COLORS}
          portfolio={portfolio}
          getGroupedData={getGroupedData}
          t={t}
          priceHistory={priceHistory}
          setSelectedAssetInfo={setSelectedAssetInfo}
          setSelectedAssetId={setSelectedAssetId}
          setDetailModalVisible={setDetailModalVisible}
          isRefreshingPortfolio={isRefreshingPortfolio}
          onRefreshPortfolio={onRefreshPortfolio}
          chartViewMode={chartViewMode}
          setChartViewMode={setChartViewMode}
          lang={lang}
          stableChartData={stableChartData}
          totalNetCurrentValue={totalNetCurrentValue}
          usdToTryRate={usdToTryRate}
          timeframePerformance={timeframePerformance}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          currency={currency}
          handleNetWorthPressIn={handleNetWorthPressIn}
          handleNetWorthPressOut={handleNetWorthPressOut}
          setDistributionModalVisible={setDistributionModalVisible}
          netWorthScale={netWorthScale}
          unrealizedIcon={unrealizedIcon}
          unrealizedColor={unrealizedColor}
          unrealizedPrefix={unrealizedPrefix}
          totalUnrealizedPnL={totalUnrealizedPnL}
          unrealizedPnLPct={unrealizedPnLPct}
          handleProfitPressIn={handleProfitPressIn}
          handleProfitPressOut={handleProfitPressOut}
          setProfitModalVisible={setProfitModalVisible}
          profitScale={profitScale}
          setCashModalVisible={setCashModalVisible}
          cashBalance={cashBalance}
          setSettingsVisible={setSettingsVisible}
          setSelectedPieSlice={setSelectedPieSlice}
          AnimatedTouchableOpacity={AnimatedTouchableOpacity}
          isBalanceVisible={isBalanceVisible}
          toggleBalanceVisibility={toggleBalanceVisibility}
        />


        <MarketScreen 
          styles={styles}
          COLORS={COLORS}
          marketTabMode={marketTabMode}
          setMarketTabMode={setMarketTabMode}
          t={t}
          isMarketEditMode={isMarketEditMode}
          setIsMarketEditMode={setIsMarketEditMode}
          selectedListId={selectedListId}
          setSelectedListId={setSelectedListId}
          setListNameInput={setListNameInput}
          setEditingListId={setEditingListId}
          setListError={setListError}
          setListModalVisible={setListModalVisible}
          onSettingsPress={() => setSettingsVisible(true)}
          watchlist={watchlist}
          renderGridItem={renderGridItem}
          isRefreshing={isRefreshing}
          onRefreshMarket={onRefreshMarket}
          customLists={customLists}
          openListOptions={openListOptions}
          lang={lang}
          MOCK_ASSETS={MOCK_ASSETS}
          MarketService={MarketService}
          setWatchlist={setWatchlist}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          setIsPagerDisabled={setIsPagerDisabled}
        />
      </PagerView>

      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => pagerRef.current?.setPage(0)}
            activeOpacity={0.7}
          >
            <View style={{ alignItems: 'center' }}>
              <MaterialIcons name="business-center" size={24} color="#8A8A9A" />
              <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', opacity: portfolioOpacity }]} pointerEvents="none">
                <MaterialIcons name="business-center" size={24} color="#FFFFFF" style={{ shadowColor: '#FFF', shadowOpacity: 0.3, shadowRadius: 5 }} />
              </Animated.View>
            </View>
            <View style={{ marginTop: 4, alignItems: 'center', width: '100%' }}>
              <Text style={styles.navText} numberOfLines={1}>{lang === 'tr' ? 'PORTFÖY' : 'PORTFOLIO'}</Text>
              <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }, { opacity: portfolioOpacity }]} pointerEvents="none">
                <Text style={[styles.navText, { color: '#FFFFFF', shadowColor: '#FFF', shadowOpacity: 0.2, shadowRadius: 3 }]} numberOfLines={1}>{lang === 'tr' ? 'PORTFÖY' : 'PORTFOLIO'}</Text>
              </Animated.View>
            </View>
          </TouchableOpacity>
          
          <View style={styles.navItemCenterWrapper}>
            <TouchableOpacity 
              style={styles.navItemCenter} 
              onPress={handleCenterButton}
              activeOpacity={0.8}
            >
              <Animated.View style={[styles.navItemCenterInner, { transform: [{ scale: fabScale }] }]}>
                <View style={[StyleSheet.absoluteFill, { borderRadius: 30, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />
                <View style={{ justifyContent: 'center', alignItems: 'center', width: 40, height: 40 }}>
                  {/* Subtle Embossed Glow Effect */}
                  <View style={{ 
                    position: 'absolute', 
                    width: 28, 
                    height: 28, 
                    backgroundColor: '#6FCFD6', 
                    borderRadius: 14, 
                    opacity: 0.15, 
                    transform: [{scale: 1.5}],
                    blurRadius: 10 
                  }} />
                  
                  {/* Custom Pill-Shaped Plus Symbol */}
                  {/* Horizontal Bar */}
                  <View style={{ 
                    position: 'absolute',
                    width: 24, 
                    height: 6, 
                    borderRadius: 4, 
                    backgroundColor: '#F5F5F7',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 1.5,
                  }} />
                  {/* Vertical Bar */}
                  <View style={{ 
                    position: 'absolute',
                    width: 6, 
                    height: 24, 
                    borderRadius: 4, 
                    backgroundColor: '#F5F5F7',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 1.5,
                  }} />
                </View>
              </Animated.View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => { pagerRef.current?.setPage(1); setIsMarketEditMode(false); }}
            activeOpacity={0.7}
          >
            <View style={{ alignItems: 'center' }}>
              <MaterialIcons name="trending-up" size={24} color="#8A8A9A" />
              <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', opacity: marketOpacity }]} pointerEvents="none">
                <MaterialIcons name="trending-up" size={24} color="#FFFFFF" style={{ shadowColor: '#FFF', shadowOpacity: 0.3, shadowRadius: 5 }} />
              </Animated.View>
            </View>
            <View style={{ marginTop: 4, alignItems: 'center', width: '100%' }}>
              <Text style={styles.navText} numberOfLines={1}>{lang === 'tr' ? 'PİYASA' : 'MARKET'}</Text>
              <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }, { opacity: marketOpacity }]} pointerEvents="none">
                <Text style={[styles.navText, { color: '#FFFFFF', shadowColor: '#FFF', shadowOpacity: 0.2, shadowRadius: 3 }]} numberOfLines={1}>{lang === 'tr' ? 'PİYASA' : 'MARKET'}</Text>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* YENİ: YENİLENMİŞ LİSTE OLUŞTURMA MODALI (Hata & Shake Animasyonu Eklendi) */}
      <ListModal 
        visible={listModalVisible}
        onClose={() => setListModalVisible(false)}
        styles={styles}
        COLORS={COLORS}
        editingListId={editingListId}
        t={t}
        shakeAnim={shakeAnim}
        listError={listError}
        listNameInput={listNameInput}
        setListNameInput={setListNameInput}
        setListError={setListError}
        createOrUpdateList={createOrUpdateList}
      />

      <ProfitModal 
        visible={profitModalVisible}
        onClose={() => setProfitModalVisible(false)}
        styles={styles}
        COLORS={COLORS}
        t={t}
        getTimeframeLabel={getTimeframeLabel}
        topPerformers={topPerformers}
        getAssetIcon={getAssetIcon}
        worstPerformers={worstPerformers}
        lang={lang}
        filteredHistory={filteredHistory}
      />

      <DistributionModal 
        visible={distributionModalVisible}
        onClose={() => setDistributionModalVisible(false)}
        styles={styles}
        COLORS={COLORS}
        t={t}
        lang={lang}
        pieData={pieData}
        selectedPieSlice={selectedPieSlice}
        setSelectedPieSlice={setSelectedPieSlice}
        totalNetCurrentValue={totalNetCurrentValue}
      />

      <AddAssetModal 
        visible={modalVisible}
        onClose={resetAddModal}
        styles={styles}
        COLORS={COLORS}
        selectedSearchAsset={selectedSearchAsset}
        isAddMoreMode={isAddMoreMode}
        setSelectedSearchAsset={setSelectedSearchAsset}
        t={t}
        activeTab={activeTab}
        ASSET_TYPES={ASSET_TYPES}
        assetType={assetType}
        handleCategoryChange={handleCategoryChange}
        theme={theme}
        searchQuery={searchQuery}
        handleSearch={handleSearch}
        searchResults={searchResults}
        marketTabMode={marketTabMode}
        watchlist={watchlist}
        selectedListId={selectedListId}
        customLists={customLists}
        handleAssetSelect={handleAssetSelect}
        getAssetIcon={getAssetIcon}
        getCurrencySymbol={getCurrencySymbol}
        inputMode={inputMode}
        setInputMode={setInputMode}
        primaryInput={primaryInput}
        setPrimaryInput={setPrimaryInput}
        decimals={decimals}
        calculatedQty={calculatedQty}
        calculatedTotalAmount={calculatedTotalAmount}
        buyPrice={buyPrice}
        setBuyPrice={setBuyPrice}
        note={note}
        setNote={setNote}
        addAsset={addAsset}
        lockedCategory={activeTab === 'MARKET' && marketTabMode === 'GRID' && selectedCategory !== 'ALL' ? selectedCategory : null}
      />

      <DetailModal 
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        styles={styles}
        COLORS={COLORS}
        currentDetailAsset={currentDetailAsset}
        getAssetIcon={getAssetIcon}
        t={t}
        activeTab={activeTab}
        currency={currency}
        getCurrencySymbol={getCurrencySymbol}
        getConvertedValueLocal={getConvertedValueLocal}
        decimals={decimals}
        setDetailModalVisible={setDetailModalVisible}
        setIsAddMoreMode={setIsAddMoreMode}
        setAssetType={setAssetType}
        handleAssetSelect={handleAssetSelect}
        setModalVisible={setModalVisible}
        setSellModalVisible={setSellModalVisible}
        theme={theme}
        deleteAsset={deleteAsset}
        isBalanceVisible={isBalanceVisible}
        priceHistory={priceHistory}
        usdToTryRate={usdToTryRate}
        totalNetCurrentValue={totalNetCurrentValue}
      />


      <ListOptionsModal 
        visible={listOptionsVisible}
        onClose={() => setListOptionsVisible(false)}
        styles={styles}
        COLORS={COLORS}
        selectedOptionList={selectedOptionList}
        t={t}
        setEditingListId={setEditingListId}
        setListNameInput={setListNameInput}
        setListError={setListError}
        setListModalVisible={setListModalVisible}
        deleteCustomList={(id) => {
          const updated = customLists.filter(l => l.id !== id);
          saveLists(updated);
        }}
        setListOptionsVisible={setListOptionsVisible}
      />

      <SettingsModal 
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        styles={styles}
        COLORS={COLORS}
        t={t}
        theme={theme}
        changeTheme={changeTheme}
        lang={lang}
        changeLanguage={changeLanguage}
        currency={currency}
        changeCurrency={changeCurrency}
        handleResetAllData={handleResetAllData}
      />

      <PriceUpdateModal 
        visible={priceModalVisible}
        onClose={() => setPriceModalVisible(false)}
        styles={styles}
        COLORS={COLORS}
        t={t}
        currentDetailAsset={currentDetailAsset}
        getCurrencySymbol={getCurrencySymbol}
        currentPriceInput={currentPriceInput}
        setCurrentPriceInput={setCurrentPriceInput}
        updateCurrentPrice={updateCurrentPrice}
      />

      <SellModal 
        visible={sellModalVisible}
        onClose={() => setSellModalVisible(false)}
        styles={styles}
        COLORS={COLORS}
        t={t}
        sellQuantityInput={sellQuantityInput}
        setSellQuantityInput={setSellQuantityInput}
        sellAsset={sellAsset}
      />

      <CashModal 
        visible={cashModalVisible}
        onClose={() => setCashModalVisible(false)}
        styles={styles}
        COLORS={COLORS}
        lang={lang}
        cashInput={cashInput}
        setCashInput={setCashInput}
        setCashBalance={setCashBalance}
      />

    </SafeAreaContext>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const getStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 15, paddingBottom: 20 },
  headerProfile: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  brandText: { color: COLORS.textMain, fontSize: 18, fontWeight: '800', letterSpacing: 1.5 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  pageTitle: { color: COLORS.textMain, fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Inter-Medium' : 'sans-serif-medium' },
  visibilityToggle: { marginLeft: 8, padding: 4 },
  headerValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },

  headerTabSwitcher: { flexDirection: 'row', backgroundColor: '#16161A', borderRadius: 12, padding: 4, width: '65%' },
  headerTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  headerTabActive: { backgroundColor: '#2A2A35' },
  headerTabText: { color: '#8A8A9A', fontWeight: '700', fontSize: 13 },
  headerTabTextActive: { color: '#FFFFFF' },
  
  performanceContainer: { marginBottom: 25 },
  perfLabel: { color: COLORS.textSub, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  perfValue: { color: COLORS.textMain, fontSize: 42, fontWeight: '900', letterSpacing: -1.5, marginBottom: 20 },
  timeFiltersBg: { flexDirection: 'row', backgroundColor: COLORS.surfaceHigh, padding: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 20 },
  timeFilterBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16 },
  timeFilterActive: { backgroundColor: COLORS.primary },
  timeFilterText: { color: COLORS.textSub, fontSize: 12, fontWeight: 'bold' },
  timeFilterTextActive: { color: COLORS.bg, fontWeight: '900' },
  
  chartBox: { backgroundColor: COLORS.chartBg, borderRadius: 24, justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' },
  tooltipContainer: { position: 'absolute', backgroundColor: COLORS.surfaceHigh, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, zIndex: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  tooltipValue: { color: COLORS.textMain, fontSize: 12, fontWeight: '900' },

  trendingGrid: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  trendCard: { flex: 1, backgroundColor: COLORS.surfaceHigh, padding: 15, borderRadius: 16 },
  trendLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  trendValue: { color: COLORS.textMain, fontSize: 20, fontWeight: '900' },
  categoryTitle: { color: COLORS.textSub, fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  compactCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  compactLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  compactIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.surfaceHigh, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  compactName: { color: COLORS.textMain, fontSize: 16, fontWeight: '700' },
  compactSub: { color: COLORS.textSub, fontSize: 12, marginTop: 2 },
  compactRight: { alignItems: 'flex-end', marginLeft: 10 },
  compactPrice: { color: COLORS.textMain, fontSize: 16, fontWeight: '700' },
  compactPct: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  dragHandleContainer: { width: '100%', alignItems: 'center', paddingTop: 15, paddingBottom: 20 },
  dragHandle: { width: 40, height: 4, backgroundColor: COLORS.textSub, borderRadius: 2, opacity: 0.5 },
  modalOverlayFlexEnd: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
  
  donutContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative', marginVertical: 5 },
  donutCenterTextContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  donutCenterLabel: { color: COLORS.textSub, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  donutCenterValue: { color: COLORS.textMain, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  donutCenterPct: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  legendContainer: { marginTop: 10, paddingHorizontal: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  legendItemActive: { backgroundColor: COLORS.surfaceHigh, borderRadius: 12, paddingHorizontal: 10, borderBottomWidth: 0, marginVertical: 4 },
  legendColorBox: { width: 12, height: 12, borderRadius: 4, marginRight: 12 },
  legendSymbol: { color: COLORS.textMain, fontSize: 14, fontWeight: 'bold' },
  legendName: { color: COLORS.textSub, fontSize: 11, marginTop: 2 },
  legendPct: { color: COLORS.textMain, fontSize: 16, fontWeight: '900' },

  perfSectionTitle: { color: COLORS.textSub, fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  perfCard: { backgroundColor: COLORS.surfaceHigh, borderRadius: 16, padding: 15 },
  perfListItem: { marginBottom: 15 },
  perfListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  perfItemName: { color: COLORS.textMain, fontSize: 15, fontWeight: 'bold' },
  perfItemPct: { fontSize: 14, fontWeight: '900' },


  detailPageBox: { backgroundColor: COLORS.surfaceHigh, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 25, paddingBottom: 50, minHeight: '98%', maxHeight: '98%', zIndex: 2, borderTopWidth: 1, borderTopColor: COLORS.border },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  detailIconBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: COLORS.surfaceHigh, justifyContent: 'center', alignItems: 'center' },
  detailName: { color: COLORS.textMain, fontSize: 24, fontWeight: '900' },
  detailType: { color: COLORS.textSub, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  detailChartBox: { height: 120, backgroundColor: COLORS.chartBg, borderRadius: 20, padding: 20, justifyContent: 'space-between', overflow: 'hidden', marginBottom: 25 },
  detailCurrentPrice: { color: COLORS.textMain, fontSize: 32, fontWeight: '900', zIndex: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 25 },
  statBox: { flexBasis: '47%', backgroundColor: COLORS.surfaceHigh, padding: 15, borderRadius: 16 },
  statBoxLabel: { color: COLORS.textSub, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  statBoxValue: { color: COLORS.textMain, fontSize: 18, fontWeight: '900' },
  detailNoteArea: { backgroundColor: COLORS.primarySoft, padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: COLORS.primarySoft },
  detailNoteText: { color: COLORS.primaryDim, fontSize: 13, fontStyle: 'italic', flex: 1, fontWeight: '500' },
  detailActionRow: { flexDirection: 'row', gap: 15 },
  detailBtnSecondary: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.surfaceHigh, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  detailBtnSecondaryText: { color: COLORS.textMain, fontSize: 14, fontWeight: 'bold' },
  detailBtnPrimary: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.primary, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  detailBtnPrimaryText: { color: COLORS.bg, fontSize: 14, fontWeight: 'bold' },
  
  emptyText: { textAlign: 'center', marginTop: 20, marginBottom: 20, color: COLORS.textSub, fontSize: 14, fontStyle: 'italic' },
  
  bottomNav: { 
    flexDirection: 'row', 
    backgroundColor: '#0F0F12', 
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 24,
    height: 65, 
    alignItems: 'center', 
    justifyContent: 'space-around', 
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navItemCenterWrapper: {
    marginTop: -35,
    backgroundColor: '#0F0F12', 
    borderRadius: 40,
    padding: 6,
  },
  navItemCenter: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1A1A1E', justifyContent: 'center', alignItems: 'center' },
  navItemCenterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#839DD6', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#A883D6' },
  navText: { color: '#8A8A9A', fontSize: 10, fontWeight: '700', marginTop: 4 },
  
  modalBox: { backgroundColor: COLORS.surface, padding: 25, paddingTop: 5, paddingBottom: 40, borderTopLeftRadius: 30, borderTopRightRadius: 30, zIndex: 2 },
  modalTitle: { color: COLORS.textMain, fontSize: 20, fontWeight: '900', marginBottom: 20 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  input: { backgroundColor: COLORS.bg, color: COLORS.textMain, padding: 16, borderRadius: 16, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  
  segmentedControl: { flexDirection: 'row', backgroundColor: COLORS.surfaceHigh, borderRadius: 20, padding: 4, marginBottom: 20 },
  segmentBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: COLORS.primary, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 3 },
  segmentText: { color: COLORS.textSub, fontSize: 14, fontWeight: 'bold' },
  segmentTextActive: { color: COLORS.bg, fontWeight: '900' },

  searchModalBox: { backgroundColor: COLORS.surface, height: '90%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingTop: 5, zIndex: 2 },
  categoryScroll: { height: 50, marginBottom: 20 },
  pillBtn: { backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginRight: 10, height: 40, justifyContent: 'center' },
  pillBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillBtnText: { color: COLORS.textSub, fontSize: 13, fontWeight: 'bold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 16, paddingHorizontal: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15, height: 55 },
  searchInput: { flex: 1, color: COLORS.textMain, fontSize: 16, height: '100%' },
  searchResultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  resultSymbol: { color: COLORS.textMain, fontSize: 16, fontWeight: 'bold' },
  resultName: { color: COLORS.textSub, fontSize: 12, marginTop: 2 },
  selectedAssetCard: { backgroundColor: COLORS.bg, padding: 15, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  selectedSymbol: { color: COLORS.primary, fontSize: 18, fontWeight: '900' },
  changeAssetBtn: { padding: 10, backgroundColor: COLORS.surfaceHigh, borderRadius: 12 },
  inputLabel: { color: COLORS.textSub, fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  modernInput: { backgroundColor: COLORS.bg, color: COLORS.textMain, padding: 15, borderRadius: 16, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  megaSaveBtn: { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 30 },
  megaSaveBtnText: { color: COLORS.bg, fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  smartInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginBottom: 10 },
  smartInputCurrency: { color: COLORS.textSub, fontSize: 28, fontWeight: 'bold', marginHorizontal: 10 },
  smartInput: { color: COLORS.textMain, fontSize: 48, fontWeight: '900', minWidth: 100, textAlign: 'center', padding: 0 },
  smartFeedbackBox: { backgroundColor: COLORS.primarySoft, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },
  smartFeedbackText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },

  gridCard: { flex: 1, backgroundColor: '#16161A', margin: 6, borderRadius: 16, padding: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: '#2A2A35' },
  gridSymbol: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  gridPrice: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  gridChange: { fontSize: 12, fontWeight: '600' },
  gridCardEditMode: { borderWidth: 1.5, borderColor: COLORS.error },
  gridName: { color: COLORS.textMain, fontSize: 14, fontWeight: 'bold' },
  gridPriceContainer: { alignItems: 'flex-start' },
  gridPricePrefix: { color: COLORS.textSub, fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  gridPrice: { color: COLORS.textMain, fontSize: 18, fontWeight: '900' },
  gridChangeContainer: { flexDirection: 'row', alignItems: 'center' },
  gridChangePct: { fontSize: 12, fontWeight: 'bold', marginLeft: 2 },
  deleteBadge: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.error, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 2, borderColor: COLORS.bg },
  doneBtn: { backgroundColor: COLORS.surfaceHigh, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  doneBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  emptyMarketContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyMarketText: { color: COLORS.textSub, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // YENİ: Güncellenmiş Özel Liste Satır Stilleri
  listOverviewContainer: { flex: 1, paddingHorizontal: 25 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  listRowName: { color: COLORS.textMain, fontSize: 16, fontWeight: 'normal', flex: 1 },
  listRowPill: { backgroundColor: COLORS.surfaceHigh, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 10 },
  listRowCount: { color: COLORS.textSub, fontSize: 12, fontWeight: 'bold' },
  listDetailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  listDetailTitle: { color: COLORS.textMain, fontSize: 24, fontWeight: '900', marginLeft: 10 },

  // List Options Modal Styles
  optionsModalBox: { backgroundColor: COLORS.surface, padding: 25, paddingTop: 10, paddingBottom: 40, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  optionsHeader: { marginBottom: 25, alignItems: 'center' },
  optionsTitle: { color: COLORS.textMain, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  optionsSub: { color: COLORS.textSub, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  optionsList: { backgroundColor: COLORS.bg, borderRadius: 20, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: COLORS.border },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  optionIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionText: { color: COLORS.textMain, fontSize: 16, fontWeight: '600', flex: 1 },
  optionsCancelBtn: { backgroundColor: COLORS.surfaceHigh, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  optionsCancelText: { color: COLORS.textMain, fontSize: 15, fontWeight: 'bold' },
  
  // YENİ: Boş Durum Yönlendirici Buton Stili
  ghostBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: COLORS.surfaceHigh },
  ghostBtnText: { color: COLORS.primary, fontWeight: 'bold' }
});
