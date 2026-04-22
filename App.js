import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SectionList, Modal, Alert, SafeAreaView, ScrollView, StatusBar, KeyboardAvoidingView, Platform, FlatList, LayoutAnimation, UIManager, Animated, PanResponder, Dimensions, RefreshControl, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { G, Circle, Path } from 'react-native-svg';
import { SafeAreaView as SafeAreaContext } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { LineChart } from 'react-native-gifted-charts';
import PerformanceChartSection from './PerformanceChartSection';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { calculateAssetPnL, calculateTotalPortfolio, getTopGainersAndLosers, isUsdType, getPieChartDistribution, getPortfolioPerformanceByTimeframe, calculateAdvancedChartData } from './portfolioEngine';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// 1. DİNAMİK TEMA PALETLERİ
// ============================================================================
const DARK_THEME = {
  bg: '#131313', surface: '#1c1b1b', surfaceHigh: '#2a2a2a',
  primary: '#00FFA3', primaryDim: '#006d37', primarySoft: 'rgba(0, 255, 163, 0.1)',
  error: '#FF4D4D', errorSoft: 'rgba(255, 77, 77, 0.1)',
  textMain: '#FFFFFF', textSub: '#8A919E', border: '#3b4b3d',
  chartBg: '#111A16', cardBg: 'rgba(53, 53, 52, 0.4)', overlay: 'rgba(0,0,0,0.85)',
  bottomNavBg: 'rgba(19, 19, 19, 0.95)'
};

const LIGHT_THEME = {
  bg: '#F2F4F7', surface: '#FFFFFF', surfaceHigh: '#E2E8F0',
  primary: '#00B873', primaryDim: '#008a56', primarySoft: 'rgba(0, 184, 115, 0.15)',
  error: '#FF3B30', errorSoft: 'rgba(255, 59, 48, 0.15)',
  textMain: '#111827', textSub: '#6B7280', border: '#D1D5DB',
  chartBg: '#EAFFF5', cardBg: '#FFFFFF', overlay: 'rgba(0,0,0,0.5)',
  bottomNavBg: 'rgba(255, 255, 255, 0.95)'
};

const PIE_COLORS = ['#00FFA3', '#3A86FF', '#8338EC', '#FFBE0B', '#FF4D4D', '#8A919E'];

const ASSET_TYPES = ['BIST', 'TEFAS', 'GOLD', 'CRYPTO', 'USA'];
const CATEGORY_ORDER = ['BIST', 'TEFAS', 'GOLD', 'CRYPTO', 'USA'];

const MOCK_ASSETS = {
  'BIST': [{ symbol: 'THYAO', name: 'Türk Hava Yolları', price: 295.50 }, { symbol: 'TUPRS', name: 'Tüpraş', price: 172.40 }, { symbol: 'EREGL', name: 'Erdemir', price: 44.10 }, { symbol: 'ASELS', name: 'Aselsan', price: 58.20 }, { symbol: 'KCHOL', name: 'Koç Holding', price: 210.00 }, { symbol: 'GARAN', name: 'Garanti BBVA', price: 84.50 }],
  'USA': [{ symbol: 'AAPL', name: 'Apple Inc.', price: 175.50 }, { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420.10 }, { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 890.00 }, { symbol: 'TSLA', name: 'Tesla Inc.', price: 170.20 }, { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 180.50 }],
  'CRYPTO': [{ symbol: 'BTC', name: 'Bitcoin', price: 65400.00 }, { symbol: 'ETH', name: 'Ethereum', price: 3450.00 }, { symbol: 'BNB', name: 'BNB', price: 590.00 }, { symbol: 'SOL', name: 'Solana', price: 145.00 }, { symbol: 'XRP', name: 'Ripple', price: 0.58 }],
  'GOLD': [{ symbol: 'GLD/TRY', name: 'Gram Altın', price: 2450.00 }, { symbol: 'XAU/USD', name: 'Ons Altın', price: 2340.00 }, { symbol: 'USD/TRY', name: 'Amerikan Doları', price: 32.15 }, { symbol: 'EUR/TRY', name: 'Euro', price: 34.80 }],
  'TEFAS': [{ symbol: 'MAC', name: 'Marmara Capital Hisse Fonu', price: 0.45 }, { symbol: 'TI2', name: 'İş Portföy BIST 100 Dışı Fon', price: 1.20 }, { symbol: 'AFT', name: 'Ak Portföy Yeni Teknolojiler', price: 0.85 }]
};

const TRANSLATIONS = {
  tr: {
    portfolio: 'Portföy', market: 'Piyasa', marketPulse: 'PİYASA DURUMU', totalAssetValue: 'TOPLAM VARLIK DEĞERİ', peak: 'ZİRVE',
    t1D: '1G', t1W: '1H', t1M: '1A', t1Y: '1Y', tALL: 'TZ', netWorth: 'NET VARLIK', realizedPL: 'GERÇEKLEŞEN KÂR',
    shares: 'Adet', cost: 'Maliyet', current: 'Güncel', newTx: 'Yeni İşlem', addToWatch: 'Takibe Al',
    searchAsset: 'Varlık ara (Örn: THYAO, AAPL)', noResults: 'Sonuç bulunamadı.', customAsset: 'Özel Varlık Ekle',
    buyPrice: 'Alış Fiyatı', currentPrice: 'Güncel Fiyat', quantity: 'Adet', note: 'Kişisel Not & Strateji...',
    cancel: 'İptal', save: 'İşlemi Kaydet', updatePrice: 'Fiyat Güncelle', update: 'Güncelle',
    addMore: 'Ekleme Yap', addMoreQty: 'Eklenecek Adet', addMorePrice: 'Alış Fiyatı',
    sellTitle: 'Satış & Kâr Realizasyonu', sellQty: 'Satılacak Adet', confirm: 'Onayla',
    emptyList: 'Henüz varlık eklenmedi.', settings: 'Ayarlar', language: 'Dil / Language', currency: 'Para Birimi / Currency', theme: 'Görünüm / Theme',
    alertWarning: 'Uyarı', alertFill: 'Lütfen tutar ve fiyat girin.', alertInvalid: 'Geçersiz değer.',
    alertSuccess: 'İşlem Başarılı', buy: 'ALIM', sell: 'SATIM', profit: 'Kâr', executeTrade: 'SAT / KÂR AL',
    details: 'Varlık Detayları', avgCost: 'Ortalama Maliyet', tax: 'Vergi (Stopaj)', netProfit: 'Net Kâr/Zarar', totalValue: 'Toplam Değer', delete: 'Varlığı Sil',
    portfolioDist: 'Portföy Dağılımı', others: 'Diğer',
    performanceRankings: 'Performans Analizi', topPerformers: 'En Çok Kazandıranlar', worstPerformers: 'En Çok Kaybettirenler',
    BIST: 'BIST', TEFAS: 'Tefas Fonu', GOLD: 'Altın/Döviz', CRYPTO: 'Kripto', USA: 'ABD Hisse',
    modeAmount: 'Tutar', modeQuantity: 'Adet', approx: 'Yaklaşık', calcQty: 'Alınacak Adet', calcTotal: 'Toplam Maliyet',
    alreadyAdded: 'Bu varlık zaten listenizde mevcut.', done: 'Bitti', emptyMarket: 'Takip listeniz boş.\nVarlık eklemek için + butonuna dokunun.',
    tracking: 'Takip', createList: 'Yeni Liste Oluştur', listName: 'Liste Adı', renameList: 'Yeniden Adlandır',
    deleteList: 'Listeyi Sil', emptyLists: 'Henüz bir takip listesi oluşturmadınız.\nİlk listenizi oluşturmak için + butonuna dokunun.',
    listNameExists: 'Bu isimde bir liste zaten var.', listNameReq: 'Lütfen bir liste adı girin.',
    createBtn: 'Oluştur', noListsYet: 'Henüz liste yok', emptyListsSub: 'İlk listenizi oluşturmak için üstteki + ikonuna dokunun.', assets: 'varlık' // YENİ: Temizlenen UI çevirileri
  },
  en: {
    portfolio: 'Portfolio', market: 'Watchlist', marketPulse: 'MARKET PULSE', totalAssetValue: 'TOTAL ASSET VALUE', peak: 'PEAK',
    t1D: '1D', t1W: '1W', t1M: '1M', t1Y: '1Y', tALL: 'AT', netWorth: 'NET WORTH', realizedPL: 'REALIZED P/L',
    shares: 'Shares', cost: 'Avg Cost', current: 'Current', newTx: 'New Transaction', addToWatch: 'Add to Watchlist',
    searchAsset: 'Search asset (e.g., AAPL, BTC)', noResults: 'No results found.', customAsset: 'Add Custom Asset',
    buyPrice: 'Buy Price', currentPrice: 'Current Price', quantity: 'Quantity', note: 'Personal Note & Strategy...',
    cancel: 'Cancel', save: 'Save Transaction', updatePrice: 'Update Price', update: 'Update',
    addMore: 'Add More', addMoreQty: 'Quantity to Add', addMorePrice: 'Buy Price',
    sellTitle: 'Execute Trade & Realize Profit', sellQty: 'Quantity to Sell', confirm: 'Confirm',
    emptyList: 'No assets found.', settings: 'Settings', language: 'Language / Dil', currency: 'Currency / Para Birimi', theme: 'Theme / Görünüm',
    alertWarning: 'Warning', alertFill: 'Please enter amount and price.', alertInvalid: 'Invalid quantity.',
    alertSuccess: 'Transaction Successful', buy: 'BUY', sell: 'SELL', profit: 'Profit', executeTrade: 'EXECUTE TRADE',
    details: 'Asset Details', avgCost: 'Average Cost', tax: 'Tax', netProfit: 'Net P/L', totalValue: 'Total Value', delete: 'Delete Asset',
    portfolioDist: 'Portfolio Distribution', others: 'Others',
    performanceRankings: 'Performance Analysis', topPerformers: 'Top Performers', worstPerformers: 'Worst Performers',
    BIST: 'BIST', TEFAS: 'Tefas Fund', GOLD: 'Gold/FX', CRYPTO: 'Crypto', USA: 'US Stock',
    modeAmount: 'Amount', modeQuantity: 'Quantity', approx: 'Approx', calcQty: 'Estimated Qty', calcTotal: 'Total Cost',
    alreadyAdded: 'This asset is already in your watchlist.', done: 'Done', emptyMarket: 'Your watchlist is empty.\nTap the + button to add assets.',
    tracking: 'Custom Lists', createList: 'Create New List', listName: 'List Name', renameList: 'Rename',
    deleteList: 'Delete List', emptyLists: 'You have not created any custom lists yet.\nTap the + button to create your first list.',
    listNameExists: 'A list with this name already exists.', listNameReq: 'Please enter a list name.',
    createBtn: 'Create', noListsYet: 'No watchlists yet', emptyListsSub: 'Tap the plus icon above to create your first list.', assets: 'assets' // YENİ: Temizlenen UI çevirileri
  }
};

const migrateType = (type) => {
  switch(type) { case 'Hisse': return 'BIST'; case 'Fon': return 'TEFAS'; case 'Altın/Döviz': return 'GOLD'; case 'Kripto': return 'CRYPTO'; case 'ABD Hisse': return 'USA'; default: return type || 'BIST'; }
};

const getCurrencySymbol = (type) => {
  switch(type) { case 'BIST': case 'TEFAS': return '₺'; case 'CRYPTO': case 'USA': case 'GOLD': default: return '$'; }
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const SwipeableModal = ({ visible, onClose, children, boxStyle, styles }) => {
  const panY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => { if (gestureState.dy > 0) panY.setValue(gestureState.dy); },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.2) {
          Animated.timing(panY, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => onClose());
        } else {
          Animated.spring(panY, { toValue: 0, bounciness: 12, useNativeDriver: true }).start();
        }
      }
    })
  ).current;

  useEffect(() => { if (visible) panY.setValue(0); }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlayFlexEnd} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[boxStyle, { transform: [{ translateY: panY }] }]}>
          <View {...panResponder.panHandlers} style={styles.dragHandleContainer}><View style={styles.dragHandle} /></View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

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
  const t = (key) => TRANSLATIONS[lang][key] || key;
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [chartViewMode, setChartViewMode] = useState('PERFORMANCE'); // 'PERFORMANCE' veya 'ASSET_FLOW'
  const [usdToTryRate, setUsdToTryRate] = useState(32.50);

  const netWorthScale = useRef(new Animated.Value(1)).current;
  const profitScale = useRef(new Animated.Value(1)).current;
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

  const loadData = async () => {
    try {
      const sPort = await AsyncStorage.getItem('@portfolio');
      const sWatch = await AsyncStorage.getItem('@watchlist');
      const sHist = await AsyncStorage.getItem('@history');
      const sChart = await AsyncStorage.getItem('@chart_history');
      const sPriceHist = await AsyncStorage.getItem('@price_history');
      const sLang = await AsyncStorage.getItem('@language'); 
      const sCurr = await AsyncStorage.getItem('@currency');
      const sTheme = await AsyncStorage.getItem('@theme'); 
      const sLists = await AsyncStorage.getItem('@custom_lists');
      
      if (sPort) setPortfolio(JSON.parse(sPort).map(item => ({...item, type: migrateType(item.type)})));
      if (sWatch) setWatchlist(JSON.parse(sWatch).map(item => ({ ...item, type: migrateType(item.type), changePercent: item.changePercent || 0 })));
      if (sHist) setHistory(JSON.parse(sHist));
      if (sChart) setChartHistory(JSON.parse(sChart));
      if (sPriceHist) setPriceHistory(JSON.parse(sPriceHist));
      if (sLang) setLang(sLang);
      if (sCurr) setCurrency(sCurr);
      if (sTheme) setTheme(sTheme);
      if (sLists) setCustomLists(JSON.parse(sLists));
      // USD/TRY kurunu çek
      try {
        const rates = await MarketService._fetchForexRates();
        if (rates?.TRY) setUsdToTryRate(rates.TRY);
      } catch (e) { /* Varsayılan kur kullanılır */ }
      // Uygulama açıldığında portföy fiyatlarını güncelle
      if (sPort) {
        const parsedPort = JSON.parse(sPort).map(item => ({...item, type: migrateType(item.type)}));
        refreshPortfolioPrices(parsedPort);
      }
    } catch (e) { Alert.alert(t('alertWarning'), "Error loading data"); }
  };

  const saveData = async (key, data) => { await AsyncStorage.setItem(key, JSON.stringify(data)); };
  // FAZ 3: GERÇEK ZAMANLI VERİ TABANI VE GÜNLÜK KAYIT MOTORU (GÜNCELLENDİ)
  const saveDailySnapshot = async (currentTotal, currentCost) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let currentHistory = [...chartHistory];

    // YENİ: O anki varlıkların teker teker fiyatlarını bir "Hafıza Kartına" yaz
    const currentAssetPrices = {};
    portfolio.forEach(a => {
        currentAssetPrices[a.name] = a.currentPrice !== undefined ? a.currentPrice : a.price;
    });

    if (currentHistory.length === 0) {
      const stored = await AsyncStorage.getItem('@chart_history');
      if (stored) {
        currentHistory = JSON.parse(stored);
      } else {
        for (let i = 30; i >= 1; i--) {
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - i);
          const noise = 1 + ((Math.random() - 0.5) * 0.04);
          currentHistory.push({
            date: pastDate.toISOString().split('T')[0],
            timestamp: pastDate.getTime(),
            value: currentTotal > 0 ? currentTotal * Math.pow(noise, i/5) : 0,
            cost: currentCost,
            prices: currentAssetPrices // Sahte geçmişte bugünün fiyatlarını kopyalarız
          });
        }
      }
    }

    const todayIndex = currentHistory.findIndex(d => d.date === todayStr);
    const todayData = { 
      date: todayStr, 
      timestamp: Date.now(), 
      value: Math.max(0, currentTotal), 
      cost: Math.max(0, currentCost),
      prices: currentAssetPrices // YENİ: O günkü hisse fiyatlarını da veri tabanına göm
    };

    if (todayIndex >= 0) {
      currentHistory[todayIndex] = todayData; 
    } else {
      currentHistory.push(todayData); 
    }

    setChartHistory(currentHistory);
    AsyncStorage.setItem('@chart_history', JSON.stringify(currentHistory));
  };

  // Veritabanını güncel tutan motor (HIZLANDIRILDI)
  useEffect(() => {
     saveDailySnapshot(totalNetCurrentValue, totalCost); // Uygulama açıldığında beklemeden hemen kaydet
     const timer = setInterval(() => {
        saveDailySnapshot(totalNetCurrentValue, totalCost);
     }, 60000); // Her dakikada bir güncelle
     return () => clearInterval(timer);
  }, [totalNetCurrentValue, totalCost]);
  const saveLists = async (data) => { setCustomLists(data); await AsyncStorage.setItem('@custom_lists', JSON.stringify(data)); };

  // Portföy varlıklarının güncel fiyatlarını API'den çek
  const refreshPortfolioPrices = async (portfolioData) => {
    const data = portfolioData || portfolio;
    if (!data || data.length === 0) return;
    try {
      const updated = await MarketService.fetchMultiple(data);
      // Sadece currentPrice ve changePercent güncelle, price (maliyet) değişmesin
      const merged = data.map(a => {
        const fresh = updated.find(u => u.id === a.id);
        if (fresh && fresh.currentPrice !== undefined) {
          return { ...a, currentPrice: fresh.currentPrice, changePercent: fresh.changePercent || 0 };
        }
        return a;
      });
      setPortfolio(merged);
      saveData('@portfolio', merged);
    } catch (e) { console.log('Portfolio price refresh failed:', e); }
  };

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

  const changeTheme = (newTheme) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setTheme(newTheme); AsyncStorage.setItem('@theme', newTheme); };
  const changeLanguage = (selectedLang) => { setLang(selectedLang); AsyncStorage.setItem('@language', selectedLang); };
  const changeCurrency = (selectedCur) => { setCurrency(selectedCur); AsyncStorage.setItem('@currency', selectedCur); };

  // --- YENİ EKLENEN SIFIRLAMA FONKSİYONU ---
  const handleResetAllData = () => {    
    Alert.alert(
      'Tehlikeli İşlem',
      'Tüm portföy verileriniz, işlem geçmişiniz ve ayarlarınız kalıcı olarak silinecektir. Emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        { 
          text: 'Evet, Sıfırla', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                '@portfolio', '@watchlist', '@history', '@chart_history', 
                '@custom_lists', '@language', '@currency', '@theme'
              ]);
              
              setPortfolio([]);
              setWatchlist([]);
              setHistory([]);
              setChartHistory([]);
              setCustomLists([]);
              setCashBalance(0);
              
              setSettingsVisible(false);
              Alert.alert('Sıfırlandı', 'Uygulama ilk haline döndürüldü.');
            } catch (e) {
              Alert.alert('Hata', 'Sıfırlama sırasında bir hata oluştu.');
            }
          } 
        }
      ],
      { cancelable: true }
    );
  };
  // -----------------------------------------

  const logTransaction = (type, name, qty, price, netProfit = 0, assetType = 'BIST') => {
    const newTx = { id: Date.now().toString(), timestamp: Date.now(), date: new Date().toLocaleDateString(), type, name, qty, price, netProfit, assetType };
    setHistory([newTx, ...history]); saveData('@history', [newTx, ...history]);
  };

    const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length === 0) { setSearchResults(MOCK_ASSETS[assetType]); return; }
    const query = text.toLowerCase();
    const filtered = MOCK_ASSETS[assetType].filter(asset => asset.symbol.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query));
    if (text.length > 0 && !filtered.find(a => a.symbol.toLowerCase() === query)) { filtered.push({ symbol: text.toUpperCase(), name: t('customAsset'), isCustom: true }); }
    setSearchResults(filtered);
  };

  const handleCategoryChange = (cat) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setAssetType(cat); setSearchQuery(''); setSelectedSearchAsset(null); setSearchResults(MOCK_ASSETS[cat]); };
  
  const handleAssetSelect = async (item) => { 
    if (activeTab === 'MARKET') {
       if (marketTabMode === 'GRID') {
          const isDuplicate = watchlist.some(a => a.name === item.symbol);
          if (isDuplicate) { Alert.alert(t('alertWarning'), t('alreadyAdded')); return; }
          const updated = [...watchlist, { id: Math.random().toString(), name: item.symbol, type: assetType, price: item.price || 0, currentPrice: item.price || 0, changePercent: 0, note: '' }];
          setWatchlist(updated); saveData('@watchlist', updated);
       } else if (marketTabMode === 'LISTS' && selectedListId) {
          const currentList = customLists.find(l => l.id === selectedListId);
          if (currentList?.assetIds.includes(item.symbol)) { Alert.alert(t('alertWarning'), t('alreadyAdded')); return; }
          const updated = customLists.map(l => l.id === selectedListId ? { ...l, assetIds: [...l.assetIds, item.symbol] } : l);
          saveLists(updated);
       }
       setModalVisible(false);
       setSearchQuery('');
    } else {
       LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); 
       setSelectedSearchAsset(item); 
       // Canlı fiyat çekmeyi dene, başarısız olursa mock fiyatı kullan
       let livePrice = item.price || 0;
       try {
         if (assetType === 'CRYPTO') {
           const result = await MarketService._fetchCryptoPrice(item.symbol);
           if (result?.price) livePrice = result.price;
         } else if (assetType === 'GOLD') {
           if (item.symbol === 'XAU/USD' || item.symbol === 'GLD/TRY') {
             const goldResult = await MarketService._fetchGoldUSD();
             if (goldResult?.price) {
               if (item.symbol === 'XAU/USD') { livePrice = goldResult.price; }
               else {
                 const rates = await MarketService._fetchForexRates();
                 if (rates?.TRY) livePrice = parseFloat(((goldResult.price * rates.TRY) / 31.1035).toFixed(2));
               }
             }
           } else if (item.symbol === 'USD/TRY' || item.symbol === 'EUR/TRY') {
             const rates = await MarketService._fetchForexRates();
             if (rates) {
               if (item.symbol === 'USD/TRY' && rates.TRY) livePrice = rates.TRY;
               else if (item.symbol === 'EUR/TRY' && rates.TRY && rates.EUR) livePrice = parseFloat((rates.TRY / rates.EUR).toFixed(4));
             }
           }
         }
       } catch (e) { /* Mock fiyat kullan */ }
       setBuyPrice(livePrice > 0 ? livePrice.toString() : '');
    }
  };

  const resetAddModal = () => { 
    setSearchQuery(''); setSelectedSearchAsset(null); 
    setPrimaryInput(''); setBuyPrice(''); setNote(''); 
    setInputMode('AMOUNT');
    setIsAddMoreMode(false); 
    setModalVisible(false); 
  };

  const handleCenterButton = () => {
    setIsAddMoreMode(false); 
    setSearchResults(MOCK_ASSETS[assetType]); 
    // Eğer listelerdeysek ve bir detaya girmediksek, "+" butonu da Liste Oluşturmaya gider.
    if (activeTab === 'MARKET' && marketTabMode === 'LISTS' && !selectedListId) {
       setListNameInput(''); setEditingListId(null); setListError(''); setListModalVisible(true);
    } else {
       setModalVisible(true); 
    }
  };

  // YENİ: Listeyi doğrulayan, titreten ve pürüzsüz animasyonla içine sokan geliştirilmiş kayıt motoru
  const createOrUpdateList = () => {
    const trimmed = listNameInput.trim();
    if (!trimmed) { setListError(t('listNameReq')); triggerShake(); return; }
    if (customLists.some(l => l.name.toLowerCase() === trimmed.toLowerCase() && l.id !== editingListId)) {
        setListError(t('listNameExists')); triggerShake(); return;
    }
    setListError('');
    if (editingListId) {
        const updated = customLists.map(l => l.id === editingListId ? { ...l, name: trimmed } : l);
        saveLists(updated);
        setListModalVisible(false);
    } else {
        const newId = Date.now().toString();
        const newList = { id: newId, name: trimmed, createdAt: Date.now(), assetIds: [] };
        saveLists([newList, ...customLists]);
        setListModalVisible(false);
        // Yeni liste oluşturulunca ufak bir saniye sonra doğrudan içine dal
        setTimeout(() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedListId(newId);
        }, 300);
    }
  };

  const openListOptions = (list) => {
    Alert.alert(list.name, '', [
      { text: t('renameList'), onPress: () => { setEditingListId(list.id); setListNameInput(list.name); setListError(''); setListModalVisible(true); } },
      { text: t('deleteList'), style: 'destructive', onPress: () => {
          const updated = customLists.filter(l => l.id !== list.id);
          saveLists(updated);
      }},
      { text: t('cancel'), style: 'cancel' }
    ]);
  };

  const numInput = parseFloat(primaryInput.replace(',', '.')) || 0;
  const numPrice = parseFloat(buyPrice.replace(',', '.')) || 0;
  const decimals = assetType === 'CRYPTO' ? 8 : 2; 

  let calculatedQty = 0; let calculatedTotalAmount = 0;
  if (inputMode === 'AMOUNT') { calculatedTotalAmount = numInput; calculatedQty = numPrice > 0 ? (numInput / numPrice) : 0; } 
  else { calculatedQty = numInput; calculatedTotalAmount = numInput * numPrice; }

  const addAsset = async () => {
    if (!selectedSearchAsset || !buyPrice || !primaryInput) { Alert.alert(t('alertWarning'), t('alertFill')); return; }
    const finalQty = parseFloat(calculatedQty.toFixed(8)); 
    const finalPrice = numPrice; const finalSymbol = selectedSearchAsset.symbol;
    if (finalQty <= 0) { Alert.alert(t('alertWarning'), t('alertInvalid')); return; }

    // Canlı piyasa fiyatını çek (currentPrice için)
    let liveMarketPrice = finalPrice;
    try {
      if (assetType === 'CRYPTO') {
        const result = await MarketService._fetchCryptoPrice(finalSymbol);
        if (result?.price) liveMarketPrice = result.price;
      } else if (assetType === 'GOLD') {
        if (finalSymbol === 'XAU/USD' || finalSymbol === 'GLD/TRY') {
          const goldResult = await MarketService._fetchGoldUSD();
          if (goldResult?.price) {
            if (finalSymbol === 'XAU/USD') { liveMarketPrice = goldResult.price; }
            else {
              const rates = await MarketService._fetchForexRates();
              if (rates?.TRY) liveMarketPrice = parseFloat(((goldResult.price * rates.TRY) / 31.1035).toFixed(2));
            }
          }
        } else if (finalSymbol === 'USD/TRY' || finalSymbol === 'EUR/TRY') {
          const rates = await MarketService._fetchForexRates();
          if (rates) {
            if (finalSymbol === 'USD/TRY' && rates.TRY) liveMarketPrice = rates.TRY;
            else if (finalSymbol === 'EUR/TRY' && rates.TRY && rates.EUR) liveMarketPrice = parseFloat((rates.TRY / rates.EUR).toFixed(4));
          }
        }
      }
    } catch (e) { /* Hata durumunda alış fiyatını kullan */ }

    const existingIndex = portfolio.findIndex(a => a.name === finalSymbol);
    let updatedData = [...portfolio];
    if (existingIndex >= 0) {
      const existing = updatedData[existingIndex];
      const oldTotalCost = existing.price * existing.quantity;
      const newTotalCost = finalPrice * finalQty;
      const totalQty = existing.quantity + finalQty;
      updatedData[existingIndex] = { ...existing, price: (oldTotalCost + newTotalCost) / totalQty, quantity: totalQty, currentPrice: liveMarketPrice, type: assetType, note: note || existing.note };
    } else {
      updatedData.push({ id: Math.random().toString(), name: finalSymbol, type: assetType, price: finalPrice, quantity: finalQty, currentPrice: liveMarketPrice, note });
    }
    setPortfolio(updatedData); saveData('@portfolio', updatedData);
    logTransaction(t('buy'), finalSymbol, finalQty, finalPrice, 0, assetType);
    resetAddModal();

    // FAZ 1 BÜYÜSÜ: Arka Planda Geriye Dönük Veri Tamamlama (Historical Backfilling)
    // Uygulamanın UI'ını dondurmamak için asenkron (sessizce) çalışır
    setTimeout(async () => {
      const historyData = await MarketService.fetchHistoricalPrices(finalSymbol, assetType, 30);
      setPriceHistory(prev => {
        const updatedHistory = { ...prev, [finalSymbol]: historyData };
        AsyncStorage.setItem('@price_history', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    }, 500);
  };

  const updateCurrentPrice = () => {
    if (!currentPriceInput) return;
    const newPrice = parseFloat(currentPriceInput.replace(',', '.'));
    if (activeTab === 'PORTFOLIO') { const up = portfolio.map(a => a.id === selectedAssetId ? { ...a, currentPrice: newPrice } : a); setPortfolio(up); saveData('@portfolio', up); } 
    else { const up = watchlist.map(a => a.id === selectedAssetId ? { ...a, currentPrice: newPrice } : a); setWatchlist(up); saveData('@watchlist', up); }
    setDetailModalVisible(false); setCurrentPriceInput('');
  };

 const sellAsset = () => {
    const sellQty = parseFloat(sellQuantityInput.replace(',', '.'));
    const asset = portfolio.find(a => a.id === selectedAssetId);
    if (!sellQty || sellQty <= 0 || sellQty > asset.quantity) { Alert.alert(t('alertWarning'), t('alertInvalid')); return; }

    const cPrice = asset.currentPrice !== undefined ? asset.currentPrice : asset.price;
    const grossProfitNative = (cPrice * sellQty) - (asset.price * sellQty);
    
    // Tefas Fonları için Vergi (Stopaj) Hesaplaması
    let taxNative = 0; 
    if (asset.type === 'TEFAS' && grossProfitNative > 0) taxNative = grossProfitNative * 0.175; 
    const netProfitNative = grossProfitNative - taxNative;

    // FAZ 2 BÜYÜSÜ: Satıştan Elde Edilen Toplam Geliri Kasaya Aktarma
    const isUsd = (asset.type === 'CRYPTO' || asset.type === 'USA' || asset.type === 'GOLD');
    const rate = isUsd ? usdToTryRate : 1;
    
    // Kasaya girecek para = (Satış Fiyatı * Adet) - Vergi
    const totalSaleValueNative = (cPrice * sellQty) - taxNative;
    const totalSaleValueTRY = totalSaleValueNative * rate;

    const remQty = asset.quantity - sellQty;
    const upPort = remQty <= 0 ? portfolio.filter(a => a.id !== selectedAssetId) : portfolio.map(a => a.id === selectedAssetId ? { ...a, quantity: remQty } : a);
    
    // Parayı kasaya ekle ve portföyü güncelle
    setCashBalance(prev => prev + totalSaleValueTRY);
    setPortfolio(upPort); 
    saveData('@portfolio', upPort);
    logTransaction(t('sell'), asset.name || asset.symbol, sellQty, cPrice, netProfitNative, asset.type);
    
    setSellModalVisible(false); setSellQuantityInput(''); setDetailModalVisible(false);
  };

  const deleteAsset = (id) => { 
    if(activeTab === 'PORTFOLIO') { const up = portfolio.filter(a => a.id !== id); setPortfolio(up); saveData('@portfolio', up); }
    else { const up = watchlist.filter(a => a.id !== id); setWatchlist(up); saveData('@watchlist', up); }
    setDetailModalVisible(false);
  };

  const removeWatchlistAsset = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const up = watchlist.filter(a => a.id !== id);
    setWatchlist(up); saveData('@watchlist', up);
    if(up.length === 0) setIsMarketEditMode(false); 
  };

  const removeCustomListAsset = (symbol) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = customLists.map(l => l.id === selectedListId ? { ...l, assetIds: l.assetIds.filter(s => s !== symbol) } : l);
    saveLists(updated);
    const currentList = updated.find(l => l.id === selectedListId);
    if(currentList && currentList.assetIds.length === 0) setIsMarketEditMode(false);
  };

  const onRefreshMarket = async () => {
    setIsRefreshing(true);
    try {
      const updatedData = await MarketService.fetchMultiple(watchlist);
      setWatchlist(updatedData); saveData('@watchlist', updatedData);
      flashAnim.setValue(1); Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: false }).start();
    } catch (error) { console.log(error); }
    setIsRefreshing(false);
  };

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

  const getTimeframeLabel = () => {
    if (lang === 'tr') { switch(timeFilter) { case '1D': return 'Son 24 Saat'; case '1W': return 'Son 1 Hafta'; case '1M': return 'Son 1 Ay'; case '3M': return 'Son 3 Ay'; case '6M': return 'Son 6 Ay'; case 'YTD': return 'Yılbaşından Beri'; case '1Y': return 'Son 1 Yıl'; case 'ALL': return 'Tüm Zamanlar'; default: return ''; } } 
    else { switch(timeFilter) { case '1D': return 'Last 24 Hours'; case '1W': return 'Last 1 Week'; case '1M': return 'Last 1 Month'; case '3M': return 'Last 3 Months'; case '6M': return 'Last 6 Months'; case 'YTD': return 'Year to Date'; case '1Y': return 'Last 1 Year'; case 'ALL': return 'All Time'; default: return ''; } }
  };

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
  const getAssetIcon = (type) => { switch(type) { case 'BIST': return 'business'; case 'USA': return 'language'; case 'TEFAS': return 'pie-chart'; case 'CRYPTO': return 'currency-bitcoin'; case 'GOLD': return 'attach-money'; default: return 'widgets'; } };

  const getGroupedData = (sourceData) => {
    const grouped = []; CATEGORY_ORDER.forEach(type => { const items = sourceData.filter(a => (a.type || 'BIST') === type); if (items.length > 0) { grouped.push({ title: type, data: items }); } }); return grouped;
  };

  // YENİ: PORTFÖY İÇİN DİNAMİK DÖVİZ ÇEVİRİCİ MOTOR
  const getConvertedValue = (nativePrice, type) => {
    if (!nativePrice) return 0;
    const isNativeUsd = isUsdType(type); // Kripto, ABD Hisse ve Altın USD bazlıdır
    
    if (currency === '₺') {
      // TL seçiliyse: Yabancı varlıkları kura çarp, Türk varlıklarına dokunma
      return isNativeUsd ? nativePrice * usdToTryRate : nativePrice;
    } else if (currency === '$') {
      // Dolar seçiliyse: Türk varlıkları kura böl, Yabancı varlıklara dokunma
      return !isNativeUsd ? nativePrice / usdToTryRate : nativePrice;
    } 
    return nativePrice; 
  };

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
    const displayPrice = getConvertedValue(cPrice, item.type);

    return (
      <TouchableOpacity style={styles.compactCard} activeOpacity={0.7} onPress={() => { setSelectedAssetInfo(item); setSelectedAssetId(item.id); setDetailModalVisible(true); }}>
        <View style={styles.compactLeft}>
          <View style={styles.compactIconBox}><MaterialIcons name={getAssetIcon(item.type)} size={20} color={COLORS.primary} /></View>
          <View><Text style={styles.compactName}>{item.name}</Text><Text style={styles.compactSub}>{`${item.quantity.toFixed(decimals)} ${t('shares')}`}</Text></View>
        </View>
        <View style={styles.compactRight}>
           {/* getCurrencySymbol(item.type) yerine global 'currency' ve yeni displayPrice kullanıyoruz */}
           <Text style={styles.compactPrice}>{currency}{displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
           <Text style={[styles.compactPct, { color: isProfit ? COLORS.primary : (pct < 0 ? COLORS.error : COLORS.textSub) }]}>{isProfit && pct > 0 ? '+' : ''}{pct.toFixed(2)}%</Text>
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
    const flashColor = flashAnim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', isProfit ? 'rgba(0, 255, 163, 0.15)' : 'rgba(255, 77, 77, 0.15)'] });

    return (
      <AnimatedTouchableOpacity 
        style={[styles.gridCard, isMarketEditMode && styles.gridCardEditMode, isMarketEditMode && wiggleStyle]} 
        activeOpacity={0.7} 
        onPress={() => { if (!isMarketEditMode && marketTabMode === 'GRID') { setSelectedAssetInfo(item); setSelectedAssetId(item.id); setDetailModalVisible(true); } }}
        onLongPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsMarketEditMode(true); }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: flashColor, borderRadius: 16 }]} pointerEvents="none" />
        {isMarketEditMode && (
          <TouchableOpacity style={styles.deleteBadge} onPress={() => marketTabMode === 'GRID' ? removeWatchlistAsset(item.id) : removeCustomListAsset(item.name)}>
             <MaterialIcons name="close" size={14} color="#FFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.gridPriceContainer}>
           <Text style={styles.gridPricePrefix}>{getCurrencySymbol(item.type || assetType)}</Text>
           <Text style={styles.gridPrice} numberOfLines={1} adjustsFontSizeToFit>{cPrice ? cPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}</Text>
        </View>
        <View style={styles.gridChangeContainer}>
           <MaterialIcons name={arrowIcon} size={14} color={changeColor} />
           <Text style={[styles.gridChangePct, { color: changeColor }]}>{Math.abs(pct).toFixed(2)}%</Text>
        </View>
      </AnimatedTouchableOpacity>
    );
  };

  const currentDetailAsset = (portfolio.find(a => a.id === selectedAssetId) || watchlist.find(a => a.id === selectedAssetId)) || selectedAssetInfo;

  return (
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
        <View key="0" collapsable={false}>
          <View style={styles.topHeader}>
            <View style={styles.headerProfile}>
              <View style={styles.avatar}><MaterialIcons name="account-balance-wallet" size={20} color={theme === 'dark' ? '#131313' : '#FFFFFF'} /></View>
              <Text style={styles.brandText}>INCIK</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity onPress={() => setSettingsVisible(true)}>
                <MaterialIcons name="settings" size={26} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>
          </View>
          <SectionList
            sections={getGroupedData(portfolio)}
            keyExtractor={item => item.id}
            renderItem={renderCompactItem}
            renderSectionHeader={({ section: { title } }) => ( <Text style={styles.categoryTitle}>{t(title)}</Text> )}
            refreshControl={<RefreshControl refreshing={isRefreshingPortfolio} onRefresh={onRefreshPortfolio} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
            // DİKKAT: Başındaki () => kısmını SİLDİK! Sadece ( ile başlıyor.
            ListHeaderComponent={(
              <View style={{paddingHorizontal: 0, paddingBottom: 20}}>
              {/* MIDAS TARZI GRAFİK SEÇİCİ SEKMELER */}
        <View style={{ flexDirection: 'row', backgroundColor: COLORS.surfaceHigh, borderRadius: 12, padding: 4, marginHorizontal: 20, marginTop: 10, marginBottom: -10 }}>
          <TouchableOpacity 
            style={[{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 }, chartViewMode === 'PERFORMANCE' && { backgroundColor: COLORS.cardBg }]} 
            onPress={() => setChartViewMode('PERFORMANCE')}
          >
            <Text style={{ color: chartViewMode === 'PERFORMANCE' ? COLORS.primary : COLORS.textSub, fontWeight: 'bold', fontSize: 13 }}>
              {lang === 'tr' ? 'Performans' : 'Performance'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 }, chartViewMode === 'ASSET_FLOW' && { backgroundColor: COLORS.cardBg }]} 
            onPress={() => setChartViewMode('ASSET_FLOW')}
          >
            <Text style={{ color: chartViewMode === 'ASSET_FLOW' ? COLORS.primary : COLORS.textSub, fontWeight: 'bold', fontSize: 13 }}>
              {lang === 'tr' ? 'Varlık Akışı' : 'Asset Flow'}
            </Text>
          </TouchableOpacity>
        </View>

        <PerformanceChartSection
          data={stableChartData}
          // ... (diğer prop'lar aynı kalacak)
               
                  liveValue={currency === '$' ? totalNetCurrentValue / usdToTryRate : totalNetCurrentValue}
                  liveChange={timeframePerformance.pct}
                  liveChangeAmount={timeframePerformance.amount}
                  timeRanges={['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL']}
                  selectedRange={timeFilter}
                  onRangeSelect={setTimeFilter}
                  language={lang}
                  currency={currency}
                  locale={lang === 'tr' ? 'tr-TR' : 'en-US'} 
                />

                <View style={[styles.trendingGrid, { paddingHorizontal: 20, marginTop: 10 }]}>
                  <AnimatedTouchableOpacity 
                    activeOpacity={0.85} 
                    onPressIn={handleNetWorthPressIn} 
                    onPressOut={handleNetWorthPressOut} 
                    onPress={() => { setSelectedPieSlice(null); setDistributionModalVisible(true); }}
                    style={[styles.trendCard, { transform: [{ scale: netWorthScale }] }]}
                  >
                    <Text style={styles.trendLabel}>{t('netWorth')}</Text>
                    {/* DİNAMİK KUTU: Seçilen Kura Göre Net Varlık */}
                    <Text style={styles.trendValue}>{currency}{(currency === '$' ? totalNetCurrentValue / usdToTryRate : totalNetCurrentValue).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                      {unrealizedIcon && <MaterialIcons name={unrealizedIcon} size={14} color={unrealizedColor} style={{marginRight: 2}} />}
                      <Text style={{color: unrealizedColor, fontSize: 12, fontWeight: '700'}}>
                        {unrealizedPrefix}{currency}{Math.abs(currency === '$' ? totalUnrealizedPnL / usdToTryRate : totalUnrealizedPnL).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({unrealizedPrefix}{unrealizedPnLPct.toFixed(1)}%)
                      </Text>
                    </View>
                  </AnimatedTouchableOpacity>

                  <AnimatedTouchableOpacity 
                    activeOpacity={0.85} 
                    onPressIn={handleProfitPressIn} 
                    onPressOut={handleProfitPressOut} 
                    onPress={() => setProfitModalVisible(true)}
                    style={[styles.trendCard, { transform: [{ scale: profitScale }] }]}
                  >
<Text style={[styles.trendLabel, {color: timeframePerformance.amount > 0 ? COLORS.primary : COLORS.error}]}>{lang === 'tr' ? 'DÖNEM GETİRİSİ' : 'PERIOD RETURN'}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'flex-start', marginTop: 6}}>
                      <MaterialIcons name={timeframePerformance.amount > 0 ? 'trending-up' : 'trending-down'} size={24} color={timeframePerformance.amount > 0 ? COLORS.primary : COLORS.error} style={{marginRight: 6}} />
                      <View style={{flex: 1}}>
                        {/* DİNAMİK KUTU: Seçilen Kura Göre Kâr/Zarar */}
                        <Text style={[styles.trendValue, {fontSize: 18}]}>{currency}{Math.abs(currency === '$' ? timeframePerformance.amount / usdToTryRate : timeframePerformance.amount).toLocaleString('tr-TR', {minimumFractionDigits:0})}</Text>
                        <Text style={{color: timeframePerformance.amount > 0 ? COLORS.primary : COLORS.error, fontSize: 12, fontWeight: '700'}}>({timeframePerformance.pct.toFixed(2)}%)</Text>
                      </View>
                    </View>
                  </AnimatedTouchableOpacity>
                </View>
                {/* NAKİT KASA BÖLÜMÜ */}
          <View style={[styles.trendingGrid, { paddingHorizontal: 20, marginTop: 20, marginBottom: 10 }]}>
            <TouchableOpacity 
              style={[styles.trendCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }]}
              onPress={() => setCashModalVisible(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.compactIconBox, { backgroundColor: 'rgba(0, 255, 163, 0.15)' }]}>
                  <MaterialIcons name="account-balance-wallet" size={20} color="#00FFA3" />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.trendLabel}>Boşta Nakit (Sermaye)</Text>
                  <Text style={{ color: '#8A919E', fontSize: 11, marginTop: 2 }}>Para Ekle / Çek</Text>
                </View>
              </View>
              
              {/* Döviz çevirici motorumuzu burada da kullanıyoruz */}
              <Text style={styles.trendValue}>
                {currency}{currency === '$' ? (cashBalance / usdToTryRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : cashBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </TouchableOpacity>
          </View>
              </View>
            )}
            // -----------------------------------------------------------------
            contentContainerStyle={{ paddingBottom: 120 }}
            ListEmptyComponent={<Text style={styles.emptyText}>{t('emptyList')}</Text>}
            stickySectionHeadersEnabled={false}
          />
        </View>

        <View key="1" collapsable={false}>
          <View style={styles.topHeader}>
            <View style={styles.headerTabSwitcher}>
              <TouchableOpacity style={[styles.headerTab, marketTabMode === 'GRID' && styles.headerTabActive]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setMarketTabMode('GRID'); setIsMarketEditMode(false); setSelectedListId(null); }}>
                <Text style={[styles.headerTabText, marketTabMode === 'GRID' && styles.headerTabTextActive]}>{t('market')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerTab, marketTabMode === 'LISTS' && styles.headerTabActive]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setMarketTabMode('LISTS'); setIsMarketEditMode(false); }}>
                <Text style={[styles.headerTabText, marketTabMode === 'LISTS' && styles.headerTabTextActive]}>{t('tracking')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.headerIcons}>
              {isMarketEditMode ? (
                <TouchableOpacity onPress={() => setIsMarketEditMode(false)} style={styles.doneBtn}><Text style={styles.doneBtnText}>{t('done')}</Text></TouchableOpacity>
              ) : (
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   {marketTabMode === 'LISTS' && !selectedListId && (
                     <TouchableOpacity onPress={() => { setListNameInput(''); setEditingListId(null); setListError(''); setListModalVisible(true); }} style={{marginRight: 15}}>
                        <MaterialIcons name="add" size={28} color={COLORS.textMain} />
                     </TouchableOpacity>
                   )}
                   <TouchableOpacity onPress={() => setSettingsVisible(true)}>
                      <MaterialIcons name="settings" size={26} color={COLORS.textMain} />
                   </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          <TouchableWithoutFeedback onPress={() => { if(isMarketEditMode) setIsMarketEditMode(false); }}>
            <View style={{flex: 1}}>
              
              {marketTabMode === 'GRID' && (
                <>
                  <View style={{paddingHorizontal: 25, marginBottom: 15}}><Text style={{color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2}}>{t('marketPulse')}</Text></View>
                  <FlatList
                    key="market-grid"
                    data={watchlist} keyExtractor={item => item.id} numColumns={3} renderItem={renderGridItem} contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 120 }}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefreshMarket} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
                    ListEmptyComponent={<View style={styles.emptyMarketContainer}><MaterialIcons name="grid-view" size={64} color={COLORS.border} style={{marginBottom: 20}} /><Text style={styles.emptyMarketText}>{t('emptyMarket')}</Text></View>}
                  />
                </>
              )}

              {marketTabMode === 'LISTS' && (
                <>
                  {!selectedListId ? (
                    <View style={styles.listOverviewContainer}>
                       <FlatList
                         key="custom-lists-overview"
                         data={customLists} keyExtractor={item => item.id} showsVerticalScrollIndicator={false}
                         contentContainerStyle={{paddingBottom: 120}}
                         // YENİ: Özel ve Ferah Boş Durum (Empty State) tasarımı güncellendi
                         ListEmptyComponent={
                           <View style={styles.emptyMarketContainer}>
                              <MaterialIcons name="format-list-bulleted" size={64} color={COLORS.border} style={{marginBottom: 15}} />
                              <Text style={[styles.emptyMarketText, {fontWeight: 'bold', color: COLORS.textMain, marginBottom: 5, fontSize: 16}]}>{t('noListsYet')}</Text>
                              <Text style={styles.emptyMarketText}>{t('emptyListsSub')}</Text>
                              <TouchableOpacity style={styles.ghostBtn} onPress={() => { setListNameInput(''); setEditingListId(null); setListError(''); setListModalVisible(true); }}>
                                 <Text style={styles.ghostBtnText}>{t('createList')}</Text>
                              </TouchableOpacity>
                           </View>
                         }
                         renderItem={({item}) => (
                           // YENİ: Çok daha temiz, çizgili (Divider) ve kapsüllü (Pill) satır yapısı
                           <TouchableOpacity style={styles.listRow} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedListId(item.id); }} onLongPress={() => openListOptions(item)}>
                             <Text style={styles.listRowName}>{item.name}</Text>
                             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <View style={styles.listRowPill}><Text style={styles.listRowCount}>{item.assetIds.length} {t('assets')}</Text></View>
                                <MaterialIcons name="chevron-right" size={20} color={COLORS.border} />
                             </View>
                           </TouchableOpacity>
                         )}
                       />
                    </View>
                  ) : (
                    <View style={{flex: 1}}>
                       <View style={styles.listDetailHeader}>
                          <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedListId(null); setIsMarketEditMode(false); }} style={{padding: 5}}>
                             <MaterialIcons name="arrow-back" size={26} color={COLORS.textMain} />
                          </TouchableOpacity>
                          <Text style={styles.listDetailTitle} numberOfLines={1}>{customLists.find(l => l.id === selectedListId)?.name}</Text>
                       </View>
                       <FlatList
                          key={`custom-list-detail-${selectedListId}`}
                          data={customLists.find(l => l.id === selectedListId)?.assetIds || []} keyExtractor={item => item} numColumns={3} renderItem={renderGridItem} contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 120 }}
                          ListEmptyComponent={<View style={styles.emptyMarketContainer}><Text style={styles.emptyMarketText}>{t('emptyList')}</Text></View>}
                       />
                    </View>
                  )}
                </>
              )}

            </View>
          </TouchableWithoutFeedback>
        </View>
      </PagerView>

      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => pagerRef.current?.setPage(0)}>
            <View>
              <MaterialIcons name="query-stats" size={26} color={COLORS.textSub} />
              <Animated.View style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center'}, {opacity: pageScrollPos.interpolate({inputRange: [0, 1], outputRange: [1, 0]})}]} pointerEvents="none">
                <MaterialIcons name="query-stats" size={26} color={COLORS.primary} />
              </Animated.View>
            </View>
            <View>
              <Text style={styles.navText}>{t('portfolio')}</Text>
              <Animated.View style={[{position: 'absolute', top: 0, left: 0, right: 0}, {opacity: pageScrollPos.interpolate({inputRange: [0, 1], outputRange: [1, 0]})}]} pointerEvents="none">
                <Text style={[styles.navText, {color: COLORS.primary}]}>{t('portfolio')}</Text>
              </Animated.View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItemCenter} onPress={handleCenterButton}>
            <View style={styles.navItemCenterInner}><MaterialIcons name="add" size={34} color={theme === 'dark' ? '#131313' : '#FFFFFF'} /></View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => { pagerRef.current?.setPage(1); setIsMarketEditMode(false); }}>
            <View>
              <MaterialIcons name="trending-up" size={26} color={COLORS.textSub} />
              <Animated.View style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center'}, {opacity: pageScrollPos.interpolate({inputRange: [0, 1], outputRange: [0, 1]})}]} pointerEvents="none">
                <MaterialIcons name="trending-up" size={26} color={COLORS.primary} />
              </Animated.View>
            </View>
            <View>
              <Text style={styles.navText}>{t('market')}</Text>
              <Animated.View style={[{position: 'absolute', top: 0, left: 0, right: 0}, {opacity: pageScrollPos.interpolate({inputRange: [0, 1], outputRange: [0, 1]})}]} pointerEvents="none">
                <Text style={[styles.navText, {color: COLORS.primary}]}>{t('market')}</Text>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* YENİ: YENİLENMİŞ LİSTE OLUŞTURMA MODALI (Hata & Shake Animasyonu Eklendi) */}
      <SwipeableModal visible={listModalVisible} onClose={() => setListModalVisible(false)} boxStyle={styles.modalBox} styles={styles}>
        <Text style={[styles.modalTitle, {textAlign: 'center'}]}>{editingListId ? t('renameList') : t('createList')}</Text>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <TextInput 
             style={[styles.input, listError ? {borderColor: COLORS.error} : {}]} 
             placeholder={t('listName')} 
             placeholderTextColor={COLORS.textSub} 
             value={listNameInput} 
             onChangeText={(t) => {setListNameInput(t); setListError('');}} 
             autoFocus={true} 
          />
        </Animated.View>
        {listError ? <Text style={{color: COLORS.error, fontSize: 12, marginBottom: 15, marginTop: -10, marginLeft: 5}}>{listError}</Text> : null}
        <TouchableOpacity style={[styles.megaSaveBtn, {marginTop: 10}]} onPress={createOrUpdateList}>
           <Text style={styles.megaSaveBtnText}>{editingListId ? t('save') : t('createBtn')}</Text>
        </TouchableOpacity>
      </SwipeableModal>

      <SwipeableModal visible={profitModalVisible} onClose={() => setProfitModalVisible(false)} boxStyle={styles.detailPageBox} styles={styles}>
        <View style={[styles.detailHeader, {marginBottom: 15}]}><View style={{flex: 1}}><Text style={styles.detailName}>{t('performanceRankings')}</Text><Text style={{color: COLORS.textSub, fontSize: 13, marginTop: 4}}>{getTimeframeLabel()}</Text></View><TouchableOpacity onPress={() => setProfitModalVisible(false)}><MaterialIcons name="close" size={28} color={COLORS.textSub} /></TouchableOpacity></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
           <View style={{marginBottom: 30}}><View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}><MaterialIcons name="trending-up" size={20} color={COLORS.primary} style={{marginRight: 6}} /><Text style={styles.perfSectionTitle}>{t('topPerformers')}</Text></View><View style={styles.perfCard}>{topPerformers.length > 0 ? topPerformers.map((item, index) => (<View key={`top-${index}`} style={[styles.perfListItem, index === topPerformers.length - 1 && {marginBottom: 0}]}><View style={styles.perfListHeader}><View style={{flexDirection: 'row', alignItems: 'center'}}><View style={[styles.compactIconBox, {width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.primarySoft, marginRight: 10}]}><MaterialIcons name={getAssetIcon(item.type)} size={14} color={COLORS.primary} /></View><Text style={styles.perfItemName}>{item.name || item.symbol}</Text></View><View style={{flexDirection: 'row', alignItems: 'center'}}><View style={{width: 30, height: 15, marginRight: 8}}><Svg width="100%" height="100%" viewBox="0 0 30 15"><Path d="M0,15 Q10,10 15,5 T30,0" stroke={COLORS.primary} strokeWidth={2} fill="none" strokeLinecap="round" /></Svg></View><View style={{backgroundColor: COLORS.primarySoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8}}><Text style={[styles.perfItemPct, {color: COLORS.primary}]}>+{item.pct.toFixed(2)}%</Text></View></View></View></View>)) : <Text style={styles.emptyText}>{t('emptyList')}</Text>}</View></View>
           <View style={{marginBottom: 30}}><View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}><MaterialIcons name="trending-down" size={20} color={COLORS.error} style={{marginRight: 6}} /><Text style={[styles.perfSectionTitle, {color: COLORS.textMain}]}>{t('worstPerformers')}</Text></View><View style={styles.perfCard}>{worstPerformers.length > 0 ? worstPerformers.map((item, index) => (<View key={`worst-${index}`} style={[styles.perfListItem, index === worstPerformers.length - 1 && {marginBottom: 0}]}><View style={styles.perfListHeader}><View style={{flexDirection: 'row', alignItems: 'center'}}><View style={[styles.compactIconBox, {width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.errorSoft, marginRight: 10}]}><MaterialIcons name={getAssetIcon(item.type)} size={14} color={COLORS.error} /></View><Text style={styles.perfItemName}>{item.name || item.symbol}</Text></View><View style={{flexDirection: 'row', alignItems: 'center'}}><View style={{width: 30, height: 15, marginRight: 8}}><Svg width="100%" height="100%" viewBox="0 0 30 15"><Path d="M0,0 Q10,5 15,10 T30,15" stroke={COLORS.error} strokeWidth={2} fill="none" strokeLinecap="round" /></Svg></View><View style={{backgroundColor: COLORS.errorSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8}}><Text style={[styles.perfItemPct, {color: COLORS.error}]}>{item.pct.toFixed(2)}%</Text></View></View></View></View>)) : <Text style={styles.emptyText}>{t('emptyList')}</Text>}</View></View>

           <View style={{marginBottom: 10}}><View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}><MaterialIcons name="account-balance-wallet" size={20} color={COLORS.textSub} style={{marginRight: 6}} /><Text style={[styles.perfSectionTitle, {color: COLORS.textMain}]}>{lang === 'tr' ? 'Gerçekleşen İşlemler' : 'Realized Trades'}</Text></View>
             {filteredHistory.length > 0 ? (
               <View style={styles.perfCard}>
                 {filteredHistory.map((tx, index) => (
                   <View key={`tx-${index}`} style={[styles.perfListItem, index === filteredHistory.length - 1 && {marginBottom: 0}]}>
                     <View style={styles.perfListHeader}>
                       <View style={{flexDirection: 'row', alignItems: 'center'}}>
                         <View style={[styles.compactIconBox, {width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.surfaceHigh, marginRight: 10, borderWidth: 1, borderColor: COLORS.border}]}><MaterialIcons name="swap-horiz" size={14} color={COLORS.textSub} /></View>
                         <View><Text style={styles.perfItemName}>{tx.name}</Text><Text style={{color: COLORS.textSub, fontSize: 10}}>{tx.date}</Text></View>
                       </View>
                       <View style={{backgroundColor: tx.netProfit > 0 ? COLORS.primarySoft : COLORS.errorSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8}}>
                         <Text style={[styles.perfItemPct, {color: tx.netProfit > 0 ? COLORS.primary : COLORS.error}]}>{tx.netProfit > 0 ? '+' : ''}₺{Math.abs(tx.netProfit).toFixed(2)}</Text>
                       </View>
                     </View>
                   </View>
                 ))}
               </View>
             ) : (
               <View style={{alignItems: 'center', padding: 30, backgroundColor: COLORS.surfaceHigh, borderRadius: 16}}>
                 <MaterialIcons name="receipt-long" size={36} color={COLORS.border} style={{marginBottom: 10}} />
                 <Text style={{color: COLORS.textSub, fontSize: 14, fontWeight: '500'}}>{lang === 'tr' ? 'Bu dönemde gerçekleşen işlem yok' : 'No trades realized in this period'}</Text>
               </View>
             )}
           </View>
        </ScrollView>
      </SwipeableModal>

      <SwipeableModal visible={distributionModalVisible} onClose={() => setDistributionModalVisible(false)} boxStyle={styles.detailPageBox} styles={styles}>
        <View style={styles.detailHeader}><View style={{flex: 1}}><Text style={styles.detailName}>{t('portfolioDist')}</Text></View><TouchableOpacity onPress={() => setDistributionModalVisible(false)}><MaterialIcons name="close" size={28} color={COLORS.textSub} /></TouchableOpacity></View>
                {pieData.length > 0 ? (<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}><View style={styles.donutContainer}><Svg width="220" height="220" viewBox="0 0 220 220"><G rotation="-90" origin="110, 110">{(() => {let cumulativePercent = 0; return pieData.map((slice, i) => {const radius = 80; const circumference = 2 * Math.PI * radius; const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`; const rotation = (cumulativePercent / 100) * 360; cumulativePercent += slice.percentage; const isSelected = selectedPieSlice === i; const isDimmed = selectedPieSlice !== null && !isSelected; return (<Circle key={slice.id || i} cx="110" cy="110" r={radius} stroke={slice.color} strokeWidth={isSelected ? 38 : 30} strokeDasharray={strokeDasharray} fill="transparent" origin="110, 110" rotation={rotation} opacity={isDimmed ? 0.3 : 1} onPress={() => setSelectedPieSlice(isSelected ? null : i)} />);});})()}</G></Svg><View style={styles.donutCenterTextContainer}><Text style={styles.donutCenterLabel}>{selectedPieSlice !== null ? pieData[selectedPieSlice].name : t('netWorth')}</Text><Text style={styles.donutCenterValue}>{selectedPieSlice !== null ? `₺${pieData[selectedPieSlice].value.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}` : `₺${totalNetCurrentValue.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}</Text>{selectedPieSlice !== null && <Text style={[styles.donutCenterPct, {color: pieData[selectedPieSlice].color}]}>{pieData[selectedPieSlice].percentage.toFixed(1)}%</Text>}</View></View><View style={styles.legendContainer}>{pieData.map((slice, i) => (<TouchableOpacity key={i} style={[styles.legendItem, selectedPieSlice === i && styles.legendItemActive]} onPress={() => setSelectedPieSlice(selectedPieSlice === i ? null : i)}><View style={[styles.legendColorBox, {backgroundColor: slice.color}]} /><View style={{flex: 1}}><Text style={styles.legendSymbol}>{slice.name}</Text><Text style={styles.legendName} numberOfLines={1}>{slice.type === 'OTHER' ? '' : t(slice.type)}</Text></View><Text style={styles.legendPct}>{slice.percentage.toFixed(1)}%</Text></TouchableOpacity>))}</View></ScrollView>) : (<View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}><MaterialIcons name="pie-chart-outline" size={48} color={COLORS.border} style={{marginBottom: 15}} /><Text style={{color: COLORS.textSub}}>{t('emptyList')}</Text></View>)}
      </SwipeableModal>

      <SwipeableModal visible={modalVisible} onClose={resetAddModal} boxStyle={styles.searchModalBox} styles={styles}>
        <View style={[styles.modalHeaderRow, { justifyContent: 'flex-start', marginBottom: 25 }]}>
            {selectedSearchAsset && !isAddMoreMode && (
              <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedSearchAsset(null); }} style={{ marginRight: 15 }}>
                <MaterialIcons name="arrow-back" size={26} color={COLORS.textMain} />
              </TouchableOpacity>
            )}
            <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
               {isAddMoreMode ? t('addMore') : (activeTab === 'PORTFOLIO' ? t('newTx') : t('addToWatch'))}
            </Text>
        </View>
        
        {!selectedSearchAsset ? (
          <View style={{flex: 1}}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{gap: 10, paddingRight: 20}}>
              {ASSET_TYPES.map(type => (
                <TouchableOpacity key={type} style={[styles.pillBtn, assetType === type && styles.pillBtnActive]} onPress={() => handleCategoryChange(type)}>
                  <Text style={[styles.pillBtnText, assetType === type && {color: theme === 'dark' ? '#131313' : '#FFFFFF'}]}>{t(type)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={22} color={COLORS.textSub} style={{marginRight: 10}} />
              <TextInput style={styles.searchInput} placeholder={t('searchAsset')} placeholderTextColor={COLORS.textSub} value={searchQuery} onChangeText={handleSearch} autoCapitalize="characters" autoCorrect={false} />
              {searchQuery.length > 0 && ( <TouchableOpacity onPress={() => handleSearch('')}><MaterialIcons name="cancel" size={20} color={COLORS.textSub} /></TouchableOpacity> )}
            </View>
            <FlatList 
              data={searchResults} keyExtractor={(item, index) => item.symbol + index} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}} ListEmptyComponent={<Text style={styles.emptyText}>{t('noResults')}</Text>}
              renderItem={({item}) => {
                const isAdded = activeTab === 'MARKET' ? (
                  marketTabMode === 'GRID' 
                    ? watchlist.some(a => a.name === item.symbol) 
                    : (selectedListId ? customLists.find(l => l.id === selectedListId)?.assetIds.includes(item.symbol) : false)
                ) : false;

                return (
                  <TouchableOpacity 
                    style={[styles.searchResultItem, isAdded && {opacity: 0.4}]} 
                    disabled={isAdded}
                    onPress={() => handleAssetSelect(item)}
                  >
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <View style={[styles.compactIconBox, {width: 36, height: 36, marginRight: 12, backgroundColor: item.isCustom ? COLORS.primarySoft : COLORS.surfaceHigh}]}><MaterialIcons name={item.isCustom ? "add" : getAssetIcon(assetType)} size={18} color={COLORS.primary} /></View>
                        <View><Text style={styles.resultSymbol}>{item.symbol}</Text><Text style={styles.resultName}>{item.name}</Text></View>
                      </View>
                      {isAdded ? (
                        <MaterialIcons name="check-circle" size={20} color={COLORS.primary} />
                      ) : (
                        <Text style={{color: COLORS.textSub, fontSize: 13, fontWeight: 'bold'}}>{item.price ? `${getCurrencySymbol(assetType)}${item.price}` : ''}</Text>
                      )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
            <View style={styles.selectedAssetCard}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={[styles.compactIconBox, {width: 40, height: 40, marginRight: 15}]}><MaterialIcons name={getAssetIcon(assetType)} size={20} color={COLORS.primary} /></View>
                  <View>
                    <Text style={styles.selectedSymbol}>{selectedSearchAsset.symbol}</Text>
                    <Text style={styles.resultName}>{selectedSearchAsset.name !== selectedSearchAsset.symbol ? selectedSearchAsset.name : t(assetType)}</Text>
                  </View>
                </View>
                {!isAddMoreMode && ( <TouchableOpacity style={styles.changeAssetBtn} onPress={() => setSelectedSearchAsset(null)}><MaterialIcons name="edit" size={16} color={COLORS.textMain} /></TouchableOpacity> )}
            </View>

            {activeTab === 'PORTFOLIO' && (
              <>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity style={[styles.segmentBtn, inputMode === 'AMOUNT' && styles.segmentBtnActive]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setInputMode('AMOUNT'); setPrimaryInput(''); }}><Text style={[styles.segmentText, inputMode === 'AMOUNT' && styles.segmentTextActive]}>{t('modeAmount')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.segmentBtn, inputMode === 'QUANTITY' && styles.segmentBtnActive]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setInputMode('QUANTITY'); setPrimaryInput(''); }}><Text style={[styles.segmentText, inputMode === 'QUANTITY' && styles.segmentTextActive]}>{t('modeQuantity')}</Text></TouchableOpacity>
                </View>

                <View style={styles.smartInputContainer}>
                  {inputMode === 'AMOUNT' && <Text style={styles.smartInputCurrency}>{getCurrencySymbol(assetType)}</Text>}
                  <TextInput style={styles.smartInput} placeholder="0" placeholderTextColor={COLORS.border} value={primaryInput} onChangeText={setPrimaryInput} keyboardType="numeric" autoFocus={true} />
                  {inputMode === 'QUANTITY' && <Text style={styles.smartInputCurrency}>{selectedSearchAsset.symbol}</Text>}
                </View>

                <View style={styles.smartFeedbackBox}>
                  <MaterialIcons name="auto-awesome" size={16} color={COLORS.primary} style={{marginRight: 6}} />
                  <Text style={styles.smartFeedbackText}>
                    {inputMode === 'AMOUNT' ? `${t('approx')} ${calculatedQty > 0 ? calculatedQty.toFixed(decimals) : '0'} ${selectedSearchAsset.symbol} ${t('calcQty')}` : `${t('calcTotal')}: ${getCurrencySymbol(assetType)}${calculatedTotalAmount > 0 ? calculatedTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}`}
                  </Text>
                </View>
                <View style={{marginTop: 10}}><Text style={styles.inputLabel}>{t('buyPrice')} ({getCurrencySymbol(assetType)})</Text><TextInput style={styles.modernInput} placeholder="0.00" placeholderTextColor={COLORS.textSub} value={buyPrice} onChangeText={setBuyPrice} keyboardType="numeric" /></View>
                <Text style={[styles.inputLabel, {marginTop: 25}]}>{t('note')}</Text>
                <TextInput style={[styles.modernInput, {height: 80, textAlignVertical: 'top'}]} placeholder="..." placeholderTextColor={COLORS.textSub} value={note} onChangeText={setNote} multiline={true} />
                <TouchableOpacity style={styles.megaSaveBtn} onPress={addAsset}><Text style={styles.megaSaveBtnText}>{t('save')}</Text></TouchableOpacity>
              </>
            )}
          </ScrollView>
        )}
      </SwipeableModal>

      <SwipeableModal visible={detailModalVisible} onClose={() => setDetailModalVisible(false)} boxStyle={styles.detailPageBox} styles={styles}>
        {currentDetailAsset && (
          <View>
            <View style={styles.detailHeader}>
                <View style={styles.detailIconBox}><MaterialIcons name={getAssetIcon(currentDetailAsset.type)} size={32} color={COLORS.primary} /></View>
                <View style={{flex: 1, marginLeft: 15}}><Text style={styles.detailName}>{currentDetailAsset.name}</Text><Text style={styles.detailType}>{t(currentDetailAsset.type)}</Text></View>
            </View>
            
            <View style={[styles.detailChartBox, {padding: 0, justifyContent: 'flex-start'}]}>
              {/* BÜYÜK FİYAT BAŞLIĞI DİNAMİKLEŞTİ */}
              <Text style={[styles.detailCurrentPrice, {padding: 20, paddingBottom: 0}]}>
                {activeTab === 'PORTFOLIO' ? currency : getCurrencySymbol(currentDetailAsset.type)}
                {activeTab === 'PORTFOLIO' 
                  ? getConvertedValue(currentDetailAsset.currentPrice || currentDetailAsset.price, currentDetailAsset.type).toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : (currentDetailAsset.currentPrice || currentDetailAsset.price).toLocaleString('en-US', { minimumFractionDigits: 2 })
                }
              </Text>
              <View style={{flex: 1, justifyContent: 'flex-end', overflow: 'hidden'}}>
                 {/* ... (Dalga SVG kısmı aynı kalacak) ... */}
                 <Svg width="100%" height="80" viewBox="0 0 100 80" preserveAspectRatio="none">
                    <Path d="M 0,80 Q 25,20 50,50 T 100,10 L 100,100 L 0,100 Z" fill={COLORS.primarySoft} />
                    <Path d="M 0,80 Q 25,20 50,50 T 100,10" stroke={COLORS.primary} strokeWidth="3" fill="none" />
                 </Svg>
              </View>
            </View>

            {activeTab === 'PORTFOLIO' && (
              <>
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}><Text style={styles.statBoxLabel}>{t('quantity')}</Text><Text style={styles.statBoxValue}>{currentDetailAsset.quantity ? currentDetailAsset.quantity.toFixed(decimals) : '-'}</Text></View>
                    <View style={styles.statBox}><Text style={styles.statBoxLabel}>{t('avgCost')}</Text>
                      {/* ORTALAMA MALİYET DİNAMİKLEŞTİ */}
                      <Text style={styles.statBoxValue}>{currency}{getConvertedValue(currentDetailAsset.price, currentDetailAsset.type).toFixed(2)}</Text>
                    </View>
                    {(() => {
                      const nativeCost = currentDetailAsset.price * currentDetailAsset.quantity; 
                      const nativeVal = currentDetailAsset.currentPrice * currentDetailAsset.quantity;
                      const gross = nativeVal - nativeCost; 
                      const tax = (currentDetailAsset.type === 'TEFAS' && gross > 0) ? gross * 0.175 : 0; 
                      const net = gross - tax;
                      
                      // Gösterim için çeviriler
                      const displayVal = getConvertedValue(nativeVal, currentDetailAsset.type);
                      const displayNet = getConvertedValue(net, currentDetailAsset.type);
                      const displayTax = getConvertedValue(tax, currentDetailAsset.type);

                      return (
                        <>
                          <View style={styles.statBox}><Text style={styles.statBoxLabel}>{t('totalValue')}</Text><Text style={styles.statBoxValue}>{currency}{displayVal.toFixed(2)}</Text></View>
                          <View style={styles.statBox}><Text style={styles.statBoxLabel}>{t('netProfit')}</Text><Text style={[styles.statBoxValue, {color: displayNet >= 0 ? COLORS.primary : COLORS.error}]}>{displayNet >= 0 ? '+' : ''}{currency}{displayNet.toFixed(2)}</Text></View>
                          {tax > 0 && (<View style={[styles.statBox, {width: '100%'}]}><Text style={styles.statBoxLabel}>{t('tax')}</Text><Text style={[styles.statBoxValue, {color: COLORS.error}]}>-{currency}{displayTax.toFixed(2)}</Text></View>)}
                        </>
                      );
                    })()}
                </View>
                {/* ... Modalın geri kalanı aynı ... */}
                {currentDetailAsset.note && ( <View style={styles.detailNoteArea}><MaterialIcons name="sticky-note-2" size={18} color={COLORS.primary} style={{marginRight: 8}} /><Text style={styles.detailNoteText}>{currentDetailAsset.note}</Text></View> )}
                
                <View style={styles.detailActionRow}>
                    <TouchableOpacity style={styles.detailBtnSecondary} onPress={() => {
                        setDetailModalVisible(false); setIsAddMoreMode(true); setAssetType(currentDetailAsset.type);
                        handleAssetSelect({ symbol: currentDetailAsset.name, name: currentDetailAsset.name, price: currentDetailAsset.currentPrice !== undefined ? currentDetailAsset.currentPrice : currentDetailAsset.price });
                        setModalVisible(true);
                    }}>
                      <MaterialIcons name="add-circle-outline" size={18} color={COLORS.textMain} style={{marginRight: 5}} />
                      <Text style={styles.detailBtnSecondaryText}>{t('addMore')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.detailBtnPrimary} onPress={() => setSellModalVisible(true)}>
                      <MaterialIcons name="sell" size={18} color={theme === 'dark' ? '#131313' : '#FFFFFF'} style={{marginRight: 5}} />
                      <Text style={styles.detailBtnPrimaryText}>{t('executeTrade')}</Text>
                    </TouchableOpacity> 
                </View>
                <TouchableOpacity style={{marginTop: 15, alignSelf: 'center'}} onPress={() => deleteAsset(currentDetailAsset.id)}><Text style={{color: COLORS.error, fontSize: 14, fontWeight: 'bold'}}>{t('delete')}</Text></TouchableOpacity>
              </>
            )}
          </View>
        )}
      </SwipeableModal>

      <SwipeableModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} boxStyle={styles.modalBox} styles={styles}>
        <Text style={styles.modalTitle}>{t('settings')}</Text>
        <Text style={{color: COLORS.textSub, marginBottom: 10, textAlign: 'center', fontWeight: 'bold'}}>{t('theme')}</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity style={[styles.segmentBtn, theme === 'light' && styles.segmentBtnActive]} onPress={() => changeTheme('light')}><Text style={[styles.segmentText, theme === 'light' && styles.segmentTextActive]}>☀️ Light</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, theme === 'dark' && styles.segmentBtnActive]} onPress={() => changeTheme('dark')}><Text style={[styles.segmentText, theme === 'dark' && styles.segmentTextActive]}>🌙 Dark</Text></TouchableOpacity>
        </View>
        <Text style={{color: COLORS.textSub, marginBottom: 10, textAlign: 'center', fontWeight: 'bold', marginTop: 10}}>{t('language')}</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity style={[styles.segmentBtn, lang === 'tr' && styles.segmentBtnActive]} onPress={() => changeLanguage('tr')}><Text style={[styles.segmentText, lang === 'tr' && styles.segmentTextActive]}>🇹🇷 TR</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, lang === 'en' && styles.segmentBtnActive]} onPress={() => changeLanguage('en')}><Text style={[styles.segmentText, lang === 'en' && styles.segmentTextActive]}>🇬🇧 EN</Text></TouchableOpacity>
        </View>
        <Text style={{color: COLORS.textSub, marginBottom: 10, textAlign: 'center', fontWeight: 'bold', marginTop: 10}}>{t('currency')}</Text>
        <View style={styles.segmentedControl}>
          {['₺', '$', '€'].map(cur => ( <TouchableOpacity key={cur} style={[styles.segmentBtn, currency === cur && styles.segmentBtnActive]} onPress={() => changeCurrency(cur)}><Text style={[styles.segmentText, currency === cur && styles.segmentTextActive]}>{cur}</Text></TouchableOpacity> ))}
        </View>

        {/* --- YENİ EKLENEN SIFIRLAMA BUTONU --- */}
        <TouchableOpacity 
          style={{ marginTop: 30, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: COLORS.border }}
          onPress={handleResetAllData}
        >
          <Text style={{ color: COLORS.error, fontSize: 13, fontWeight: 'bold' }}>Tüm Verileri Sıfırla</Text>
        </TouchableOpacity>
        {/* ------------------------------------- */}

      </SwipeableModal>

      <SwipeableModal visible={priceModalVisible} onClose={() => setPriceModalVisible(false)} boxStyle={styles.modalBox} styles={styles}>
        <Text style={styles.modalTitle}>{t('updatePrice')}</Text>
        <TextInput style={styles.input} placeholder={`${t('currentPrice')} (${currentDetailAsset ? getCurrencySymbol(currentDetailAsset.type) : '$'})`} placeholderTextColor={COLORS.textSub} value={currentPriceInput} onChangeText={setCurrentPriceInput} keyboardType="numeric" />
        <TouchableOpacity style={styles.megaSaveBtn} onPress={updateCurrentPrice}><Text style={styles.megaSaveBtnText}>{t('update')}</Text></TouchableOpacity>
      </SwipeableModal>

      <SwipeableModal visible={sellModalVisible} onClose={() => setSellModalVisible(false)} boxStyle={styles.modalBox} styles={styles}>
        <Text style={styles.modalTitle}>{t('sellTitle')}</Text>
        <TextInput style={styles.input} placeholder={t('sellQty')} placeholderTextColor={COLORS.textSub} value={sellQuantityInput} onChangeText={setSellQuantityInput} keyboardType="numeric" />
        <TouchableOpacity style={[styles.megaSaveBtn, {backgroundColor: COLORS.error}]} onPress={sellAsset}><Text style={styles.megaSaveBtnText}>{t('confirm')}</Text></TouchableOpacity>
      </SwipeableModal>
      {/* YENİ: NAKİT EKLE / ÇEK MODALI */}
      <SwipeableModal visible={cashModalVisible} onClose={() => setCashModalVisible(false)} boxStyle={styles.modalBox} styles={styles}>
        <Text style={styles.modalTitle}>{lang === 'tr' ? 'Nakit İşlemi (Sermaye)' : 'Manage Cash'}</Text>
        
        <TextInput
          style={[styles.input, { fontSize: 24, textAlign: 'center', fontWeight: 'bold' }]}
          keyboardType="numeric"
          placeholder={lang === 'tr' ? "Tutar Girin" : "Enter Amount"}
          placeholderTextColor={COLORS.textSub}
          value={cashInput}
          onChangeText={setCashInput}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
          <TouchableOpacity 
            style={[styles.megaSaveBtn, { flex: 1, backgroundColor: COLORS.errorSoft, marginTop: 0 }]}
            onPress={() => {
              const amount = parseFloat(cashInput.replace(',', '.'));
              if (!isNaN(amount) && amount > 0) {
                setCashBalance(prev => Math.max(0, prev - amount));
                setCashInput('');
                setCashModalVisible(false);
              }
            }}
          >
            <Text style={[styles.megaSaveBtnText, { color: COLORS.error }]}>{lang === 'tr' ? 'Para Çek' : 'Withdraw'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.megaSaveBtn, { flex: 1, marginTop: 0 }]}
            onPress={() => {
              const amount = parseFloat(cashInput.replace(',', '.'));
              if (!isNaN(amount) && amount > 0) {
                setCashBalance(prev => prev + amount);
                setCashInput('');
                setCashModalVisible(false);
              }
            }}
          >
            <Text style={styles.megaSaveBtnText}>{lang === 'tr' ? 'Sermaye Ekle' : 'Deposit'}</Text>
          </TouchableOpacity>
        </View>
      </SwipeableModal>

    </SafeAreaContext>
    </GestureHandlerRootView>
  );
}

const getStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 8, paddingBottom: 8 },
  headerProfile: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  brandText: { color: COLORS.textMain, fontSize: 18, fontWeight: '800', letterSpacing: 1.5 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  pageTitle: { color: COLORS.textMain, fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  
  headerTabSwitcher: { flexDirection: 'row', backgroundColor: COLORS.surfaceHigh, borderRadius: 12, padding: 4, flex: 1, marginRight: 20 },
  headerTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  headerTabActive: { backgroundColor: COLORS.primary },
  headerTabText: { color: COLORS.textSub, fontWeight: 'bold', fontSize: 13 },
  headerTabTextActive: { color: COLORS.bg, fontWeight: '900' },
  
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
  categoryTitle: { color: COLORS.primary, fontSize: 12, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginHorizontal: 20, marginTop: 15, marginBottom: 10 },
  compactCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 15, marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  compactLeft: { flexDirection: 'row', alignItems: 'center' },
  compactIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.surfaceHigh, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  compactName: { color: COLORS.textMain, fontSize: 16, fontWeight: 'bold' },
  compactSub: { color: COLORS.textSub, fontSize: 11, marginTop: 2 },
  compactRight: { alignItems: 'flex-end' },
  compactPrice: { color: COLORS.textMain, fontSize: 15, fontWeight: '800' },
  compactPct: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },

  dragHandleContainer: { width: '100%', alignItems: 'center', paddingBottom: 15, paddingTop: 10 },
  dragHandle: { width: 45, height: 5, backgroundColor: COLORS.textSub, borderRadius: 3, opacity: 0.5 },
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


  detailPageBox: { backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingTop: 5, paddingBottom: 50, minHeight: '65%', zIndex: 2 },
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
  
  bottomNavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bottomNavBg, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 25, paddingTop: 10 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40 },
  navItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
  navText: { fontSize: 10, color: COLORS.textSub, fontWeight: '800', marginTop: 5, textTransform: 'uppercase' },
  navItemCenter: { marginTop: -30, alignItems: 'center', justifyContent: 'center' },
  navItemCenterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  
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

  gridCard: { width: (SCREEN_WIDTH - 50 - 30) / 3, aspectRatio: 1, backgroundColor: COLORS.surfaceHigh, borderRadius: 16, padding: 12, marginHorizontal: 5, marginBottom: 10, justifyContent: 'space-between', position: 'relative' },
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