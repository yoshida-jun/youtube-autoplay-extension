// Chrome Storage APIのラッパークラス

/** @type {boolean} */
const DEBUG_MODE = false;

/**
 * ストレージ操作のエラーをログ出力
 * @param {string} operation - 操作名
 * @param {chrome.runtime.LastError|null} error - エラーオブジェクト
 */
function logStorageError(operation, error) {
  if (DEBUG_MODE) {
    console.error(`[StorageManager] ${operation} エラー:`, error);
  }
}

/**
 * Chrome Storage APIのラッパークラス
 * すべての操作でエラーハンドリングを提供
 */
class StorageManager {
  /**
   * ストレージからデータを取得
   * @param {string|string[]} keys - 取得するキー
   * @returns {Promise<Object>} 取得したデータ
   */
  static async get(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            logStorageError('get', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        logStorageError('get', error);
        reject(error);
      }
    });
  }

  /**
   * ストレージにデータを保存
   * @param {Object} data - 保存するデータ
   * @returns {Promise<void>}
   */
  static async set(data) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            logStorageError('set', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (error) {
        logStorageError('set', error);
        reject(error);
      }
    });
  }

  /**
   * ストレージからデータを削除
   * @param {string|string[]} keys - 削除するキー
   * @returns {Promise<void>}
   */
  static async remove(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.remove(keys, () => {
          if (chrome.runtime.lastError) {
            logStorageError('remove', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (error) {
        logStorageError('remove', error);
        reject(error);
      }
    });
  }

  /**
   * ストレージを完全にクリア
   * @returns {Promise<void>}
   */
  static async clear() {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            logStorageError('clear', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (error) {
        logStorageError('clear', error);
        reject(error);
      }
    });
  }
}
