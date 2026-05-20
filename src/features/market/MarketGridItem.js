import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AssetIcon from '../../components/AssetIcon';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const MarketGridItem = ({ 
  item, 
  marketTabMode, 
  isMarketEditMode, 
  wiggleStyle, 
  COLORS, 
  styles, 
  t, 
  removeWatchlistAsset, 
  removeCustomListAsset, 
  setSelectedAssetInfo, 
  setSelectedAssetId, 
  setDetailModalVisible, 
  setIsMarketEditMode,
  MOCK_ASSETS
}) => {
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

  const hasExtended = item.extendedPrice && (item.session === 'PRE' || item.session === 'POST');

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
      
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
        <Text style={[styles.gridPrice, { marginBottom: 0 }]}>
          {isIndex ? '' : (isUsdBased ? '$' : '₺')}
          {cPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        {hasExtended && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 8, color: '#8A8A9A', fontWeight: '800', letterSpacing: 0.5, marginBottom: -1, textTransform: 'uppercase' }}>
              {item.session}
            </Text>
            <Text style={{ fontSize: 13.5, color: '#8A8A9A', fontWeight: '700' }}>
              ${item.extendedPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name={arrowIcon} size={12} color={changeColor} style={{ marginRight: 2 }} />
          <Text style={[styles.gridChange, { color: changeColor }]}>
            {Math.abs(pct).toFixed(2)}%
          </Text>
        </View>
        {hasExtended && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons 
              name={item.extendedChangePct >= 0 ? 'arrow-upward' : 'arrow-downward'} 
              size={9} 
              color={item.extendedChangePct >= 0 ? '#00E87A' : '#FF4757'} 
              style={{ marginRight: 1 }} 
            />
            <Text style={{ 
              fontSize: 9.6, 
              color: item.extendedChangePct >= 0 ? 'rgba(0, 232, 122, 0.7)' : 'rgba(255, 71, 87, 0.7)', 
              fontWeight: '700' 
            }}>
              {Math.abs(item.extendedChangePct).toFixed(2)}%
            </Text>
          </View>
        )}
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
};
