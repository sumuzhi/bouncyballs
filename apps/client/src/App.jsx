import DetailModal from './components/DetailModal';
import GameControls from './components/GameControls';
import GameHeader from './components/GameHeader';
import InfoPanel from './components/InfoPanel';
import StartOverlay from './components/StartOverlay';
import { useBouncyGame } from './hooks/useBouncyGame';
import '../style.css';

export default function App() {
  const { canvasRef, state, actions } = useBouncyGame();

  return (
    <>
      <canvas id="canvas" ref={canvasRef} />
      <div id="ui-layer">
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
      <StartOverlay visible={state.overlayVisible} onStart={actions.startAudio} />
      <DetailModal
        ball={state.selectedBall}
        visible={state.detailVisible}
        onClose={actions.closeDetail}
        onPlayAudio={actions.playAudio}
      />
    </>
  );
}
