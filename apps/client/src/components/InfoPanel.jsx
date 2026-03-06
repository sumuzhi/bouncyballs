import styles from './InfoPanel.module.less';

export default function InfoPanel({ ball, onPlayAudio, onOpenDetail }) {
  return (
    <div
      className={ball ? `${styles.infoPanel} ${styles.visible}` : styles.infoPanel}
      onClick={ball ? onOpenDetail : undefined}
    >
      <h2 className={styles.infoChar}>{ball?.char || '汉'}</h2>
      <p className={styles.infoPinyin}>{ball?.pinyin || 'hàn'}</p>
      <img
        className={ball?.stroke ? `${styles.strokeGif} ${styles.strokeVisible}` : `${styles.strokeGif} ${styles.strokeHidden}`}
        src={ball?.stroke || ''}
        alt="笔画"
      />
      {ball?.audio ? (
        <button
          className={styles.playAudioBtn}
          title="播放读音"
          onClick={(event) => {
            event.stopPropagation();
            onPlayAudio(ball?.audio);
          }}
        >
          🔊
        </button>
      ) : null}
      <div className={styles.infoExamples}>
        {(ball?.examples?.length ? ball.examples : ['暂无组词']).map((example) => (
          <span className={styles.exampleTag} key={example}>
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
