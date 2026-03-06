export default function StartOverlay({ visible, onStart }) {
  if (!visible) {
    return null;
  }

  return (
    <div id="overlay">
      <div className="modal">
        <h2>👋 小朋友你好！</h2>
        <p>这里有好多三年级要学的生字。</p>
        <p>它们很喜欢听你读书的声音。</p>
        <p>
          <strong>你的声音越大，跳起来的生字就越多哦！</strong>
        </p>
        <p>准备好了吗？点击下面的按钮开始吧！</p>
        <button id="modal-start-btn" onClick={onStart}>
          我准备好了！
        </button>
      </div>
    </div>
  );
}
