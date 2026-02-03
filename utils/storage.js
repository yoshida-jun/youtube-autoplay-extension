// Chrome Storage APIのラッパークラス
class StorageManager {
  // ストレージからデータを取得
  static async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result);
      });
    });
  }

  // ストレージにデータを保存
  static async set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        resolve();
      });
    });
  }

  // ストレージからデータを削除
  static async remove(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => {
        resolve();
      });
    });
  }

  // ストレージを完全にクリア
  static async clear() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }
}
