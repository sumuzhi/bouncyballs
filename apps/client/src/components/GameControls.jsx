import { useId } from 'react';
import styles from './GameControls.module.less';

export default function GameControls({
  isAudioActive,
  isPaused,
  onStart,
  onPause,
  onRefresh,
  onFullscreen,
  fullscreenText,
  sensitivity,
  onSensitivityChange,
  ballCountPercent,
  onBallCountChange,
  ballCountDisplay,
  volumePercent,
}) {
  const sensitivityId = useId();
  const ballCountId = useId();

  return (
    <div className={styles.controls}>
      <button className={styles.actionButton} onClick={onStart} disabled={isAudioActive}>
        {isAudioActive ? '麦克风监听中...' : '开始游戏'}
      </button>
      <button
        className={`${styles.actionButton} ${isAudioActive ? (isPaused ? styles.pauseContinue : styles.pauseActive) : ''}`}
        onClick={onPause}
        disabled={!isAudioActive}
      >
        {isPaused ? '继续' : '暂停'}
      </button>
      <button className={styles.actionButton} onClick={onRefresh}>
        换一批
      </button>
      <button className={styles.actionButton} onClick={onFullscreen}>
        {fullscreenText}
      </button>
      <div className={styles.controlGroup}>
        <label htmlFor={sensitivityId}>灵敏度:</label>
        <input
          type="range"
          className={styles.rangeInput}
          id={sensitivityId}
          min="0.5"
          max="3.0"
          step="0.1"
          value={sensitivity}
          onChange={(event) => onSensitivityChange(Number(event.target.value))}
        />
      </div>
      <div className={styles.controlGroup}>
        <label htmlFor={ballCountId}>生字量:</label>
        <input
          type="range"
          className={styles.rangeInput}
          id={ballCountId}
          min="1"
          max="100"
          step="1"
          value={ballCountPercent}
          onChange={(event) => onBallCountChange(Number(event.target.value))}
          title="调整显示生字的百分比"
        />
        <span className={styles.ballCountDisplay}>
          {ballCountDisplay}
        </span>
      </div>
      <div className={styles.statusIndicator}>
        <span>声音大小:</span>
        <div className={styles.volumeMeter}>
          <progress className={styles.volumeBar} max="100" value={volumePercent} />
        </div>
      </div>
    </div>
  );
}
