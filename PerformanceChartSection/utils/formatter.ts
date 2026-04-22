// PerformanceChartSection/utils/formatter.js

export const formatCurrency = (value, currencySymbol, locale = 'tr-TR') => {
  // Uygulamadan gelen sembolleri (₺, $, €) standart ISO kodlarına çeviriyoruz
  let currencyCode = 'TRY';
  if (currencySymbol === '$') currencyCode = 'USD';
  if (currencySymbol === '€') currencyCode = 'EUR';
  if (currencySymbol === '₺') currencyCode = 'TRY';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    // Hata durumunda (eski Android sürümleri vb.) manuel fallback
    return `${currencySymbol}${value.toLocaleString(locale)}`;
  }
};

export const formatDate = (timestamp, locale = 'tr-TR') => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};