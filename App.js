import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView as SafeAreaContext } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { calculateTotalPortfolio, getTopGainersAndLosers, isUsdType, getPieChartDistribution, calculateAdvancedChartData } from './portfolioEngine';

import { DARK_THEME, LIGHT_THEME } from './src/shared/constants/themes';
import { TRANSLATIONS } from './src/shared/constants/translations';
import { MOCK_ASSETS, ASSET_TYPES, CATEGORY_ORDER } from './src/shared/constants/mockData';
import { getStyles } from './src/shared/styles/appStyles';
import { MarketService } from './src/shared/services/MarketService';
import { getCurrencySymbol, migrateType } from './src/shared/utils/assetUtils';
import { usePortfolioData } from './src/features/portfolio/usePortfolioData';
import { useWatchlist } from './src/features/watchlist/useWatchlist';
import { usePortfolio } from './src/features/portfolio/usePortfolio';
import { useSearch } from './src/features/search/useSearch';
import { useSettings } from './src/features/settings/useSettings';
import { useAppModals } from './src/shared/hooks/useAppModals';
import { getAssetIcon, getConvertedValue, createTranslationFunction } from './src/uiUtils';
import { PortfolioScreen } from './src/features/portfolio/PortfolioScreen';
import { MarketGridItem } from './src/features/market/MarketGridItem';
import { MarketScreen } from './src/features/market/MarketScreen';
import { SettingsModal } from './src/shared/components/SettingsModal';
import { AddAssetModal } from './src/features/portfolio/AddAssetModal';
import { DetailModal } from './src/features/portfolio/DetailModal';
import { ListOptionsModal } from './src/features/watchlist/ListOptionsModal';
import { SellModal } from './src/features/portfolio/SellModal';
import { CashModal } from './src/features/portfolio/CashModal';
import { ListModal } from './src/features/market/ListModal';
import { ProfitModal } from './src/features/portfolio/ProfitModal';
import { DistributionModal } from './src/features/portfolio/DistributionModal';
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function App() {
  return (
    <AppRoot />
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

  const {
    modalVisible, setModalVisible,
    sellModalVisible, setSellModalVisible,
    settingsVisible, setSettingsVisible,
    detailModalVisible, setDetailModalVisible,
    distributionModalVisible, setDistributionModalVisible,
    profitModalVisible, setProfitModalVisible,
    cashModalVisible, setCashModalVisible,
    listModalVisible, setListModalVisible,
    listOptionsVisible, setListOptionsVisible,
    selectedAssetInfo, setSelectedAssetInfo,
    selectedAssetId, setSelectedAssetId,
    selectedPieSlice, setSelectedPieSlice,
    selectedOptionList, setSelectedOptionList
  } = useAppModals();

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
  const [listNameInput, setListNameInput] = useState('');
  const [editingListId, setEditingListId] = useState(null); 
  // NAKİT KASA SİSTEMİ
  const [cashBalance, setCashBalance] = useState(0); // Kasadaki boşta duran TL
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

  const [isAddMoreMode, setIsAddMoreMode] = useState(false);

  const [assetType, setAssetType] = useState('BIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchAsset, setSelectedSearchAsset] = useState(null);

  const [inputMode, setInputMode] = useState('AMOUNT'); 
  const [primaryInput, setPrimaryInput] = useState(''); 
  const [buyPrice, setBuyPrice] = useState(''); 
  const [note, setNote] = useState('');

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

  const { addAsset, deleteAsset, sellAsset } = usePortfolio({
    activeTab, primaryInput, buyPrice, selectedSearchAsset, portfolio, watchlist,
    customLists, selectedListId, assetType, note, inputMode,
    selectedAssetId, sellQuantityInput, usdToTryRate,
    setPortfolio, setWatchlist, setCashBalance, setPriceHistory,
    saveData, saveLists, logTransaction, resetAddModal,
    setModalVisible, setSellModalVisible, setDetailModalVisible,
    setPrimaryInput, setBuyPrice, setNote, setSellQuantityInput,
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
      const forexData = await MarketService._fetchForexRates();
      if (forexData?.rates?.TRY) setUsdToTryRate(forexData.rates.TRY);
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

  // getTimeframeLabel moved to usePortfolioData
  
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
    const results = calculateAdvancedChartData(chartHistory, timeFilter, totalNetCurrentValue, totalUnrealizedPnL, unrealizedPnLPct, portfolio, usdToTryRate, priceHistory);
    
    return {
      allChartData: results,
      timeframePerformance: results.pnl
    };
  }, [chartHistory, timeFilter, totalNetCurrentValue, totalUnrealizedPnL, unrealizedPnLPct, portfolio, usdToTryRate, priceHistory]);

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
  const getConvertedValueLocal = (val, assetOrType) => getConvertedValue(val, assetOrType, currency, usdToTryRate, isUsdType);

  // Hesaplama Motoru: Pasta Grafik (Varlık Dağılımı)
  const pieData = useMemo(() => {
    return getPieChartDistribution(portfolio, usdToTryRate, totalNetCurrentValue, t('cash'), cashBalance);
  }, [portfolio, usdToTryRate, totalNetCurrentValue, lang, cashBalance]);

  const renderGridItem = useCallback(({ item }) => {
    return (
      <MarketGridItem 
        item={item}
        marketTabMode={marketTabMode}
        isMarketEditMode={isMarketEditMode}
        wiggleStyle={wiggleStyle}
        COLORS={COLORS}
        styles={styles}
        t={t}
        removeWatchlistAsset={removeWatchlistAsset}
        removeCustomListAsset={removeCustomListAsset}
        setSelectedAssetInfo={setSelectedAssetInfo}
        setSelectedAssetId={setSelectedAssetId}
        setDetailModalVisible={setDetailModalVisible}
        setIsMarketEditMode={setIsMarketEditMode}
        MOCK_ASSETS={MOCK_ASSETS}
      />
    );
  }, [marketTabMode, isMarketEditMode, wiggleStyle, COLORS, styles, t, removeWatchlistAsset, removeCustomListAsset, setSelectedAssetInfo, setSelectedAssetId, setDetailModalVisible, setIsMarketEditMode]);

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
