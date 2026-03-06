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
  return (
    <div id="controls">
      <button id="start-btn" onClick={onStart} disabled={isAudioActive}>
        {isAudioActive ? '麦克风监听中...' : '开始游戏'}
      </button>
      <button
        id="pause-btn"
        onClick={onPause}
        disabled={!isAudioActive}
        style={
          isAudioActive
            ? {
                background: isPaused
                  ? 'linear-gradient(45deg, #4caf50, #81c784)'
                  : 'linear-gradient(45deg, #ff6f00, #ffca28)',
                boxShadow: isPaused ? '0 4px 0 #388e3c' : '0 4px 0 #e65100',
              }
            : undefined
        }
      >
        {isPaused ? '继续' : '暂停'}
      </button>
      <button id="refresh-btn" onClick={onRefresh}>
        换一批
      </button>
      <button id="fullscreen-btn" onClick={onFullscreen}>
        {fullscreenText}
      </button>
      <div className="control-group">
        <label htmlFor="sensitivity">灵敏度:</label>
        <input
          type="range"
          id="sensitivity"
          min="0.5"
          max="3.0"
          step="0.1"
          value={sensitivity}
          onChange={(event) => onSensitivityChange(Number(event.target.value))}
        />
      </div>
      <div className="control-group">
        <label htmlFor="ball-count-percent">生字量:</label>
        <input
          type="range"
          id="ball-count-percent"
          min="1"
          max="100"
          step="1"
          value={ballCountPercent}
          onChange={(event) => onBallCountChange(Number(event.target.value))}
          title="调整显示生字的百分比"
        />
        <span id="ball-count-display" style={{ fontSize: 14, minWidth: 80 }}>
          {ballCountDisplay}
        </span>
      </div>
      <div className="status-indicator">
        <span>声音大小:</span>
        <div id="volume-meter">
          <div id="volume-bar" style={{ width: `${volumePercent}%` }} />
        </div>
      </div>
    </div>
  );
}
