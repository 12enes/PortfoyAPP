// PerformanceChartSection/HeaderSection.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from './utils/formatter';

export default function HeaderSection({ activePoint, liveValue, liveChange, currency, locale }) {
  // Silent Luxury: Sadece kullanıcı grafiğe dokunduğunda (scrubbing) veri gösteriyoruz.
  // Boştayken yukarıdaki ana hero section verisi yeterlidir.
  if (!activePoint) return <View style={{ height: 40 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.valueText}>
        {formatCurrency(activePoint.value, currency, locale)}
      </Text>
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