import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { getAssetRateToTry } from '../../../portfolioEngine';

export const usePortfolio = (deps) => {
  const {
    activeTab, primaryInput, buyPrice, selectedSearchAsset, portfolio, watchlist,
    customLists, selectedListId, assetType, note, inputMode,
    selectedAssetId, currentPriceInput, sellQuantityInput, usdToTryRate,
    setPortfolio, setWatchlist, setCashBalance, setPriceHistory,
    saveData, saveLists, logTransaction, resetAddModal,
    setModalVisible, setSellModalVisible, setDetailModalVisible,
    setPrimaryInput, setBuyPrice, setNote, setSellQuantityInput, setCurrentPriceInput,
    t, MarketService, onRefreshMarket
  } = deps;

  const addAsset = async () => {
    const symbol = selectedSearchAsset?.symbol || primaryInput;
    if (!selectedSearchAsset) return;

    // PORTFOLIO modunda zorunlu alan kontrolü
    if (activeTab === 'PORTFOLIO' && (!buyPrice || !primaryInput)) {
      Alert.alert(t('alertWarning'), t('alertFill')); 
      return; 
    }
    
    const numInput = parseFloat((primaryInput || '').toString().replace(',', '.')) || 0;
    const numPrice = parseFloat((buyPrice || selectedSearchAsset.price || '0').toString().replace(',', '.')) || 0;

    let calculatedQty = 0;
    if (inputMode === 'AMOUNT') { 
      calculatedQty = numPrice > 0 ? (numInput / numPrice) : 0; 
    } else { 
      calculatedQty = numInput; 
    }

    const finalQty = parseFloat(calculatedQty.toFixed(8)); 
    const finalPrice = numPrice; 
    const finalSymbol = selectedSearchAsset.symbol;
    
    if (activeTab === 'PORTFOLIO' && finalQty <= 0) { 
      Alert.alert(t('alertWarning'), t('alertInvalid')); 
      return; 
    }

    let liveMarketPrice = finalPrice;
    try {
      if (assetType === 'CRYPTO') {
        const result = await MarketService._fetchCryptoPrice(finalSymbol);
        if (result?.price) liveMarketPrice = result.price;
      } else if (assetType === 'GOLD') {
        if (finalSymbol === 'XAU/USD' || finalSymbol === 'GRAM/TL') {
          const goldResult = await MarketService._fetchGoldUSD();
          if (goldResult?.price) {
            if (finalSymbol === 'XAU/USD') { liveMarketPrice = goldResult.price; }
            else {
              const rates = await MarketService._fetchForexRates();
              if (rates?.TRY) liveMarketPrice = parseFloat(((goldResult.price * rates.TRY) / 31.1035).toFixed(2));
            }
          }
        } else if (finalSymbol === 'DOLAR/TL' || finalSymbol === 'EURO/TL') {
          const rates = await MarketService._fetchForexRates();
          if (rates) {
            if (finalSymbol === 'DOLAR/TL' && rates.TRY) liveMarketPrice = rates.TRY;
            else if (finalSymbol === 'EURO/TL' && rates.TRY && rates.EUR) liveMarketPrice = parseFloat((rates.TRY / rates.EUR).toFixed(4));
          }
        } else if (finalSymbol === 'BRENT') {
          const brentResult = await MarketService._fetchYahooFinance('BZ=F');
          if (brentResult?.price) liveMarketPrice = brentResult.price;
        }
      }
    } catch (e) { }

    if (activeTab === 'PORTFOLIO') {
      const existingIndex = portfolio.findIndex(a => a.name === finalSymbol);
      let updatedData = [...portfolio];
      if (existingIndex >= 0) {
        const existing = updatedData[existingIndex];
        const oldTotalCost = existing.price * existing.quantity;
        const newTotalCost = finalPrice * finalQty;
        const totalQty = existing.quantity + finalQty;
        updatedData[existingIndex] = { ...existing, price: (oldTotalCost + newTotalCost) / totalQty, quantity: totalQty, currentPrice: liveMarketPrice, type: assetType, note: note || existing.note, addedDate: existing.addedDate || Date.now() };
      } else {
        updatedData.push({ id: Math.random().toString(), name: finalSymbol, type: assetType, price: finalPrice, quantity: finalQty, currentPrice: liveMarketPrice, addedDate: Date.now(), note });
      }
      
      setPortfolio(updatedData); 
      saveData('@portfolio', updatedData);
      logTransaction(t('buy'), finalSymbol, finalQty, finalPrice, 0, assetType);
    } else {
      // MARKET / WATCHLIST LOGIC
      
      // Her durumda ana Watchlist'e ekle (Eğer yoksa) - Bu fiyat zenginleştirmesi için gereklidir
      const existingIndex = watchlist.findIndex(a => a.name === finalSymbol);
      if (existingIndex === -1) {
        const up = [...watchlist, { id: Math.random().toString(), name: finalSymbol, type: assetType, price: finalPrice, currentPrice: liveMarketPrice, changePercent: 0 }];
        setWatchlist(up);
        saveData('@watchlist', up);
        // Varlık eklenince hemen fiyatı güncelle
        setTimeout(() => onRefreshMarket(), 500);
      }

      // Eğer bir özel liste seçiliyse oraya da ekle
      if (selectedListId) {
        const updated = customLists.map(l => 
          l.id === selectedListId 
            ? { ...l, assetIds: l.assetIds.includes(finalSymbol) ? l.assetIds : [...l.assetIds, finalSymbol] } 
            : l
        );
        saveLists(updated);
      }
    }

    resetAddModal();

    if (activeTab === 'PORTFOLIO') {
      setTimeout(async () => {
        const historyData = await MarketService.fetchHistoricalPrices(finalSymbol, assetType, 30);
        setPriceHistory(prev => {
          const updatedHistory = { ...prev, [finalSymbol]: historyData };
          AsyncStorage.setItem('@price_history', JSON.stringify(updatedHistory));
          return updatedHistory;
        });
      }, 500);
    }
  };

  const deleteAsset = (id) => { 
    if(activeTab === 'PORTFOLIO') { const up = portfolio.filter(a => a.id !== id); setPortfolio(up); saveData('@portfolio', up); }
    else { const up = watchlist.filter(a => a.id !== id); setWatchlist(up); saveData('@watchlist', up); }
    setDetailModalVisible(false);
  };

  const sellAsset = () => {
    const sellQty = parseFloat(sellQuantityInput.toString().replace(',', '.'));
    const asset = portfolio.find(a => a.id === selectedAssetId);
    if (!sellQty || sellQty <= 0 || sellQty > asset.quantity) { Alert.alert(t('alertWarning'), t('alertInvalid')); return; }

    const cPrice = asset.currentPrice !== undefined ? asset.currentPrice : asset.price;
    const grossProfitNative = (cPrice * sellQty) - (asset.price * sellQty);
    
    let taxNative = 0; 
    if (asset.type === 'TEFAS' && grossProfitNative > 0) taxNative = grossProfitNative * 0.175; 
    const netProfitNative = grossProfitNative - taxNative;

    const rate = getAssetRateToTry(asset, usdToTryRate);
    
    const totalSaleValueNative = (cPrice * sellQty) - taxNative;
    const totalSaleValueTRY = totalSaleValueNative * rate;

    const remQty = asset.quantity - sellQty;
    const upPort = remQty <= 0 ? portfolio.filter(a => a.id !== selectedAssetId) : portfolio.map(a => a.id === selectedAssetId ? { ...a, quantity: remQty } : a);
    
    setCashBalance(prev => {
      const next = prev + totalSaleValueTRY;
      saveData('@cash_balance', next);
      return next;
    });
    setPortfolio(upPort); 
    saveData('@portfolio', upPort);
    logTransaction(t('sell'), asset.name || asset.symbol, sellQty, cPrice, netProfitNative, asset.type);
    
    setSellModalVisible(false); setSellQuantityInput(''); setDetailModalVisible(false);
  };

  const updateCurrentPrice = () => {
    if (!currentPriceInput) return;
    const newPrice = parseFloat(currentPriceInput.toString().replace(',', '.'));
    if (activeTab === 'PORTFOLIO') { const up = portfolio.map(a => a.id === selectedAssetId ? { ...a, currentPrice: newPrice } : a); setPortfolio(up); saveData('@portfolio', up); } 
    else { const up = watchlist.map(a => a.id === selectedAssetId ? { ...a, currentPrice: newPrice } : a); setWatchlist(up); saveData('@watchlist', up); }
    setDetailModalVisible(false); setCurrentPriceInput('');
  };

  return { addAsset, deleteAsset, sellAsset, updateCurrentPrice };
};
