import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import PagerView from 'react-native-pager-view';
import { MaterialIcons } from '@expo/vector-icons';
import { MarketScreen } from './features/market/MarketScreen';
import { store } from './app/store';
import { hydratePortfolio } from './features/portfolio/portfolioSlice';
import { hydrateSettings } from './features/settings/settingsSlice';
import { readJson } from './shared/utils/storage';
import PortfolioDashboard from './features/portfolio/PortfolioDashboard';

type MarketComposerContext = {
  mode: 'GRID' | 'LISTS';
  selectedListId: string | null;
};

// --- ANA EKRAN VE NAVİGASYON MOTORU ---
function MainScreen() {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  
  // Hata Riskine Karşı: Doğrudan state ağacından güvenli okuma yapıyoruz
  const settings = useSelector((state: any) => state.settings || {});
  const portfolioState = useSelector((state: any) => state.portfolio || {});
  
  const isDark = settings.theme === 'dark';
  const lang = settings.language || 'tr';

  const COLORS = {
    bg: isDark ? '#0A0A0C' : '#F2F4F7',
    bottomNavBg: isDark ? 'rgba(10, 10, 12, 0.98)' : 'rgba(255, 255, 255, 0.98)',
    textSub: isDark ? '#8A8A9A' : '#6B7280',
    primary: '#00E87A',
    border: isDark ? '#1E1E24' : '#E2E8F0'
  };

  const pagerRef = useRef<PagerView>(null);
  const pageScrollPos = useRef(new Animated.Value(0)).current;
  const [currentPage, setCurrentPage] = useState(0);
  const [marketAssetComposerSignal, setMarketAssetComposerSignal] = useState(0);
  const [marketListComposerSignal, setMarketListComposerSignal] = useState(0);
  const [portfolioComposerSignal, setPortfolioComposerSignal] = useState(0);
  const [marketContext, setMarketContext] = useState<MarketComposerContext>({ mode: 'GRID', selectedListId: null });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: insets.top }}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={COLORS.bg} 
      />
      
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => {
          setCurrentPage(e.nativeEvent.position);
        }}
        onPageScroll={(e) => {
          pageScrollPos.setValue(e.nativeEvent.position + e.nativeEvent.offset);
        }}
      >
        {/* SAYFA 0: PORTFÖY (Dashboard) */}
        <View key="0" collapsable={false}>
          <PortfolioDashboard composerSignal={portfolioComposerSignal} />
        </View>

        {/* SAYFA 1: PİYASA / TAKİP LİSTESİ */}
        <View key="1" collapsable={false}>
          <MarketScreen
            assetComposerSignal={marketAssetComposerSignal}
            listComposerSignal={marketListComposerSignal}
            onContextChange={setMarketContext}
          />
        </View>
      </PagerView>

      {/* ALT NAVİGASYON (BOTTOM NAV) - Eski INCIK Tasarımı */}
      <View style={[styles.bottomNavContainer, { backgroundColor: COLORS.bottomNavBg, borderTopColor: COLORS.border, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomNav}>
          
          {/* PORTFÖY BUTONU */}
          <TouchableOpacity style={styles.navItem} onPress={() => pagerRef.current?.setPage(0)}>
            <View>
              <MaterialIcons name="query-stats" size={26} color={COLORS.textSub} />
              <Animated.View style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center', opacity: pageScrollPos.interpolate({inputRange: [0, 1], outputRange: [1, 0]})}]} pointerEvents="none">
                <MaterialIcons name="query-stats" size={26} color={COLORS.primary} />
              </Animated.View>
            </View>
            <Text style={styles.navText}>{lang === 'tr' ? 'PORTFÖY' : 'PORTFOLIO'}</Text>
            <Animated.View style={[styles.activeLabel, {opacity: pageScrollPos.interpolate({inputRange: [0, 1], outputRange: [1, 0]})}]} pointerEvents="none">
              <Text style={[styles.navText, {color: COLORS.primary}]}>{lang === 'tr' ? 'PORTFÖY' : 'PORTFOLIO'}</Text>
            </Animated.View>
          </TouchableOpacity>
          
          {/* ORTA EKLE BUTONU (FAB) */}
          <TouchableOpacity 
            style={styles.navItemCenter} 
            onPress={() => {
              if (currentPage === 0) {
                setPortfolioComposerSignal((value) => value + 1);
                pagerRef.current?.setPage(0);
                return;
              }

              if (marketContext.mode === 'LISTS' && !marketContext.selectedListId) {
                setMarketListComposerSignal((value) => value + 1);
              } else {
                setMarketAssetComposerSignal((value) => value + 1);
              }
              pagerRef.current?.setPage(1);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.navItemCenterInner}>
              <MaterialIcons name="add" size={34} color={isDark ? "#0A0A0C" : "#FFFFFF"} />
            </View>
          </TouchableOpacity>

          {/* PİYASA BUTONU */}
          <TouchableOpacity style={styles.navItem} onPress={() => pagerRef.current?.setPage(1)}>
            <View>
              <MaterialIcons name="trending-up" size={26} color={COLORS.textSub} />
              <Animated.View style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center', opacity: pageScrollPos.interpolate({inputRange: [0, 1], outputRange: [0, 1]})}]} pointerEvents="none">
                <MaterialIcons name="trending-up" size={26} color={COLORS.primary} />
              </Animated.View>
            </View>
            <Text style={styles.navText}>{lang === 'tr' ? 'PİYASA' : 'MARKET'}</Text>
            <Animated.View style={[styles.activeLabel, {opacity: pageScrollPos.interpolate({inputRange: [0, 1], outputRange: [0, 1]})}]} pointerEvents="none">
              <Text style={[styles.navText, {color: COLORS.primary}]}>{lang === 'tr' ? 'PİYASA' : 'MARKET'}</Text>
            </Animated.View>
          </TouchableOpacity>

        </View>
      </View>

    </View>
  );
}

// --- BOOTSTRAP: VERİ YÜKLEME KATMANI ---
function Bootstrap() {
  const dispatch = useDispatch();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [portfolioState, settingsState] = await Promise.all([
          readJson<any>('portfolio-state'),
          readJson<any>('portfolio-settings')
        ]);
        if (!mounted) return;
        if (portfolioState) dispatch(hydratePortfolio(portfolioState));
        if (settingsState) dispatch(hydrateSettings(settingsState));
      } catch (e) {
        console.error("Hydration Error:", e);
      } finally {
        setIsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [dispatch]);

  if (!isReady) return null;

  return <MainScreen />;
}

// --- APP ROOT ---
export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Bootstrap />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bottomNavContainer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    borderTopWidth: 1, paddingBottom: 25, paddingTop: 12,
    elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10
  },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 45 },
  navItem: { alignItems: 'center', justifyContent: 'center', width: 70 },
  navText: { fontSize: 10, color: '#8A919E', fontWeight: '800', marginTop: 6, letterSpacing: 0.5 },
  activeLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  navItemCenter: { marginTop: -35, alignItems: 'center', justifyContent: 'center' },
  navItemCenterInner: { 
    width: 58, height: 58, borderRadius: 29, backgroundColor: '#00E87A', 
    justifyContent: 'center', alignItems: 'center', 
    elevation: 12, shadowColor: '#00E87A', shadowOpacity: 0.6, shadowRadius: 12, 
    shadowOffset: { width: 0, height: 4 } 
  },
});
