import { create } from 'zustand';

type MarketState = Record<string, unknown>;

export const useMarketStore = create<MarketState>(() => ({}));
