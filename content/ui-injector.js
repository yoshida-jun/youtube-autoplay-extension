// UI要素注入クラス

/**
 * UI要素の作成と注入を管理するクラス
 * XSS対策のため、innerHTMLを使用せずDOMメソッドで要素を作成
 */
class UIInjector {
  constructor() {
    /** @type {HTMLElement|null} */
    this.controlPanel = null;
    /** @type {Array<{url: string, title: string, dateText?: string}>} */
    this.playlist = [];
    /** @type {string} */
    this.filterKeyword = '';
    /** @type {number} 日付フィルター（日数、0は無制限） */
    this.filterDays = 0;
    /** @type {boolean} ドラッグ中かどうか */
    this.isDragging = false;
    /** @type {number} ドラッグ開始時のオフセットX */
    this.dragOffsetX = 0;
    /** @type {number} ドラッグ開始時のオフセットY */
    this.dragOffsetY = 0;
  }

  /**
   * DOM要素を安全に作成するヘルパー
   * @param {string} tag - タグ名
   * @param {Object} attributes - 属性オブジェクト
   * @param {string|HTMLElement|HTMLElement[]} [children] - 子要素またはテキスト
   * @returns {HTMLElement}
   */
  createElement(tag, attributes = {}, children = null) {
    const element = document.createElement(tag);

    // 属性を設定
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else {
        element.setAttribute(key, value);
      }
    }

    // 子要素を追加
    if (children) {
      if (typeof children === 'string') {
        element.textContent = children;
      } else if (Array.isArray(children)) {
        children.forEach(child => element.appendChild(child));
      } else {
        element.appendChild(children);
      }
    }

    return element;
  }

  /**
   * コントロールパネルを作成
   * @returns {HTMLElement}
   */
  createControlPanel() {
    // ヘッダー部分
    const stopBtn = this.createElement('button', {
      id: 'yt-autoplay-stop',
      className: 'yt-autoplay-btn-icon',
      title: '連続再生を終了',
      textContent: '×'
    });

    const title = this.createElement('span', {
      className: 'yt-autoplay-title',
      textContent: 'Auto Player'
    });

    const minimizeBtn = this.createElement('button', {
      id: 'yt-autoplay-minimize',
      className: 'yt-autoplay-btn-icon',
      textContent: '−'
    });

    const header = this.createElement('div', {
      className: 'yt-autoplay-header'
    }, [title, minimizeBtn, stopBtn]);

    // コントロール行（前へ、ステータス、次へ、自動チェックを1行に）
    const prevBtn = this.createElement('button', {
      id: 'yt-autoplay-prev',
      className: 'yt-autoplay-btn yt-autoplay-btn-sm',
      textContent: '◀',
      title: 'P: 前へ'
    });

    const currentSpan = this.createElement('span', {
      id: 'yt-autoplay-current',
      textContent: '0'
    });

    const separator = document.createTextNode('/');

    const totalSpan = this.createElement('span', {
      id: 'yt-autoplay-total',
      textContent: '0'
    });

    const status = this.createElement('span', {
      className: 'yt-autoplay-status-inline'
    });
    status.appendChild(currentSpan);
    status.appendChild(separator);
    status.appendChild(totalSpan);

    const nextBtn = this.createElement('button', {
      id: 'yt-autoplay-next',
      className: 'yt-autoplay-btn yt-autoplay-btn-sm',
      textContent: '▶',
      title: 'N: 次へ'
    });

    const checkbox = this.createElement('input', {
      type: 'checkbox',
      id: 'yt-autoplay-checkbox',
      className: 'yt-autoplay-checkbox'
    });
    checkbox.checked = true;

    const checkboxLabel = this.createElement('span', {
      className: 'yt-autoplay-checkbox-label-sm',
      textContent: '自動'
    });

    const checkboxWrapper = this.createElement('label', {
      className: 'yt-autoplay-checkbox-wrapper-sm',
      title: 'A: 自動で次へ'
    }, [checkbox, checkboxLabel]);

    const controlRow = this.createElement('div', {
      className: 'yt-autoplay-control-row'
    }, [prevBtn, status, nextBtn, checkboxWrapper]);

    // 収集行（ボタンとオプションを1行に）
    const collectBtn = this.createElement('button', {
      id: 'yt-autoplay-collect',
      className: 'yt-autoplay-btn yt-autoplay-collect-btn',
      textContent: '🔄 収集'
    });

    const replaceRadio = this.createElement('input', {
      type: 'radio',
      id: 'yt-autoplay-collect-replace',
      name: 'collect-mode',
      value: 'replace'
    });
    replaceRadio.checked = true;

    const replaceLabel = this.createElement('label', {
      className: 'yt-autoplay-radio-label'
    });
    replaceLabel.setAttribute('for', 'yt-autoplay-collect-replace');
    replaceLabel.textContent = '入替';

    const addRadio = this.createElement('input', {
      type: 'radio',
      id: 'yt-autoplay-collect-add',
      name: 'collect-mode',
      value: 'add'
    });

    const addLabel = this.createElement('label', {
      className: 'yt-autoplay-radio-label'
    });
    addLabel.setAttribute('for', 'yt-autoplay-collect-add');
    addLabel.textContent = '追加';

    const collectOptions = this.createElement('div', {
      className: 'yt-autoplay-collect-options-inline'
    }, [replaceRadio, replaceLabel, addRadio, addLabel]);

    const collectRow = this.createElement('div', {
      className: 'yt-autoplay-collect-row'
    }, [collectBtn, collectOptions]);

    // フィルター部分
    const filterInput = this.createElement('input', {
      type: 'text',
      id: 'yt-autoplay-filter',
      className: 'yt-autoplay-filter-input',
      placeholder: 'キーワードで絞り込み...'
    });

    // 日付フィルター
    const dateSelect = this.createElement('select', {
      id: 'yt-autoplay-date-filter',
      className: 'yt-autoplay-date-select'
    });

    const dateOptions = [
      { value: '0', label: '期間: すべて' },
      { value: '1', label: '今日' },
      { value: '7', label: '今週' },
      { value: '30', label: '今月' },
      { value: '365', label: '今年' }
    ];

    dateOptions.forEach(opt => {
      const option = this.createElement('option', { value: opt.value });
      option.textContent = opt.label;
      dateSelect.appendChild(option);
    });

    const filterRow = this.createElement('div', {
      className: 'yt-autoplay-filter-row'
    }, [filterInput, dateSelect]);

    const filterSection = this.createElement('div', {
      className: 'yt-autoplay-filter'
    }, filterRow);

    // プレイリスト部分
    const playlistList = this.createElement('ul', {
      id: 'yt-autoplay-playlist',
      className: 'yt-autoplay-playlist'
    });

    // ボディ部分
    const body = this.createElement('div', {
      className: 'yt-autoplay-body'
    }, [controlRow, collectRow, filterSection, playlistList]);

    // パネル全体
    const panel = this.createElement('div', {
      id: 'yt-autoplay-control',
      className: 'yt-autoplay-panel'
    }, [header, body]);

    return panel;
  }

  /**
   * UIを挿入
   */
  inject() {
    // 既存のパネルを削除
    this.remove();

    this.controlPanel = this.createControlPanel();
    document.body.appendChild(this.controlPanel);

    // イベントリスナーを設定
    this.attachEventListeners();
  }

  /**
   * イベントリスナーの設定
   */
  attachEventListeners() {
    // 最小化ボタン
    // パネル内の要素を取得するヘルパー（IDの競合を避ける）
    const panel = this.controlPanel;
    if (!panel) return;

    const minimizeBtn = panel.querySelector('#yt-autoplay-minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        panel.classList.toggle('minimized');
        minimizeBtn.textContent = panel.classList.contains('minimized') ? '+' : '−';
      });
    }

    // 停止ボタン
    const stopBtn = panel.querySelector('#yt-autoplay-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('yt-autoplay-stop'));
      });
    }

    // 自動再生チェックボックス
    const checkbox = panel.querySelector('#yt-autoplay-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        window.dispatchEvent(new CustomEvent('yt-autoplay-toggle'));
      });
    }

    // 次へボタン
    const nextBtn = panel.querySelector('#yt-autoplay-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('yt-autoplay-next'));
      });
    }

    // 前へボタン
    const prevBtn = panel.querySelector('#yt-autoplay-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('yt-autoplay-prev'));
      });
    }

    // フィルター入力
    const filterInput = panel.querySelector('#yt-autoplay-filter');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        this.filterKeyword = e.target.value.toLowerCase();
        this.renderPlaylist();
      });
    }

    // 日付フィルター
    const dateSelect = panel.querySelector('#yt-autoplay-date-filter');
    if (dateSelect) {
      dateSelect.addEventListener('change', (e) => {
        this.filterDays = parseInt(e.target.value, 10);
        this.renderPlaylist();
      });
    }

    // 動画収集ボタン
    const collectBtn = panel.querySelector('#yt-autoplay-collect');
    if (collectBtn) {
      collectBtn.addEventListener('click', () => {
        const replaceRadio = panel.querySelector('#yt-autoplay-collect-replace');
        const mode = replaceRadio && replaceRadio.checked ? 'replace' : 'add';
        window.dispatchEvent(new CustomEvent('yt-autoplay-collect', { detail: { mode } }));
      });
    }

    // ドラッグ移動機能（ヘッダーをドラッグ）
    const header = this.controlPanel?.querySelector('.yt-autoplay-header');
    if (header && this.controlPanel) {
      header.addEventListener('mousedown', (e) => {
        // ボタンをクリックした場合はドラッグしない
        if (e.target.closest('button')) return;

        this.isDragging = true;
        const rect = this.controlPanel.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;

        // ドラッグ中のスタイル
        this.controlPanel.style.transition = 'none';
        header.style.cursor = 'grabbing';

        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!this.isDragging || !this.controlPanel) return;

        const newX = e.clientX - this.dragOffsetX;
        const newY = e.clientY - this.dragOffsetY;

        // 画面外に出ないように制限
        const maxX = window.innerWidth - this.controlPanel.offsetWidth;
        const maxY = window.innerHeight - this.controlPanel.offsetHeight;

        this.controlPanel.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
        this.controlPanel.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
        this.controlPanel.style.right = 'auto';
      });

      document.addEventListener('mouseup', () => {
        if (this.isDragging && this.controlPanel) {
          this.isDragging = false;
          this.controlPanel.style.transition = '';
          header.style.cursor = '';
        }
      });
    }
  }

  /**
   * プレイリストを描画
   * @param {number} currentIndex - 現在のインデックス
   */
  renderPlaylist(currentIndex = -1) {
    const playlistEl = document.getElementById('yt-autoplay-playlist');
    if (!playlistEl) return;

    playlistEl.innerHTML = '';

    this.playlist.forEach((video, index) => {
      // キーワードフィルタリング
      if (this.filterKeyword && !video.title.toLowerCase().includes(this.filterKeyword)) {
        return;
      }

      // 日付フィルタリング
      if (this.filterDays > 0 && video.dateText) {
        const videoDays = VideoDetector.parseDateTextToDays(video.dateText);
        if (videoDays > this.filterDays) {
          return;
        }
      }

      const li = this.createElement('li', {
        className: 'yt-autoplay-playlist-item' + (index === currentIndex ? ' current' : '')
      });
      li.dataset.index = String(index);

      // インデックス
      const indexSpan = this.createElement('span', {
        className: 'yt-autoplay-playlist-index',
        textContent: String(index + 1)
      });

      // タイトル
      const titleSpan = this.createElement('span', {
        className: 'yt-autoplay-playlist-title',
        textContent: video.title || `動画 ${index + 1}`
      });
      titleSpan.title = video.title || `動画 ${index + 1}`;
      titleSpan.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('yt-autoplay-jump', { detail: { index } }));
      });

      // 削除ボタン
      const deleteBtn = this.createElement('button', {
        className: 'yt-autoplay-playlist-delete',
        textContent: '×',
        title: 'リストから削除'
      });
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('yt-autoplay-delete', { detail: { index } }));
      });

      li.appendChild(indexSpan);
      li.appendChild(titleSpan);
      li.appendChild(deleteBtn);

      playlistEl.appendChild(li);
    });
  }

  /**
   * 状態を更新
   * @param {number} current - 現在の位置
   * @param {number} total - 合計数
   * @param {boolean} isEnabled - 自動再生が有効か
   * @param {Array<{url: string, title: string}>} [playlist] - プレイリスト
   */
  updateState(current, total, isEnabled, playlist = null) {
    const currentEl = document.getElementById('yt-autoplay-current');
    const totalEl = document.getElementById('yt-autoplay-total');
    const checkbox = document.getElementById('yt-autoplay-checkbox');

    if (currentEl) currentEl.textContent = String(current);
    if (totalEl) totalEl.textContent = String(total);

    if (checkbox) {
      checkbox.checked = isEnabled;
    }

    if (playlist) {
      this.playlist = playlist;
    }

    this.renderPlaylist(current - 1);
  }

  /**
   * UIを削除
   */
  remove() {
    if (this.controlPanel) {
      this.controlPanel.remove();
      this.controlPanel = null;
    }
    // 動画情報バーも削除
    this.removeVideoInfoBar();
  }

  /**
   * 動画情報バーを作成・挿入
   */
  injectVideoInfoBar() {
    // 既存のバーを削除
    this.removeVideoInfoBar();

    // 情報を取得
    const info = this.getVideoInfo();
    if (!info) return;

    // 情報バーを作成
    const infoBar = this.createElement('div', {
      id: 'yt-autoplay-info-bar',
      className: 'yt-autoplay-info-bar'
    });

    // チャンネル情報
    const channelSection = this.createElement('div', {
      className: 'yt-autoplay-info-section'
    });

    const channelIcon = this.createElement('span', {
      className: 'yt-autoplay-info-icon',
      textContent: '📺'
    });

    const channelName = this.createElement('span', {
      className: 'yt-autoplay-info-channel',
      textContent: info.channelName || '不明'
    });

    const subscriberCount = this.createElement('span', {
      className: 'yt-autoplay-info-subscribers',
      textContent: info.subscriberCount ? `(${info.subscriberCount})` : ''
    });

    channelSection.appendChild(channelIcon);
    channelSection.appendChild(channelName);
    if (info.subscriberCount) {
      channelSection.appendChild(subscriberCount);
    }

    infoBar.appendChild(channelSection);

    // 視聴者数（ライブの場合）
    if (info.viewerCount) {
      const viewerSection = this.createElement('div', {
        className: 'yt-autoplay-info-section'
      });

      const viewerIcon = this.createElement('span', {
        className: 'yt-autoplay-info-icon',
        textContent: '👁'
      });

      const viewerCount = this.createElement('span', {
        className: 'yt-autoplay-info-viewers',
        textContent: info.viewerCount
      });

      viewerSection.appendChild(viewerIcon);
      viewerSection.appendChild(viewerCount);
      infoBar.appendChild(viewerSection);
    }

    // 配信開始時間または投稿日
    if (info.publishedTime) {
      const timeSection = this.createElement('div', {
        className: 'yt-autoplay-info-section'
      });

      const timeIcon = this.createElement('span', {
        className: 'yt-autoplay-info-icon',
        textContent: info.isLive ? '🔴' : '📅'
      });

      const timeText = this.createElement('span', {
        className: 'yt-autoplay-info-time',
        textContent: info.publishedTime
      });

      timeSection.appendChild(timeIcon);
      timeSection.appendChild(timeText);
      infoBar.appendChild(timeSection);
    }

    // YouTubeページに挿入（プレイヤーとチャットの間）
    const targetContainer = document.querySelector('#primary-inner, #primary');
    const playerContainer = document.querySelector('#player, ytd-player');

    if (targetContainer && playerContainer) {
      // プレイヤーの次に挿入
      playerContainer.parentNode.insertBefore(infoBar, playerContainer.nextSibling);
      Logger.log('UIInjector', '動画情報バーを挿入しました');
    } else {
      // フォールバック: body直下に追加
      document.body.appendChild(infoBar);
      infoBar.style.position = 'fixed';
      infoBar.style.top = '56px';
      infoBar.style.left = '50%';
      infoBar.style.transform = 'translateX(-50%)';
      Logger.log('UIInjector', '動画情報バーをフォールバック位置に挿入');
    }
  }

  /**
   * 動画情報バーを削除
   */
  removeVideoInfoBar() {
    const existingBar = document.getElementById('yt-autoplay-info-bar');
    if (existingBar) {
      existingBar.remove();
    }
  }

  /**
   * YouTubeページから動画情報を取得
   * @returns {{channelName: string, subscriberCount: string, viewerCount: string, publishedTime: string, isLive: boolean}|null}
   */
  getVideoInfo() {
    try {
      // チャンネル名
      const channelNameEl = document.querySelector(
        'ytd-channel-name yt-formatted-string a, ' +
        '#owner #channel-name yt-formatted-string a, ' +
        '#owner-name a, ' +
        'ytd-video-owner-renderer #channel-name a'
      );
      const channelName = channelNameEl?.textContent?.trim() || '';

      // 登録者数
      const subscriberEl = document.querySelector(
        '#owner-sub-count, ' +
        'ytd-video-owner-renderer #owner-sub-count, ' +
        '#subscriber-count'
      );
      const subscriberCount = subscriberEl?.textContent?.trim() || '';

      // ライブ配信かどうか
      const isLive = !!document.querySelector(
        '.ytp-live-badge, ' +
        'ytd-badge-supported-renderer[badge-style="BADGE_STYLE_TYPE_LIVE_NOW"]'
      );

      // 視聴者数（ライブの場合）
      let viewerCount = '';
      if (isLive) {
        const viewerEl = document.querySelector(
          '.view-count, ' +
          '#info-container .view-count, ' +
          'ytd-video-view-count-renderer span'
        );
        viewerCount = viewerEl?.textContent?.trim() || '';
      }

      // 投稿日/配信開始時間
      const dateEl = document.querySelector(
        '#info-strings yt-formatted-string, ' +
        '#info-container #date yt-formatted-string, ' +
        'ytd-video-primary-info-renderer #info-strings yt-formatted-string, ' +
        '#upload-info span'
      );
      let publishedTime = dateEl?.textContent?.trim() || '';

      // ライブ配信の場合、開始時間を取得
      if (isLive && !publishedTime) {
        const liveInfoEl = document.querySelector(
          '.ytp-live-badge-text, ' +
          '#info-strings span'
        );
        publishedTime = liveInfoEl?.textContent?.trim() || 'ライブ配信中';
      }

      if (!channelName && !viewerCount && !publishedTime) {
        return null;
      }

      return {
        channelName,
        subscriberCount,
        viewerCount,
        publishedTime,
        isLive
      };
    } catch (error) {
      Logger.error('UIInjector', '動画情報取得エラー:', error);
      return null;
    }
  }

  /**
   * 動画情報バーを更新
   */
  updateVideoInfoBar() {
    // 少し遅延させて情報が読み込まれるのを待つ
    setTimeout(() => {
      this.injectVideoInfoBar();
    }, 1500);
  }
}
