// ポップアップUI制御

document.addEventListener('DOMContentLoaded', async () => {
  console.log('ポップアップUI読み込み完了');

  // 現在の状態を取得
  const state = await chrome.storage.local.get([
    'autoPlayEnabled',
    'currentIndex',
    'currentPlaylist'
  ]);

  console.log('現在の状態:', state);
  updateUI(state);

  // トグルボタン
  document.getElementById('btn-toggle').addEventListener('click', async () => {
    const currentState = await chrome.storage.local.get('autoPlayEnabled');
    const newState = !currentState.autoPlayEnabled;

    await chrome.storage.local.set({ autoPlayEnabled: newState });

    // アクティブタブのコンテンツスクリプトにメッセージを送信
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('youtube.com')) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggleAutoPlay' });
      }
    } catch (error) {
      console.log('タブへのメッセージ送信エラー:', error);
    }

    updateUI({ ...currentState, autoPlayEnabled: newState });
  });

  // リセットボタン
  document.getElementById('btn-reset').addEventListener('click', async () => {
    await chrome.storage.local.set({
      autoPlayEnabled: false,
      currentIndex: -1,
      currentPlaylist: []
    });

    updateUI({
      autoPlayEnabled: false,
      currentIndex: -1,
      currentPlaylist: []
    });

    console.log('状態をリセットしました');
  });

  // ストレージの変更を監視
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      chrome.storage.local.get([
        'autoPlayEnabled',
        'currentIndex',
        'currentPlaylist'
      ], (state) => {
        updateUI(state);
      });
    }
  });
});

// UIを更新
function updateUI(state) {
  const autoPlayStatus = document.getElementById('status-autoplay');
  const positionStatus = document.getElementById('status-position');
  const toggleBtn = document.getElementById('btn-toggle');

  // 自動再生ステータス
  autoPlayStatus.textContent = state.autoPlayEnabled ? 'ON' : 'OFF';
  autoPlayStatus.className = state.autoPlayEnabled ? 'value active' : 'value';

  // 現在の位置
  const current = (state.currentIndex || -1) + 1;
  const total = state.currentPlaylist ? state.currentPlaylist.length : 0;
  positionStatus.textContent = `${Math.max(0, current)} / ${total}`;

  // トグルボタンのテキスト
  toggleBtn.textContent = state.autoPlayEnabled ? '自動再生を停止' : '自動再生を開始';
  toggleBtn.className = state.autoPlayEnabled ? 'btn btn-danger' : 'btn btn-primary';
}
