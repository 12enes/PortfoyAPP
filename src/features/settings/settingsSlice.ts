import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  theme: 'light' | 'dark';
  language: 'tr' | 'en';
  currency: '₺' | '$';
}

const initialState: SettingsState = {
  theme: 'dark',
  language: 'tr',
  currency: '₺',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<'tr' | 'en'>) => {
      state.language = action.payload;
    },
    setCurrency: (state, action: PayloadAction<'₺' | '$'>) => {
      state.currency = action.payload;
    },
    hydrateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { setTheme, setLanguage, setCurrency, hydrateSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
