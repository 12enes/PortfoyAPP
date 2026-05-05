import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { SwipeableModal } from '../../shared/components/SwipeableModal';
import AssetIcon from '../../components/AssetIcon';

export const ProfitModal = ({
  visible, onClose, styles, COLORS, t, getTimeframeLabel,
  topPerformers, getAssetIcon, worstPerformers, lang, filteredHistory
}) => {
  const [activeTab, setActiveTab] = React.useState('GAINERS');

  const renderItem = (item, index, isGainer) => {
    const rank = (index + 1).toString().padStart(2, '0');
    const color = isGainer ? COLORS.primary : COLORS.error;
    
    return (
      <View 
        key={index} 
        style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          paddingVertical: 16, 
          borderBottomWidth: 1, 
          borderBottomColor: COLORS.border 
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={{ color: COLORS.textSub, fontSize: 13, fontWeight: '600', marginRight: 15, width: 22 }}>{rank}</Text>
          <View style={{ marginRight: 12 }}>
            <AssetIcon asset={item} size={32} />
          </View>
          <View>
            <Text style={{ color: COLORS.textMain, fontSize: 16, fontWeight: '700' }}>{item.symbol || item.name}</Text>
            <Text style={{ color: COLORS.textSub, fontSize: 12, marginTop: 2 }}>{item.name || item.symbol}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: color }}>
          {isGainer ? '+' : ''}{item.pct.toFixed(2)}%
        </Text>
      </View>
    );
  };

  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={styles.detailPageBox} styles={styles}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textMain, letterSpacing: 1 }}>
          {lang === 'tr' ? 'SIRALAMA' : 'RANKINGS'}
        </Text>
        <Text style={{ color: COLORS.textSub, fontSize: 12, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{getTimeframeLabel()}</Text>
      </View>

      {/* PILL TOGGLE */}
      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: COLORS.surface, // SURFACE_LOW Pattern
        borderRadius: 100, 
        padding: 4, 
        marginBottom: 20,
        marginHorizontal: 10
      }}>
        <TouchableOpacity 
          style={{ 
            flex: 1, 
            paddingVertical: 10, 
            alignItems: 'center', 
            borderRadius: 100, 
            backgroundColor: activeTab === 'GAINERS' ? COLORS.surfaceHigh : 'transparent' 
          }}
          onPress={() => setActiveTab('GAINERS')}
        >
          <Text style={{ color: activeTab === 'GAINERS' ? COLORS.textMain : COLORS.textSub, fontWeight: '700', fontSize: 13 }}>
            {lang === 'tr' ? 'KAZANDIRANLAR' : 'GAINERS'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ 
            flex: 1, 
            paddingVertical: 10, 
            alignItems: 'center', 
            borderRadius: 100, 
            backgroundColor: activeTab === 'LOSERS' ? COLORS.surfaceHigh : 'transparent' 
          }}
          onPress={() => setActiveTab('LOSERS')}
        >
          <Text style={{ color: activeTab === 'LOSERS' ? COLORS.textMain : COLORS.textSub, fontWeight: '700', fontSize: 13 }}>
            {lang === 'tr' ? 'KAYBETTİRENLER' : 'LOSERS'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
         {activeTab === 'GAINERS' ? (
           <View>
             {topPerformers.length > 0 ? topPerformers.map((item, index) => renderItem(item, index, true)) : (
               <Text style={[styles.emptyText, { marginTop: 40 }]}>{t('emptyList')}</Text>
             )}
           </View>
         ) : (
           <View>
             {worstPerformers.length > 0 ? worstPerformers.map((item, index) => renderItem(item, index, false)) : (
               <Text style={[styles.emptyText, { marginTop: 40 }]}>{t('emptyList')}</Text>
             )}
           </View>
         )}

         {/* REALIZED TRADES - Small Section below */}
         {filteredHistory.length > 0 && (
           <View style={{ marginTop: 30 }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
               <Text style={{ color: COLORS.textSub, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>
                 {lang === 'tr' ? 'GERÇEKLEŞEN İŞLEMLER' : 'REALIZED TRADES'}
               </Text>
             </View>
             {filteredHistory.map((tx, index) => (
                <View 
                  key={index} 
                  style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    paddingVertical: 14, 
                    borderBottomWidth: 1, 
                    borderBottomColor: COLORS.border 
                  }}
                >
                  <View>
                    <Text style={{ color: COLORS.textMain, fontSize: 15, fontWeight: '600' }}>{tx.name}</Text>
                    <Text style={{ color: COLORS.textSub, fontSize: 11, marginTop: 2 }}>{tx.date}</Text>
                  </View>
                  <Text style={{ color: tx.netProfit > 0 ? COLORS.primary : COLORS.error, fontSize: 15, fontWeight: '700' }}>
                    {tx.netProfit > 0 ? '+' : ''}₺{Math.abs(tx.netProfit).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                  </Text>
                </View>
             ))}
           </View>
         )}
      </ScrollView>
    </SwipeableModal>
  );
};
