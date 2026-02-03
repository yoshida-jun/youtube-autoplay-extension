// UI要素注入クラス
class UIInjector {
  constructor() {
    this.controlPanel = null;
  }

  // コントロールパネルを作成
  createControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'yt-autoplay-control';
    panel.className = 'yt-autoplay-panel';

    panel.innerHTML = `
      <div class="yt-autoplay-header">
        <span class="yt-autoplay-title">Auto Player</span>
        <button id="yt-autoplay-minimize" class="yt-autoplay-btn-icon">−</button>
      </div>
      <div class="yt-autoplay-body">
        <div class="yt-autoplay-status">
          <span id="yt-autoplay-current">0</span> / <span id="yt-autoplay-total">0</span>
        </div>
        <div class="yt-autoplay-controls">
          <button id="yt-autoplay-toggle" class="yt-autoplay-btn yt-autoplay-toggle-btn">
            <span class="yt-autoplay-icon" id="yt-autoplay-icon">▶</span>
            <span id="yt-autoplay-state-text">自動再生</span>
          </button>
          <button id="yt-autoplay-next" class="yt-autoplay-btn">
            次へ →
          </button>
        </div>
      </div>
    `;

    return panel;
  }

  // UIを挿入
  inject() {
    // 既存のパネルを削除
    this.remove();

    this.controlPanel = this.createControlPanel();
    document.body.appendChild(this.controlPanel);

    // イベントリスナーを設定
    this.attachEventListeners();
  }

  // イベントリスナーの設定
  attachEventListeners() {
    // 最小化ボタン
    const minimizeBtn = document.getElementById('yt-autoplay-minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        this.controlPanel.classList.toggle('minimized');
        minimizeBtn.textContent = this.controlPanel.classList.contains('minimized') ? '+' : '−';
      });
    }

    // 自動再生トグル
    const toggleBtn = document.getElementById('yt-autoplay-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('yt-autoplay-toggle'));
      });
    }

    // 次へボタン
    const nextBtn = document.getElementById('yt-autoplay-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('yt-autoplay-next'));
      });
    }
  }

  // 状態を更新
  updateState(current, total, isEnabled) {
    const currentEl = document.getElementById('yt-autoplay-current');
    const totalEl = document.getElementById('yt-autoplay-total');
    const iconEl = document.getElementById('yt-autoplay-icon');
    const toggleBtn = document.getElementById('yt-autoplay-toggle');

    if (currentEl) currentEl.textContent = current;
    if (totalEl) totalEl.textContent = total;

    if (iconEl) {
      iconEl.textContent = isEnabled ? '⏸' : '▶';
    }

    if (toggleBtn) {
      if (isEnabled) {
        toggleBtn.classList.add('active');
        toggleBtn.title = '自動再生を無効化';
      } else {
        toggleBtn.classList.remove('active');
        toggleBtn.title = '自動再生を有効化';
      }
    }
  }

  // UIを削除
  remove() {
    if (this.controlPanel) {
      this.controlPanel.remove();
      this.controlPanel = null;
    }
  }
}
