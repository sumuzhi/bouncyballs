export async function fetchCharacters(limit = 1000) {
  const response = await fetch(`/api/characters?limit=${limit}`);
  const result = await response.json();
  if (Array.isArray(result)) {
    return result;
  }
  if (Array.isArray(result?.data)) {
    return result.data;
  }
  return [];
}
