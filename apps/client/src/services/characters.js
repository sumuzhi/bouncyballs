export async function fetchCharacters(limit = 1000) {
  const tokenFromPortal = window.$wujie?.props?.token;
  const tokenFromStorage = localStorage.getItem('playerToken');
  const token = tokenFromPortal || tokenFromStorage;
  const response = await fetch(`/api/characters?limit=${limit}`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
  if (!response.ok) {
    return [];
  }
  const result = await response.json();
  if (Array.isArray(result)) {
    return result;
  }
  if (Array.isArray(result?.data)) {
    return result.data;
  }
  return [];
}
