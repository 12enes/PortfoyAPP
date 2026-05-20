import AsyncStorage from '@react-native-async-storage/async-storage';

export const portfolioStorage = {
  saveData: async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving data for key ${key}:`, e);
    }
  },

  getData: async (key) => {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error getting data for key ${key}:`, e);
      return null;
    }
  },

  removeData: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing data for key ${key}:`, e);
    }
  }
};
