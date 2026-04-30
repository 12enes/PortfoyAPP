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
          <View style={{ paddingBottom: 20 }}>
            {/* HERO SECTION */}
            <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 20, marginBottom: 25 }}>
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

              <TouchableOpacity 
                onPress={() => setProfitModalVisible(true)}
                activeOpacity={0.7}
                style={{ marginTop: 12 }}
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
            </View>

            {/* CHART DIVIDER & TRIGGER */}
            <View style={{ 
              borderBottomWidth: 1, 
              borderBottomColor: COLORS.border, 
              marginHorizontal: 20, 
              flexDirection: 'row', 
              justifyContent: 'flex-end', 
              alignItems: 'center',
              paddingBottom: 8,
              marginBottom: 10
            }}>
              <TouchableOpacity onPress={() => setIsChartVisible(!isChartVisible)}>
                <MaterialIcons name="insert-chart-outlined" size={20} color={isChartVisible ? COLORS.primary : COLORS.textSub} />
              </TouchableOpacity>
            </View>

            {isChartVisible && (
              <>
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.surfaceHigh, borderRadius: 12, padding: 4, marginHorizontal: 20, marginTop: 10, marginBottom: 15 }}>
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
              </>
            )}



            {/* CASH MODULE */}
            <TouchableOpacity 
              style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                paddingVertical: 16, 
                paddingHorizontal: 20, 
                borderBottomWidth: 1, 
                borderBottomColor: COLORS.border,
                marginTop: 10
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
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('emptyList')}</Text>}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
};
