import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchWordPairs } from '../services/wordPairs';

const TOTAL_PER_ROUND = 5;

function shuffle(list) {
  const cloned = [...list];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

export default function useWordMatchGame() {
  const [roundWords, setRoundWords] = useState([]);
  const [matchedMap, setMatchedMap] = useState({});
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const total = roundWords.length;
  const matchedCount = useMemo(
    () => Object.keys(matchedMap).length,
    [matchedMap],
  );
  const finished = total > 0 && matchedCount === total;
  const elapsedMs = (finishedAt || Date.now()) - startTime;
  const accuracy =
    matchedCount + errors === 0
      ? 100
      : Math.round((matchedCount / (matchedCount + errors)) * 100);

  const englishCards = useMemo(
    () =>
      roundWords.map((word) => ({
        id: word.id,
        label: word.en,
        matched: Boolean(matchedMap[word.id]),
      })),
    [matchedMap, roundWords],
  );

  const chineseTargets = useMemo(
    () =>
      roundWords.map((word) => ({
        id: word.id,
        label: word.zh,
        matchedBy: matchedMap[word.id] || '',
      })),
    [matchedMap, roundWords],
  );

  const commitMatch = useCallback((cardId, targetId) => {
    if (cardId !== targetId) {
      setErrors((prev) => prev + 1);
      setToast('配对错误，请再试一次');
      return false;
    }
    if (matchedMap[cardId]) {
      return true;
    }
    const nextMap = { ...matchedMap, [cardId]: cardId };
    setMatchedMap(nextMap);
    setToast('配对成功');
    if (Object.keys(nextMap).length === roundWords.length) {
      setFinishedAt(Date.now());
    }
    return true;
  }, [matchedMap, roundWords.length]);

  const loadRound = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await fetchWordPairs(TOTAL_PER_ROUND);
      const normalized = list
        .filter((item) => item.en && item.zh)
        .map((item) => ({
          id: item._id || item.id || `${item.en}-${item.zh}`,
          en: item.en,
          zh: item.zh,
        }));
      if (!normalized.length) {
        throw new Error('题库为空，请先在管理后台录入单词');
      }
      setRoundWords(shuffle(normalized).slice(0, TOTAL_PER_ROUND));
    } catch (error) {
      setLoadError(error.message || '题库加载失败');
      setRoundWords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetRound = useCallback(async () => {
    await loadRound();
    setMatchedMap({});
    setErrors(0);
    setStartTime(Date.now());
    setFinishedAt(null);
    setToast('');
  }, [loadRound]);

  const clearToast = useCallback(() => setToast(''), []);

  useEffect(() => {
    resetRound();
  }, [resetRound]);

  return {
    englishCards,
    chineseTargets,
    matchedCount,
    total,
    errors,
    elapsedMs,
    accuracy,
    toast,
    loading,
    loadError,
    finished,
    commitMatch,
    clearToast,
    resetRound,
  };
}
