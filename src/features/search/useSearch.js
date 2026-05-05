import { useEffect } from 'react';

export const useSearch = (deps) => {
  const {
    assetType, MOCK_ASSETS, activeTab, marketTabMode, watchlist, customLists, selectedListId,
    searchQuery, setSearchQuery, setSearchResults, setAssetType, setSelectedSearchAsset, setBuyPrice,
    setPrimaryInput, setNote, setInputMode, setIsAddMoreMode, setModalVisible,
    setWatchlist, saveLists, saveData, t, MarketService,
    setListNameInput, setEditingListId, setListError, setListModalVisible
  } = deps;

  // Debounce Effect: searchQuery değiştikçe 300ms sonra gerçek aramayı tetikler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      } else {
        setSearchResults(MOCK_ASSETS[assetType] || []);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, assetType]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    // Hızlı sonuç için mock filtrelemeyi anında yapalım
    const mockFiltered = (MOCK_ASSETS[assetType] || []).filter(a => 
      a.name.toLowerCase().includes(text.toLowerCase()) || 
      a.symbol.toLowerCase().includes(text.toLowerCase())
    );
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
    } catch (e) {
      console.log('Arama hatası:', e.message);
    }
  };

  const handleCategoryChange = (cat) => {
    setAssetType(cat);
    setSearchQuery('');
    setSearchResults(MOCK_ASSETS[cat]);
  };

  const handleAssetSelect = (asset) => {
    setSelectedSearchAsset(asset);
    setBuyPrice(asset.price ? asset.price.toString() : '');
    setPrimaryInput('');
    setNote('');
    setInputMode('AMOUNT');
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
