import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PortfolioState {
  assets: any[];
  cashBalance: number;
  history: any[];
  priceHistory: Record<string, any>;
  usdToTryRate: number;
}

const initialState: PortfolioState = {
  assets: [],
  cashBalance: 0,
  history: [],
  priceHistory: {},
  usdToTryRate: 32.50,
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    setAssets: (state, action: PayloadAction<any[]>) => {
      state.assets = action.payload;
    },
    setCashBalance: (state, action: PayloadAction<number>) => {
      state.cashBalance = action.payload;
    },
    setUsdRate: (state, action: PayloadAction<number>) => {
      state.usdToTryRate = action.payload;
    },
    hydratePortfolio: (state, action: PayloadAction<Partial<PortfolioState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { setAssets, setCashBalance, setUsdRate, hydratePortfolio } = portfolioSlice.actions;
export default portfolioSlice.reducer;
