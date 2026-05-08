import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, LayoutAnimation } from 'react-native';

export const useSettings = (deps) => {
  const {
    setTheme, setLang, setCurrency, setPortfolio, setWatchlist, setHistory,
    setChartHistory, setCustomLists, setCashBalance, setSettingsVisible,
    history, saveData, t
  } = deps;

  const changeTheme = (newTheme) => { 
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); 
    setTheme(newTheme); 
    AsyncStorage.setItem('@theme', newTheme); 
  };

  const changeLanguage = (selectedLang) => { 
    setLang(selectedLang); 
    AsyncStorage.setItem('@language', selectedLang); 
  };

  const changeCurrency = (selectedCur) => { 
    setCurrency(selectedCur); 
    AsyncStorage.setItem('@currency', selectedCur); 
  };

  const handleResetAllData = () => {    
    Alert.alert(
      'Tehlikeli İşlem',
      'Tüm portföy verileriniz, işlem geçmişiniz ve ayarlarınız kalıcı olarak silinecektir. Emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        { 
          text: 'Evet, Sıfırla', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                '@portfolio', '@watchlist', '@history', '@chart_history', 
                '@price_history', '@cash_balance', '@custom_lists', '@language', '@currency', '@theme'
              ]);
              
              setPortfolio([]);
              setWatchlist([]);
              setHistory([]);
              setChartHistory([]);
              setCustomLists([]);
              setCashBalance(0);
              
              setSettingsVisible(false);
              Alert.alert('Sıfırlandı', 'Uygulama ilk haline döndürüldü.');
            } catch (e) {
              Alert.alert('Hata', 'Sıfırlama sırasında bir hata oluştu.');
            }
          } 
        }
      ],
      { cancelable: true }
    );
  };

  const logTransaction = (type, name, qty, price, netProfit = 0, assetType = 'BIST') => {
    const newTx = {
      id: Date.now().toString(),
      type, name, qty, price,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      netProfit, assetType
    };
    setHistory([newTx, ...history]); 
    saveData('@history', [newTx, ...history]);
  };

  return { changeTheme, changeLanguage, changeCurrency, handleResetAllData, logTransaction };
};
