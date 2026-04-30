import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SectionList, Modal, Alert, SafeAreaView, ScrollView, StatusBar, KeyboardAvoidingView, Platform, FlatList, LayoutAnimation, UIManager, Animated, PanResponder, Dimensions, RefreshControl, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { G, Circle, Path } from 'react-native-svg';
import { SafeAreaProvider, SafeAreaView as SafeAreaContext } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { LineChart } from 'react-native-gifted-charts';
import PerformanceChartSection from './PerformanceChartSection';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { calculateAssetPnL, calculateTotalPortfolio, getTopGainersAndLosers, isUsdType, getPieChartDistribution, getPortfolioPerformanceByTimeframe, calculateAdvancedChartData } from './portfolioEngine';
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
import { MarketScreen } from './src/features/market/MarketScreen';
import { SwipeableModal } from './src/shared/components/SwipeableModal';
import { SettingsModal } from './src/shared/components/SettingsModal';
import { AddAssetModal } from './src/features/portfolio/AddAssetModal';
import { DetailModal } from './src/features/portfolio/DetailModal';
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
  switch(type) { case 'Hisse': return 'BIST'; case 'Fon': return 'TEFAS'; case 'Altın/Döviz': return 'GOLD'; case 'Kripto': return 'CRYPTO'; case 'ABD Hisse': return 'USA'; default: return type || 'BIST'; }
};

const getCurrencySymbol = (type) => {
  switch(type) { case 'BIST': case 'TEFAS': return '₺'; case 'CRYPTO': case 'USA': case 'GOLD': default: return '$'; }
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);


const MarketService = {
  // Binance: Kripto fiyatları (BTC, ETH, BNB, SOL, XRP → USDT paritesi)
  _fetchCryptoPrice: async (symbol) => {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`);
      if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
      const data = await res.json();
      return { price: parseFloat(data.lastPrice), changePct: parseFloat(data.priceChangePercent) };
    } catch (e) { return null; }
  },

  // Binance PAXG: Ons altın proxy (XAU/USD ≈ PAXG/USDT)
  _fetchGoldUSD: async () => {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT');
      if (!res.ok) throw new Error(`Binance PAXG HTTP ${res.status}`);
      const data = await res.json();
      return { price: parseFloat(data.lastPrice), changePct: parseFloat(data.priceChangePercent) };
    } catch (e) { return null; }
  },

  // ExchangeRate API: Döviz kurları (USD → TRY, EUR → TRY vb.)
  _fetchForexRates: async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error(`Forex HTTP ${res.status}`);
      const data = await res.json();
      if (data.result !== 'success') throw new Error('Forex API failed');
      return data.rates; 
    } catch (e) { return null; }
  },

  fetchAsset: async (id) => { return {}; },

  // FAZ 1: Geriye Dönük Veri Çekme ve Forward-Fill (Tatil/Boşluk Doldurma) Algoritması
  // DÜZELTME: Artık doğru yerde, kendi başına bağımsız bir fonksiyon.
  fetchHistoricalPrices: async (symbol, type, daysBack = 30) => {
    try {
      const now = new Date();
      const mockData = {};
      
      let basePrice = 100;
      if (type === 'CRYPTO') {
        const res = await MarketService._fetchCryptoPrice(symbol);
        if (res?.price) basePrice = res.price;
      }

      for (let i = daysBack; i >= 0; i--) {
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - i);
        const dayOfWeek = pastDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
          const dateStr = pastDate.toISOString().split('T')[0];
          const noise = 1 + ((Math.random() - 0.5) * 0.05);
          mockData[dateStr] = basePrice * Math.pow(noise, i/10);
        }
      }

      const filledData = {};
      let lastKnownPrice = basePrice;
      
      for (let i = daysBack; i >= 0; i--) {
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - i);
        const dateStr = pastDate.toISOString().split('T')[0];
        const timestamp = pastDate.getTime();

        if (mockData[dateStr]) {
          lastKnownPrice = mockData[dateStr];
        }
        
        filledData[timestamp] = lastKnownPrice; 
      }

      return filledData;
    } catch (e) {
      console.log('Geçmiş veri çekilemedi:', e);
      return {};
    }
  },

  fetchMultiple: async (assets) => {
    const needsCrypto = assets.some(a => a.type === 'CRYPTO');
    const needsGold = assets.some(a => a.type === 'GOLD');
    
    const cryptoSymbols = [...new Set(assets.filter(a => a.type === 'CRYPTO').map(a => a.name))];
    const cryptoPromises = needsCrypto
      ? cryptoSymbols.map(sym => MarketService._fetchCryptoPrice(sym).then(r => [sym, r]))
      : [];

    const goldPromise = needsGold ? MarketService._fetchGoldUSD() : Promise.resolve(null);
    const forexPromise = needsGold ? MarketService._fetchForexRates() : Promise.resolve(null);

    const [cryptoResults, goldData, forexRates] = await Promise.all([
      Promise.all(cryptoPromises),
      goldPromise,
      forexPromise
    ]);

    const cryptoMap = {};
    cryptoResults.forEach(([sym, result]) => { if (result) cryptoMap[sym] = result; });

    const usdTry = forexRates?.TRY || null;
    const eurUsd = forexRates?.EUR || null; 
    const xauUsd = goldData?.price || null;

    const updated = assets.map(a => {
      if (a.type === 'CRYPTO' && cryptoMap[a.name]) {
        const { price, changePct } = cryptoMap[a.name];
        return { ...a, currentPrice: price, changePercent: changePct };
      }

      if (a.type === 'GOLD') {
        const symbol = a.name; 

        if (symbol === 'USD/TRY' && usdTry) {
          const oldPrice = a.currentPrice || a.price;
          const pct = oldPrice > 0 ? ((usdTry - oldPrice) / oldPrice) * 100 : 0;
          return { ...a, currentPrice: usdTry, changePercent: pct };
        }
        if (symbol === 'EUR/TRY' && usdTry && eurUsd) {
          const eurTry = usdTry / eurUsd; 
          const oldPrice = a.currentPrice || a.price;
          const pct = oldPrice > 0 ? ((eurTry - oldPrice) / oldPrice) * 100 : 0;
          return { ...a, currentPrice: parseFloat(eurTry.toFixed(4)), changePercent: pct };
        }
        if (symbol === 'XAU/USD' && xauUsd) {
          return { ...a, currentPrice: xauUsd, changePercent: goldData.changePct };
        }
        if (symbol === 'GLD/TRY' && xauUsd && usdTry) {
          const gramTry = (xauUsd * usdTry) / 31.1035;
          const oldPrice = a.currentPrice || a.price;
          const pct = oldPrice > 0 ? ((gramTry - oldPrice) / oldPrice) * 100 : 0;
          return { ...a, currentPrice: parseFloat(gramTry.toFixed(2)), changePercent: pct };
        }
      }

      return { ...a, changePercent: a.changePercent || 0 };
    });

    return updated;
  }
};

export default function App() {
  const [portfolio, setPortfolio] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [history, setHistory] = useState([]);
  const [chartHistory, setChartHistory] = useState([]); // FAZ 3: Gerçek Zamanlı Grafik Veritabanı
  const [priceHistory, setPriceHistory] = useState({}); // FAZ 1: Varlıkların Geçmiş Fiyat Veritabanı
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
    setLang, setCurrency, setTheme, customLists, setWatchlist, setCustomLists, setUsdToTryRate,
    setIsRefreshing, flashAnim, lang, timeFilter,
    t, MarketService, migrateType
  });

  const { createOrUpdateList, openListOptions, removeWatchlistAsset, removeCustomListAsset } = useWatchlist({
    listNameInput, customLists, editingListId, watchlist,
    saveLists, saveData, setListModalVisible, setListNameInput,
    setEditingListId, setListError, setSelectedListId, triggerShake, t,
    setWatchlist, setIsMarketEditMode, selectedListId
  });

  const { handleSearch, handleCategoryChange, handleAssetSelect, resetAddModal } = useSearch({
    assetType, MOCK_ASSETS, activeTab, marketTabMode, watchlist, customLists, selectedListId,
    setSearchQuery, setSearchResults, setAssetType, setSelectedSearchAsset, setBuyPrice,
    setPrimaryInput, setNote, setInputMode, setIsAddMoreMode, setModalVisible,
    setWatchlist, saveLists, saveData, t, MarketService,
    setListNameInput, setEditingListId, setListError, setListModalVisible
  });

  const handleCenterButton = () => {
    setIsAddMoreMode(false); 
    setSearchResults(MOCK_ASSETS[assetType]); 
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
    t, MarketService
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
        // Portföy fiyatlarını güncelle
        if (portfolioRef.current.length > 0) {
          const updatedPort = await MarketService.fetchMultiple(portfolioRef.current);
          const mergedPort = portfolioRef.current.map(a => {
            const fresh = updatedPort.find(u => u.id === a.id);
            if (fresh && fresh.currentPrice !== undefined) {
              return { ...a, currentPrice: fresh.currentPrice, changePercent: fresh.changePercent || 0 };
            }
            return a;
          });
          setPortfolio(mergedPort);
          saveData('@portfolio', mergedPort);
        }
        // Watchlist fiyatlarını güncelle
        if (watchlistRef.current.length > 0) {
          const updatedWatch = await MarketService.fetchMultiple(watchlistRef.current);
          setWatchlist(updatedWatch);
          saveData('@watchlist', updatedWatch);
          // Flash animasyonu tetikle
          flashAnim.setValue(1);
          Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: false }).start();
        }
      } catch (e) { /* Ağ hatası - sonraki döngüde tekrar denenecek */ }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  // loadData moved to usePortfolioData


  // saveData moved to usePortfolioData

  // FAZ 3: GERÇEK ZAMANLI VERİ TABANI VE GÜNLÜK KAYIT MOTORU (GÜNCELLENDİ)
  // saveDailySnapshot moved to usePortfolioData


  // Veritabanını güncel tutan motor (HIZLANDIRILDI)
  useEffect(() => {
     saveDailySnapshot(totalNetCurrentValue, totalCost); // Uygulama açıldığında beklemeden hemen kaydet
     const timer = setInterval(() => {
        saveDailySnapshot(totalNetCurrentValue, totalCost);
     }, 60000); // Her dakikada bir güncelle
     return () => clearInterval(timer);
  }, [totalNetCurrentValue, totalCost]);
  // saveLists moved to usePortfolioData


  const onRefreshPortfolio = async () => {
    setIsRefreshingPortfolio(true);
    // USD/TRY kurunu da güncelle
    try {
      const rates = await MarketService._fetchForexRates();
      if (rates?.TRY) setUsdToTryRate(rates.TRY);
    } catch (e) { /* Mevcut kur kullanılır */ }
    await refreshPortfolioPrices();
    setIsRefreshingPortfolio(false);
  };

  // Settings functions moved to useSettings

  // -----------------------------------------



  // handleSearch, handleCategoryChange and handleAssetSelect moved to useSearch


  // resetAddModal moved to useSearch


  // handleCenterButton moved to useSearch

  // YENİ: Listeyi doğrulayan, titreten ve pürüzsüz animasyonla içine sokan geliştirilmiş kayıt motoru
  // createOrUpdateList and openListOptions moved to useWatchlist


  const numInput = parseFloat(primaryInput.replace(',', '.')) || 0;
  const numPrice = parseFloat(buyPrice.replace(',', '.')) || 0;
  const decimals = assetType === 'CRYPTO' ? 8 : 2; 

  let calculatedQty = 0; let calculatedTotalAmount = 0;
  if (inputMode === 'AMOUNT') { calculatedTotalAmount = numInput; calculatedQty = numPrice > 0 ? (numInput / numPrice) : 0; } 
  else { calculatedQty = numInput; calculatedTotalAmount = numInput * numPrice; }

  // addAsset moved to usePortfolio


  // updateCurrentPrice moved to usePortfolio


  // sellAsset moved to usePortfolio


  // deleteAsset moved to usePortfolio


  // Asset removal functions moved to useWatchlist

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
          const rate = (txType === 'CRYPTO' || txType === 'USA' || txType === 'GOLD') ? usdToTryRate : 1;
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
  let unrealizedColor = COLORS.textSub; let unrealizedPrefix = ''; let unrealizedIcon = null;
  if (totalUnrealizedPnL > 0) { unrealizedColor = COLORS.primary; unrealizedPrefix = '+'; unrealizedIcon = 'trending-up'; }
  else if (totalUnrealizedPnL < 0) { unrealizedColor = COLORS.error; unrealizedIcon = 'trending-down'; }

  // Hesaplama Motoru: En Çok Kazandıranlar / Kaybettirenler (Özel Geçmiş Veri İle)
  const { topPerformers, worstPerformers } = getTopGainersAndLosers(portfolio, usdToTryRate, timeFilter, priceHistory);
  // getFilteredHistory moved to usePortfolioData
  const filteredHistory = getFilteredHistory();

// --- FAZ 3 BÜYÜSÜ: MIDAS TWR VE VARLIK AKIŞI MOTORU ---
  const { allChartData, timeframePerformance } = useMemo(() => {
    const results = calculateAdvancedChartData(chartHistory, timeFilter, totalNetCurrentValue, totalUnrealizedPnL, unrealizedPnLPct);
    
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
  const getConvertedValueLocal = (val, type) => getConvertedValue(val, type, currency, usdToTryRate, isUsdType);

  // Hesaplama Motoru: Pasta Grafik (Varlık Dağılımı)
  const pieData = useMemo(() => {
    return getPieChartDistribution(portfolio, usdToTryRate, totalNetCurrentValue, t('others'));
  }, [portfolio, usdToTryRate, totalNetCurrentValue, lang]);

  const renderCompactItem = ({ item }) => {
    const cPrice = item.currentPrice !== undefined ? item.currentPrice : item.price;
    const cost = item.price * item.quantity;
    const grossValue = cPrice * item.quantity;
    let tax = 0; if (item.type === 'TEFAS' && (grossValue - cost) > 0) tax = (grossValue - cost) * 0.175;
    const netProfit = (grossValue - cost) - tax;
    
    // Yüzdelik değişim para biriminden bağımsızdır, hep aynı kalır
    const pct = cost > 0 ? (netProfit / cost) * 100 : 0;
    const isProfit = netProfit >= 0;

    // BÜYÜ BURADA: Kullanıcının seçtiği para birimine göre ekranda gösterilecek fiyatı hesaplıyoruz
    const displayPrice = getConvertedValueLocal(cPrice, item.type);

    return (
      <TouchableOpacity 
        style={styles.compactCard} 
        activeOpacity={0.6} 
        onPress={() => { setSelectedAssetInfo(item); setSelectedAssetId(item.id); setDetailModalVisible(true); }}
      >
        <View style={styles.compactLeft}>
          <View style={styles.compactIconBox}>
            <MaterialIcons name={getAssetIcon(item.type)} size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.compactName}>{item.name}</Text>
            <Text style={styles.compactSub}>{`${item.quantity.toFixed(decimals)} ${t('shares')}`}</Text>
          </View>
        </View>
        <View style={styles.compactRight}>
           <Text style={styles.compactPrice}>
             {currency}{((grossValue * (currency === '$' ? (1/usdToTryRate) : 1))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
           </Text>
           <Text style={[styles.compactPct, { color: isProfit ? COLORS.primary : (pct < 0 ? COLORS.error : COLORS.textSub) }]}>
             {isProfit && pct > 0 ? '+' : ''}{pct.toFixed(2)}%
           </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGridItem = ({ item }) => {
    let cPrice = 0; let pct = 0;
    if (marketTabMode === 'GRID') {
      cPrice = item.currentPrice !== undefined ? item.currentPrice : item.price; pct = item.changePercent || 0;
    } else {
      let foundAsset = null; Object.values(MOCK_ASSETS).forEach(arr => { const a = arr.find(x => x.symbol === item); if (a) foundAsset = a; });
      cPrice = foundAsset ? foundAsset.price : 0; pct = 0; 
      item = { name: item, id: item }; 
    }

    const isProfit = pct > 0; const isLoss = pct < 0;
    const changeColor = isProfit ? COLORS.primary : (isLoss ? COLORS.error : COLORS.textSub);
    const arrowIcon = isProfit ? 'arrow-upward' : (isLoss ? 'arrow-downward' : 'remove');

    return (
      <AnimatedTouchableOpacity 
        style={[styles.gridCard, isMarketEditMode && styles.gridCardEditMode, isMarketEditMode && wiggleStyle]} 
        activeOpacity={0.7} 
        onPress={() => { if (!isMarketEditMode && marketTabMode === 'GRID') { setSelectedAssetInfo(item); setSelectedAssetId(item.id); setDetailModalVisible(true); } }}
        onLongPress={() => { if (marketTabMode === 'GRID') setIsMarketEditMode(true); }}
      >
        <Text style={styles.gridSymbol} numberOfLines={1}>{item.symbol || item.name}</Text>
        <Text style={styles.gridPrice}>
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
            style={{ position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.error, borderRadius: 12, padding: 2 }}
            onPress={() => marketTabMode === 'GRID' ? removeWatchlistAsset(item.id) : removeCustomListAsset(item.name)}
          >
             <MaterialIcons name="close" size={14} color="#FFF" />
          </TouchableOpacity>
        )}
      </AnimatedTouchableOpacity>
    );
  };

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
        onPageScroll={(e) => { pageScrollPos.setValue(e.nativeEvent.position + e.nativeEvent.offset); }}
        onPageSelected={(e) => { setActiveTab(e.nativeEvent.position === 0 ? 'PORTFOLIO' : 'MARKET'); }}
      >
        <PortfolioScreen 
          styles={styles}
          COLORS={COLORS}
          portfolio={portfolio}
          getGroupedData={getGroupedData}
          renderCompactItem={renderCompactItem}
          t={t}
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
          setSettingsVisible={setSettingsVisible}
          watchlist={watchlist}
          renderGridItem={renderGridItem}
          isRefreshing={isRefreshing}
          onRefreshMarket={onRefreshMarket}
          customLists={customLists}
          openListOptions={openListOptions}
          lang={lang}
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
          
          <TouchableOpacity 
            style={styles.navItemCenter} 
            onPress={handleCenterButton}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.navItemCenterInner, { transform: [{ scale: fabScale }] }]}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: 30, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />
              <MaterialIcons name="add" size={32} color="#FFFFFF" style={{ shadowColor: '#FFF', shadowOpacity: 0.2, shadowRadius: 10 }} />
            </Animated.View>
          </TouchableOpacity>

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
        currency={currency}
        setCurrency={setCurrency}
        usdToTryRate={usdToTryRate}
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

  dragHandleContainer: { width: '100%', alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  dragHandle: { width: 40, height: 4, backgroundColor: COLORS.textSub, borderRadius: 2, opacity: 0.5 },
  modalOverlayFlexEnd: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  
  donutContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative', marginVertical: 20 },
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


  detailPageBox: { backgroundColor: COLORS.surfaceHigh, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 25, paddingBottom: 50, minHeight: '65%', zIndex: 2, borderTopWidth: 1, borderTopColor: COLORS.border },
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
  
  bottomNavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(10, 10, 12, 0.85)', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', paddingBottom: 12, paddingTop: 8 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 50 },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  navText: { fontSize: 10, color: '#8A8A9A', fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },
  navItemCenter: { marginTop: -12, alignItems: 'center', justifyContent: 'center' },
  navItemCenterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  
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
  categoryScroll: { maxHeight: 50, marginBottom: 20 },
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
  
  // YENİ: Boş Durum Yönlendirici Buton Stili
  ghostBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: COLORS.surfaceHigh },
  ghostBtnText: { color: COLORS.primary, fontWeight: 'bold' }
});