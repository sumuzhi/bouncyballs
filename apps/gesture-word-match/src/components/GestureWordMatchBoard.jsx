import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useWordMatchGame from '../hooks/useWordMatchGame';
import useHandGestureDrag from '../hooks/useHandGestureDrag';
import styles from './GestureWordMatchBoard.module.less';

const CARD_WIDTH = 180;
const CARD_HEIGHT = 68;
const TARGET_WIDTH = 220;
const TARGET_HEIGHT = 68;

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function randomizeCardPositions(cards, width, height) {
  const leftZoneWidth = Math.max(width * 0.44, CARD_WIDTH + 24);
  const rowGap = Math.max(14, (height - cards.length * CARD_HEIGHT) / (cards.length + 1));
  const map = {};
  cards.forEach((card, index) => {
    const y = rowGap + index * (CARD_HEIGHT + rowGap);
    const xPadding = Math.max(12, leftZoneWidth - CARD_WIDTH - 24);
    const x = 12 + Math.random() * xPadding;
    map[card.id] = {
      x,
      y: Math.max(12, Math.min(y, height - CARD_HEIGHT - 12)),
      originX: x,
      originY: Math.max(12, Math.min(y, height - CARD_HEIGHT - 12)),
    };
  });
  return map;
}

export default function GestureWordMatchBoard() {
  const boardRef = useRef(null);
  const videoRef = useRef(null);
  const grabOffsetRef = useRef({ dx: CARD_WIDTH / 2, dy: CARD_HEIGHT / 2 });
  const [boardSize, setBoardSize] = useState({ width: 980, height: 620 });
  const [cardPositions, setCardPositions] = useState({});
  const [cursorSensitivity, setCursorSensitivity] = useState(1.9);
  const [fistStartRatio, setFistStartRatio] = useState(1.08);
  const {
    englishCards,
    chineseTargets,
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
  } = useWordMatchGame();

  const targetsLayout = useMemo(() => {
    const top = 42;
    const availableHeight = boardSize.height - top * 2;
    const gap =
      chineseTargets.length > 1
        ? (availableHeight - chineseTargets.length * TARGET_HEIGHT) /
          (chineseTargets.length - 1)
        : 0;
    return chineseTargets.map((target, index) => ({
      ...target,
      x: Math.max(boardSize.width * 0.66, boardSize.width - TARGET_WIDTH - 24),
      y: top + index * (TARGET_HEIGHT + Math.max(14, gap)),
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
    }));
  }, [boardSize.height, boardSize.width, chineseTargets]);

  useEffect(() => {
    setCardPositions(randomizeCardPositions(englishCards, boardSize.width, boardSize.height));
  }, [boardSize.height, boardSize.width, englishCards]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    const timer = setTimeout(() => clearToast(), 1300);
    return () => clearTimeout(timer);
  }, [clearToast, toast]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) {
      return undefined;
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) {
        return;
      }
      setBoardSize({
        width: rect.width,
        height: rect.height,
      });
    });
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  const onPickCard = useCallback(
    (point) => {
      const pickableCards = englishCards.filter((card) => !card.matched);
      for (let i = pickableCards.length - 1; i >= 0; i -= 1) {
        const card = pickableCards[i];
        const pos = cardPositions[card.id];
        if (!pos) {
          continue;
        }
        const isInside =
          point.x >= pos.x &&
          point.x <= pos.x + CARD_WIDTH &&
          point.y >= pos.y &&
          point.y <= pos.y + CARD_HEIGHT;
        if (isInside) {
          grabOffsetRef.current = {
            dx: point.x - pos.x,
            dy: point.y - pos.y,
          };
          return card.id;
        }
      }
      return '';
    },
    [cardPositions, englishCards],
  );

  const onMoveCard = useCallback((cardId, point) => {
    setCardPositions((prev) => {
      const current = prev[cardId];
      if (!current) {
        return prev;
      }
      const nextX = Math.min(
        Math.max(point.x - grabOffsetRef.current.dx, 0),
        boardSize.width - CARD_WIDTH,
      );
      const nextY = Math.min(
        Math.max(point.y - grabOffsetRef.current.dy, 0),
        boardSize.height - CARD_HEIGHT,
      );
      return {
        ...prev,
        [cardId]: {
          ...current,
          x: nextX,
          y: nextY,
        },
      };
    });
  }, [boardSize.height, boardSize.width]);

  const onDropCard = useCallback((cardId, point) => {
    setCardPositions((prev) => {
      const current = prev[cardId];
      if (!current) {
        return prev;
      }
      if (!point) {
        return {
          ...prev,
          [cardId]: { ...current, x: current.originX, y: current.originY },
        };
      }
      const target = targetsLayout.find(
        (item) =>
          point.x >= item.x &&
          point.x <= item.x + item.width &&
          point.y >= item.y &&
          point.y <= item.y + item.height,
      );
      if (!target) {
        return {
          ...prev,
          [cardId]: { ...current, x: current.originX, y: current.originY },
        };
      }
      const matched = commitMatch(cardId, target.id);
      if (!matched) {
        return {
          ...prev,
          [cardId]: { ...current, x: current.originX, y: current.originY },
        };
      }
      return {
        ...prev,
        [cardId]: {
          ...current,
          x: target.x + (target.width - CARD_WIDTH) / 2,
          y: target.y,
          originX: target.x + (target.width - CARD_WIDTH) / 2,
          originY: target.y,
        },
      };
    });
  }, [commitMatch, targetsLayout]);

  const { ready, cameraReady, error, cursor, draggingCardId, resetCursorToCenter } = useHandGestureDrag({
    videoRef,
    boardRef,
    onPickCard,
    onMoveCard,
    onDropCard,
    cursorSensitivity,
    fistStartRatio,
  });

  return (
    <div className={styles.page}>
      <div className={`glass-panel ${styles.header}`}>
        <div className={styles.titleGroup}>
          <h2>手势单词配对</h2>
          <span>左侧摄像头识别手势，握拳抓取卡片，松拳完成释放</span>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={`glass-panel ${styles.sidePanel}`}>
          <div className={styles.cameraWrap}>
            <video ref={videoRef} autoPlay playsInline muted className={styles.camera} />
          </div>
          <div className={styles.sideActions}>
            <button type='button' onClick={resetRound} className={styles.randomButton}>
              随机重生单词
            </button>
            <button type='button' onClick={resetCursorToCenter} className={styles.resetCursorButton}>
              重置光标到中心
            </button>
          </div>
          <div className={styles.sensitivityPanel}>
            <div className={styles.sensitivityHeader}>
              <span>光标灵敏度</span>
              <strong>{cursorSensitivity.toFixed(2)}x</strong>
            </div>
            <input
              type='range'
              min='0.8'
              max='3'
              step='0.05'
              value={cursorSensitivity}
              className={styles.sensitivityRange}
              onChange={(event) => setCursorSensitivity(Number(event.target.value))}
            />
          </div>
          <div className={styles.sensitivityPanel}>
            <div className={styles.sensitivityHeader}>
              <span>握拳阈值</span>
              <strong>{fistStartRatio.toFixed(2)}</strong>
            </div>
            <input
              type='range'
              min='0.9'
              max='1.35'
              step='0.01'
              value={fistStartRatio}
              className={styles.sensitivityRange}
              onChange={(event) => setFistStartRatio(Number(event.target.value))}
            />
          </div>
        </aside>

        <div className={`glass-panel ${styles.boardWrap}`} ref={boardRef}>
          <div className={styles.boardMask} />

          {targetsLayout.map((target) => (
            <div
              key={target.id}
              className={`${styles.target} ${target.matchedBy ? styles.targetMatched : ''}`}
              style={{
                left: target.x,
                top: target.y,
                width: target.width,
                height: target.height,
              }}
            >
              <span className={styles.targetLabel}>{target.label}</span>
            </div>
          ))}

          {englishCards
            .filter((card) => !card.matched)
            .map((card) => {
              const pos = cardPositions[card.id];
              if (!pos) {
                return null;
              }
              return (
                <div
                  key={card.id}
                  className={`${styles.card} ${
                    draggingCardId === card.id ? styles.cardDragging : ''
                  }`}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  }}
                >
                  {card.label}
                </div>
              );
            })}

          {cursor.active && (
            <div
              className={`${styles.cursor} ${cursor.pinch ? styles.cursorPinch : ''}`}
              style={{
                left: cursor.x,
                top: cursor.y,
              }}
            />
          )}

          {(loading || !cameraReady) && (
            <div className={styles.notice}>
              <span>
                {loading
                  ? '正在加载题库...'
                  : ready
                    ? '正在请求摄像头权限...'
                    : '正在加载手势模型...'}
              </span>
            </div>
          )}

          {(error || loadError) && (
            <div className={styles.noticeError}>
              <span>{error || loadError}</span>
            </div>
          )}

          {toast && <div className={styles.toast}>{toast}</div>}

          {finished && (
            <div className={styles.resultLayer}>
              <div className={styles.resultCard}>
                <h3>回合完成</h3>
                <p>总耗时：{formatSeconds(elapsedMs)}</p>
                <p>错误次数：{errors}</p>
                <p>准确率：{accuracy}%</p>
                <button type='button' onClick={resetRound} className={styles.restartButton}>
                  再来一局
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
