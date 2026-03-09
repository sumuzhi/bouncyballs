import { useEffect, useState } from 'react';
import GestureWordMatchBoard from './components/GestureWordMatchBoard';
import {
  getPortalToken,
  redirectToPortalLogin,
  verifyPortalAuth,
} from './services/auth';

export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const isLocalDev =
      import.meta.env.DEV &&
      ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);

    const verify = async () => {
      if (isLocalDev) {
        if (!cancelled) {
          setIsAuthorized(true);
        }
        return;
      }
      const token = getPortalToken();
      if (!token) {
        redirectToPortalLogin();
        return;
      }
      try {
        const ok = await verifyPortalAuth(token);
        if (!ok) {
          throw new Error('Unauthorized');
        }
        if (!cancelled) {
          setIsAuthorized(true);
        }
      } catch (_error) {
        localStorage.removeItem('playerToken');
        localStorage.removeItem('playerUser');
        document.cookie = 'portalToken=; Max-Age=0; Path=/; SameSite=Lax';
        redirectToPortalLogin();
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isAuthorized !== true) {
    return null;
  }

  return <GestureWordMatchBoard />;
}
