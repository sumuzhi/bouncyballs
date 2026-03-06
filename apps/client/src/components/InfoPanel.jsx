import styles from './InfoPanel.module.less';

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
        className={ball?.stroke ? styles.strokeVisible : styles.strokeHidden}
      />
      {ball?.audio ? (
        <button
          id="play-audio-btn"
          title="播放读音"
          onClick={(event) => {
            event.stopPropagation();
            onPlayAudio(ball?.audio);
          }}
        >
          🔊
        </button>
      ) : null}
      <div id="info-examples">
        {(ball?.examples?.length ? ball.examples : ['暂无组词']).map((example) => (
          <span className="example-tag" key={example}>
            {example}
          </span>
        ))}
      </div>
      <p className={styles.tipText}>
        点击生字查看详情
      </p>
    </div>
  );
}
