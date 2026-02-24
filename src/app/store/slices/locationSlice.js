import { createSlice } from '@reduxjs/toolkit';

const MAX_RECENT_PINCODES = 5;

const initialState = {
  pincode: null,
  addressLabel: null,
  recentPincodes: [],
  suggestedPincodes: [
    { pincode: '110001', label: 'Connaught Place, New Delhi' },
    { pincode: '400001', label: 'Fort, Mumbai' },
    { pincode: '560001', label: 'Bangalore GPO' },
    { pincode: '600001', label: 'Chennai GPO' },
    { pincode: '700001', label: 'Kolkata GPO' },
    { pincode: '201301', label: 'Sector 69, Noida' },
  ],
  isLoading: false,
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocation: (state, { payload }) => {
      const { pincode, addressLabel } = payload ?? {};
      state.pincode = pincode ?? state.pincode;
      state.addressLabel = addressLabel ?? state.addressLabel;
      state.error = null;
      state.isLoading = false; // always clear loading when we have a location
      if (pincode) {
        const existing = state.recentPincodes.filter((r) => r.pincode !== pincode);
        const entry = { pincode, label: addressLabel || `Pin ${pincode}` };
        state.recentPincodes = [entry, ...existing].slice(0, MAX_RECENT_PINCODES);
      }
    },
    setPincodeOnly: (state, { payload }) => {
      const pincode = payload?.pincode ?? payload;
      if (pincode) {
        state.pincode = String(pincode);
        state.addressLabel = payload?.label ?? state.addressLabel ?? `Pin ${pincode}`;
        state.error = null;
        const entry = { pincode: state.pincode, label: state.addressLabel };
        const existing = state.recentPincodes.filter((r) => r.pincode !== state.pincode);
        state.recentPincodes = [entry, ...existing].slice(0, MAX_RECENT_PINCODES);
      }
    },
    setLoading: (state, { payload }) => {
      state.isLoading = payload !== undefined ? payload : true;
      if (payload === false) state.error = null;
    },
    setError: (state, { payload }) => {
      state.error = payload ?? null;
      state.isLoading = false;
    },
    clearLocation: (state) => {
      state.pincode = null;
      state.addressLabel = null;
      state.error = null;
    },
  },
});

export const { setLocation, setPincodeOnly, setLoading, setError, clearLocation } = locationSlice.actions;
export default locationSlice.reducer;
