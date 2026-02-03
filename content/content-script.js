// メインコントローラークラス

/**
 * 自動再生の制御を行うメインコントローラー
 */
class AutoPlayController {
  constructor() {
    /** @type {VideoDetector} */
    this.videoDetector = new VideoDetector();
    /** @type {PlayerController} */
    this.playerController = new PlayerController();
    /** @type {UIInjector} */
    this.uiInjector = new UIInjector();

    /** @type {Array<{url: string, title: string}>} */
    this.videoList = [];
    /** @type {number} */
    this.currentIndex = -1;
    /** @type {boolean} 連続再生モードが有効か（パネル表示用） */
    this.playbackActive = false;
    /** @type {boolean} 自動で次へ進むか（チェックボックス用） */
    this.autoNextEnabled = true;
    /** @type {boolean} */
    this.isInitialized = false;
    /** @type {boolean} イベントリスナーが設定済みか */
    this.eventListenersAttached = false;
  }

  /**
   * 初期化
   * @returns {Promise<void>}
   */
  async init() {
    Logger.log('AutoPlay', '初期化中...');

    try {
      // ストレージから状態を復元
      await this.restoreState();

      // ページタイプを判定
      const pageType = this.videoDetector.detectPageType();
      Logger.log('AutoPlay', 'ページタイプ:', pageType);

      if (pageType === 'WATCH') {
        // 動画視聴ページ
        this.initWatchPage();
      } else if (pageType !== 'UNKNOWN') {
        // 動画一覧ページ
        this.initListPage();
      }

      // ページ遷移を監視（YouTubeはSPA）
      if (!this.isInitialized) {
        this.observePageChanges();
        this.isInitialized = true;
      }
    } catch (error) {
      Logger.error('AutoPlay', '初期化エラー:', error);
    }
  }

  /**
   * 一覧ページの初期化
   */
  initListPage() {
    Logger.log('AutoPlay', '一覧ページを初期化');

    // 動画リストを取得（少し遅延させる）
    setTimeout(() => {
      // ローカルの表示用リストを更新（ストレージには保存しない）
      const pageVideos = this.videoDetector.getVideoList();
      Logger.log('AutoPlay', 'ページ内の動画:', pageVideos.length, '件');

      // 自動再生が有効な場合のみUIを表示
      this.updateUI();

      // イベントリスナー
      this.attachEventListeners();
    }, 1000);
  }

  /**
   * 視聴ページの初期化
   */
  initWatchPage() {
    Logger.log('AutoPlay', '視聴ページを初期化');
    Logger.log('AutoPlay', '連続再生モード:', this.playbackActive ? 'ON' : 'OFF');
    Logger.log('AutoPlay', '自動で次へ:', this.autoNextEnabled ? 'ON' : 'OFF');
    Logger.log('AutoPlay', 'プレイリスト件数:', this.videoList.length);

    // 連続再生中はYouTubeの自動再生を無効化＆広告スキップ監視開始
    if (this.playbackActive) {
      setTimeout(() => {
        this.playerController.disableYouTubeAutoplay();
      }, 2000);
      // 広告スキップ監視を開始
      this.playerController.startAdSkipWatcher();
    }

    // 現在の動画がリスト内のどれかを特定（UIより先に実行）
    const currentVideoId = this.playerController.getCurrentVideoId();
    this.findCurrentIndex(currentVideoId);

    // 自動再生が有効な場合のみUIを表示（インデックス特定後に表示）
    this.updateUI();

    // 連続再生中は動画情報バーを表示
    if (this.playbackActive) {
      this.uiInjector.updateVideoInfoBar();
    }

    // 動画終了を監視
    this.playerController.watchVideoEnd(() => {
      Logger.log('AutoPlay', '動画終了イベント受信');
      if (this.playbackActive && this.autoNextEnabled) {
        Logger.log('AutoPlay', '自動で次へが有効 - 次の動画に進みます');
        setTimeout(() => {
          this.playNextVideo();
        }, 1000);
      } else {
        Logger.log('AutoPlay', '自動で次へが無効 - 停止します');
      }
    });

    // イベントリスナー
    this.attachEventListeners();
  }

  /**
   * イベントリスナーを設定
   */
  attachEventListeners() {
    // グローバルフラグで重複登録を防止（インスタンス再作成でもリセットされない）
    if (globalEventListenersAttached) {
      Logger.log('AutoPlay', 'イベントリスナーは既に設定済み（グローバル）');
      return;
    }
    globalEventListenersAttached = true;
    Logger.log('AutoPlay', 'イベントリスナーを設定（グローバル）');

    // 自動で次へトグル（チェックボックス）
    window.addEventListener('yt-autoplay-toggle', () => {
      globalController.toggleAutoNext();
    });

    // 次へボタン
    window.addEventListener('yt-autoplay-next', () => {
      globalController.playNextVideo();
    });

    // 前へボタン
    window.addEventListener('yt-autoplay-prev', () => {
      globalController.playPrevVideo();
    });

    // 停止ボタン
    window.addEventListener('yt-autoplay-stop', () => {
      globalController.stopPlayback();
    });

    // 動画ジャンプ
    window.addEventListener('yt-autoplay-jump', (e) => {
      const index = e.detail.index;
      globalController.jumpToVideo(index);
    });

    // 動画削除
    window.addEventListener('yt-autoplay-delete', (e) => {
      const index = e.detail.index;
      globalController.deleteFromPlaylist(index);
    });

    // 動画収集
    window.addEventListener('yt-autoplay-collect', (e) => {
      const mode = e.detail.mode;
      globalController.collectVideos(mode);
    });

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      // 連続再生モードが無効なら無視
      if (!globalController || !globalController.playbackActive) return;

      // 広告再生中は無視（ただしスキップは試みる）
      if (globalController.playerController.isAdPlaying()) {
        // 広告中にNやPを押したらスキップを試みる
        if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          const skipped = globalController.playerController.trySkipAd();
          if (skipped) {
            Logger.log('AutoPlay', '広告をスキップしました');
          } else {
            Logger.log('AutoPlay', '広告再生中（スキップ不可）');
          }
        }
        return;
      }

      // 入力フィールドにフォーカスがある場合は無視
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable ||
        activeEl.closest('#search')
      )) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n': // 次の動画
          e.preventDefault();
          globalController.playNextVideo();
          break;
        case 'p': // 前の動画
          e.preventDefault();
          globalController.playPrevVideo();
          break;
        case 'a': // 自動で次へ トグル
          e.preventDefault();
          globalController.toggleAutoNext();
          break;
        case 'escape': // 連続再生を停止
          globalController.stopPlayback();
          break;
      }
    });
  }

  /**
   * 前の動画を再生
   * @returns {Promise<void>}
   */
  async playPrevVideo() {
    if (this.videoList.length === 0) {
      Logger.log('AutoPlay', '動画リストが空です');
      return;
    }

    // 前のインデックスを計算
    this.currentIndex = this.currentIndex <= 0
      ? this.videoList.length - 1
      : this.currentIndex - 1;
    Logger.log('AutoPlay', '前の動画インデックス:', this.currentIndex);

    const prevVideo = this.videoList[this.currentIndex];

    if (prevVideo && prevVideo.url) {
      Logger.log('AutoPlay', '前の動画に遷移:', prevVideo.title);
      await this.saveCurrentIndex();
      this.playerController.navigateToVideo(prevVideo.url);
    }
  }

  /**
   * 連続再生を停止
   * @returns {Promise<void>}
   */
  async stopPlayback() {
    this.playbackActive = false;
    Logger.log('AutoPlay', '連続再生を停止');
    await StorageManager.set({
      [STORAGE_KEYS.AUTO_PLAY_ENABLED]: false
    });
    this.updateUI();
  }

  /**
   * 指定した動画にジャンプ
   * @param {number} index - インデックス
   * @returns {Promise<void>}
   */
  async jumpToVideo(index) {
    if (index < 0 || index >= this.videoList.length) return;

    this.currentIndex = index;
    await this.saveCurrentIndex();

    const video = this.videoList[index];
    if (video && video.url) {
      Logger.log('AutoPlay', '動画にジャンプ:', video.title);
      this.playerController.navigateToVideo(video.url);
    }
  }

  /**
   * 動画を収集してプレイリストに追加または入れ替え
   * @param {'add'|'replace'} mode - 追加モードか入れ替えモードか
   * @returns {Promise<void>}
   */
  async collectVideos(mode) {
    Logger.log('AutoPlay', '動画収集開始:', mode);

    // 収集ボタンの状態を変更（フィードバック）
    const collectBtn = document.getElementById('yt-autoplay-collect');
    if (collectBtn) {
      collectBtn.textContent = '収集中...';
      collectBtn.disabled = true;
    }

    try {
      const videos = this.videoDetector.getVideoList();

      if (videos.length === 0) {
        Logger.log('AutoPlay', '収集できる動画がありません');
        this.showCollectResult('動画が見つかりません', false);
        return;
      }

      const newVideos = videos.map(v => ({ url: v.url, title: v.title, dateText: v.dateText || '' }));
      Logger.log('AutoPlay', '収集した動画:', newVideos.length, '件');

      let addedCount = 0;
      if (mode === 'replace') {
        // 入れ替え
        this.videoList = newVideos;
        this.currentIndex = 0;
        addedCount = newVideos.length;
      } else {
        // 追加（重複チェック）
        const existingUrls = new Set(this.videoList.map(v => v.url));
        const uniqueNewVideos = newVideos.filter(v => !existingUrls.has(v.url));
        this.videoList = [...this.videoList, ...uniqueNewVideos];
        addedCount = uniqueNewVideos.length;
        Logger.log('AutoPlay', '追加した動画（重複除外）:', addedCount, '件');
      }

      // ストレージに保存
      await StorageManager.set({
        [STORAGE_KEYS.CURRENT_PLAYLIST]: this.videoList,
        [STORAGE_KEYS.CURRENT_INDEX]: this.currentIndex
      });

      this.updateUI();

      // 結果を表示
      if (mode === 'replace') {
        this.showCollectResult(`${addedCount}件の動画を収集`, true);
      } else {
        this.showCollectResult(`${addedCount}件追加（重複除外）`, addedCount > 0);
      }
    } finally {
      // ボタンを元に戻す
      if (collectBtn) {
        collectBtn.textContent = '🔄 収集';
        collectBtn.disabled = false;
      }
    }
  }

  /**
   * 収集結果を一時的に表示
   * @param {string} message - メッセージ
   * @param {boolean} success - 成功かどうか
   */
  showCollectResult(message, success) {
    const collectBtn = document.getElementById('yt-autoplay-collect');
    if (!collectBtn) return;

    const originalText = collectBtn.textContent;
    collectBtn.textContent = success ? `✓ ${message}` : `✗ ${message}`;
    collectBtn.style.background = success ? '#4caf50' : '#f44336';

    setTimeout(() => {
      collectBtn.textContent = '🔄 収集';
      collectBtn.style.background = '';
    }, 2000);
  }

  /**
   * プレイリストから動画を削除
   * @param {number} index - インデックス
   * @returns {Promise<void>}
   */
  async deleteFromPlaylist(index) {
    if (index < 0 || index >= this.videoList.length) return;

    Logger.log('AutoPlay', '動画を削除:', this.videoList[index].title);

    // プレイリストから削除
    this.videoList.splice(index, 1);

    // 現在のインデックスを調整
    if (this.currentIndex >= index && this.currentIndex > 0) {
      this.currentIndex--;
    }

    // ストレージに保存
    await StorageManager.set({
      [STORAGE_KEYS.CURRENT_PLAYLIST]: this.videoList,
      [STORAGE_KEYS.CURRENT_INDEX]: this.currentIndex
    });

    this.updateUI();
  }

  /**
   * 現在のインデックスを特定
   * @param {string|null} videoId - 動画ID
   */
  findCurrentIndex(videoId) {
    if (!videoId || this.videoList.length === 0) return;

    const index = this.videoList.findIndex(video =>
      video.url && video.url.includes(`v=${videoId}`)
    );

    if (index !== -1) {
      Logger.log('AutoPlay', '現在の動画インデックス:', index);
      this.currentIndex = index;
      // インデックスのみ保存（プレイリストは上書きしない）
      this.saveCurrentIndex();
      // updateUIはinitWatchPage側で呼ばれるのでここでは呼ばない
    } else if (this.playbackActive) {
      // プレイリストにない動画に遷移した場合（YouTubeの自動再生など）
      // 正しい次の動画に戻す
      Logger.log('AutoPlay', 'プレイリスト外の動画を検知、正しい動画に遷移します');
      setTimeout(() => {
        const correctVideo = this.videoList[this.currentIndex];
        if (correctVideo && correctVideo.url) {
          const correctVideoId = new URL(correctVideo.url).searchParams.get('v');
          if (correctVideoId !== videoId) {
            Logger.log('AutoPlay', '正しい動画に遷移:', correctVideo.title);
            this.playerController.navigateToVideo(correctVideo.url);
          }
        }
      }, 500);
    }
  }

  /**
   * 「自動で次へ」の切り替え（チェックボックス用）
   * @returns {Promise<void>}
   */
  async toggleAutoNext() {
    this.autoNextEnabled = !this.autoNextEnabled;
    Logger.log('AutoPlay', '自動で次へ:', this.autoNextEnabled ? 'ON' : 'OFF');
    await this.saveAutoNextState();
    this.updateUI();
  }

  /**
   * 次の動画を再生
   * @returns {Promise<void>}
   */
  async playNextVideo() {
    if (this.videoList.length === 0) {
      Logger.log('AutoPlay', '動画リストが空です');
      return;
    }

    // 次のインデックスを計算
    this.currentIndex = (this.currentIndex + 1) % this.videoList.length;
    Logger.log('AutoPlay', '次の動画インデックス:', this.currentIndex);

    const nextVideo = this.videoList[this.currentIndex];

    if (nextVideo && nextVideo.url) {
      Logger.log('AutoPlay', '次の動画に遷移:', nextVideo.title);
      await this.saveCurrentIndex();
      this.playerController.navigateToVideo(nextVideo.url);
    }
  }

  /**
   * UIを更新
   */
  updateUI() {
    // 連続再生モードが有効な場合のみパネルを表示
    if (this.playbackActive) {
      if (!this.uiInjector.controlPanel) {
        this.uiInjector.inject();
      }
      this.uiInjector.updateState(
        this.currentIndex + 1,
        this.videoList.length,
        this.autoNextEnabled,
        this.videoList
      );
    } else {
      // 連続再生モードが無効な場合はパネルを非表示
      this.uiInjector.remove();
    }
  }

  /**
   * 「自動で次へ」状態のみ保存
   * @returns {Promise<void>}
   */
  async saveAutoNextState() {
    try {
      await StorageManager.set({
        autoNextEnabled: this.autoNextEnabled
      });
    } catch (error) {
      Logger.error('AutoPlay', '自動で次へ状態保存エラー:', error);
    }
  }

  /**
   * 現在のインデックスのみ保存
   * @returns {Promise<void>}
   */
  async saveCurrentIndex() {
    try {
      await StorageManager.set({
        [STORAGE_KEYS.CURRENT_INDEX]: this.currentIndex
      });
    } catch (error) {
      Logger.error('AutoPlay', 'インデックス保存エラー:', error);
    }
  }

  /**
   * 状態を復元
   * @returns {Promise<void>}
   */
  async restoreState() {
    try {
      const data = await StorageManager.get([
        STORAGE_KEYS.AUTO_PLAY_ENABLED,
        STORAGE_KEYS.CURRENT_INDEX,
        STORAGE_KEYS.CURRENT_PLAYLIST,
        'autoNextEnabled'
      ]);

      this.playbackActive = data[STORAGE_KEYS.AUTO_PLAY_ENABLED] === true;
      this.autoNextEnabled = data.autoNextEnabled !== false; // デフォルトはtrue
      this.currentIndex = data[STORAGE_KEYS.CURRENT_INDEX] !== undefined
        ? data[STORAGE_KEYS.CURRENT_INDEX]
        : -1;

      if (data[STORAGE_KEYS.CURRENT_PLAYLIST] && Array.isArray(data[STORAGE_KEYS.CURRENT_PLAYLIST])) {
        this.videoList = data[STORAGE_KEYS.CURRENT_PLAYLIST];
      }

      Logger.log('AutoPlay', '状態を復元:', {
        playbackActive: this.playbackActive,
        autoNextEnabled: this.autoNextEnabled,
        currentIndex: this.currentIndex,
        videoCount: this.videoList.length
      });
    } catch (error) {
      Logger.error('AutoPlay', '状態復元エラー:', error);
    }
  }

  /**
   * ページ遷移を監視
   */
  observePageChanges() {
    let lastUrl = window.location.href;

    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href;

      if (currentUrl !== lastUrl) {
        Logger.log('AutoPlay', 'ページ遷移を検知:', currentUrl);
        lastUrl = currentUrl;

        // オブザーバーをクリア（UIは削除しない - playbackActiveなら維持）
        this.videoDetector.stopObserving();
        this.playerController.cleanup();

        // 再初期化
        setTimeout(() => {
          this.init();
        }, 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// グローバルコントローラー
let globalController = null;
// グローバルでイベントリスナー登録済みフラグを管理（インスタンス再作成でもリセットされない）
let globalEventListenersAttached = false;

// 初期化処理
Logger.log('AutoPlay', 'コンテンツスクリプト読み込み完了');

/**
 * 即座にUIを初期化（ストレージから状態を読み取る）
 */
async function immediateInit() {
  globalController = new AutoPlayController();

  // 即座にストレージから状態を復元してUIを表示
  try {
    const data = await chrome.storage.local.get([
      'autoPlayEnabled',
      'currentIndex',
      'currentPlaylist',
      'autoNextEnabled'
    ]);

    globalController.playbackActive = data.autoPlayEnabled === true;
    globalController.autoNextEnabled = data.autoNextEnabled !== false;
    globalController.currentIndex = data.currentIndex ?? -1;
    globalController.videoList = data.currentPlaylist || [];

    // 視聴ページの場合、現在のURLに基づいてインデックスを検証・更新
    if (globalController.playbackActive && globalController.videoList.length > 0) {
      const currentVideoId = globalController.playerController.getCurrentVideoId();
      if (currentVideoId) {
        // findCurrentIndexを呼び出してURLに基づく正しいインデックスを設定
        globalController.findCurrentIndex(currentVideoId);
      }
    }

    Logger.log('AutoPlay', '即座に状態復元:', {
      playbackActive: globalController.playbackActive,
      videoCount: globalController.videoList.length,
      currentIndex: globalController.currentIndex
    });

    // playbackActiveがtrueなら即座にパネルを表示
    if (globalController.playbackActive) {
      globalController.updateUI();
      // イベントリスナーも即座に設定（×ボタンなどが動作するように）
      globalController.attachEventListeners();
    }
  } catch (error) {
    Logger.error('AutoPlay', '即座復元エラー:', error);
  }

  // 通常の初期化も実行（動画終了監視などのため）
  setTimeout(() => globalController.init(), 2000);
}

// DOMContentLoadedまたはページ読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    immediateInit();
  });
} else {
  immediateInit();
}

// ストレージ変更を監視（即座にUIを更新するため）
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && globalController) {
    Logger.log('AutoPlay', 'ストレージ変更検知:', changes);

    // autoPlayEnabledが変更された場合
    if (changes.autoPlayEnabled) {
      globalController.playbackActive = changes.autoPlayEnabled.newValue === true;
    }

    // autoNextEnabledが変更された場合
    if (changes.autoNextEnabled !== undefined) {
      globalController.autoNextEnabled = changes.autoNextEnabled.newValue !== false;
    }

    // currentPlaylistが変更された場合
    if (changes.currentPlaylist) {
      globalController.videoList = changes.currentPlaylist.newValue || [];
    }

    // currentIndexが変更された場合
    if (changes.currentIndex !== undefined) {
      globalController.currentIndex = changes.currentIndex.newValue ?? -1;
    }

    // UIを更新
    globalController.updateUI();
  }
});

// ポップアップからのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  Logger.log('AutoPlay', 'メッセージ受信:', request.action);

  if (request.action === 'collectVideos') {
    // 動画リストを収集
    const videoDetector = new VideoDetector();
    const videos = videoDetector.getVideoList();

    Logger.log('AutoPlay', '動画を収集:', videos.length, '件');

    sendResponse({
      videos: videos.map(v => ({
        url: v.url,
        title: v.title
      }))
    });
    return true;
  }

  if (request.action === 'collectAndPlay') {
    // 動画を収集して再生開始（アイコンクリック時）
    (async () => {
      try {
        // 既に連続再生中の場合は収集をスキップ
        if (globalController && globalController.playbackActive) {
          Logger.log('AutoPlay', '既に再生中のため収集をスキップ');
          sendResponse({ success: true, message: '既に再生中です' });
          return;
        }

        const videoDetector = new VideoDetector();
        const videos = videoDetector.getVideoList();

        Logger.log('AutoPlay', '動画を収集:', videos.length, '件');

        if (videos.length === 0) {
          sendResponse({ success: false, error: '動画が見つかりません' });
          return;
        }

        // すべての動画をプレイリストに追加
        const playlist = videos.map(v => ({ url: v.url, title: v.title, dateText: v.dateText || '' }));

        // ストレージに保存して再生開始
        await chrome.storage.local.set({
          currentPlaylist: playlist,
          selectedIndexes: playlist.map((_, i) => i),
          currentIndex: 0,
          autoPlayEnabled: true,
          autoNextEnabled: true
        });

        Logger.log('AutoPlay', 'ストレージ保存完了、遷移開始');

        // グローバルコントローラーの状態も更新
        if (globalController) {
          globalController.videoList = playlist;
          globalController.currentIndex = 0;
          globalController.playbackActive = true;
          globalController.autoNextEnabled = true;
        }

        sendResponse({ success: true, count: videos.length });

        // 少し遅延してから最初の動画に移動（ストレージ同期のため）
        setTimeout(() => {
          if (playlist[0] && playlist[0].url) {
            window.location.href = playlist[0].url;
          }
        }, 100);
      } catch (error) {
        Logger.error('AutoPlay', '収集エラー:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'toggleAutoNext') {
    if (globalController) {
      globalController.toggleAutoNext();
    }
    sendResponse({ success: true });
    return true;
  }

  return false;
});
