import { memo } from 'react';
import { useBouncyGame } from '../hooks/useBouncyGame';
import GameHeader from './GameHeader';
import DetailModal from './DetailModal';
import GameControls from './GameControls';
import InfoPanel from './InfoPanel';
import StartOverlay from './StartOverlay';
import styles from './AuthorizedGame.module.less';

function AuthorizedGame() {
  const { canvasRef, state, actions } = useBouncyGame();

  return (
    <>
      <canvas className={styles.canvas} ref={canvasRef} />
      <div className={styles.uiLayer}>
        <GameHeader />
        <InfoPanel
          ball={state.selectedBall}
          onPlayAudio={actions.playAudio}
          onOpenDetail={actions.openDetail}
        />
        <GameControls
          isAudioActive={state.isAudioActive}
          isPaused={state.isPaused}
          onStart={actions.startAudio}
          onPause={actions.togglePause}
          onRefresh={actions.refreshBalls}
          onFullscreen={actions.toggleFullscreen}
          fullscreenText={state.fullscreenText}
          sensitivity={state.sensitivity}
          onSensitivityChange={actions.onSensitivityChange}
          ballCountPercent={state.ballCountPercent}
          onBallCountChange={actions.onBallCountChange}
          ballCountDisplay={state.ballCountDisplay}
          volumePercent={state.volumePercent}
        />
      </div>
      <StartOverlay
        visible={state.overlayVisible}
        onStart={actions.startAudio}
      />
      <DetailModal
        ball={state.selectedBall}
        visible={state.detailVisible}
        onClose={actions.closeDetail}
        onPlayAudio={actions.playAudio}
      />
    </>
  );
}

export default memo(AuthorizedGame);
