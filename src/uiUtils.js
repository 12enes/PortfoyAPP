export const getAssetIcon = (type) => { 
  switch(type) { 
    case 'BIST': return 'business'; 
    case 'USA': return 'language'; 
    case 'TEFAS': return 'pie-chart'; 
    case 'CRYPTO': return 'currency-bitcoin'; 
    case 'GOLD': return 'attach-money'; 
    default: return 'widgets'; 
  } 
};

export const getConvertedValue = (nativePrice, type, currency, usdToTryRate, isUsdType) => {
  if (!nativePrice) return 0;
  const isNativeUsd = isUsdType(type); 
  
  if (currency === '₺') {
    return isNativeUsd ? nativePrice * usdToTryRate : nativePrice;
  } else if (currency === '$') {
    return !isNativeUsd ? nativePrice / usdToTryRate : nativePrice;
  } 
  return nativePrice; 
};

export const createTranslationFunction = (translations, lang) => (key) => {
  if (!translations || !translations[lang]) return key;
  return translations[lang][key] || key;
};
