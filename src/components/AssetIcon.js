import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import FundLogo from './FundLogo';

// Dövizler (Forex) için flagCodes sözlüğü
const flagCodes = {
  'USD': 'us',
  'DOLAR': 'us',
  'EUR': 'eu',
  'EURO': 'eu',
  'GBP': 'gb',
  'JPY': 'jp',
  'AUD': 'au',
  'CAD': 'ca',
  'CHF': 'ch',
  'CNY': 'cn',
  'RUB': 'ru',
  'AED': 'ae',
  'SAR': 'sa',
  'AZN': 'az',
  'TRY': 'tr'
};

/**
 * AssetIcon Component - "Silent Luxury" Design
 * Dynamically fetches crypto/stock icons or renders a premium fallback.
 */
const AssetIcon = ({ asset, size = 40 }) => {
  const [imageError, setImageError] = useState(false);

  const symbol = asset.symbol || asset.name || '';
  const cleanSymbol = symbol.split('/')[0].toUpperCase();
  
  let currentType = asset.type;
  // Auto-Type Logic: Tip boşsa tahminde bulun
  if (!currentType) {
    if (symbol.includes('/TRY') || symbol.includes('/TL')) currentType = 'FOREX';
    else if (symbol.length >= 3 && symbol.length <= 6) currentType = 'BIST'; // Basit bir tahmin
  }

  let imageUrl = null;
  let useFundLogo = false;

  // Dinamik URL Mantık Motoru
  if (currentType === 'CRYPTO') {
    imageUrl = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@master/128/color/${cleanSymbol.toLowerCase()}.png`;
  } else if (currentType === 'USA') {
    imageUrl = `https://financialmodelingprep.com/image-stock/${cleanSymbol}.png`;
  } else if (currentType === 'BIST') {
    imageUrl = `https://cdn.jsdelivr.net/gh/ahmeterenodaci/Istanbul-Stock-Exchange--BIST--including-symbols-and-logos/logos/${cleanSymbol.toUpperCase()}.png`;
  } else if (currentType === 'TEFAS') {
    useFundLogo = true;
    imageUrl = 'tefas_placeholder'; // Condition'ı geçmek için
  } else if (currentType === 'FOREX' || symbol.includes('/TRY') || symbol.includes('/TL')) {
    const code = flagCodes[cleanSymbol];
    if (code) imageUrl = `https://flagcdn.com/w160/${code}.png`;
  }

  const renderFallback = () => {
    // Normalde 2 harf alıyoruz
    let fallbackText = cleanSymbol.substring(0, 2) || '?';

    // TEFAS ise fon kodunun tamamını (3 karakter) al
    if (asset.type === 'TEFAS') {
      fallbackText = cleanSymbol.substring(0, 3);
    }

    if (asset.type === 'GOLD' || symbol.toUpperCase() === 'ALTIN' || symbol.toUpperCase() === 'XAU' || cleanSymbol === 'GRAM') {
      fallbackText = 'AU';
    } else if (cleanSymbol === 'BRENT') {
      fallbackText = 'BR';
    }

    return (
      <View style={[
        styles.fallbackContainer, 
        { width: size, height: size, borderRadius: size / 2 }
      ]}>
        <Text style={[styles.fallbackText, { fontSize: fallbackText.length > 2 ? size * 0.28 : size * 0.35 }]}>
          {fallbackText}
        </Text>
      </View>
    );
  };

  if ((imageUrl || useFundLogo) && !imageError) {
    if (useFundLogo) {
      return <FundLogo fund={asset} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setImageError(true)}
      />
    );
  }

  return renderFallback();
};

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#D4AF37', // Matte Gold
    fontWeight: '600',
  },
});

export default AssetIcon;
