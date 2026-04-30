import React, { useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, RefreshControl, ScrollView, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PerformanceChartSection from '../../../PerformanceChartSection';

export const PortfolioScreen = ({
  styles, COLORS, portfolio, getGroupedData, renderCompactItem, t,
  isRefreshingPortfolio, onRefreshPortfolio, chartViewMode, setChartViewMode,
  lang, stableChartData, totalNetCurrentValue, usdToTryRate, timeframePerformance,
  timeFilter, setTimeFilter, currency, handleNetWorthPressIn, handleNetWorthPressOut,
  setDistributionModalVisible, netWorthScale, unrealizedIcon, unrealizedColor,
  unrealizedPrefix, totalUnrealizedPnL, unrealizedPnLPct, handleProfitPressIn,
  handleProfitPressOut, setProfitModalVisible, profitScale, setCashModalVisible,
  cashBalance, setSettingsVisible, setSelectedPieSlice, AnimatedTouchableOpacity
}) => {
  const insets = useSafeAreaInsets();
  const [isChartVisible, setIsChartVisible] = useState(true);

  return (
    <View key="0" collapsable={false} style={{ flex: 1 }}>
      <SectionList
        sections={getGroupedData(portfolio)}
        keyExtractor={item => item.id}
        renderItem={renderCompactItem}
        renderSectionHeader={({ section: { title } }) => ( <Text style={styles.categoryTitle}>{t(title)}</Text> )}
        refreshControl={<RefreshControl refreshing={isRefreshingPortfolio} onRefresh={onRefreshPortfolio} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListHeaderComponent={(
          <View style={{ paddingBottom: 10 }}>
            {/* HERO SECTION */}
            <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 20, marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={{ color: COLORS.textSub, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {lang === 'tr' ? 'NET VARLIK' : 'NET WORTH'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => { setSelectedPieSlice(null); setDistributionModalVisible(true); }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 42, fontWeight: '800', color: COLORS.textMain, marginTop: 4 }}>
                      {currency}{(currency === '$' ? totalNetCurrentValue / usdToTryRate : totalNetCurrentValue).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setSettingsVisible(true)} style={{ marginTop: 5 }}>
                  <MaterialIcons name="settings" size={24} color={COLORS.textSub} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <TouchableOpacity 
                  onPress={() => setProfitModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: timeframePerformance.amount >= 0 ? 'rgba(0, 232, 122, 0.15)' : 'rgba(255, 71, 87, 0.15)',
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 100,
                    alignSelf: 'flex-start'
                  }}>
                    <MaterialIcons 
                      name={timeframePerformance.amount >= 0 ? 'trending-up' : 'trending-down'} 
                      size={14} 
                      color={timeframePerformance.amount >= 0 ? COLORS.primary : COLORS.error} 
                      style={{ marginRight: 4 }} 
                    />
                    <Text style={{ color: timeframePerformance.amount >= 0 ? COLORS.primary : COLORS.error, fontSize: 14, fontWeight: '700' }}>
                      {timeframePerformance.amount >= 0 ? '+' : ''}{currency}{Math.abs(currency === '$' ? timeframePerformance.amount / usdToTryRate : timeframePerformance.amount).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({timeframePerformance.pct.toFixed(2)}%)
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsChartVisible(!isChartVisible)} style={{ padding: 8 }}>
                  <MaterialIcons name="insert-chart-outlined" size={20} color={isChartVisible ? COLORS.primary : COLORS.textSub} />
                </TouchableOpacity>
              </View>

              {/* PERMANENT TIMEFRAME FILTERS */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                {['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'].map(range => (
                  <TouchableOpacity 
                    key={range} 
                    style={{ 
                      paddingVertical: 6, 
                      paddingHorizontal: 10, 
                      borderRadius: 12, 
                      backgroundColor: timeFilter === range ? '#FFFFFF' : 'transparent' 
                    }}
                    onPress={() => setTimeFilter(range)}
                  >
                    <Text style={{ 
                      color: timeFilter === range ? '#000000' : '#8A919E', 
                      fontSize: 12, 
                      fontWeight: timeFilter === range ? '900' : '700' 
                    }}>
                      {range}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* REFINED DIVIDER */}
              <View style={{ height: 1, backgroundColor: '#3A3A45', marginHorizontal: 30, marginTop: 25 }} />
            </View>

            {isChartVisible && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 20, marginTop: 10, marginBottom: 15, gap: 16 }}>
                  <TouchableOpacity onPress={() => setChartViewMode('PERFORMANCE')}>
                    <Text style={{ 
                      color: chartViewMode === 'PERFORMANCE' ? '#FFFFFF' : '#8A8A9A', 
                      fontWeight: chartViewMode === 'PERFORMANCE' ? '600' : '400', 
                      fontSize: 14 
                    }}>
                      {lang === 'tr' ? 'Performans' : 'Performance'}
                    </Text>
                    {chartViewMode === 'PERFORMANCE' && <View style={{ height: 2, backgroundColor: '#FFFFFF', marginTop: 4, width: '100%' }} />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setChartViewMode('ASSET_FLOW')}>
                    <Text style={{ 
                      color: chartViewMode === 'ASSET_FLOW' ? '#FFFFFF' : '#8A8A9A', 
                      fontWeight: chartViewMode === 'ASSET_FLOW' ? '600' : '400', 
                      fontSize: 14 
                    }}>
                      {lang === 'tr' ? 'Varlık Akışı' : 'Asset Flow'}
                    </Text>
                    {chartViewMode === 'ASSET_FLOW' && <View style={{ height: 2, backgroundColor: '#FFFFFF', marginTop: 4, width: '100%' }} />}
                  </TouchableOpacity>
                </View>

                 <PerformanceChartSection
                  data={stableChartData}
                  liveValue={currency === '$' ? totalNetCurrentValue / usdToTryRate : totalNetCurrentValue}
                  liveChange={timeframePerformance.pct}
                  liveChangeAmount={timeframePerformance.amount}
                  language={lang}
                  currency={currency}
                  locale={lang === 'tr' ? 'tr-TR' : 'en-US'} 
                />
              </>
            )}



          </View>
        )}
        ListFooterComponent={(
          <TouchableOpacity 
            style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingVertical: 16, 
              paddingHorizontal: 20, 
              borderTopWidth: 1, 
              borderTopColor: COLORS.border,
              marginTop: 20,
              marginBottom: 100
            }}
            onPress={() => setCashModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="account-balance-wallet" size={20} color={COLORS.textSub} style={{ marginRight: 12 }} />
              <Text style={{ color: COLORS.textSub, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {lang === 'tr' ? 'NAKİT VARLIK' : 'CASH BALANCE'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: COLORS.textMain, fontSize: 16, fontWeight: '700' }}>
                {currency === '$' ? (cashBalance / usdToTryRate).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : `₺${cashBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </Text>
              <Text style={{ color: COLORS.textSub, fontSize: 12, marginTop: 2 }}>
                {currency === '$' ? `₺${cashBalance.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : `$${(cashBalance / usdToTryRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('emptyList')}</Text>}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
};
