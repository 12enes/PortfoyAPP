export const ASSET_TYPES = ['BIST', 'INDEX', 'TEFAS', 'GOLD', 'CRYPTO', 'USA'];
export const CATEGORY_ORDER = ['BIST', 'INDEX', 'TEFAS', 'GOLD', 'CRYPTO', 'USA'];

export const MOCK_ASSETS = {
  'BIST': [
    { symbol: 'THYAO', name: 'Türk Hava Yolları', price: 295.50 },
    { symbol: 'TUPRS', name: 'Tüpraş', price: 172.40 },
    { symbol: 'EREGL', name: 'Erdemir', price: 44.10 },
    { symbol: 'ASELS', name: 'Aselsan', price: 58.20 },
    { symbol: 'KCHOL', name: 'Koç Holding', price: 210.00 },
    { symbol: 'GARAN', name: 'Garanti BBVA', price: 84.50 },
    { symbol: 'SAHOL', name: 'Sabancı Holding', price: 92.30 },
    { symbol: 'ISCTR', name: 'İş Bankası (C)', price: 13.40 },
    { symbol: 'AKBNK', name: 'Akbank', price: 56.10 },
    { symbol: 'SISE', name: 'Şişecam', price: 51.20 }
  ],
  'USA': [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420.10 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 890.00 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 170.20 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 180.50 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 155.30 },
    { symbol: 'META', name: 'Meta Platforms', price: 495.20 },
    { symbol: 'NFLX', name: 'Netflix Inc.', price: 620.40 },
    { symbol: 'AMD', name: 'Advanced Micro Devices', price: 165.10 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', price: 410.50 }
  ],
  'CRYPTO': [
    { symbol: 'BTC', name: 'Bitcoin', price: 65400.00 },
    { symbol: 'ETH', name: 'Ethereum', price: 3450.00 },
    { symbol: 'BNB', name: 'BNB', price: 590.00 },
    { symbol: 'SOL', name: 'Solana', price: 145.00 },
    { symbol: 'XRP', name: 'Ripple', price: 0.58 },
    { symbol: 'ADA', name: 'Cardano', price: 0.45 },
    { symbol: 'DOT', name: 'Polkadot', price: 7.20 },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.15 },
    { symbol: 'AVAX', name: 'Avalanche', price: 35.40 },
    { symbol: 'MATIC', name: 'Polygon', price: 0.72 }
  ],
  'GOLD': [
    { symbol: 'GRAM/TL', name: 'Gram Altın', price: 2450.00 },
    { symbol: 'XAU/USD', name: 'Ons Altın', price: 2340.00 },
    { symbol: 'DOLAR/TL', name: 'Amerikan Doları', price: 32.15 },
    { symbol: 'EURO/TL', name: 'Euro', price: 34.80 },
    { symbol: 'BRENT', name: 'Brent Petrol', price: 83.50 },
    { symbol: 'XAG/USD', name: 'Ons Gümüş', price: 28.40 },
    { symbol: 'PLATINUM', name: 'Platin', price: 950.00 },
    { symbol: 'PALADIUM', name: 'Paladyum', price: 1020.00 },
    { symbol: 'GBP/TL', name: 'İngiliz Sterlini', price: 40.50 },
    { symbol: 'CHF/TL', name: 'İsviçre Frangı', price: 35.20 }
  ],
  'TEFAS': [
    { symbol: 'MAC', name: 'Marmara Capital Hisse Fonu', price: 0.45 },
    { symbol: 'TI2', name: 'İş Portföy BIST 100 Dışı Fon', price: 1.20 },
    { symbol: 'AFT', name: 'Ak Portföy Yeni Teknolojiler', price: 0.85 },
    { symbol: 'TCD', name: 'Tacirler Değişken Fon', price: 2.10 },
    { symbol: 'IPJ', name: 'İş Portföy Elektrikli Araçlar', price: 0.95 },
    { symbol: 'YAS', name: 'Yapı Kredi Koç Hold. Fonu', price: 1.40 },
    { symbol: 'GMR', name: 'Gedik Portföy Hisse Fonu', price: 1.15 },
    { symbol: 'GAF', name: 'Garanti Portföy Hisse Fonu', price: 0.78 },
    { symbol: 'OKD', name: 'Osmanlı Portföy Hisse Fonu', price: 1.65 },
    { symbol: 'HVS', name: 'HSBC Portföy Hisse Fonu', price: 1.32 }
  ],
  'INDEX': [
    { symbol: 'XU100.IS', name: 'BIST 100', price: 10500.00 },
    { symbol: 'XU030.IS', name: 'BIST 30', price: 11200.00 },
    { symbol: 'XBANK.IS', name: 'BIST Bankacılık', price: 12500.00 },
    { symbol: 'XUTEK.IS', name: 'BIST Teknoloji', price: 14000.00 },
    { symbol: 'XUSIN.IS', name: 'BIST Sınai', price: 16000.00 },
    { symbol: 'XUHIZ.IS', name: 'BIST Hizmetler', price: 9500.00 },
    { symbol: 'XUTUM.IS', name: 'BIST Tüm', price: 12000.00 },
    { symbol: '^NDX', name: 'NASDAQ 100', price: 18500.00 },
    { symbol: '^IXIC', name: 'NASDAQ Composite', price: 16500.00 },
    { symbol: '^GSPC', name: 'S&P 500', price: 5200.00 },
    { symbol: '^DJI', name: 'Dow Jones Industrial', price: 39500.00 },
    { symbol: '^RUT', name: 'Russell 2000', price: 2100.00 },
    { symbol: '^VIX', name: 'CBOE Volatility (VIX)', price: 14.50 },
    { symbol: '^GDAXI', name: 'DAX (Almanya)', price: 18200.00 },
    { symbol: '^FTSE', name: 'FTSE 100 (İngiltere)', price: 8100.00 },
    { symbol: '^N225', name: 'Nikkei 225 (Japonya)', price: 38500.00 }
  ]
};
