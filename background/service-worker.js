// バックグラウンドサービスワーカー

/**
 * 開発モードフラグ
 * @type {boolean}
 */
const DEBUG_MODE = false;

/**
 * デバッグログを出力
 * @param {...any} args - ログ引数
 */
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log('[ServiceWorker]', ...args);
  }
}

/**
 * 拡張機能のインストール時の初期化
 */
chrome.runtime.onInstalled.addListener(() => {
  debugLog('YouTube Auto Player インストール完了');

  // 初期設定
  chrome.storage.local.set({
    autoPlayEnabled: false,
    autoNextEnabled: true,
    currentIndex: -1,
    currentPlaylist: []
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('[ServiceWorker] 初期設定エラー:', chrome.runtime.lastError);
    }
  });
});

/**
 * 拡張機能アイコンクリック時の処理
 */
chrome.action.onClicked.addListener(async (tab) => {
  debugLog('アイコンクリック:', tab.url);

  // YouTubeページかチェック
  if (!tab.url || !tab.url.includes('youtube.com')) {
    // YouTubeページでない場合はサブスクリプションページを開く
    chrome.tabs.update(tab.id, { url: 'https://www.youtube.com/feed/subscriptions' });
    return;
  }

  try {
    // コンテンツスクリプトに動画収集と再生開始を指示
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'collectAndPlay' });
    debugLog('収集結果:', response);
  } catch (error) {
    console.error('[ServiceWorker] 収集エラー:', error);
    // コンテンツスクリプトが読み込まれていない場合はページを再読み込み
    chrome.tabs.reload(tab.id);
  }
});

/**
 * メッセージハンドラ
 * @param {Object} request - リクエストオブジェクト
 * @param {chrome.runtime.MessageSender} sender - 送信者情報
 * @param {function} sendResponse - レスポンス送信関数
 * @returns {boolean} 非同期レスポンスの場合はtrue
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('メッセージ受信:', request);

  try {
    if (request.action === 'getState') {
      // 状態を取得
      chrome.storage.local.get(['autoPlayEnabled', 'currentIndex', 'currentPlaylist'], (data) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse(data);
        }
      });
      return true; // 非同期レスポンス
    }

    if (request.action === 'setState') {
      // 状態を設定
      chrome.storage.local.set(request.data, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true });
        }
      });
      return true;
    }

    if (request.action === 'toggleAutoPlay') {
      // 自動再生を切り替え
      chrome.storage.local.get(['autoPlayEnabled'], (data) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }

        const newState = !data.autoPlayEnabled;
        chrome.storage.local.set({ autoPlayEnabled: newState }, () => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ autoPlayEnabled: newState });
          }
        });
      });
      return true;
    }
  } catch (error) {
    console.error('[ServiceWorker] メッセージ処理エラー:', error);
    sendResponse({ error: error.message });
    return true;
  }

  return false;
});

/**
 * ストレージ変更の監視
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    debugLog('ストレージ変更:', changes);
  }
});
