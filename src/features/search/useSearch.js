import { useEffect } from 'react';

export const useSearch = (deps) => {
  const {
    assetType, MOCK_ASSETS, activeTab, marketTabMode, watchlist, customLists, selectedListId,
    searchQuery, setSearchQuery, setSearchResults, setAssetType, setSelectedSearchAsset, setBuyPrice,
    setPrimaryInput, setNote, setInputMode, setIsAddMoreMode, setModalVisible,
    setWatchlist, saveLists, saveData, t, MarketService,
    setListNameInput, setEditingListId, setListError, setListModalVisible,
    livePriceMap
  } = deps;

  // Debounce Effect: searchQuery değiştikçe 300ms sonra gerçek aramayı tetikler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      } else {
        const enriched = (MOCK_ASSETS[assetType] || []).map(a => ({
          ...a,
          price: livePriceMap[a.symbol] || 0
        }));
        setSearchResults(enriched);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, assetType, livePriceMap]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    // Hızlı sonuç için mock filtrelemeyi anında yapalım + Canlı fiyatlarla zenginleştir
    const mockFiltered = (MOCK_ASSETS[assetType] || []).filter(a => 
      a.name.toLowerCase().includes(text.toLowerCase()) || 
      a.symbol.toLowerCase().includes(text.toLowerCase())
    ).map(a => ({
      ...a,
      // Sadece canlı haritada varsa fiyatı göster, yoksa 0 yap (ekranda gizlensin)
      price: livePriceMap[a.symbol] || 0
    }));
    setSearchResults(mockFiltered);
  };

  const performSearch = async (text) => {
    if (!text || text.length < 2) return;

    // Mock filtreleme (başlangıç noktası)
    const mockFiltered = (MOCK_ASSETS[assetType] || []).filter(a => 
      a.name.toLowerCase().includes(text.toLowerCase()) || 
      a.symbol.toLowerCase().includes(text.toLowerCase())
    );

    try {
      if (assetType === 'BIST') {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${text}&lang=tr&region=TR&quotesCount=10&newsCount=0`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await res.json();
        const apiResults = (data.quotes || [])
          .filter(q => q.quoteType === 'EQUITY' && (q.exchange === 'IST' || q.symbol.endsWith('.IS')))
          .map(q => ({
            symbol: q.symbol.replace('.IS', ''),
            name: q.longname || q.shortname || q.symbol,
            price: 0,
            type: 'BIST'
          }));
        const merged = [...mockFiltered];
        apiResults.forEach(a => {
          if (!merged.find(m => m.symbol === a.symbol)) merged.push(a);
        });
        setSearchResults(merged);

      } else if (assetType === 'USA') {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${text}&lang=en&region=US&quotesCount=10&newsCount=0`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await res.json();
        const apiResults = (data.quotes || [])
          .filter(q => q.quoteType === 'EQUITY')
          .map(q => ({
            symbol: q.symbol,
            name: q.longname || q.shortname || q.symbol,
            price: 0,
            type: 'USA'
          }));
        const merged = [...mockFiltered];
        apiResults.forEach(a => {
          if (!merged.find(m => m.symbol === a.symbol)) merged.push(a);
        });
        setSearchResults(merged);

      } else if (assetType === 'CRYPTO') {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price');
        const data = await res.json();
        const apiResults = data
          .filter(i => i.symbol.startsWith(text.toUpperCase()) && i.symbol.endsWith('USDT'))
          .slice(0, 10)
          .map(i => ({
            symbol: i.symbol.replace('USDT', ''),
            name: i.symbol.replace('USDT', '') + ' / USDT',
            price: parseFloat(i.price),
            type: 'CRYPTO'
          }));
        const merged = [...mockFiltered];
        apiResults.forEach(a => {
          if (!merged.find(m => m.symbol === a.symbol)) merged.push(a);
        });
        setSearchResults(merged);

      } else if (assetType === 'TEFAS') {
        if (!mockFiltered.find(m => m.symbol === text.toUpperCase())) {
          setSearchResults([
            { symbol: text.toUpperCase(), name: 'TEFAS Fonu', price: 0, type: 'TEFAS' },
            ...mockFiltered
          ]);
        }
      }
      
      // Sonuçları canlı fiyatlarla tekrar harmanla
      setSearchResults(prev => prev.map(a => ({
        ...a,
        price: livePriceMap[a.symbol] || a.price
      })));
    } catch (e) {
      console.log('Arama hatası:', e.message);
    }
  };

  const handleCategoryChange = (cat) => {
    setAssetType(cat);
    setSearchQuery('');
    // Kategori değişince mock verileri sadece canlı fiyatlarla göster
    const enriched = (MOCK_ASSETS[cat] || []).map(a => ({
      ...a,
      price: livePriceMap[a.symbol] || 0
    }));
    setSearchResults(enriched);
  };

  const handleAssetSelect = async (asset) => {
    setSelectedSearchAsset(asset);
    
    // Önce bildiğimiz en iyi fiyatı koy
    const bestPrice = livePriceMap[asset.symbol] || asset.price || 0;
    setBuyPrice(bestPrice > 0 ? bestPrice.toString() : '');
    
    setPrimaryInput('');
    setNote('');
    setInputMode('AMOUNT');

    // ARKA PLANDA: En güncel fiyatı çek ve güncelle (eğer mümkünse)
    try {
      const freshAsset = await MarketService.fetchAsset(asset);
      if (freshAsset && freshAsset.currentPrice) {
        setBuyPrice(freshAsset.currentPrice.toString());
      }
    } catch (e) {
      console.log("Live price fetch failed:", e.message);
    }
  };

  const resetAddModal = () => { 
    setSearchQuery(''); setSelectedSearchAsset(null); 
    setPrimaryInput(''); setBuyPrice(''); setNote(''); 
    setInputMode('AMOUNT');
    setIsAddMoreMode(false); 
    setModalVisible(false); 
  };

  return { handleSearch, handleCategoryChange, handleAssetSelect, resetAddModal };
};
