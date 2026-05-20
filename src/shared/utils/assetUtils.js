export const migrateType = (type) => {
  switch (type) {
    case 'Hisse': return 'BIST';
    case 'Fon': return 'TEFAS';
    case 'Altın/Döviz': return 'GOLD';
    case 'Kripto': return 'CRYPTO';
    case 'ABD Hisse': return 'USA';
    case 'Endeks':
    case 'INDEX':
      return 'INDEX';
    default:
      return type || 'BIST';
  }
};

export const getCurrencySymbol = (type, symbolOrName) => {
  if (symbolOrName) {
    const s = symbolOrName.toUpperCase();
    const tlAssets = ['GRAM/TL', 'DOLAR/TL', 'EURO/TL', 'GRAM ALTIN', 'ALTIN'];
    if (tlAssets.some(a => s.includes(a)) || s.includes('/TL')) return '₺';
    if (s.includes('XAU') || s.includes('BRENT') || s.includes('XAG') || s.includes('SILVER') || s.includes('PLATINUM') || s.includes('ONS')) return '$';
  }

  switch (type) {
    case 'BIST':
    case 'TEFAS':
      return '₺';
    case 'CRYPTO':
    case 'USA':
      return '$';
    case 'INDEX':
      if (symbolOrName && symbolOrName.startsWith('^')) return '$';
      return '₺';
    case 'GOLD':
      if (symbolOrName && symbolOrName.includes('USD')) return '$';
      return '₺';
    case 'FOREX':
    default:
      return '₺';
  }
};
