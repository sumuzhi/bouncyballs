import { getPortalToken } from './auth';

export async function fetchWordPairs(count = 5) {
  const token = getPortalToken();
  const response = await fetch(`/api/word-pairs?random=true&count=${count}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || '题库加载失败');
  }
  const data = await response.json();
  return Array.isArray(data.data) ? data.data : [];
}
