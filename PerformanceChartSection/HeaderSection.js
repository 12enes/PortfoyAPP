// PerformanceChartSection/HeaderSection.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from './utils/formatter';

export default function HeaderSection({ activePoint, liveValue, liveChange, liveChangeAmount, currency, locale, viewMode, data, valueScale = 1 }) {
  const isPerformance = viewMode === 'PERFORMANCE';
  let primaryValue = '';
  let secondaryValue = '';
  let primaryColor = '#FFFFFF';

  const formatScaledCurrency = (value) => formatCurrency((value || 0) * valueScale, currency, locale);
  const formatSignedScaledCurrency = (value) => {
    const scaledValue = (value || 0) * valueScale;
    const sign = scaledValue >= 0 ? '+' : '-';
    return `${sign}${formatCurrency(Math.abs(scaledValue), currency, locale)}`;
  };

  if (activePoint) {
    if (isPerformance) {
      // Performans modunda Üst Satır: Net Kâr Yüzdesi (+%5.25), Alt Satır: Net Kâr TL (₺)
      const pct = activePoint.netProfitPercent ?? 0;
      const isPositive = pct >= 0;
      primaryValue = `${isPositive ? '+' : ''}${pct.toFixed(2)}%`;
      primaryColor = isPositive ? '#00E87A' : '#FF4757';
      secondaryValue = formatSignedScaledCurrency(activePoint.netProfit ?? 0);
    } else {
      // Varlık Akışı modunda Üst Satır: Toplam Piyasa Değeri, Alt Satır: Tarih
      // Eğer activePoint.assetValue varsa onu kullan (performans dizisi yanlışlıkla gelse bile bizi korur), yoksa doğrudan value kullan.
      const displayVal = activePoint.assetValue !== undefined ? activePoint.assetValue : (activePoint.value || 0);
      primaryValue = formatScaledCurrency(displayVal);
      secondaryValue = activePoint.date ? new Date(activePoint.date).toLocaleDateString('tr-TR') : '';
    }
  } else {
    // Crosshair Aktif Değilken (Boşta)
    if (isPerformance) {
      const val = liveChange ?? 0;
      const isPositive = val >= 0;
      primaryValue = `${isPositive ? '+' : ''}${val.toFixed(2)}%`;
      primaryColor = isPositive ? '#00E87A' : '#FF4757';
      secondaryValue = formatSignedScaledCurrency(liveChangeAmount ?? 0);
    } else {
      primaryValue = formatScaledCurrency(liveValue ?? 0);
      // Tarih Aralığı
      if (data && data.length > 0) {
        const start = new Date(data[0].date).toLocaleDateString('tr-TR');
        const end = new Date(data[data.length - 1].date).toLocaleDateString('tr-TR');
        secondaryValue = `${start} - ${end}`;
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.primaryText, { color: primaryColor }]}>
        {primaryValue}
      </Text>
      <Text style={styles.secondaryText}>
        {secondaryValue}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 25, alignItems: 'flex-start', minHeight: 60 },
  primaryText: { fontSize: 32, fontWeight: '900', tabularNums: true },
  secondaryText: { fontSize: 14, fontWeight: '600', color: '#8A8A9A', marginTop: 2, tabularNums: true }
});
