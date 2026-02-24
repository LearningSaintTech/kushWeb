import storage from 'redux-persist/lib/storage';
import createTransform from 'redux-persist/es/createTransform';

// Don't persist isLoading/error so rehydration never leaves UI stuck on "Detecting location..."
// Transform runs per key; when key is 'location', state is the location slice only.
const locationTransform = createTransform(
  (state) => {
    if (!state) return state;
    const { isLoading, error, ...rest } = state;
    return rest;
  },
  (state) => ({
    ...(state || {}),
    isLoading: false,
    error: null,
  }),
  { whitelist: ['location'] }
);

export const persistConfig = {
  key: 'khush_root',
  version: 1,
  storage,
  whitelist: ['location', 'search'],
  transforms: [locationTransform],
};
