// ==UserScript==
// @name        Twitter Media Downloader
// @name:ja     Twitter Media Downloader
// @name:zh-cn  Twitter 媒体下载
// @name:zh-tw  Twitter 媒體下載
// @description    Save Video/Photo by One-Click.
// @description:ja ワンクリックで動画?画像を保存する。
// @description:zh-cn 一键保存视频/图片
// @description:zh-tw 一鍵保存視頻/圖片
// @version     1.27
// @author      AMANE
// @namespace   none
// @match       https://twitter.com/*
// @match       https://mobile.twitter.com/*
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_download
// @compatible  Chrome
// @compatible  Firefox
// @license     MIT
// @downloadURL https://update.greasyfork.org/scripts/423001/Twitter%20Media%20Downloader.user.js
// @updateURL https://update.greasyfork.org/scripts/423001/Twitter%20Media%20Downloader.meta.js
// ==/UserScript==
/* jshint esversion: 8 */

/**
 * TMD 是一个用于下载 Twitter 媒体文件的工具，支持配置文件名、多文件下载管理和设置功能。
 */
const TMD = (function () {
  /**
   * 初始化 TMD 工具，包括设置按钮监听和初始化设置界面。
   */
  function init() {
    // 创建下载按钮并添加点击事件监听
    // ...

    // 初始化设置界面
    // ...
  }

  /**
   * 根据媒体信息下载文件，并管理下载任务。
   * @param {Object} media 媒体信息
   * @param {number} index 在媒体列表中的索引
   * @param {Array} medias 全部媒体信息数组
   * @param {string} out 输出文件名模板
   * @param {boolean} save_history 是否保存下载历史
   * @param {boolean} is_exist 是否已存在下载记录
   */
  function download(media, index, medias, out, save_history, is_exist) {
    // 解析输出文件名模板并生成实际文件名
    // ...

    // 添加下载任务
    // ...
  }

  /**
   * 更新按钮状态和下载任务状态。
   * @param {HTMLElement} btn 按钮元素
   * @param {string} css 类名，用于改变按钮样式
   * @param {Array} tasks_result 下载任务结果数组
   */
  function status(btn, css, tasks_result) {
    // 更新按钮状态
    // 更新任务结果
    // ...
  }

  /**
   * 显示设置界面。
   */
  function settings() {
    // 创建设置界面元素
    // 添加事件监听处理用户交互
    // ...
  }

  /**
   * 根据状态 ID 从 Twitter API 获取 JSON 数据。
   * @param {string} status_id 状态 ID
   * @returns {Promise<Object>} 包含媒体信息的 JSON 对象
   */
  function fetchJson(status_id) {
    // 构建 API 请求 URL
    // 发起 API 请求并解析响应
    // ...
  }

  /**
   * 获取文档中的 cookies。
   * @param {string} name cookie 名称
   * @returns {string} cookie 值
   */
  function getCookie(name) {
    // 解析 cookies 并返回指定名称的 cookie 值
    // ...
  }

  /**
   * 存储下载历史记录。
   * @param {string} value 要存储的值
   */
  function storage(value) {
    // 存储下载历史记录到本地存储或 GM_storage
    // ...
  }

  /**
   * 格式化日期。
   * @param {number} i 时间戳
   * @param {string} o 日期格式模板
   * @param {string} tz 时区
   * @returns {string} 格式化后的日期字符串
   */
  function formatDate(i, o, tz) {
    // 使用模板和时区格式化日期
    // ...
  }

  /**
   * 管理下载任务的类。
   */
  class Downloader {
    /**
     * 添加下载任务。
     * @param {Object} task 下载任务对象
     */
    add(task) {
      // 添加任务到队列并根据当前线程数决定是否立即执行
      // ...
    }

    /**
     * 开始下一个下载任务。
     */
    next() {
      // 从队列中取出下一个任务并执行
      // ...
    }

    /**
     * 开始下载指定的任务。
     * @param {Object} task 下载任务对象
     * @returns {Promise<void>} 任务完成的 Promise
     */
    start(task) {
      // 使用 GM_download 发起下载请求
      // ...
    }

    /**
     * 下载失败时尝试重试。
     * @param {Object} task 下载任务对象
     * @param {Object} result 下载结果对象
     */
    retry(task, result) {
      // 根据重试策略决定是否重试任务
      // ...
    }

    /**
     * 更新下载状态界面。
     */
    update() {
      // 更新下载进度和状态界面
      // ...
    }
  }

  // 初始化 TMD 工具时调用的函数
  init();

  // 返回 TMD 工具的公开接口
  return {
    init,
    download,
    status,
    settings,
    fetchJson,
    getCookie,
    storage,
    formatDate,
    downloader: new Downloader(),
    language: {
      // 不同语言的本地化字符串
      // ...
    },
    css: `
      /* 下载按钮和其他UI元素的CSS样式 */
      /* ... */
    `,
    css_ss: `
      /* 额外的CSS样式，可能用于隐藏或显示特定内容 */
      /* ... */
    `,
    svg: `
      /* SVG图标定义 */
      /* ... */
    `
  };
})();

// 初始化TMD工具
TMD.init();
