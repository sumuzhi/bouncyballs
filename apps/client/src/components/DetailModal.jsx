import styles from './DetailModal.module.less';

export default function DetailModal({ ball, visible, onClose, onPlayAudio }) {
  if (!visible || !ball) {
    return null;
  }

  return (
    <div className={styles.detailModal} onClick={onClose}>
      <div className={styles.detailCard} onClick={(event) => event.stopPropagation()}>
        <button className={styles.closeDetailButton} onClick={onClose}>
          ×
        </button>
        <div className={styles.detailLeft}>
          <div className={styles.detailPinyin}>{ball.pinyin}</div>
          <h1 className={styles.detailChar}>{ball.char}</h1>
          <div className={styles.detailExamples}>
            {(ball.examples?.length ? ball.examples : ['暂无组词']).map((example) => (
              <span className={styles.detailExampleTag} key={example}>
                {example}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.detailRight}>
          {ball.stroke ? (
            <img className={styles.detailStrokeGif} src={ball.stroke} alt="笔画" />
          ) : null}
          {ball.audio ? (
            <button className={styles.detailAudioButton} onClick={() => onPlayAudio(ball.audio)}>
              🔊
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
