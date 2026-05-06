import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { PortfolioScreen } from './PortfolioScreen';
import { RootState } from '../../app/store';
import { calculateTotalPortfolio } from '../../../portfolioEngine';
import { createTranslationFunction } from '../../uiUtils';
import { TRANSLATIONS } from '../../shared/constants/translations';
import { DARK_THEME, LIGHT_THEME } from '../../shared/constants/themes';
import { CATEGORY_ORDER } from '../../shared/constants/mockData';

const PortfolioDashboard = ({ composerSignal }: { composerSignal: number }) => {
  const portfolio = useSelector((state: RootState) => state.portfolio.assets);
  const cashBalance = useSelector((state: RootState) => state.portfolio.cashBalance);
  const priceHistory = useSelector((state: RootState) => state.portfolio.priceHistory);
  const usdToTryRate = useSelector((state: RootState) => state.portfolio.usdToTryRate);
  const settings = useSelector((state: RootState) => state.settings);
  
  const isDark = settings.theme === 'dark';
  const COLORS = isDark ? DARK_THEME : LIGHT_THEME;
  const t = createTranslationFunction(TRANSLATIONS, settings.language);
  
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [chartViewMode, setChartViewMode] = useState<'PERFORMANCE' | 'ASSET_FLOW'>('PERFORMANCE');

  const { totalNetCurrentValue, totalUnrealizedPnL, unrealizedPnLPct } = calculateTotalPortfolio(portfolio, usdToTryRate, cashBalance);
  
  const getGroupedData = (sourceData: any[]) => {
    const grouped: any[] = []; 
    CATEGORY_ORDER.forEach(type => { 
      const items = sourceData.filter(a => (a.type || 'BIST') === type); 
      if (items.length > 0) { grouped.push({ title: type, data: items }); } 
    }); 
    return grouped;
  };

  const dummyScale = { transform: [{ scale: 1 }] };
  
  return (
    <PortfolioScreen 
      portfolio={portfolio}
      cashBalance={cashBalance}
      usdToTryRate={usdToTryRate}
      COLORS={COLORS}
      t={t}
      lang={settings.language}
      currency={settings.currency}
      timeFilter={timeFilter}
      setTimeFilter={setTimeFilter}
      chartViewMode={chartViewMode}
      setChartViewMode={setChartViewMode}
      totalNetCurrentValue={totalNetCurrentValue}
      totalUnrealizedPnL={totalUnrealizedPnL}
      unrealizedPnLPct={unrealizedPnLPct}
      timeframePerformance={{ amount: totalUnrealizedPnL, pct: unrealizedPnLPct }}
      stableChartData={[]} 
      getGroupedData={getGroupedData}
      priceHistory={priceHistory}
      setSelectedAssetInfo={() => {}}
      setSelectedAssetId={() => {}}
      setDetailModalVisible={() => {}}
      isRefreshingPortfolio={false}
      onRefreshPortfolio={() => {}}
      handleNetWorthPressIn={() => {}}
      handleNetWorthPressOut={() => {}}
      setDistributionModalVisible={() => {}}
      netWorthScale={dummyScale}
      unrealizedIcon="trending-up"
      unrealizedColor={COLORS.primary}
      unrealizedPrefix="+"
      handleProfitPressIn={() => {}}
      handleProfitPressOut={() => {}}
      setProfitModalVisible={() => {}}
      profitScale={dummyScale}
      setCashModalVisible={() => {}}
      setSettingsVisible={() => {}}
      setSelectedPieSlice={() => {}}
      AnimatedTouchableOpacity={null} 
      styles={{}} 
    />
  );
};

export default PortfolioDashboard;
