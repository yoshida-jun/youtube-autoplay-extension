// 定数定義

/**
 * YouTubeページタイプごとの動画要素セレクタ
 * @type {Object.<string, {container: string, videoLinks: string, videoItems?: string, video?: string, playerContainer?: string}>}
 */
const YOUTUBE_SELECTORS = {
  // 検索結果ページ
  SEARCH_RESULTS: {
    container: 'ytd-search',
    videoLinks: 'ytd-video-renderer a#video-title',
    videoItems: 'ytd-video-renderer'
  },

  // 再生リストページ
  PLAYLIST: {
    container: 'ytd-playlist-video-list-renderer',
    videoLinks: 'ytd-playlist-video-renderer a.yt-simple-endpoint',
    videoItems: 'ytd-playlist-video-renderer'
  },

  // チャンネルページ
  CHANNEL: {
    container: 'ytd-grid-renderer',
    videoLinks: 'ytd-grid-video-renderer a#video-title',
    videoItems: 'ytd-grid-video-renderer'
  },

  // ホーム/おすすめページ
  HOME: {
    container: 'ytd-app',
    videoLinks: 'ytd-rich-item-renderer h3 a, ytd-video-renderer h3 a, ytd-grid-video-renderer h3 a',
    videoItems: 'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer'
  },

  // サブスクリプションページ
  SUBSCRIPTIONS: {
    container: 'ytd-app',
    videoLinks: 'ytd-grid-video-renderer h3 a, ytd-video-renderer h3 a, ytd-rich-item-renderer h3 a',
    videoItems: 'ytd-grid-video-renderer, ytd-video-renderer'
  },

  // 視聴ページ（関連動画）
  WATCH: {
    container: 'ytd-watch-flexy',
    videoLinks: 'ytd-compact-video-renderer a#video-title, ytd-compact-video-renderer a.yt-simple-endpoint[href*="/watch"]',
    videoItems: 'ytd-compact-video-renderer'
  },

  // 動画プレイヤー
  PLAYER: {
    video: 'video.html5-main-video',
    playerContainer: '#movie_player'
  }
};

/**
 * Chrome Storageで使用するキー
 * @type {Object.<string, string>}
 */
const STORAGE_KEYS = {
  AUTO_PLAY_ENABLED: 'autoPlayEnabled',
  CURRENT_PLAYLIST: 'currentPlaylist',
  CURRENT_INDEX: 'currentIndex',
  PAGE_TYPE: 'pageType'
};

// Object.freeze で定数を不変にする
Object.freeze(YOUTUBE_SELECTORS);
Object.freeze(STORAGE_KEYS);
