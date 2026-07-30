import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import {
  communityProfileService,
  getCommunityProfileErrorMessage,
} from '../../../services/communityProfile.service';
import { debugLog, debugWarn } from '../../../utils/debugLog';

const CommunityProfileContext = createContext(null);

export function CommunityProfileProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      setError(null);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await communityProfileService.getProfile();
      setProfile(data);
      debugLog('[CommunityProfile] hydrated', {
        isCreator: data?.isCreator,
        isDesigner: data?.isDesigner,
        creatorOnboardingStep: data?.creatorOnboardingStep,
        designerOnboardingStep: data?.designerOnboardingStep,
        designerVerificationStatus: data?.designerVerificationStatus,
        username: data?.username,
      });
      return data;
    } catch (err) {
      const message = getCommunityProfileErrorMessage(
        err,
        'Failed to load community profile.',
      );
      setError(message);
      debugWarn('[CommunityProfile] refresh failed', message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return undefined;
    }
    refresh();
    return undefined;
  }, [isAuthenticated, refresh]);

  const selectRole = useCallback(async (role) => {
    debugLog('[CommunityProfile] selectRole', { role });
    const data = await communityProfileService.selectRole(role);
    setProfile(data);
    return data;
  }, []);

  const applyProfile = useCallback((data) => {
    if (data) setProfile(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      profile,
      loading,
      error,
      refresh,
      selectRole,
      applyProfile,
      setProfile,
    }),
    [profile, loading, error, refresh, selectRole, applyProfile],
  );

  return (
    <CommunityProfileContext.Provider value={value}>
      {children}
    </CommunityProfileContext.Provider>
  );
}

export function useCommunityProfile() {
  const ctx = useContext(CommunityProfileContext);
  if (!ctx) {
    throw new Error('useCommunityProfile must be used within CommunityProfileProvider');
  }
  return ctx;
}
