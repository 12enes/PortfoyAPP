import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SectionList, Modal, Alert, SafeAreaView, ScrollView, StatusBar, KeyboardAvoidingView, Platform, FlatList, LayoutAnimation, UIManager, Animated, PanResponder, Dimensions, RefreshControl, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { G, Circle, Path } from 'react-native-svg';
import { SafeAreaView as SafeAreaContext, SafeAreaProvider } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { LineChart } from 'react-native-gifted-charts';
import PerformanceChartSection from './PerformanceChartSection';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { calculateAssetPnL, calculateTotalPortfolio, getTopGainersAndLosers, isUsdType, getPieChartDistribution, getPortfolioPerformanceByTimeframe, calculateAdvancedChartData } from './portfolioEngine';
import { DARK_THEME, LIGHT_THEME, PIE_COLORS } from './src/shared/constants/themes';
import { TRANSLATIONS } from './src/shared/constants/translations';
import { MOCK_ASSETS, ASSET_TYPES, CATEGORY_ORDER } from './src/shared/constants/mockData';
import MarketService from './src/shared/services/marketService';
import { migrateType, getCurrencySymbol } from './src/shared/utils/assetUtils';
import { getTranslation, getAssetIcon, getConvertedValue as getConvertedValHelper } from './src/shared/utils/uiHelpers';
import SwipeableModal from './src/shared/components/SwipeableModal';
import CustomTabBar from './src/shared/components/CustomTabBar';
import getStyles from './src/shared/styles/appStyles';
import { usePortfolioData } from './src/features/portfolio/usePortfolioData';
import { usePortfolio } from './src/features/portfolio/usePortfolio';
import { useWatchlist } from './src/features/watchlist/useWatchlist';
import { useSearch } from './src/features/search/useSearch';
import { useSettings } from './src/features/settings/useSettings';
import PortfolioScreen from './src/features/portfolio/PortfolioScreen';
import MarketScreen from './src/features/market/MarketScreen';
import SettingsModal from './src/shared/components/SettingsModal';
import AddAssetModal from './src/features/portfolio/AddAssetModal';
import DetailModal from './src/features/portfolio/DetailModal';
import PriceUpdateModal from './src/features/portfolio/PriceUpdateModal';
import SellModal from './src/features/portfolio/SellModal';
import CashModal from './src/features/portfolio/CashModal';
import ListModal from './src/features/market/ListModal';
import ProfitModal from './src/features/portfolio/ProfitModal';
import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, interpolate as interpolateRe, Extrapolate } from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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
  const t = (key) => getTranslation(key, lang);
  const getConvertedValue = (value, type) => getConvertedValHelper(value, type, currency, usdToTryRate);
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [chartViewMode, setChartViewMode] = useState('PERFORMANCE'); // 'PERFORMANCE' veya 'ASSET_FLOW'
  const [usdToTryRate, setUsdToTryRate] = useState(32.50);

  const pagerRef = useRef(null);
  const pageScrollPos = useRef(new Animated.Value(0)).current;
  
  const [marketTabMode, setMarketTabMode] = useState('GRID'); 
  const [customLists, setCustomLists] = useState([]); 
  const [selectedListId, setSelectedListId] = useState(null); 
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listNameInput, setListNameInput] = useState('');
  const [editingListId, setEditingListId] = useState(null); 
  // NAKİT KASA SİSTEMİ
  const [cashBalance, setCashBalance] = useState(0); // Kasadaki boşta duran TL
  const [usdCashBalance, setUsdCashBalance] = useState(0); // Kasadaki boşta duran USD
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
  const animatedSetSearchQuery = (text) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchQuery(text);
  };
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchAsset, setSelectedSearchAsset] = useState(null);
  const [selectedPieSlice, setSelectedPieSlice] = useState(null);

  const [inputMode, setInputMode] = useState('AMOUNT'); 
  const [primaryInput, setPrimaryInput] = useState(''); 
  const [buyPrice, setBuyPrice] = useState(''); 
  const [note, setNote] = useState('');

  const [currentPriceInput, setCurrentPriceInput] = useState('');
  const [sellQuantityInput, setSellQuantityInput] = useState('');

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

  // ADIM 7: onRefreshMarket artık Hook içinden geliyor
  const { 
    saveData, loadData, saveLists, refreshPortfolioPrices, 
    saveDailySnapshot, onRefreshMarket, getFilteredHistory, getTimeframeLabel 
  } = usePortfolioData({
    portfolio, watchlist, chartHistory, setPortfolio, setWatchlist, setHistory, setChartHistory,
    setPriceHistory, setLang, setCurrency, setTheme,
    setCustomLists, setUsdToTryRate, setIsRefreshing, flashAnim, t,
    setCashBalance, setUsdCashBalance, history, timeFilter, usdToTryRate, lang
  });

  const numInput = parseFloat(primaryInput.replace(',', '.')) || 0;
  const numPrice = parseFloat(buyPrice.replace(',', '.')) || 0;
  const decimals = assetType === 'CRYPTO' ? 8 : 2; 

  let calculatedQty = 0; let calculatedTotalAmount = 0;
  if (inputMode === 'AMOUNT') { calculatedTotalAmount = numInput; calculatedQty = numPrice > 0 ? (numInput / numPrice) : 0; } 
  else { calculatedQty = numInput; calculatedTotalAmount = numInput * numPrice; }

  // ADIM 8: Liste yönetimi fonksiyonları Hook'tan geliyor
  const { 
    createOrUpdateList, openListOptions, removeWatchlistAsset, removeCustomListAsset 
  } = useWatchlist({
    listNameInput, setListNameInput, setListError, t, triggerShake,
    customLists, editingListId, setEditingListId, setListModalVisible,
    saveLists, setSelectedListId, setIsMarketEditMode, watchlist, setWatchlist, saveData
  });

  // ADIM 10: Arama işlemleri Hook'tan geliyor
  const { 
    handleSearch, handleCategoryChange, handleAssetSelect, resetAddModal, handleCenterButton 
  } = useSearch({
    assetType, activeTab, marketTabMode, watchlist, customLists, selectedListId,
    setSearchQuery: animatedSetSearchQuery, setSearchResults, setAssetType, setSelectedSearchAsset,
    setWatchlist, setModalVisible, setBuyPrice, setPrimaryInput, setNote,
    setInputMode, setIsAddMoreMode, setIsMarketEditMode, setEditingListId, 
    setListNameInput, setListError, setListModalVisible,
    saveData, saveLists, t
  });

  // ADIM 11: Ayarlar ve İşlem Kaydı Hook'tan geliyor
  const { 
    changeTheme, changeLanguage, changeCurrency, handleResetAllData, logTransaction 
  } = useSettings({
    history, setTheme, setLang, setCurrency, setPortfolio, setWatchlist, 
    setHistory, setChartHistory, setCustomLists, setCashBalance, setUsdCashBalance, setSettingsVisible,
    saveData, t
  });

  // ADIM 9: Varlık işlemleri Hook'tan geliyor
  const { addAsset, updateCurrentPrice, sellAsset, deleteAsset } = usePortfolio({
    portfolio, watchlist, activeTab, selectedAssetId, selectedSearchAsset,
    buyPrice, primaryInput, calculatedQty, assetType, note,
    currentPriceInput, sellQuantityInput, usdToTryRate,
    setPortfolio, setWatchlist, setCashBalance, setUsdCashBalance, setPriceHistory,
    setDetailModalVisible, setCurrentPriceInput, setSellModalVisible, setSellQuantityInput,
    saveData, logTransaction, resetAddModal, t, decimals,
    saveDailySnapshot, totalNetCurrentValue, totalCost
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



  // Veritabanını güncel tutan motor (HIZLANDIRILDI)
  useEffect(() => {
     saveDailySnapshot(totalNetCurrentValue, totalCost); // Uygulama açıldığında beklemeden hemen kaydet
     const timer = setInterval(() => {
        saveDailySnapshot(totalNetCurrentValue, totalCost);
     }, 60000); // Her dakikada bir güncelle
     return () => clearInterval(timer);
  }, [totalNetCurrentValue, totalCost]);









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


  let profitColor = COLORS.textSub; let profitPrefix = ''; let profitIcon = 'remove';
  if (realizedStats.value > 0) { profitColor = COLORS.primary; profitPrefix = '+'; profitIcon = 'trending-up'; } 
  else if (realizedStats.value < 0) { profitColor = COLORS.error; profitIcon = 'trending-down'; }

  // Hesaplama Motoru (Portfolio Engine) devrede
  const calculatedStats = calculateTotalPortfolio(portfolio, usdToTryRate, cashBalance, usdCashBalance);
  const totalCost = Number(calculatedStats.totalCost) || 0;
  const totalNetCurrentValue = Number(calculatedStats.totalNetCurrentValue) || 0;
  const totalUnrealizedPnL = Number(calculatedStats.totalUnrealizedPnL) || 0;
  const unrealizedPnLPct = Number(calculatedStats.unrealizedPnLPct) || 0;
  
  let unrealizedColor = COLORS.textSub; let unrealizedPrefix = ''; let unrealizedIcon = null;
  if (totalUnrealizedPnL > 0) { unrealizedColor = COLORS.primary; unrealizedPrefix = '+'; unrealizedIcon = 'trending-up'; }
  else if (totalUnrealizedPnL < 0) { unrealizedColor = COLORS.error; unrealizedIcon = 'trending-down'; }

  // Hesaplama Motoru: En Çok Kazandıranlar / Kaybettirenler (Özel Geçmiş Veri İle)
  const { topPerformers, worstPerformers } = getTopGainersAndLosers(portfolio, usdToTryRate, timeFilter, priceHistory);
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


  // Hesaplama Motoru: Pasta Grafik (Varlık Dağılımı)
  const pieData = useMemo(() => {
    return getPieChartDistribution(portfolio, usdToTryRate, totalNetCurrentValue, t('others'));
  }, [portfolio, usdToTryRate, totalNetCurrentValue, lang]);

  const renderGridItem = ({ item }) => {
    let cPrice = 0; let pct = 0;
    if (marketTabMode === 'GRID') {
      cPrice = item.currentPrice !== undefined ? item.currentPrice : item.price; pct = item.changePercent || 0;
    } else {
      let foundAsset = null; Object.values(MOCK_ASSETS).forEach(arr => { const a = arr.find(x => x.symbol === item); if (a) foundAsset = a; });
      cPrice = foundAsset ? foundAsset.price : 0; pct = 0; 
      item = { name: item, id: item, type: foundAsset ? foundAsset.type : 'BIST' }; 
    }

    const isProfit = pct > 0; const isLoss = pct < 0;
    // Green and Red reserved ONLY for financial numbers
    const changeColor = isProfit ? '#00E87A' : (isLoss ? '#FF4757' : '#8A8A9A');
    const arrowIcon = isProfit ? 'arrow-upward' : (isLoss ? 'arrow-downward' : 'remove');
    const flashColor = flashAnim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', isProfit ? 'rgba(0, 232, 122, 0.15)' : 'rgba(255, 71, 87, 0.15)'] });

    return (
      <AnimatedTouchableOpacity 
        style={[
          {
            flex: 1,
            aspectRatio: 1,
            backgroundColor: '#0A0A0C', // Dipsiz Siyah
            borderWidth: 1,
            borderColor: '#2A2A35', // İnce Premium Çerçeve
            margin: 4,
            padding: 12,
            justifyContent: 'space-between',
            position: 'relative'
          },
          isMarketEditMode && styles.gridCardEditMode, 
          isMarketEditMode && wiggleStyle
        ]} 
        activeOpacity={0.7} 
        onPress={() => { if (!isMarketEditMode && marketTabMode === 'GRID') { setSelectedAssetInfo(item); setSelectedAssetId(item.id); setDetailModalVisible(true); } }}
        onLongPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsMarketEditMode(true); }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: flashColor }]} pointerEvents="none" />
        {isMarketEditMode && (
          <TouchableOpacity style={styles.deleteBadge} onPress={() => marketTabMode === 'GRID' ? removeWatchlistAsset(item.id) : removeCustomListAsset(item.name)}>
             <MaterialIcons name="close" size={14} color="#FFF" />
          </TouchableOpacity>
        )}
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: -0.2 }} numberOfLines={1}>{item.name}</Text>
        <View style={{ alignItems: 'flex-start' }}>
           <Text style={{ color: '#8A8A9A', fontSize: 10, fontWeight: '600', marginBottom: 2 }}>{getCurrencySymbol(item.type || 'BIST')}</Text>
           <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.5 }} numberOfLines={1} adjustsFontSizeToFit>
             {cPrice ? cPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
           </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
           <MaterialIcons name={arrowIcon} size={14} color={changeColor} />
           <Text style={{ color: changeColor, fontSize: 12, fontWeight: '700', marginLeft: 2 }}>{Math.abs(pct).toFixed(2)}%</Text>
        </View>
      </AnimatedTouchableOpacity>
    );
  };

  const currentDetailAsset = (portfolio.find(a => a.id === selectedAssetId) || watchlist.find(a => a.id === selectedAssetId)) || selectedAssetInfo;
  
  const marketProps = {
    styles, COLORS, t,
    marketTabMode, setMarketTabMode,
    isMarketEditMode, setIsMarketEditMode,
    selectedListId, setSelectedListId,
    watchlist, customLists, isRefreshing,
    setListNameInput, setEditingListId, 
    setListError, setListModalVisible, setSettingsVisible,
    onRefreshMarket, openListOptions, renderGridItem,
    wiggleStyle, flashAnim, assetType
  };

  const settingsProps = {
    styles, COLORS, t,
    settingsVisible, setSettingsVisible,
    theme, changeTheme,
    lang, changeLanguage,
    currency, changeCurrency,
    handleResetAllData
  };

  const addAssetProps = {
    styles, COLORS, t,
    modalVisible, resetAddModal,
    selectedSearchAsset, isAddMoreMode, activeTab,
    setSelectedSearchAsset,
    assetType, handleCategoryChange, theme,
    searchQuery, handleSearch,
    searchResults, marketTabMode, watchlist, selectedListId, customLists, handleAssetSelect,
    inputMode, setInputMode, setPrimaryInput, primaryInput,
    calculatedQty, decimals, calculatedTotalAmount,
    buyPrice, setBuyPrice, note, setNote, addAsset
  };

  const detailProps = {
    styles, COLORS, t,
    detailModalVisible, setDetailModalVisible,
    currentDetailAsset, activeTab, currency,
    getConvertedValue, decimals,
    setIsAddMoreMode, setAssetType, handleAssetSelect, setModalVisible,
    setSellModalVisible, deleteAsset,
    theme
  };

  const priceUpdateProps = {
    styles, COLORS, t,
    priceModalVisible, setPriceModalVisible,
    currentDetailAsset,
    currentPriceInput, setCurrentPriceInput,
    updateCurrentPrice
  };

  const sellProps = {
    styles, COLORS, t,
    sellModalVisible, setSellModalVisible,
    sellQuantityInput, setSellQuantityInput,
    sellAsset
  };

  const cashProps = {
    styles, COLORS, lang,
    cashModalVisible, setCashModalVisible,
    cashInput, setCashInput,
    cashBalance, setCashBalance,
    usdCashBalance, setUsdCashBalance
  };

  const listProps = {
    styles, COLORS, t,
    listModalVisible, setListModalVisible,
    editingListId, shakeAnim, listError, setListError,
    listNameInput, setListNameInput,
    createOrUpdateList
  };

  const profitProps = {
    styles, COLORS, t, lang,
    profitModalVisible, setProfitModalVisible,
    getTimeframeLabel, getAssetIcon,
    topPerformers, worstPerformers, filteredHistory
  };


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
            COLORS={COLORS} styles={styles} t={t} lang={lang} currency={currency} theme={theme}
            portfolio={portfolio} cashBalance={cashBalance} usdCashBalance={usdCashBalance} totalNetCurrentValue={totalNetCurrentValue}
            totalCost={totalCost} totalUnrealizedPnL={totalUnrealizedPnL} unrealizedPnLPct={unrealizedPnLPct}
            timeframePerformance={timeframePerformance} timeFilter={timeFilter} usdToTryRate={usdToTryRate}
            stableChartData={stableChartData} chartViewMode={chartViewMode} isRefreshingPortfolio={isRefreshingPortfolio}
            setSettingsVisible={setSettingsVisible} setChartViewMode={setChartViewMode} setTimeFilter={setTimeFilter}
            onRefreshPortfolio={onRefreshPortfolio} setSelectedPieSlice={setSelectedPieSlice}
            setDistributionModalVisible={setDistributionModalVisible} setProfitModalVisible={setProfitModalVisible}
            setCashModalVisible={setCashModalVisible}
            getGroupedData={getGroupedData} getTimeframeLabel={getTimeframeLabel}
            setSelectedAssetInfo={setSelectedAssetInfo} setSelectedAssetId={setSelectedAssetId}
            setDetailModalVisible={setDetailModalVisible} decimals={decimals}
            priceHistory={priceHistory}
          />

          <View key="1" collapsable={false}>
            <MarketScreen marketProps={marketProps} />
          </View>
        </PagerView>

        <CustomTabBar
          activeTab={activeTab}
          pagerRef={pagerRef}
          setModalVisible={setModalVisible}
          COLORS={COLORS}
          styles={styles}
          t={t}
        />

        <ListModal listProps={listProps} />
        <ProfitModal profitProps={profitProps} />
        <SwipeableModal visible={distributionModalVisible} onClose={() => setDistributionModalVisible(false)} boxStyle={styles.detailPageBox} styles={styles}>
          <View style={styles.detailHeader}><View style={{flex: 1}}><Text style={styles.detailName}>{t('portfolioDist')}</Text></View><TouchableOpacity onPress={() => setDistributionModalVisible(false)}><MaterialIcons name="close" size={28} color={COLORS.textSub} /></TouchableOpacity></View>
                  {pieData.length > 0 ? (<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}><View style={styles.donutContainer}><Svg width="220" height="220" viewBox="0 0 220 220"><G rotation="-90" origin="110, 110">{(() => {let cumulativePercent = 0; return pieData.map((slice, i) => {const radius = 80; const circumference = 2 * Math.PI * radius; const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`; const rotation = (cumulativePercent / 100) * 360; cumulativePercent += slice.percentage; const isSelected = selectedPieSlice === i; const isDimmed = selectedPieSlice !== null && !isSelected; return (<Circle key={slice.id || i} cx="110" cy="110" r={radius} stroke={slice.color} strokeWidth={isSelected ? 38 : 30} strokeDasharray={strokeDasharray} fill="transparent" origin="110, 110" rotation={rotation} opacity={isDimmed ? 0.3 : 1} onPress={() => setSelectedPieSlice(isSelected ? null : i)} />);});})()}</G></Svg><View style={styles.donutCenterTextContainer}><Text style={styles.donutCenterLabel}>{selectedPieSlice !== null ? pieData[selectedPieSlice].name : t('netWorth')}</Text><Text style={styles.donutCenterValue}>{selectedPieSlice !== null ? `₺${pieData[selectedPieSlice].value.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}` : `₺${totalNetCurrentValue.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}</Text>{selectedPieSlice !== null && <Text style={[styles.donutCenterPct, {color: pieData[selectedPieSlice].color}]}>{pieData[selectedPieSlice].percentage.toFixed(1)}%</Text>}</View></View><View style={styles.legendContainer}>{pieData.map((slice, i) => (<TouchableOpacity key={i} style={[styles.legendItem, selectedPieSlice === i && styles.legendItemActive]} onPress={() => setSelectedPieSlice(selectedPieSlice === i ? null : i)}><View style={[styles.legendColorBox, {backgroundColor: slice.color}]} /><View style={{flex: 1}}><Text style={styles.legendSymbol}>{slice.name}</Text><Text style={styles.legendName} numberOfLines={1}>{slice.type === 'OTHER' ? '' : t(slice.type)}</Text></View><Text style={styles.legendPct}>{slice.percentage.toFixed(1)}%</Text></TouchableOpacity>))}</View></ScrollView>) : (<View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}><MaterialIcons name="pie-chart-outline" size={48} color={COLORS.border} style={{marginBottom: 15}} /><Text style={{color: COLORS.textSub}}>{t('emptyList')}</Text></View>)}
        </SwipeableModal>

        <AddAssetModal addAssetProps={addAssetProps} />

        <DetailModal detailProps={detailProps} />
        <SettingsModal settingsProps={settingsProps} />

        <PriceUpdateModal priceUpdateProps={priceUpdateProps} />

        <SellModal sellProps={sellProps} />
        <CashModal cashProps={cashProps} />

      </SafeAreaContext>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}