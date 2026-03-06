import styles from './GameHeader.module.less';

export default function GameHeader() {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>三年级生字跳跳乐</h1>
      <p className={styles.subtitle}>大声朗读，让汉字跳起来！</p>
    </div>
  );
}
