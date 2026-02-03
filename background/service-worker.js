// バックグラウンドサービスワーカー

// 拡張機能のインストール時
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Auto Player インストール完了');

  // 初期設定
  chrome.storage.local.set({
    autoPlayEnabled: false,
    currentIndex: -1,
    currentPlaylist: []
  });
});

// メッセージハンドラ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('メッセージ受信:', request);

  if (request.action === 'getState') {
    // 状態を取得
    chrome.storage.local.get(['autoPlayEnabled', 'currentIndex', 'currentPlaylist'], (data) => {
      sendResponse(data);
    });
    return true; // 非同期レスポンス
  }

  if (request.action === 'setState') {
    // 状態を設定
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'toggleAutoPlay') {
    // 自動再生を切り替え
    chrome.storage.local.get(['autoPlayEnabled'], (data) => {
      const newState = !data.autoPlayEnabled;
      chrome.storage.local.set({ autoPlayEnabled: newState }, () => {
        sendResponse({ autoPlayEnabled: newState });
      });
    });
    return true;
  }
});

// ストレージ変更の監視
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    console.log('ストレージ変更:', changes);
  }
});
