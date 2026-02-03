// ロギングユーティリティ

/**
 * 開発モードフラグ
 * 本番環境ではfalseに設定
 * @type {boolean}
 */
const DEBUG_MODE = false;

/**
 * 条件付きロギングを提供するLoggerクラス
 * DEBUG_MODEがtrueの場合のみログを出力
 */
class Logger {
  /**
   * プレフィックス付きでログを出力
   * @param {string} prefix - ログのプレフィックス
   * @param  {...any} args - ログ引数
   */
  static log(prefix, ...args) {
    if (DEBUG_MODE) {
      console.log(`[${prefix}]`, ...args);
    }
  }

  /**
   * 警告ログを出力
   * @param {string} prefix - ログのプレフィックス
   * @param  {...any} args - ログ引数
   */
  static warn(prefix, ...args) {
    if (DEBUG_MODE) {
      console.warn(`[${prefix}]`, ...args);
    }
  }

  /**
   * エラーログを出力（常に出力）
   * @param {string} prefix - ログのプレフィックス
   * @param  {...any} args - ログ引数
   */
  static error(prefix, ...args) {
    console.error(`[${prefix}]`, ...args);
  }

  /**
   * デバッグモードかどうかを取得
   * @returns {boolean}
   */
  static isDebugMode() {
    return DEBUG_MODE;
  }
}
