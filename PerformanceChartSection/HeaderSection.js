// PerformanceChartSection/HeaderSection.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from './utils/formatter';

export default function HeaderSection({ activePoint, liveValue, liveChange, currency, locale }) {
  // Eğer grafiğe dokunuluyorsa o noktanın değerini, yoksa toplam güncel değeri al
  const valueToDisplay = activePoint ? activePoint.value : liveValue;

  return (
    <View style={styles.container}>
      <Text style={styles.valueText}>
        {/* 'currency' burada App.js'den gelen '₺' veya '$' bilgisidir */}
        {formatCurrency(valueToDisplay || 0, currency, locale)}
      </Text>
      
      {/* Sadece dokunma yokken değişim yüzdesini göster */}
      {!activePoint && (
        <View style={[styles.badge, { backgroundColor: liveChange >= 0 ? 'rgba(0, 255, 163, 0.15)' : 'rgba(255, 77, 77, 0.15)' }]}>
          <Text style={[styles.badgeText, { color: liveChange >= 0 ? '#00FFA3' : '#FF4D4D' }]}>
            {liveChange >= 0 ? '+' : ''}{liveChange.toFixed(2)}%
          </Text>
        </View>
      )}
    </View>
  );
}

// ... styles aynı kalabilir

const styles = StyleSheet.create({
  container: { paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valueText: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', tabularNums: true },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: 'bold' }
});