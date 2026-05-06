import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { G, Circle } from 'react-native-svg';
import { SwipeableModal } from '../../shared/components/SwipeableModal';

export const DistributionModal = ({
  visible, onClose, styles, COLORS, t, lang,
  pieData, selectedPieSlice, setSelectedPieSlice, totalNetCurrentValue
}) => {
  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={styles.detailPageBox} styles={styles}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 25, position: 'relative' }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textMain, letterSpacing: 1 }}>
          {lang === 'tr' ? 'VARLIK DAĞILIMI' : 'ASSET ALLOCATION'}
        </Text>
        <TouchableOpacity 
          onPress={onClose} 
          style={{ position: 'absolute', right: 0, padding: 5 }}
        >
          <MaterialIcons name="close" size={24} color={COLORS.textSub} />
        </TouchableOpacity>
      </View>
      
      {pieData.length > 0 ? (
        <View style={{ flex: 1 }}>
          <View style={styles.donutContainer}>
            <Svg width="280" height="280" viewBox="0 0 280 280">
              <G rotation="-90" origin="140, 140">
                {(() => {
                  let cumulativePercent = 0; 
                  return pieData.map((slice, i) => {
                    const radius = 110; 
                    const circumference = 2 * Math.PI * radius; 
                    const gap = 2; // Dilimler arası boşluk
                    const strokeDasharray = `${Math.max(0, (slice.percentage / 100) * circumference - gap)} ${circumference}`; 
                    const rotation = (cumulativePercent / 100) * 360; 
                    cumulativePercent += slice.percentage; 
                    const isSelected = selectedPieSlice === i; 
                    const isDimmed = selectedPieSlice !== null && !isSelected; 
                    return (
                      <Circle 
                        key={slice.id || i} 
                        cx="140" 
                        cy="140" 
                        r={radius} 
                        stroke={slice.color} 
                        strokeWidth={isSelected ? 48 : 40} 
                        strokeDasharray={strokeDasharray} 
                        fill="transparent" 
                        origin="140, 140" 
                        rotation={rotation + (gap / circumference) * 180 / Math.PI} 
                        opacity={isDimmed ? 0.3 : 1} 
                        strokeLinecap="round" 
                        onPress={() => setSelectedPieSlice(isSelected ? null : i)} 
                      />
                    );
                  });
                })()}
              </G>
            </Svg>
            <View style={styles.donutCenterTextContainer}>
              <Text style={styles.donutCenterLabel}>{selectedPieSlice !== null ? pieData[selectedPieSlice].name : t('netWorth')}</Text>
              <Text style={styles.donutCenterValue}>{selectedPieSlice !== null ? `₺${pieData[selectedPieSlice].value.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}` : `₺${totalNetCurrentValue.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}</Text>
              {selectedPieSlice !== null && <Text style={[styles.donutCenterPct, {color: pieData[selectedPieSlice].color}]}>{pieData[selectedPieSlice].percentage.toFixed(1)}%</Text>}
            </View>
          </View>

          <View style={{ flex: 1, marginTop: 10 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {pieData.map((slice, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                    opacity: selectedPieSlice !== null && selectedPieSlice !== i ? 0.5 : 1
                  }} 
                  onPress={() => setSelectedPieSlice(selectedPieSlice === i ? null : i)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.legendColorBox, { backgroundColor: slice.color, width: 8, height: 8, borderRadius: 4, marginRight: 12 }]} />
                    <Text style={{ color: COLORS.textMain, fontSize: 14, fontWeight: '500' }}>{slice.name}</Text>
                  </View>
                  <Text style={{ color: COLORS.textMain, fontSize: 15, fontWeight: '700' }}>{slice.percentage.toFixed(1)}%</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : (
        <View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialIcons name="pie-chart-outline" size={48} color={COLORS.border} style={{marginBottom: 15}} />
          <Text style={{color: COLORS.textSub}}>{t('emptyList')}</Text>
        </View>
      )}
    </SwipeableModal>
  );
};
