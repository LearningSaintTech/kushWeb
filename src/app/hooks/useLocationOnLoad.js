import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLocation, setLoading, setError } from '../store/slices/locationSlice.js';
import { getCurrentLocationPincode } from '../../services/geo.service.js';
import { addressService } from '../../services/address.service.js';

/**
 * On mount: if no pincode in Redux, set location from default address (when logged in)
 * or from geolocation. Must be called from a component inside AuthProvider; pass useAuth().isAuthenticated.
 */
export function useLocationOnLoad(isAuthenticated = false) {
  const dispatch = useDispatch();
  const pincode = useSelector((s) => s.location?.pincode);
  const isRehydrated = useSelector((s) => s._persist?.rehydrated);

  useEffect(() => {
    if (!isRehydrated || pincode) return;

    let cancelled = false;
    dispatch(setLoading(true));

    const run = async () => {
      try {
        if (isAuthenticated) {
          const res = await addressService.getDefaultAddress();
          const data = res?.data?.data ?? res?.data;
          if (!cancelled && data?.pinCode != null) {
            const label = [data.addressLine, data.city, data.state, data.pinCode].filter(Boolean).join(', ');
            dispatch(setLocation({ pincode: String(data.pinCode), addressLabel: label || `Pin ${data.pinCode}` }));
            dispatch(setLoading(false));
            return;
          }
        }
      } catch {
        // no default or not logged in – fall back to geolocation
      }
      if (cancelled) return;
      getCurrentLocationPincode()
        .then(({ pincode: pin, addressLabel }) => {
          if (cancelled) return;
          if (pin || addressLabel) {
            dispatch(setLocation({ pincode: pin, addressLabel }));
          } else {
            dispatch(setError('Address could not be resolved. Please choose from the list.'));
          }
        })
        .catch((err) => {
          if (!cancelled) {
            dispatch(setError(err?.message ?? 'Unable to get location. Please choose from the list.'));
          }
        })
        .finally(() => {
          if (!cancelled) dispatch(setLoading(false));
        });
    };

    run();
    return () => { cancelled = true; };
  }, [dispatch, isRehydrated, pincode, isAuthenticated]);
}
