export default function DetailModal({ ball, visible, onClose, onPlayAudio }) {
  if (!visible || !ball) {
    return null;
  }

  return (
    <div id="detail-modal" className="visible" onClick={onClose}>
      <div className="detail-card" onClick={(event) => event.stopPropagation()}>
        <button className="close-detail-btn" onClick={onClose}>
          ×
        </button>
        <div className="detail-left">
          <div className="detail-pinyin">{ball.pinyin}</div>
          <h1 className="detail-char">{ball.char}</h1>
          <div className="detail-examples">
            {(ball.examples?.length ? ball.examples : ['暂无组词']).map((example) => (
              <span className="detail-example-tag" key={example}>
                {example}
              </span>
            ))}
          </div>
        </div>
        <div className="detail-right">
          {ball.stroke ? (
            <img className="detail-stroke-gif" src={ball.stroke} alt="笔画" />
          ) : null}
          {ball.audio ? (
            <button className="detail-audio-btn" onClick={() => onPlayAudio(ball.audio)}>
              🔊
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
