import { combineReducers } from '@reduxjs/toolkit';
import locationReducer from './locationSlice.js';
import searchReducer from './searchSlice.js';

const rootReducer = combineReducers({
  location: locationReducer,
  search: searchReducer,
});

export default rootReducer;
export { default as locationSlice } from './locationSlice.js';
export { default as searchSlice } from './searchSlice.js';
