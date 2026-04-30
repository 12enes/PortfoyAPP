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
      <View style={{ alignItems: 'center', marginBottom: 25 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textMain, letterSpacing: 1 }}>
          {lang === 'tr' ? 'VARLIK DAĞILIMI' : 'ASSET ALLOCATION'}
        </Text>
      </View>
      
      {pieData.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
          <View style={styles.donutContainer}>
            <Svg width="220" height="220" viewBox="0 0 220 220">
              <G rotation="-90" origin="110, 110">
                {(() => {
                  let cumulativePercent = 0; 
                  return pieData.map((slice, i) => {
                    const radius = 80; 
                    const circumference = 2 * Math.PI * radius; 
                    const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`; 
                    const rotation = (cumulativePercent / 100) * 360; 
                    cumulativePercent += slice.percentage; 
                    const isSelected = selectedPieSlice === i; 
                    const isDimmed = selectedPieSlice !== null && !isSelected; 
                    return (
                      <Circle 
                        key={slice.id || i} 
                        cx="110" 
                        cy="110" 
                        r={radius} 
                        stroke={slice.color} 
                        strokeWidth={isSelected ? 38 : 30} 
                        strokeDasharray={strokeDasharray} 
                        fill="transparent" 
                        origin="110, 110" 
                        rotation={rotation} 
                        opacity={isDimmed ? 0.3 : 1} 
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
          <View style={{ marginTop: 10 }}>
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
          </View>
        </ScrollView>
      ) : (
        <View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialIcons name="pie-chart-outline" size={48} color={COLORS.border} style={{marginBottom: 15}} />
          <Text style={{color: COLORS.textSub}}>{t('emptyList')}</Text>
        </View>
      )}
    </SwipeableModal>
  );
};
