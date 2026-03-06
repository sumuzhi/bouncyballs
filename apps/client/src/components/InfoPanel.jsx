export default function InfoPanel({ ball, onPlayAudio, onOpenDetail }) {
  return (
    <div
      id="info-panel"
      className={ball ? 'visible' : ''}
      onClick={ball ? onOpenDetail : undefined}
    >
      <h2 id="info-char">{ball?.char || '汉'}</h2>
      <p id="info-pinyin">{ball?.pinyin || 'hàn'}</p>
      <img
        id="stroke-gif"
        src={ball?.stroke || ''}
        alt="笔画"
        style={{ display: ball?.stroke ? 'block' : 'none' }}
      />
      <button
        id="play-audio-btn"
        style={{ display: ball?.audio ? 'flex' : 'none' }}
        title="播放读音"
        onClick={(event) => {
          event.stopPropagation();
          onPlayAudio(ball?.audio);
        }}
      >
        🔊
      </button>
      <div id="info-examples">
        {(ball?.examples?.length ? ball.examples : ['暂无组词']).map((example) => (
          <span className="example-tag" key={example}>
            {example}
          </span>
        ))}
      </div>
      <p style={{ marginTop: 15, fontSize: '0.9rem', color: '#999' }}>
        点击生字查看详情
      </p>
    </div>
  );
}
