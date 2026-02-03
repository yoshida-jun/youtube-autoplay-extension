// YouTube動画検出クラス
class VideoDetector {
  constructor() {
    this.observer = null;
    this.currentPageType = null;
  }

  // 現在のページタイプを判定
  detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;

    if (url.includes('/results?search_query=')) return 'SEARCH_RESULTS';
    if (url.includes('&list=') || pathname.includes('/playlist')) return 'PLAYLIST';
    if (pathname.includes('/feed/subscriptions')) return 'SUBSCRIPTIONS';
    if (pathname.includes('/@') || pathname.includes('/channel')) return 'CHANNEL';
    if (pathname === '/' || pathname === '/feed/explore' || pathname === '/feed/trending') return 'HOME';
    if (pathname.includes('/watch')) return 'WATCH';

    return 'UNKNOWN';
  }

  // ページから動画リストを取得
  getVideoList() {
    const pageType = this.detectPageType();
    const selectors = YOUTUBE_SELECTORS[pageType];

    console.log('[Video Detector] ページタイプ:', pageType);

    if (!selectors) {
      console.warn('[Video Detector] セレクタが見つかりません:', pageType);
      return [];
    }

    // コンテナが読み込まれるまで待機
    const container = document.querySelector(selectors.container);
    if (!container) {
      console.warn('[Video Detector] コンテナが見つかりません:', selectors.container);
      return [];
    }

    console.log('[Video Detector] コンテナ発見:', container);

    // 動画リンクを取得
    const videoLinks = Array.from(
      document.querySelectorAll(selectors.videoLinks)
    );

    console.log('[Video Detector] 動画リンク数:', videoLinks.length);

    // デバッグ: 最初の5個のリンクをログ出力
    if (videoLinks.length === 0) {
      console.warn('[Video Detector] 動画リンクが見つかりません。セレクタ:', selectors.videoLinks);
      // すべての動画タイトルリンクを探してログ出力
      const allLinks = document.querySelectorAll('a[href*="/watch"]');
      console.log('[Video Detector] /watch を含むリンク数:', allLinks.length);
      if (allLinks.length > 0) {
        console.log('[Video Detector] 最初のリンクのID:', allLinks[0].id);
        console.log('[Video Detector] 最初のリンクのクラス:', allLinks[0].className);
        console.log('[Video Detector] 最初のリンクのaria-label:', allLinks[0].getAttribute('aria-label'));

        // より詳しい情報
        for (let i = 0; i < Math.min(3, allLinks.length); i++) {
          const link = allLinks[i];
          const parent = link.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer');
          console.log(`[Video Detector] リンク${i}の親要素:`, parent ? parent.tagName : 'なし');
        }
      }
    }

    return videoLinks.map((link, index) => ({
      index,
      url: link.href,
      title: link.textContent.trim(),
      element: link
    })).filter(video => video.url && video.url.includes('/watch?v='));
  }

  // 動画リストの動的な変更を監視
  observeVideoList(callback) {
    const pageType = this.detectPageType();
    const selectors = YOUTUBE_SELECTORS[pageType];

    if (!selectors) return;

    // 既存のオブザーバーをクリア
    if (this.observer) {
      this.observer.disconnect();
    }

    // MutationObserverでDOM変更を監視
    this.observer = new MutationObserver((mutations) => {
      const videoList = this.getVideoList();
      callback(videoList);
    });

    const container = document.querySelector(selectors.container);
    if (container) {
      this.observer.observe(container, {
        childList: true,
        subtree: true
      });
    }
  }

  // オブザーバーを停止
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
