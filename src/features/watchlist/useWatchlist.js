import { Alert, LayoutAnimation } from 'react-native';

export const useWatchlist = (deps) => {
  const {
    listNameInput, customLists, editingListId, watchlist,
    saveLists, saveData, setListModalVisible, setListNameInput,
    setEditingListId, setListError, setSelectedListId, triggerShake, t,
    setWatchlist, setIsMarketEditMode, selectedListId, setListOptionsVisible, setSelectedOptionList
  } = deps;

  const createOrUpdateList = () => {
    const trimmed = listNameInput.trim();
    if (!trimmed) { setListError(t('listNameReq')); triggerShake(); return; }
    if (customLists.some(l => l.name.toLowerCase() === trimmed.toLowerCase() && l.id !== editingListId)) {
        setListError(t('listNameExists')); triggerShake(); return;
    }
    setListError('');
    if (editingListId) {
        const updated = customLists.map(l => l.id === editingListId ? { ...l, name: trimmed } : l);
        saveLists(updated);
        setListModalVisible(false);
    } else {
        const newId = Date.now().toString();
        const newList = { id: newId, name: trimmed, createdAt: Date.now(), assetIds: [] };
        saveLists([newList, ...customLists]);
        setListModalVisible(false);
        // Yeni liste oluşturulunca ufak bir saniye sonra doğrudan içine dal
        setTimeout(() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedListId(newId);
        }, 300);
    }
  };

  const openListOptions = (list) => {
    setSelectedOptionList(list);
    setListOptionsVisible(true);
  };

  const removeWatchlistAsset = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const up = watchlist.filter(a => a.id !== id);
    setWatchlist(up); saveData('@watchlist', up);
    if(up.length === 0) setIsMarketEditMode(false); 
  };

  const removeCustomListAsset = (symbol) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = customLists.map(l => l.id === selectedListId ? { ...l, assetIds: l.assetIds.filter(s => s !== symbol) } : l);
    saveLists(updated);
    const currentList = updated.find(l => l.id === selectedListId);
    if(currentList && currentList.assetIds.length === 0) setIsMarketEditMode(false);
  };

  return { createOrUpdateList, openListOptions, removeWatchlistAsset, removeCustomListAsset };
};
