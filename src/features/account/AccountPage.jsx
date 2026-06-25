import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/context/AuthContext';
import { ROUTES } from '../../utils/constants';

/** Opens the profile panel after login, or prompts sign-in when logged out. */
export default function AccountPage() {
  const navigate = useNavigate();
  const { authChecked, isAuthenticated, openAuthModal, requestProfilePanel } =
    useAuth();

  useEffect(() => {
    if (!authChecked) return;

    if (!isAuthenticated) {
      openAuthModal(ROUTES.ACCOUNT);
      navigate(ROUTES.HOME, { replace: true });
      return;
    }

    requestProfilePanel();
    navigate(ROUTES.HOME, { replace: true });
  }, [
    authChecked,
    isAuthenticated,
    navigate,
    openAuthModal,
    requestProfilePanel,
  ]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center font-inter text-sm text-gray-500">
      Opening account…
    </div>
  );
}
