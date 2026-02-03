// 動画プレイヤー制御クラス
class PlayerController {
  constructor() {
    this.videoElement = null;
    this.isWatchingPlayer = false;
    this.endedListener = null;
  }

  // 動画プレイヤー要素を取得
  getVideoPlayer() {
    return document.querySelector(YOUTUBE_SELECTORS.PLAYER.video);
  }

  // 動画終了を監視
  watchVideoEnd(callback) {
    const video = this.getVideoPlayer();

    if (!video) {
      // プレイヤーが見つからない場合、MutationObserverで待機
      this.waitForPlayer(() => this.watchVideoEnd(callback));
      return;
    }

    // 既存のリスナーをクリア
    if (this.videoElement && this.endedListener) {
      this.videoElement.removeEventListener('ended', this.endedListener);
    }

    this.videoElement = video;
    this.isWatchingPlayer = true;

    // 動画終了イベントをリスン
    this.endedListener = () => {
      console.log('動画が終了しました');
      callback();
    };

    video.addEventListener('ended', this.endedListener);
  }

  // プレイヤーの読み込みを待機
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
        console.log('動画プレイヤーの読み込みがタイムアウトしました');
      }
      attempts++;
    }, 200);
  }

  // 次の動画に遷移
  navigateToVideo(videoUrl) {
    console.log('次の動画に遷移:', videoUrl);
    window.location.href = videoUrl;
  }

  // 現在再生中の動画IDを取得
  getCurrentVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  // リスナーをクリア
  cleanup() {
    if (this.videoElement && this.endedListener) {
      this.videoElement.removeEventListener('ended', this.endedListener);
    }
    this.videoElement = null;
    this.endedListener = null;
    this.isWatchingPlayer = false;
  }
}
