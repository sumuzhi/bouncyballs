import ReactDOM from 'react-dom/client';
import App from './App';

let root = null;

function renderApp() {
  const container = document.getElementById('root');
  if (!container) {
    return;
  }
  if (!root) {
    root = ReactDOM.createRoot(container);
  }
  root.render(<App />);
}

function mount() {
  renderApp();
  window.$wujie?.props?.closeLoading?.();
}

function unmount() {
  if (root) {
    root.unmount();
    root = null;
  }
}

if (window.__POWERED_BY_WUJIE__) {
  window.__WUJIE_MOUNT = mount;
  window.__WUJIE_UNMOUNT = unmount;
} else {
  mount();
}
