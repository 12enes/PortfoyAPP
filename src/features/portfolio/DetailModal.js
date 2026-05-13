import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { SwipeableModal } from '../../shared/components/SwipeableModal';
import AssetIcon from '../../components/AssetIcon';
import { getMarketPerformance, calculateAssetPnLForTimeframe } from '../../../portfolioEngine';

export const DetailModal = ({
  visible, onClose, styles: oldStyles, COLORS, currentDetailAsset, getAssetIcon, t,
  activeTab, currency, getCurrencySymbol, getConvertedValueLocal, decimals,
  setDetailModalVisible, setIsAddMoreMode, setAssetType, handleAssetSelect,
  setModalVisible, setSellModalVisible, theme, deleteAsset, isBalanceVisible,
  totalNetCurrentValue, priceHistory, usdToTryRate
}) => {
  
  const stats = useMemo(() => {
    if (!currentDetailAsset) return null;
    
    const hasPosition = (currentDetailAsset.quantity !== undefined) || (currentDetailAsset.price !== undefined && activeTab === 'PORTFOLIO');
    
    const assetName = (currentDetailAsset?.name || '').toUpperCase();
    const assetSymbol = (currentDetailAsset?.symbol || '').toUpperCase();

    const isUsdBased = 
      currentDetailAsset.type === 'USA' || 
      currentDetailAsset.type === 'CRYPTO' ||
      assetName.includes('USD') ||
      assetName.includes('XAU') ||
      assetName.includes('XAG') ||
      assetName.includes('BRENT') ||
      assetName.includes('PLATINUM') ||
      assetName.includes('PALADIUM') ||
      assetSymbol.includes('USD');

    const nativeTotalVal = (currentDetailAsset.currentPrice || 0) * (currentDetailAsset.quantity || 0);
    const totalValueTL = isUsdBased ? nativeTotalVal * usdToTryRate : nativeTotalVal;
    
    const nativeCost = (currentDetailAsset.price || 0) * (currentDetailAsset.quantity || 0);
    const costTL = isUsdBased ? nativeCost * usdToTryRate : nativeCost;
    
    const grossTL = totalValueTL - costTL;
    const taxTL = (currentDetailAsset.type === 'TEFAS' && grossTL > 0) ? grossTL * 0.175 : 0; 
    const netProfitTL = grossTL - taxTL;
    
    const dailyChange = currentDetailAsset.changePercent || 0;
    const dailyReturnTL = Math.round(totalValueTL * (dailyChange / 100));
    const dailyReturnSign = dailyReturnTL >= 0 ? '+' : '-';

    const profitPct = costTL > 0 ? (netProfitTL / costTL) * 100 : 0;
    const allocation = totalNetCurrentValue > 0 ? (totalValueTL / totalNetCurrentValue) * 100 : 0;

    const assetHistory = priceHistory ? priceHistory[currentDetailAsset.symbol || currentDetailAsset.name] : null;
    
    // Piyasa performansı (fiyat değişimi — tüm varlıklar için)
    const perf1D = getMarketPerformance(currentDetailAsset, '1D', assetHistory);
    const perf1W = getMarketPerformance(currentDetailAsset, '1W', assetHistory);
    const perf1M = getMarketPerformance(currentDetailAsset, '1M', assetHistory);
    const perf1Y = getMarketPerformance(currentDetailAsset, '1Y', assetHistory);

    // Portföy performansı (maliyet bazlı getiri — sadece portföy varlıkları için)
    let portfolioPerf = null;
    if (hasPosition && currentDetailAsset.quantity > 0) {
      const pp1D = calculateAssetPnLForTimeframe(currentDetailAsset, '1D', usdToTryRate, assetHistory);
      const pp1W = calculateAssetPnLForTimeframe(currentDetailAsset, '1W', usdToTryRate, assetHistory);
      const pp1M = calculateAssetPnLForTimeframe(currentDetailAsset, '1M', usdToTryRate, assetHistory);
      const pp1Y = calculateAssetPnLForTimeframe(currentDetailAsset, '1Y', usdToTryRate, assetHistory);
      portfolioPerf = {
        '1D': pp1D.percentage,
        '1W': pp1W.percentage,
        '1M': pp1M.percentage,
        '1Y': pp1Y.percentage
      };
    }

    return {
      hasPosition,
      isUsdBased,
      totalValueTL,
      netProfitTL,
      dailyReturnTL,
      dailyReturnSign,
      profitPct,
      avgCost: currentDetailAsset.price || 0,
      currentPrice: currentDetailAsset.currentPrice || 0,
      quantity: currentDetailAsset.quantity || 0,
      allocation,
      dailyChange,
      history: {
        '1D': perf1D.percentage,
        '1W': perf1W.percentage,
        '1M': perf1M.percentage,
        '1Y': perf1Y.percentage
      },
      portfolioPerf
    };
  }, [currentDetailAsset, totalNetCurrentValue, usdToTryRate, priceHistory]);

  if (!currentDetailAsset || !stats) return null;

  const isProfit = stats.hasPosition ? stats.netProfitTL >= 0 : stats.dailyChange >= 0;
  const pnlColor = isProfit ? '#00E87A' : '#FF4757';
  const curSym = currency; // TL modunda $ görünmemesi için global currency kullanıyoruz

  const getDisplayValue = (val, isNativeUsd) => {
    if (currency === '₺') {
        const tlVal = isNativeUsd ? val * usdToTryRate : val;
        return Math.round(tlVal).toLocaleString('tr-TR');
    } else {
        const usdVal = !isNativeUsd ? val / usdToTryRate : val;
        return usdVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  return (
    <SwipeableModal 
        visible={visible} 
        onClose={onClose} 
        boxStyle={localStyles.modalBox} 
        styles={oldStyles}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 1. HEADER & ASSET INFO */}
        <View style={localStyles.header}>
            <View style={localStyles.assetInfo}>
                <View style={localStyles.iconContainer}>
                    <AssetIcon asset={currentDetailAsset} size={44} />
                </View>
                <View style={localStyles.nameContainer}>
                    <Text style={localStyles.assetName}>{currentDetailAsset.name}</Text>
                    <Text style={localStyles.assetType}>{t(currentDetailAsset.type)} • {currentDetailAsset.symbol}</Text>
                </View>
            </View>
            <View style={localStyles.priceBadge}>
                <Text style={localStyles.priceBadgeLabel}>{t('currentPrice')}</Text>
                <Text style={localStyles.priceBadgeValue}>
                    {currentDetailAsset.type === 'INDEX' ? '' : (stats.isUsdBased ? '$' : '₺')}
                    {stats.currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
            </View>
        </View>

        {/* 2. POSITION SUMMARY (HERO) */}
        {stats.hasPosition ? (
            <View style={localStyles.heroSection}>
                <Text style={localStyles.heroValue}>
                    {isBalanceVisible ? `₺${Math.round(stats.totalValueTL).toLocaleString('tr-TR')}` : '***'}
                </Text>
                
                <View style={localStyles.pnlRow}>
                    <Text style={[localStyles.pnlValue, { color: pnlColor }]}>
                        {isBalanceVisible ? (
                            `${isProfit ? '+' : '-'}₺${Math.round(Math.abs(stats.netProfitTL)).toLocaleString('tr-TR')} (${isProfit ? '+' : ''}${stats.profitPct.toFixed(1)}%)`
                        ) : '***'}
                    </Text>
                    <Text style={localStyles.pnlLabel}>Toplam</Text>
                </View>

                <View style={[localStyles.pnlRow, { marginTop: 6 }]}>
                    <Text style={[localStyles.pnlValue, { color: stats.dailyReturnTL >= 0 ? '#00E87A' : '#FF4757' }]}>
                        {isBalanceVisible ? (
                            `${stats.dailyReturnSign}₺${Math.abs(stats.dailyReturnTL).toLocaleString('tr-TR')} (${stats.dailyChange >= 0 ? '+' : ''}${stats.dailyChange.toFixed(2)}%)`
                        ) : '***'}
                    </Text>
                    <Text style={localStyles.pnlLabel}>Bugün</Text>
                </View>
            </View>
        ) : (
            <View style={localStyles.heroSection}>
                <Text style={localStyles.heroLabel}>{t('marketPerformance') || 'Piyasa Performansı'}</Text>
                <View style={[localStyles.pnlRow, { marginTop: 8 }]}>
                    <MaterialIcons 
                        name={stats.dailyChange >= 0 ? 'trending-up' : 'trending-down'} 
                        size={16} 
                        color={stats.dailyChange >= 0 ? '#00E87A' : '#FF4757'} 
                    />
                    <Text style={[localStyles.pnlValue, { color: stats.dailyChange >= 0 ? '#00E87A' : '#FF4757' }]}>
                        {stats.dailyChange >= 0 ? '+' : ''}{stats.dailyChange.toFixed(2)}%
                    </Text>
                </View>
            </View>
        )}

        {/* 3. DECORATIVE CHART */}
        <View style={localStyles.chartContainer}>
            <Svg width="100%" height="100" viewBox="0 0 100 100" preserveAspectRatio="none">
                <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={pnlColor} stopOpacity="0.2" />
                        <Stop offset="1" stopColor={pnlColor} stopOpacity="0" />
                    </LinearGradient>
                </Defs>
                <Path d="M 0,80 Q 20,20 40,60 T 70,30 T 100,50 L 100,100 L 0,100 Z" fill="url(#grad)" />
                <Path d="M 0,80 Q 20,20 40,60 T 70,30 T 100,50" stroke={pnlColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </Svg>
        </View>

        {/* 4. MARKET PERFORMANCE MATRIX */}
        <Text style={localStyles.sectionTitle}>{t('performanceHistory') || 'Piyasa Performansı'}</Text>
        <View style={localStyles.matrixGrid}>
            <View style={localStyles.matrixRow}>
                <MatrixItem label="1G" value={stats.history['1D']} />
                <MatrixItem label="1H" value={stats.history['1W']} />
                <MatrixItem label="1A" value={stats.history['1M']} />
                <MatrixItem label="1Y" value={stats.history['1Y']} />
            </View>
        </View>

        {/* 4b. PORTFOLIO PERFORMANCE MATRIX (ONLY FOR PORTFOLIO ASSETS) */}
        {stats.portfolioPerf && (
            <>
                <Text style={localStyles.sectionTitle}>{'Portföy Performansı'}</Text>
                <View style={[localStyles.matrixGrid, { borderColor: 'rgba(0,232,122,0.08)' }]}>
                    <View style={localStyles.matrixRow}>
                        <MatrixItem label="1G" value={stats.portfolioPerf['1D']} />
                        <MatrixItem label="1H" value={stats.portfolioPerf['1W']} />
                        <MatrixItem label="1A" value={stats.portfolioPerf['1M']} />
                        <MatrixItem label="1Y" value={stats.portfolioPerf['1Y']} />
                    </View>
                </View>
            </>
        )}

        {/* 5. FINANCIAL STATS GRID (PORTFOLIO ONLY) */}
        {stats.hasPosition && (
            <>
                <Text style={localStyles.sectionTitle}>Pozisyon Detayı</Text>
                <View style={localStyles.statsGrid}>
                    <View style={localStyles.statRow}>
                        <StatItem 
                            label={t('avgCost') || 'Ortalama Maliyet'} 
                            value={`${currentDetailAsset.type === 'INDEX' ? '' : (stats.isUsdBased ? '$' : '₺')}${stats.avgCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                        />
                        <StatItem label={t('quantity') || 'Adet'} value={stats.quantity.toFixed(decimals)} />
                    </View>
                    <View style={localStyles.divider} />
                    <View style={localStyles.statRow}>
                        <StatItem 
                            label="Toplam Değer" 
                            value={isBalanceVisible 
                                ? `₺${Math.round(stats.totalValueTL).toLocaleString('tr-TR')}`
                                : '***'
                            } 
                        />
                        <StatItem label="Portföydeki Oranı" value={`%${stats.allocation.toFixed(1)}`} />
                    </View>
                </View>
            </>
        )}

        {/* 6. PRIMARY ACTIONS (PORTFOLIO ONLY) */}
        {stats.hasPosition && (
            <View style={localStyles.footerActions}>
                <TouchableOpacity 
                    style={localStyles.btnSecondary} 
                    onPress={() => {
                        onClose(); setIsAddMoreMode(true); setAssetType(currentDetailAsset.type);
                        handleAssetSelect({ 
                            symbol: currentDetailAsset.symbol || currentDetailAsset.name, 
                            name: currentDetailAsset.name, 
                            type: currentDetailAsset.type,
                            price: currentDetailAsset.currentPrice !== undefined ? currentDetailAsset.currentPrice : currentDetailAsset.price 
                        });
                        setModalVisible(true);
                    }}
                >
                    <Text style={localStyles.btnSecondaryText}>{t('addMore') || 'Ekle'}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={localStyles.btnPrimary} 
                    onPress={() => setSellModalVisible(true)}
                >
                    <MaterialIcons name="sell" size={20} color="#000000" style={{ marginRight: 8 }} />
                    <Text style={localStyles.btnPrimaryText}>{t('executeTrade') || 'SAT / KÂR AL'}</Text>
                </TouchableOpacity>
            </View>
        )}

        {/* 7. NOTES (IF EXISTS) */}
        {currentDetailAsset.note && (
            <View style={localStyles.noteCard}>
                <View style={localStyles.noteHeader}>
                    <MaterialIcons name="sticky-note-2" size={16} color="rgba(255,255,255,0.4)" />
                    <Text style={localStyles.noteTitle}>{t('notes') || 'Notlar'}</Text>
                </View>
                <Text style={localStyles.noteText}>{currentDetailAsset.note}</Text>
            </View>
        )}

        <TouchableOpacity 
            style={localStyles.deleteBtn} 
            onPress={() => deleteAsset(currentDetailAsset.id)}
        >
            <Text style={localStyles.deleteBtnText}>{t('delete')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SwipeableModal>
  );
};

const MatrixItem = ({ label, value }) => {
    const isPos = value >= 0;
    return (
        <View style={localStyles.matrixItem}>
            <Text style={localStyles.matrixLabel}>{label}</Text>
            <Text style={[localStyles.matrixValue, { color: isPos ? '#00E87A' : '#FF4757' }]}>
                {isPos ? '+' : ''}{value.toFixed(1)}%
            </Text>
        </View>
    );
};

const StatItem = ({ label, value, valueColor = '#FFFFFF' }) => (
    <View style={localStyles.statItem}>
        <Text style={localStyles.statLabel}>{label}</Text>
        <Text style={[localStyles.statValue, { color: valueColor }]}>{value}</Text>
    </View>
);

const ActionButton = ({ icon, label, onPress }) => (
    <TouchableOpacity style={localStyles.actionBtn} onPress={onPress}>
        <View style={localStyles.actionIconBox}>
            <MaterialIcons name={icon} size={22} color="rgba(255,255,255,0.7)" />
        </View>
        <Text style={localStyles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

const localStyles = StyleSheet.create({
  modalBox: {
    backgroundColor: '#0A0A0C',
    paddingTop: 10,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 25,
  },
  footerActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
    zIndex: 10,
  },
  btnSecondary: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#1A1A1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnPrimary: {
    flex: 2,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#00E87A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00E87A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnPrimaryText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  nameContainer: {
    marginLeft: 14,
  },
  assetName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  assetType: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  priceBadge: {
    alignItems: 'flex-end',
  },
  priceBadgeLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceBadgeValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    marginVertical: 4,
    letterSpacing: -1,
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  pnlValue: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  pnlLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  chartContainer: {
    height: 100,
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '800',
    marginHorizontal: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  matrixGrid: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  matrixItem: {
    alignItems: 'center',
    flex: 1,
  },
  matrixLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  matrixValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statsGrid: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 25,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 15,
  },
  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  noteText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  actionBtn: {
    alignItems: 'center',
    width: '22%',
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    marginTop: 30,
    alignSelf: 'center',
    padding: 10,
  },
  deleteBtnText: {
    color: 'rgba(255,71,87,0.4)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
