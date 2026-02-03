// YouTube動画検出クラス

/**
 * YouTubeページから動画を検出するクラス
 */
class VideoDetector {
  constructor() {
    /** @type {MutationObserver|null} */
    this.observer = null;
    /** @type {string|null} */
    this.currentPageType = null;
  }

  /**
   * 現在のページタイプを判定
   * @returns {string} ページタイプ
   */
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

  /**
   * ページから動画リストを取得
   * @returns {Array<{index: number, url: string, title: string, element: HTMLElement}>}
   */
  getVideoList() {
    const pageType = this.detectPageType();
    const selectors = YOUTUBE_SELECTORS[pageType];

    Logger.log('VideoDetector', 'ページタイプ:', pageType);

    if (!selectors) {
      Logger.warn('VideoDetector', 'セレクタが見つかりません:', pageType);
      return [];
    }

    // コンテナが読み込まれるまで待機
    const container = document.querySelector(selectors.container);
    if (!container) {
      Logger.warn('VideoDetector', 'コンテナが見つかりません:', selectors.container);
      return [];
    }

    // 動画リンクを取得
    const videoLinks = Array.from(
      document.querySelectorAll(selectors.videoLinks)
    );

    Logger.log('VideoDetector', '動画リンク数:', videoLinks.length);

    // 動画リンクが見つからない場合の代替処理
    if (videoLinks.length === 0) {
      return this.getFallbackVideoList();
    }

    return videoLinks.map((link, index) => {
      // 日付情報を親要素から探す
      const dateText = this.extractDateFromElement(link);
      return {
        index,
        url: link.href,
        title: link.textContent.trim(),
        dateText: dateText,
        element: link
      };
    }).filter(video => video.url && video.url.includes('/watch?v='));
  }

  /**
   * 要素から日付テキストを抽出
   * @param {HTMLElement} link - 動画リンク要素
   * @returns {string} 日付テキスト（例: "1日前", "2週間前"）
   */
  extractDateFromElement(link) {
    // 親要素を遡って動画カード全体を探す
    let container = link.closest('ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer');
    if (!container) {
      container = link.parentElement?.parentElement?.parentElement;
    }
    if (!container) return '';

    // メタデータ行から日付を探す
    const metadataLine = container.querySelector('#metadata-line');
    if (metadataLine) {
      const spans = metadataLine.querySelectorAll('span.inline-metadata-item');
      for (const span of spans) {
        const text = span.textContent.trim();
        if (this.isDateText(text)) {
          return text;
        }
      }
    }

    // 代替: aria-labelから日付を抽出
    const ariaLabel = container.getAttribute('aria-label') || link.getAttribute('aria-label') || '';
    const dateMatch = ariaLabel.match(/(\d+\s*(?:秒|分|時間|日|週間|か月|年)\s*前)/);
    if (dateMatch) {
      return dateMatch[1];
    }

    return '';
  }

  /**
   * テキストが日付形式かチェック
   * @param {string} text - チェックするテキスト
   * @returns {boolean}
   */
  isDateText(text) {
    return /^\d+\s*(?:秒|分|時間|日|週間|か月|年)\s*前$/.test(text) ||
           /^\d+\s*(?:second|minute|hour|day|week|month|year)s?\s*ago$/i.test(text);
  }

  /**
   * 日付テキストを日数に変換（フィルタリング用）
   * @param {string} dateText - 日付テキスト
   * @returns {number} 日数（推定）
   */
  static parseDateTextToDays(dateText) {
    if (!dateText) return Infinity;

    // 日本語パターン
    const jpMatch = dateText.match(/(\d+)\s*(秒|分|時間|日|週間|か月|年)\s*前/);
    if (jpMatch) {
      const num = parseInt(jpMatch[1], 10);
      const unit = jpMatch[2];
      switch (unit) {
        case '秒': return 0;
        case '分': return 0;
        case '時間': return num / 24;
        case '日': return num;
        case '週間': return num * 7;
        case 'か月': return num * 30;
        case '年': return num * 365;
      }
    }

    // 英語パターン
    const enMatch = dateText.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i);
    if (enMatch) {
      const num = parseInt(enMatch[1], 10);
      const unit = enMatch[2].toLowerCase();
      switch (unit) {
        case 'second': return 0;
        case 'minute': return 0;
        case 'hour': return num / 24;
        case 'day': return num;
        case 'week': return num * 7;
        case 'month': return num * 30;
        case 'year': return num * 365;
      }
    }

    return Infinity;
  }

  /**
   * セレクタで見つからない場合の代替取得
   * @returns {Array<{index: number, url: string, title: string, dateText: string, element: HTMLElement}>}
   */
  getFallbackVideoList() {
    const allLinks = document.querySelectorAll('a[href*="/watch"]');
    Logger.log('VideoDetector', '代替検索 - /watch を含むリンク数:', allLinks.length);

    if (allLinks.length === 0) {
      return [];
    }

    const videos = [];
    const seenUrls = new Set();

    allLinks.forEach((link, index) => {
      const url = link.href;
      // 重複を除外し、有効な動画リンクのみを取得
      if (url && url.includes('/watch?v=') && !seenUrls.has(url)) {
        const title = link.textContent.trim() ||
                      link.getAttribute('aria-label') ||
                      link.getAttribute('title') ||
                      `動画 ${index + 1}`;

        if (title.length > 0 && title.length < 500) {
          seenUrls.add(url);
          const dateText = this.extractDateFromElement(link);
          videos.push({
            index: videos.length,
            url,
            title,
            dateText,
            element: link
          });
        }
      }
    });

    Logger.log('VideoDetector', '代替検索で取得した動画数:', videos.length);
    return videos;
  }

  /**
   * 動画リストの動的な変更を監視
   * @param {function(Array): void} callback - 変更時のコールバック
   */
  observeVideoList(callback) {
    const pageType = this.detectPageType();
    const selectors = YOUTUBE_SELECTORS[pageType];

    if (!selectors) return;

    // 既存のオブザーバーをクリア
    if (this.observer) {
      this.observer.disconnect();
    }

    // MutationObserverでDOM変更を監視
    this.observer = new MutationObserver(() => {
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

  /**
   * オブザーバーを停止
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
