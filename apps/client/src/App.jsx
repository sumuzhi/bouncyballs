import { useEffect, useState } from 'react';

import AuthorizedGame from './components/AuthorizedGame';
import './style.css';


export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const isLocalDev =
      import.meta.env.DEV &&
      ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);

    const redirectToPortalLogin = () => {
      if (window.location.pathname === '/login') {
        if (!cancelled) {
          setIsAuthorized(false);
        }
        return;
      }
      const redirect = encodeURIComponent(
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
      window.top.location.href = `${window.location.origin}/login?redirect=${redirect}`;
    };

    const verify = async () => {
      if (isLocalDev) {
        if (!cancelled) {
          setIsAuthorized(true);
        }
        return;
      }
      const tokenFromPortal = window.$wujie?.props?.token;
      const tokenFromStorage = localStorage.getItem('playerToken');
      const token = tokenFromPortal || tokenFromStorage;
      if (!token) {
        redirectToPortalLogin();
        return;
      }
      try {
        const response = await fetch('/api/portal/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Unauthorized');
        }
        if (!cancelled) {
          setIsAuthorized(true);
        }
      } catch (error) {
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
  return <AuthorizedGame />;
}
