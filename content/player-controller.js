// 動画プレイヤー制御クラス

/**
 * YouTubeプレイヤーを制御するクラス
 */
class PlayerController {
  constructor() {
    /** @type {HTMLVideoElement|null} */
    this.videoElement = null;
    /** @type {boolean} */
    this.isWatchingPlayer = false;
    /** @type {function|null} */
    this.endedListener = null;
    /** @type {function|null} */
    this.timeUpdateListener = null;
    /** @type {boolean} */
    this.endTriggered = false;
    /** @type {number|null} 広告スキップ監視用インターバル */
    this.adSkipInterval = null;
  }

  /**
   * 動画プレイヤー要素を取得
   * @returns {HTMLVideoElement|null}
   */
  getVideoPlayer() {
    return document.querySelector(YOUTUBE_SELECTORS.PLAYER.video);
  }

  /**
   * 動画終了を監視
   * @param {function(): void} callback - 動画終了時のコールバック
   */
  watchVideoEnd(callback) {
    const video = this.getVideoPlayer();

    if (!video) {
      // プレイヤーが見つからない場合、MutationObserverで待機
      this.waitForPlayer(() => this.watchVideoEnd(callback));
      return;
    }

    // 既存のリスナーをクリア
    this.cleanup();

    this.videoElement = video;
    this.isWatchingPlayer = true;
    this.endTriggered = false;

    // 終了コールバックをラップ（重複呼び出しを防止）
    const triggerEnd = () => {
      if (this.endTriggered) return;
      this.endTriggered = true;
      Logger.log('PlayerController', '動画が終了しました');
      callback();
    };

    // 動画終了イベントをリスン
    this.endedListener = triggerEnd;
    video.addEventListener('ended', this.endedListener);

    // フォールバック: timeupdate で終了間近を検出
    // (YouTubeが自動再生で割り込む場合の対策)
    this.timeUpdateListener = () => {
      if (this.endTriggered) return;
      if (video.duration && video.currentTime > 0) {
        const remaining = video.duration - video.currentTime;
        // 残り1秒以内で、動画が十分な長さ（10秒以上）の場合
        if (remaining < 1 && video.duration > 10) {
          Logger.log('PlayerController', '動画終了間近を検出');
          triggerEnd();
        }
      }
    };
    video.addEventListener('timeupdate', this.timeUpdateListener);
  }

  /**
   * プレイヤーの読み込みを待機
   * @param {function(): void} callback - 読み込み完了時のコールバック
   */
  waitForPlayer(callback) {
    let attempts = 0;
    const maxAttempts = 50;

    const checkInterval = setInterval(() => {
      const video = this.getVideoPlayer();
      if (video) {
        clearInterval(checkInterval);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        Logger.warn('PlayerController', '動画プレイヤーの読み込みがタイムアウトしました');
      }
      attempts++;
    }, 200);
  }

  /**
   * YouTubeの自動再生を無効化
   */
  disableYouTubeAutoplay() {
    // YouTubeの自動再生トグルを探す
    const autoplayToggle = document.querySelector('.ytp-autonav-toggle-button');
    if (autoplayToggle) {
      const isEnabled = autoplayToggle.getAttribute('aria-checked') === 'true';
      if (isEnabled) {
        Logger.log('PlayerController', 'YouTubeの自動再生を無効化');
        autoplayToggle.click();
      }
    }
  }

  /**
   * 次の動画に遷移
   * @param {string} videoUrl - 遷移先の動画URL
   */
  navigateToVideo(videoUrl) {
    if (!videoUrl || typeof videoUrl !== 'string') {
      Logger.error('PlayerController', '無効な動画URLです:', videoUrl);
      return;
    }

    // URLの基本的なバリデーション
    if (!videoUrl.includes('youtube.com/watch')) {
      Logger.error('PlayerController', 'YouTube動画URLではありません:', videoUrl);
      return;
    }

    Logger.log('PlayerController', '次の動画に遷移:', videoUrl);
    window.location.href = videoUrl;
  }

  /**
   * 現在再生中の動画IDを取得
   * @returns {string|null}
   */
  getCurrentVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  /**
   * 広告が再生中かどうかをチェック
   * @returns {boolean}
   */
  isAdPlaying() {
    // 複数の方法で広告を検出
    const playerContainer = document.querySelector('#movie_player');
    if (playerContainer) {
      // .ad-showingクラスが存在するか
      if (playerContainer.classList.contains('ad-showing')) {
        return true;
      }
      // .ad-interruptingクラスが存在するか
      if (playerContainer.classList.contains('ad-interrupting')) {
        return true;
      }
    }

    // 広告オーバーレイが存在するか
    const adOverlay = document.querySelector('.ytp-ad-player-overlay, .ytp-ad-player-overlay-instream-info');
    if (adOverlay) {
      return true;
    }

    // 広告テキストが表示されているか
    const adText = document.querySelector('.ytp-ad-text, .ytp-ad-preview-text');
    if (adText && adText.offsetParent !== null) {
      return true;
    }

    return false;
  }

  /**
   * 広告をスキップ（スキップボタンがあれば）
   * @returns {boolean} スキップできたかどうか
   */
  trySkipAd() {
    // スキップボタンのセレクタ（複数パターン対応）
    const skipButtonSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      'button.ytp-ad-skip-button-container',
      '.ytp-ad-skip-button-slot button'
    ];

    for (const selector of skipButtonSelectors) {
      const skipBtn = document.querySelector(selector);
      if (skipBtn && skipBtn.offsetParent !== null) {
        // ボタンが表示されているかチェック
        const style = window.getComputedStyle(skipBtn);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          Logger.log('PlayerController', '広告スキップボタンをクリック');
          skipBtn.click();
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 広告監視を開始（スキップボタンが表示されたら自動クリック）
   */
  startAdSkipWatcher() {
    if (this.adSkipInterval) {
      clearInterval(this.adSkipInterval);
    }

    this.adSkipInterval = setInterval(() => {
      if (this.isAdPlaying()) {
        this.trySkipAd();
      }
    }, 500);

    Logger.log('PlayerController', '広告スキップ監視を開始');
  }

  /**
   * 広告監視を停止
   */
  stopAdSkipWatcher() {
    if (this.adSkipInterval) {
      clearInterval(this.adSkipInterval);
      this.adSkipInterval = null;
      Logger.log('PlayerController', '広告スキップ監視を停止');
    }
  }

  /**
   * リスナーをクリア
   */
  cleanup() {
    if (this.videoElement) {
      if (this.endedListener) {
        this.videoElement.removeEventListener('ended', this.endedListener);
      }
      if (this.timeUpdateListener) {
        this.videoElement.removeEventListener('timeupdate', this.timeUpdateListener);
      }
    }
    this.videoElement = null;
    this.endedListener = null;
    this.timeUpdateListener = null;
    this.isWatchingPlayer = false;
    this.endTriggered = false;
    // 広告監視も停止
    this.stopAdSkipWatcher();
  }
}
