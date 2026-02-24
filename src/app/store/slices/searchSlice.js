import { createSlice } from '@reduxjs/toolkit';

const MAX_RECENT = 10;

const initialState = {
  recentKeywords: [],
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    addRecentKeyword: (state, { payload }) => {
      const keyword = typeof payload === 'string' ? payload : payload?.keyword;
      if (!keyword || !String(keyword).trim()) return;
      const term = String(keyword).trim().toLowerCase();
      const existing = state.recentKeywords.filter((k) => k.toLowerCase() !== term);
      state.recentKeywords = [term, ...existing].slice(0, MAX_RECENT);
    },
    removeRecentKeyword: (state, { payload }) => {
      const keyword = typeof payload === 'string' ? payload : payload?.keyword;
      if (!keyword) return;
      const term = String(keyword).trim().toLowerCase();
      state.recentKeywords = state.recentKeywords.filter((k) => k.toLowerCase() !== term);
    },
    clearRecentKeywords: (state) => {
      state.recentKeywords = [];
    },
  },
});

export const { addRecentKeyword, removeRecentKeyword, clearRecentKeywords } = searchSlice.actions;
export default searchSlice.reducer;
