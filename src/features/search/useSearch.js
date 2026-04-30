export const useSearch = (deps) => {
  const {
    assetType, MOCK_ASSETS, activeTab, marketTabMode, watchlist, customLists, selectedListId,
    setSearchQuery, setSearchResults, setAssetType, setSelectedSearchAsset, setBuyPrice,
    setPrimaryInput, setNote, setInputMode, setIsAddMoreMode, setModalVisible,
    setWatchlist, saveLists, saveData, t, MarketService,
    setListNameInput, setEditingListId, setListError, setListModalVisible
  } = deps;

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text) { setSearchResults(MOCK_ASSETS[assetType]); return; }
    const filtered = MOCK_ASSETS[assetType].filter(a => a.name.toLowerCase().includes(text.toLowerCase()) || a.symbol.toLowerCase().includes(text.toLowerCase()));
    setSearchResults(filtered);
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
