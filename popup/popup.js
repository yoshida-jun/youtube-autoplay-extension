// ポップアップUI制御

/**
 * 開発モードフラグ
 * @type {boolean}
 */
const DEBUG_MODE = false;

/**
 * 選択状態を管理
 * @type {Set<number>}
 */
let selectedIndexes = new Set();

/**
 * 現在のプレイリスト
 * @type {Array<{url: string, title: string}>}
 */
let currentPlaylist = [];

/**
 * デバッグログを出力
 * @param {...any} args - ログ引数
 */
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log('[Popup]', ...args);
  }
}

/**
 * UIを更新
 * @param {Object} state - 現在の状態
 */
function updateUI(state) {
  const autoPlayStatus = document.getElementById('status-autoplay');
  const selectedStatus = document.getElementById('status-selected');
  const toggleBtn = document.getElementById('btn-toggle');

  if (!autoPlayStatus || !selectedStatus || !toggleBtn) {
    console.error('[Popup] UI要素が見つかりません');
    return;
  }

  // 自動再生ステータス
  autoPlayStatus.textContent = state.autoPlayEnabled ? 'ON' : 'OFF';
  autoPlayStatus.className = state.autoPlayEnabled ? 'value active' : 'value';

  // プレイリストを保存
  currentPlaylist = state.currentPlaylist || [];

  // 選択状態を復元
  if (state.selectedIndexes) {
    selectedIndexes = new Set(state.selectedIndexes);
  }

  // 選択中の数
  const total = currentPlaylist.length;
  selectedStatus.textContent = `${selectedIndexes.size} / ${total}`;

  // トグルボタンの状態
  if (state.autoPlayEnabled) {
    toggleBtn.textContent = '再生停止';
    toggleBtn.className = 'btn btn-danger';
  } else {
    toggleBtn.textContent = '選択動画を再生';
    toggleBtn.className = 'btn btn-success';
    toggleBtn.disabled = selectedIndexes.size === 0;
  }

  // プレイリストを更新
  updatePlaylist(currentPlaylist, state.currentIndex || -1);
}

/**
 * プレイリストを更新
 * @param {Array<{url: string, title: string}>} playlist - プレイリスト
 * @param {number} currentIndex - 現在のインデックス
 */
function updatePlaylist(playlist, currentIndex) {
  const playlistEmpty = document.getElementById('playlist-empty');
  const playlistList = document.getElementById('playlist-list');
  const playlistFooter = document.getElementById('playlist-footer');
  const filterCount = document.getElementById('filter-count');

  if (!playlistEmpty || !playlistList) return;

  if (playlist.length === 0) {
    playlistEmpty.style.display = 'block';
    playlistList.classList.add('hidden');
    if (playlistFooter) playlistFooter.classList.add('hidden');
    return;
  }

  playlistEmpty.style.display = 'none';
  playlistList.classList.remove('hidden');
  if (playlistFooter) playlistFooter.classList.remove('hidden');

  // リストをクリアして再構築
  playlistList.innerHTML = '';

  playlist.forEach((video, index) => {
    const li = document.createElement('li');
    li.className = 'playlist-item' + (index === currentIndex ? ' current' : '');
    li.dataset.index = String(index);

    // チェックボックス
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'playlist-checkbox';
    checkbox.checked = selectedIndexes.has(index);
    checkbox.addEventListener('change', () => toggleSelection(index, checkbox.checked));

    // インデックス
    const indexSpan = document.createElement('span');
    indexSpan.className = 'playlist-index';
    indexSpan.textContent = String(index + 1);

    // タイトル
    const titleSpan = document.createElement('span');
    titleSpan.className = 'playlist-title';
    titleSpan.textContent = video.title || `動画 ${index + 1}`;
    titleSpan.title = video.title || `動画 ${index + 1}`;
    titleSpan.addEventListener('click', () => navigateToVideo(video.url, index));

    // 削除ボタン
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'playlist-delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'リストから削除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromPlaylist(index);
    });

    li.appendChild(checkbox);
    li.appendChild(indexSpan);
    li.appendChild(titleSpan);
    li.appendChild(deleteBtn);

    playlistList.appendChild(li);
  });

  // 件数表示
  if (filterCount) {
    filterCount.textContent = `${playlist.length}件`;
  }

  // 「すべて選択」チェックボックスの状態を更新
  updateSelectAllCheckbox();
}

/**
 * 選択状態を切り替え
 * @param {number} index - インデックス
 * @param {boolean} selected - 選択状態
 */
async function toggleSelection(index, selected) {
  if (selected) {
    selectedIndexes.add(index);
  } else {
    selectedIndexes.delete(index);
  }

  // ストレージに保存
  await chrome.storage.local.set({
    selectedIndexes: Array.from(selectedIndexes)
  });

  // UI更新
  const selectedStatus = document.getElementById('status-selected');
  if (selectedStatus) {
    selectedStatus.textContent = `${selectedIndexes.size} / ${currentPlaylist.length}`;
  }

  // 再生ボタンの状態
  const toggleBtn = document.getElementById('btn-toggle');
  if (toggleBtn && !toggleBtn.classList.contains('btn-danger')) {
    toggleBtn.disabled = selectedIndexes.size === 0;
  }

  updateSelectAllCheckbox();
}

/**
 * すべて選択チェックボックスの状態を更新
 */
function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('filter-select-all');
  if (selectAllCheckbox && currentPlaylist.length > 0) {
    const visibleItems = getVisibleIndexes();
    const allSelected = visibleItems.every(i => selectedIndexes.has(i));
    selectAllCheckbox.checked = allSelected && visibleItems.length > 0;
  }
}

/**
 * 表示中のアイテムのインデックスを取得
 * @returns {number[]}
 */
function getVisibleIndexes() {
  const items = document.querySelectorAll('.playlist-item:not(.filtered-out)');
  return Array.from(items).map(item => parseInt(item.dataset.index, 10));
}

/**
 * すべて選択/解除
 * @param {boolean} selectAll - すべて選択するか
 */
async function toggleSelectAll(selectAll) {
  const visibleIndexes = getVisibleIndexes();

  if (selectAll) {
    visibleIndexes.forEach(i => selectedIndexes.add(i));
  } else {
    visibleIndexes.forEach(i => selectedIndexes.delete(i));
  }

  // チェックボックスを更新
  document.querySelectorAll('.playlist-checkbox').forEach(checkbox => {
    const index = parseInt(checkbox.closest('.playlist-item').dataset.index, 10);
    if (visibleIndexes.includes(index)) {
      checkbox.checked = selectAll;
    }
  });

  // ストレージに保存
  await chrome.storage.local.set({
    selectedIndexes: Array.from(selectedIndexes)
  });

  // UI更新
  const selectedStatus = document.getElementById('status-selected');
  if (selectedStatus) {
    selectedStatus.textContent = `${selectedIndexes.size} / ${currentPlaylist.length}`;
  }

  const toggleBtn = document.getElementById('btn-toggle');
  if (toggleBtn && !toggleBtn.classList.contains('btn-danger')) {
    toggleBtn.disabled = selectedIndexes.size === 0;
  }
}

/**
 * キーワードでフィルタリング
 * @param {string} keyword - キーワード
 */
function filterByKeyword(keyword) {
  const items = document.querySelectorAll('.playlist-item');
  const lowerKeyword = keyword.toLowerCase().trim();
  let visibleCount = 0;

  items.forEach(item => {
    const title = item.querySelector('.playlist-title').textContent.toLowerCase();
    if (lowerKeyword === '' || title.includes(lowerKeyword)) {
      item.classList.remove('filtered-out');
      visibleCount++;
    } else {
      item.classList.add('filtered-out');
    }
  });

  // 件数表示
  const filterCount = document.getElementById('filter-count');
  if (filterCount) {
    filterCount.textContent = `${visibleCount}件表示`;
  }

  updateSelectAllCheckbox();
}

/**
 * ソート
 * @param {string} sortType - ソートタイプ
 */
function sortPlaylist(sortType) {
  const playlistList = document.getElementById('playlist-list');
  if (!playlistList) return;

  const items = Array.from(playlistList.querySelectorAll('.playlist-item'));

  items.sort((a, b) => {
    const titleA = a.querySelector('.playlist-title').textContent;
    const titleB = b.querySelector('.playlist-title').textContent;

    if (sortType === 'title-asc') {
      return titleA.localeCompare(titleB, 'ja');
    } else if (sortType === 'title-desc') {
      return titleB.localeCompare(titleA, 'ja');
    } else {
      // デフォルト: インデックス順
      return parseInt(a.dataset.index, 10) - parseInt(b.dataset.index, 10);
    }
  });

  // 並べ替え
  items.forEach(item => playlistList.appendChild(item));
}

/**
 * プレイリストから動画を削除
 * @param {number} index - 削除するインデックス
 */
async function removeFromPlaylist(index) {
  try {
    // プレイリストから削除
    currentPlaylist.splice(index, 1);

    // 選択状態を更新（インデックスを再計算）
    const newSelectedIndexes = new Set();
    selectedIndexes.forEach(i => {
      if (i < index) {
        newSelectedIndexes.add(i);
      } else if (i > index) {
        newSelectedIndexes.add(i - 1);
      }
      // i === index の場合は削除されるので追加しない
    });
    selectedIndexes = newSelectedIndexes;

    // 現在のインデックスも調整
    let newCurrentIndex = await chrome.storage.local.get('currentIndex');
    newCurrentIndex = newCurrentIndex.currentIndex || -1;
    if (newCurrentIndex >= index && newCurrentIndex > 0) {
      newCurrentIndex--;
    }

    // ストレージに保存
    await chrome.storage.local.set({
      currentPlaylist: currentPlaylist,
      selectedIndexes: Array.from(selectedIndexes),
      currentIndex: newCurrentIndex
    });

    // UI更新
    const state = await chrome.storage.local.get([
      'autoPlayEnabled',
      'currentIndex',
      'currentPlaylist',
      'selectedIndexes'
    ]);
    updateUI(state);

    debugLog('動画を削除:', index);
  } catch (error) {
    console.error('[Popup] 削除エラー:', error);
  }
}

/**
 * 動画に移動
 * @param {string} url - 動画URL
 * @param {number} index - インデックス
 */
async function navigateToVideo(url, index) {
  try {
    await chrome.storage.local.set({ currentIndex: index });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await chrome.tabs.update(tab.id, { url: url });
      debugLog('タブを更新:', url);
    }
  } catch (error) {
    console.error('[Popup] 動画移動エラー:', error);
  }
}

/**
 * 動画を収集
 */
async function collectVideos() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('youtube.com')) {
      alert('YouTubeページを開いてください');
      return;
    }

    // コンテンツスクリプトにメッセージを送信して動画リストを取得
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'collectVideos' });
    } catch (sendError) {
      // コンテンツスクリプトが読み込まれていない場合
      console.error('[Popup] メッセージ送信エラー:', sendError);
      alert('拡張機能の読み込みが完了していません。\n\nYouTubeページを再読み込み（F5キー）してから、もう一度お試しください。');
      return;
    }

    if (response && response.videos && response.videos.length > 0) {
      // すべて選択状態で保存
      const allIndexes = response.videos.map((_, i) => i);
      selectedIndexes = new Set(allIndexes);

      await chrome.storage.local.set({
        currentPlaylist: response.videos,
        selectedIndexes: allIndexes,
        currentIndex: -1
      });

      debugLog('動画を収集:', response.videos.length, '件');

      // UIを即座に更新
      const state = await chrome.storage.local.get([
        'autoPlayEnabled',
        'currentIndex',
        'currentPlaylist',
        'selectedIndexes'
      ]);
      updateUI(state);
    } else {
      alert('動画が見つかりませんでした。\n\n・検索結果ページ\n・チャンネルページ\n・プレイリストページ\n\nなどで実行してください。');
    }
  } catch (error) {
    console.error('[Popup] 動画収集エラー:', error);
    alert('動画の収集に失敗しました。\n\nYouTubeページを再読み込みしてください。');
  }
}

/**
 * 選択した動画で再生開始
 */
async function startPlayback() {
  if (selectedIndexes.size === 0) {
    alert('再生する動画を選択してください');
    return;
  }

  try {
    // 選択された動画のみでプレイリストを作成
    const selectedVideos = Array.from(selectedIndexes)
      .sort((a, b) => a - b)
      .map(i => currentPlaylist[i])
      .filter(v => v);

    await chrome.storage.local.set({
      currentPlaylist: selectedVideos,
      selectedIndexes: selectedVideos.map((_, i) => i),
      currentIndex: 0,
      autoPlayEnabled: true
    });

    // 最初の動画に移動
    if (selectedVideos.length > 0) {
      await navigateToVideo(selectedVideos[0].url, 0);
    }
  } catch (error) {
    console.error('[Popup] 再生開始エラー:', error);
  }
}

/**
 * 初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
  debugLog('ポップアップUI読み込み完了');

  try {
    // 現在の状態を取得
    const state = await chrome.storage.local.get([
      'autoPlayEnabled',
      'currentIndex',
      'currentPlaylist',
      'selectedIndexes'
    ]);

    debugLog('現在の状態:', state);
    updateUI(state);

    // 動画収集ボタン
    const collectBtn = document.getElementById('btn-collect');
    if (collectBtn) {
      collectBtn.addEventListener('click', collectVideos);
    }

    // 再生ボタン
    const toggleBtn = document.getElementById('btn-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', async () => {
        const currentState = await chrome.storage.local.get('autoPlayEnabled');

        if (currentState.autoPlayEnabled) {
          // 停止
          await chrome.storage.local.set({ autoPlayEnabled: false });
        } else {
          // 再生開始
          await startPlayback();
        }
      });
    }

    // リセットボタン
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        await chrome.storage.local.set({
          autoPlayEnabled: false,
          currentIndex: -1,
          currentPlaylist: [],
          selectedIndexes: []
        });

        selectedIndexes.clear();
        currentPlaylist = [];

        updateUI({
          autoPlayEnabled: false,
          currentIndex: -1,
          currentPlaylist: [],
          selectedIndexes: []
        });

        debugLog('状態をリセットしました');
      });
    }

    // キーワードフィルター
    const filterKeyword = document.getElementById('filter-keyword');
    if (filterKeyword) {
      filterKeyword.addEventListener('input', (e) => {
        filterByKeyword(e.target.value);
      });
    }

    // すべて選択
    const selectAllCheckbox = document.getElementById('filter-select-all');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        toggleSelectAll(e.target.checked);
      });
    }

    // ソート
    const filterSort = document.getElementById('filter-sort');
    if (filterSort) {
      filterSort.addEventListener('change', (e) => {
        sortPlaylist(e.target.value);
      });
    }

    // プレイリスト展開/折りたたみ
    const togglePlaylistBtn = document.getElementById('btn-toggle-playlist');
    const playlistContent = document.getElementById('playlist-content');
    const filterSection = document.getElementById('filter-section');

    if (togglePlaylistBtn && playlistContent) {
      togglePlaylistBtn.addEventListener('click', () => {
        const isCollapsed = playlistContent.classList.toggle('collapsed');
        togglePlaylistBtn.classList.toggle('collapsed', isCollapsed);
        togglePlaylistBtn.textContent = isCollapsed ? '▶' : '▼';
        if (filterSection) {
          filterSection.style.display = isCollapsed ? 'none' : 'block';
        }
      });
    }

    // ヘルプボタン
    const helpBtn = document.getElementById('btn-help');
    const helpSection = document.getElementById('help-section');
    const closeHelpBtn = document.getElementById('btn-close-help');

    if (helpBtn && helpSection) {
      helpBtn.addEventListener('click', () => {
        helpSection.classList.toggle('hidden');
      });
    }

    if (closeHelpBtn && helpSection) {
      closeHelpBtn.addEventListener('click', () => {
        helpSection.classList.add('hidden');
      });
    }

    // ストレージの変更を監視
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        chrome.storage.local.get([
          'autoPlayEnabled',
          'currentIndex',
          'currentPlaylist',
          'selectedIndexes'
        ], (state) => {
          if (chrome.runtime.lastError) {
            console.error('[Popup] ストレージ取得エラー:', chrome.runtime.lastError);
            return;
          }
          updateUI(state);
        });
      }
    });
  } catch (error) {
    console.error('[Popup] 初期化エラー:', error);
  }
});
