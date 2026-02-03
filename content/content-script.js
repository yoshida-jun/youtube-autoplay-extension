// メインコントローラークラス
class AutoPlayController {
  constructor() {
    this.videoDetector = new VideoDetector();
    this.playerController = new PlayerController();
    this.uiInjector = new UIInjector();

    this.videoList = [];
    this.currentIndex = -1;
    this.autoPlayEnabled = false;
    this.isInitialized = false;
  }

  // 初期化
  async init() {
    console.log('YouTube Auto Player 初期化中...');

    // ストレージから状態を復元
    await this.restoreState();

    // ページタイプを判定
    const pageType = this.videoDetector.detectPageType();
    console.log('ページタイプ:', pageType);

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
  }

  // 一覧ページの初期化
  initListPage() {
    console.log('一覧ページを初期化');

    // 動画リストを取得（少し遅延させる）
    setTimeout(() => {
      this.updateVideoList();

      // UIを挿入
      this.uiInjector.inject();
      this.updateUI();

      // 動画リストの変更を監視
      this.videoDetector.observeVideoList((videoList) => {
        this.videoList = videoList;
        this.updateUI();
      });

      // イベントリスナー
      this.attachEventListeners();
    }, 1000);
  }

  // 視聴ページの初期化
  initWatchPage() {
    console.log('視聴ページを初期化');
    console.log('自動再生状態:', this.autoPlayEnabled ? 'ON' : 'OFF');

    // UIを挿入
    this.uiInjector.inject();
    this.updateUI();

    // 動画終了を監視
    this.playerController.watchVideoEnd(() => {
      console.log('動画終了イベント受信');
      console.log('現在の自動再生状態:', this.autoPlayEnabled);
      if (this.autoPlayEnabled) {
        console.log('自動再生が有効 - 次の動画に進みます');
        setTimeout(() => {
          this.playNextVideo();
        }, 1000);
      } else {
        console.log('自動再生が無効 - 停止します');
      }
    });

    // 現在の動画がリスト内のどれかを特定
    const currentVideoId = this.playerController.getCurrentVideoId();
    this.findCurrentIndex(currentVideoId);

    // イベントリスナー
    this.attachEventListeners();
  }

  // イベントリスナーを設定
  attachEventListeners() {
    // 自動再生トグル
    window.addEventListener('yt-autoplay-toggle', () => {
      this.toggleAutoPlay();
    });

    // 次へボタン
    window.addEventListener('yt-autoplay-next', () => {
      this.playNextVideo();
    });
  }

  // 動画リストを更新
  updateVideoList() {
    this.videoList = this.videoDetector.getVideoList();
    console.log('動画リスト更新:', this.videoList.length, '件');

    // リストを保存
    this.saveState();
  }

  // 現在のインデックスを特定
  findCurrentIndex(videoId) {
    if (!videoId) return;

    const index = this.videoList.findIndex(video =>
      video.url.includes(`v=${videoId}`)
    );

    if (index !== -1) {
      console.log('現在の動画インデックス:', index);
      this.currentIndex = index;
      this.saveState();
      this.updateUI();
    }
  }

  // 自動再生の切り替え
  async toggleAutoPlay() {
    this.autoPlayEnabled = !this.autoPlayEnabled;
    console.log('自動再生:', this.autoPlayEnabled ? 'ON' : 'OFF');
    await this.saveState();
    this.updateUI();
  }

  // 次の動画を再生
  async playNextVideo() {
    if (this.videoList.length === 0) {
      console.log('動画リストが空です');
      return;
    }

    // 次のインデックスを計算
    this.currentIndex = (this.currentIndex + 1) % this.videoList.length;
    console.log('次の動画インデックス:', this.currentIndex);

    const nextVideo = this.videoList[this.currentIndex];

    if (nextVideo) {
      console.log('次の動画に遷移:', nextVideo.title);
      await this.saveState();
      this.playerController.navigateToVideo(nextVideo.url);
    }
  }

  // UIを更新
  updateUI() {
    this.uiInjector.updateState(
      this.currentIndex + 1,
      this.videoList.length,
      this.autoPlayEnabled
    );
  }

  // 状態を保存
  async saveState() {
    await StorageManager.set({
      [STORAGE_KEYS.AUTO_PLAY_ENABLED]: this.autoPlayEnabled,
      [STORAGE_KEYS.CURRENT_INDEX]: this.currentIndex,
      [STORAGE_KEYS.CURRENT_PLAYLIST]: this.videoList.map(v => ({
        url: v.url,
        title: v.title
      }))
    });
  }

  // 状態を復元
  async restoreState() {
    const data = await StorageManager.get([
      STORAGE_KEYS.AUTO_PLAY_ENABLED,
      STORAGE_KEYS.CURRENT_INDEX,
      STORAGE_KEYS.CURRENT_PLAYLIST
    ]);

    // デフォルトでtrueに変更（初回起動時のみ）
    this.autoPlayEnabled = data[STORAGE_KEYS.AUTO_PLAY_ENABLED] !== undefined
      ? data[STORAGE_KEYS.AUTO_PLAY_ENABLED]
      : true;
    this.currentIndex = data[STORAGE_KEYS.CURRENT_INDEX] || -1;

    if (data[STORAGE_KEYS.CURRENT_PLAYLIST]) {
      this.videoList = data[STORAGE_KEYS.CURRENT_PLAYLIST];
    }

    console.log('状態を復元:', {
      autoPlayEnabled: this.autoPlayEnabled,
      currentIndex: this.currentIndex,
      videoCount: this.videoList.length
    });
  }

  // ページ遷移を監視
  observePageChanges() {
    let lastUrl = window.location.href;

    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href;

      if (currentUrl !== lastUrl) {
        console.log('ページ遷移を検知:', currentUrl);
        lastUrl = currentUrl;

        // UIとオブザーバーをクリア
        this.uiInjector.remove();
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

// 初期化処理
console.log('YouTube Auto Player コンテンツスクリプト読み込み完了');

// DOMContentLoadedまたはページ読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const controller = new AutoPlayController();
    setTimeout(() => controller.init(), 2000);
  });
} else {
  const controller = new AutoPlayController();
  setTimeout(() => controller.init(), 2000);
}
