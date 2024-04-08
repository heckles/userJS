// ==UserScript==
// @name        Twitter Media Downloader
// @name:ja     Twitter Media Downloader
// @name:zh-cn  Twitter ý������
// @name:zh-tw  Twitter ý�w���d
// @description    Save Video/Photo by One-Click.
// @description:ja ��󥯥�å��Ǆӻ�?����򱣴椹�롣
// @description:zh-cn һ��������Ƶ/ͼƬ
// @description:zh-tw һ�I����ҕ�l/�DƬ
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
 * TMD ��һ���������� Twitter ý���ļ��Ĺ��ߣ�֧�������ļ��������ļ����ع�������ù��ܡ�
 */
const TMD = (function () {
  /**
   * ��ʼ�� TMD ���ߣ��������ð�ť�����ͳ�ʼ�����ý��档
   */
  function init() {
    // �������ذ�ť����ӵ���¼�����
    // ...

    // ��ʼ�����ý���
    // ...
  }

  /**
   * ����ý����Ϣ�����ļ�����������������
   * @param {Object} media ý����Ϣ
   * @param {number} index ��ý���б��е�����
   * @param {Array} medias ȫ��ý����Ϣ����
   * @param {string} out ����ļ���ģ��
   * @param {boolean} save_history �Ƿ񱣴�������ʷ
   * @param {boolean} is_exist �Ƿ��Ѵ������ؼ�¼
   */
  function download(media, index, medias, out, save_history, is_exist) {
    // ��������ļ���ģ�岢����ʵ���ļ���
    // ...

    // �����������
    // ...
  }

  /**
   * ���°�ť״̬����������״̬��
   * @param {HTMLElement} btn ��ťԪ��
   * @param {string} css ���������ڸı䰴ť��ʽ
   * @param {Array} tasks_result ��������������
   */
  function status(btn, css, tasks_result) {
    // ���°�ť״̬
    // ����������
    // ...
  }

  /**
   * ��ʾ���ý��档
   */
  function settings() {
    // �������ý���Ԫ��
    // ����¼����������û�����
    // ...
  }

  /**
   * ����״̬ ID �� Twitter API ��ȡ JSON ���ݡ�
   * @param {string} status_id ״̬ ID
   * @returns {Promise<Object>} ����ý����Ϣ�� JSON ����
   */
  function fetchJson(status_id) {
    // ���� API ���� URL
    // ���� API ���󲢽�����Ӧ
    // ...
  }

  /**
   * ��ȡ�ĵ��е� cookies��
   * @param {string} name cookie ����
   * @returns {string} cookie ֵ
   */
  function getCookie(name) {
    // ���� cookies ������ָ�����Ƶ� cookie ֵ
    // ...
  }

  /**
   * �洢������ʷ��¼��
   * @param {string} value Ҫ�洢��ֵ
   */
  function storage(value) {
    // �洢������ʷ��¼�����ش洢�� GM_storage
    // ...
  }

  /**
   * ��ʽ�����ڡ�
   * @param {number} i ʱ���
   * @param {string} o ���ڸ�ʽģ��
   * @param {string} tz ʱ��
   * @returns {string} ��ʽ����������ַ���
   */
  function formatDate(i, o, tz) {
    // ʹ��ģ���ʱ����ʽ������
    // ...
  }

  /**
   * ��������������ࡣ
   */
  class Downloader {
    /**
     * �����������
     * @param {Object} task �����������
     */
    add(task) {
      // ������񵽶��в����ݵ�ǰ�߳��������Ƿ�����ִ��
      // ...
    }

    /**
     * ��ʼ��һ����������
     */
    next() {
      // �Ӷ�����ȡ����һ������ִ��
      // ...
    }

    /**
     * ��ʼ����ָ��������
     * @param {Object} task �����������
     * @returns {Promise<void>} ������ɵ� Promise
     */
    start(task) {
      // ʹ�� GM_download ������������
      // ...
    }

    /**
     * ����ʧ��ʱ�������ԡ�
     * @param {Object} task �����������
     * @param {Object} result ���ؽ������
     */
    retry(task, result) {
      // �������Բ��Ծ����Ƿ���������
      // ...
    }

    /**
     * ��������״̬���档
     */
    update() {
      // �������ؽ��Ⱥ�״̬����
      // ...
    }
  }

  // ��ʼ�� TMD ����ʱ���õĺ���
  init();

  // ���� TMD ���ߵĹ����ӿ�
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
      // ��ͬ���Եı��ػ��ַ���
      // ...
    },
    css: `
      /* ���ذ�ť������UIԪ�ص�CSS��ʽ */
      /* ... */
    `,
    css_ss: `
      /* �����CSS��ʽ�������������ػ���ʾ�ض����� */
      /* ... */
    `,
    svg: `
      /* SVGͼ�궨�� */
      /* ... */
    `
  };
})();

// ��ʼ��TMD����
TMD.init();
