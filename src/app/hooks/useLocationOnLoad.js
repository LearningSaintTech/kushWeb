import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLocation, setLoading, setError } from '../store/slices/locationSlice.js';
import { getCurrentLocationPincode } from '../../services/geo.service.js';

/**
 * On mount: if no pincode in Redux, request geolocation and set location (persisted).
 * Call once at app root after PersistGate has rehydrated.
 */
export function useLocationOnLoad() {
  const dispatch = useDispatch();
  const pincode = useSelector((s) => s.location?.pincode);
  const isRehydrated = useSelector((s) => s._persist?.rehydrated);

  useEffect(() => {
    if (!isRehydrated || pincode) return;

    let cancelled = false;
    dispatch(setLoading(true));

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
        // Always clear loading so UI never stays on "Detecting location..."
        // (when setLocation runs, pincode changes and effect cleanup sets cancelled=true before this runs)
        dispatch(setLoading(false));
      });

    return () => { cancelled = true; };
  }, [dispatch, isRehydrated, pincode]);
}
