export function getPortalToken() {
  const tokenFromPortal = window.$wujie?.props?.token;
  const tokenFromStorage = localStorage.getItem('playerToken');
  return tokenFromPortal || tokenFromStorage || '';
}

export async function verifyPortalAuth(token) {
  const response = await fetch('/api/portal/auth/verify', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.ok;
}

export function redirectToPortalLogin() {
  if (window.location.pathname === '/login') {
    return;
  }
  const redirect = encodeURIComponent(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
  window.top.location.href = `${window.location.origin}/login?redirect=${redirect}`;
}
