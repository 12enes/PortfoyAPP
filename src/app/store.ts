import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from '../features/portfolio/portfolioSlice';
import settingsReducer from '../features/settings/settingsSlice';

export const store = configureStore({
  reducer: {
    portfolio: portfolioReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
