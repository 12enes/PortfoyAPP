import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import ChartCanvas from './ChartCanvas';
import GestureOverlay from './GestureOverlay';
import HeaderSection from './HeaderSection';
import CrosshairLayer from './CrosshairLayer';
import { formatDate } from './utils/formatter';

export default function PerformanceChartSection({
  data, liveValue, liveChange, liveChangeAmount, language, currency, locale, viewMode, valueScale = 1,
  isBalanceVisible = true
}) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 220 });
  
  const [activePoint, setActivePoint] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  // Mod veya veri değiştiğinde seçili noktayı sıfırla veya güncelle
  useEffect(() => {
    if (activeIndex >= 0 && data && data[activeIndex]) {
      // Eğer kullanıcı hala dokunuyorsa, veriyi güncel data dizisinden tazele
      setActivePoint(data[activeIndex]);
    } else if (activeIndex === -1) {
      setActivePoint(null);
    }
  }, [viewMode, data, activeIndex]);

  // 1. ADIM: MATEMATİK VE KOORDİNAT HARİTASI
  const chartCoordinates = useMemo(() => {
    if (!data || data.length < 2 || dimensions.width === 0 || dimensions.height === 0) {
      return { xPositions: [], yPositions: [] };
    }

    const maxVal = Math.max(...data.map(d => d.value));
    const minVal = Math.min(...data.map(d => d.value));
    const range = maxVal - minVal || 1;

    const padding = range * 0.20; 
    const paddedMax = maxVal + padding;
    const paddedMin = minVal - (padding / 2);
    const paddedRange = paddedMax - paddedMin || 1;

    const xPositions = [];
    const yPositions = [];

    data.forEach((d, i) => {
      const x = (i / (data.length - 1)) * dimensions.width;
      const y = dimensions.height - ((d.value - paddedMin) / paddedRange) * dimensions.height;
      
      xPositions.push(x);
      yPositions.push(y);
    });

    return { xPositions, yPositions };
  }, [data, dimensions]);

  const crosshairX = useRef(new Animated.Value(0)).current;
  const crosshairY = useRef(new Animated.Value(0)).current;
  const crosshairOpacity = useRef(new Animated.Value(0)).current;

  const handlePointSelect = useCallback((point, index, fingerX) => {
    setActiveIndex(index);
    setActivePoint(point);
    
    if (index >= 0 && chartCoordinates.xPositions.length > 0) {
      const minX = chartCoordinates.xPositions[0];
      const maxX = chartCoordinates.xPositions[chartCoordinates.xPositions.length - 1];
      const safeFingerX = Math.max(minX, Math.min(fingerX, maxX)); 
      
      crosshairX.setValue(safeFingerX);

      let interpolatedY = chartCoordinates.yPositions[index];

      if (chartCoordinates.xPositions.length > 1) {
        const step = dimensions.width / (data.length - 1);
        let leftIdx = Math.floor(safeFingerX / step);
        let rightIdx = leftIdx + 1;

        leftIdx = Math.max(0, Math.min(leftIdx, data.length - 1));
        rightIdx = Math.max(0, Math.min(rightIdx, data.length - 1));

        if (leftIdx !== rightIdx) {
          const x0 = chartCoordinates.xPositions[leftIdx];
          const x1 = chartCoordinates.xPositions[rightIdx];
          const y0 = chartCoordinates.yPositions[leftIdx];
          const y1 = chartCoordinates.yPositions[rightIdx];

          interpolatedY = y0 + ((safeFingerX - x0) * (y1 - y0)) / (x1 - x0);
        }
      }

      crosshairY.setValue(interpolatedY);
      Animated.timing(crosshairOpacity, { toValue: 1, duration: 50, useNativeDriver: true }).start();
    } else {
      Animated.timing(crosshairOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [chartCoordinates, dimensions.width, data, crosshairX, crosshairY, crosshairOpacity]);

  return (
    <View style={styles.container}>
      <HeaderSection 
        activePoint={activePoint} 
        liveValue={liveValue} 
        liveChange={liveChange} 
        liveChangeAmount={liveChangeAmount}
        currency={currency} 
        locale={locale} 
        viewMode={viewMode}
        data={data}
        valueScale={valueScale}
        isBalanceVisible={isBalanceVisible}
      />

      <View 
        style={styles.chartContainer}
        onLayout={(e) => {
          setDimensions({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
        }}
      >
        {dimensions.width > 0 && (
          <>
            <ChartCanvas 
              data={data} 
              width={dimensions.width} 
              height={dimensions.height} 
              lineColor={liveChange >= 0 ? '#00FFA3' : '#FF4D4D'} 
              viewMode={viewMode}
            />
            
            <CrosshairLayer 
              xAnim={crosshairX} 
              yAnim={crosshairY} 
              opacityAnim={crosshairOpacity} 
              height={dimensions.height} 
              color={liveChange >= 0 ? '#00FFA3' : '#FF4D4D'} 
              dateText={activePoint ? formatDate(activePoint.date, locale) : ''}
            />

            <GestureOverlay 
              data={data} 
              width={dimensions.width} 
              onPointSelect={handlePointSelect} 
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', paddingVertical: 10 },
  chartContainer: { width: '100%', height: 220, marginTop: 20 },
  timeFilterContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20 }
});
