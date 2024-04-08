// ==UserScript==
// @name        (Mod)Twitter Media Downloader
// @name:ja     Twitter Media Downloader
// @name:zh-cn  Twitter ý������
// @name:zh-tw  Twitter ý�w���d
// @description    Save Video/Photo by One-Click.
// @description:ja ��󥯥�å��Ǆӻ�?����򱣴椹�롣
// @description:zh-cn һ��������Ƶ/ͼƬ
// @description:zh-tw һ�I����ҕ�l/�DƬ
// @version     1.27-Mod-20240408(1.�޸������ļ�����ʽ)
// @author      AMANE��Mod by heckles��
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
 * ���������ļ�����ʽ
 *
 * ���ļ�����ʽ���ڱ�ʶ�����û�����������ʱ�䡢״̬ID���ļ����͡�
 * �������ض����ַ���ģ�壬ͨ���滻ģ���е�ռλ�����������յ��ļ�����
 *
 * @param {string} userName �û���
 * @param {number} userId �û�ID
 * @param {string} dateTime ���������ں�ʱ�䣬ӦΪ�����ض���ʽ���ַ���
 * @param {string} statusId ״̬ID�������ĵ�Ψһ��ʶ��
 * @param {string} fileType �ļ����ͣ���jpg��png��
 * @returns {string} �����ṩ�Ĳ������ɵ������ļ���
 */
const filename =
  //  "twitter_{user-name}(@{user-id})_{date-time}_{status-id}_{file-type}";
  "{date-time}_twitter_{user-name}(@{user-id})_{status-id}_{file-type}";
/**
 * TMD ��һ����װ�˸��ֹ��ܵ���ִ�к���������ʵ�����Ի������á��洢��������������ʾ���Ƶȡ�
 * */
const TMD = (function () {
  let lang, host, history, show_sensitive, is_tweetdeck;
  // ����һ���������ֹ��ܵķ����Ķ���
  return {
    /**
     * ��ʼ�������������������ԡ���⻷������ʼ���洢�����ý�����ʽ�ȡ�
     * */
    init: async function () {
      // ע���Ҽ��˵���������û�����������ʾ���ı�
      GM_registerMenuCommand(
        (this.language[navigator.language] || this.language.en).settings,
        this.settings
      );
      lang =
        this.language[document.querySelector("html").lang] || this.language.en; // ���õ�ǰ����
      host = location.hostname; // ��ȡ��ǰ����
      is_tweetdeck = host.indexOf("tweetdeck") >= 0; // ����Ƿ���TweetDeck������
      history = this.storage_obsolete(); // ��ͼ�Ӿɴ洢�л�ȡ��ʷ��¼

      // ���������ʷ��¼����ʹ�þɴ洢���ƣ�����ʹ���µĴ洢����
      if (history.length) {
        this.storage(history);
        this.storage_obsolete(true);
      } else history = await this.storage(); // �첽��ȡ�洢����ʷ��¼

      show_sensitive = GM_getValue("show_sensitive", false); // ��ȡ�Ƿ���ʾ�������ݵ�����
      // ��̬������ʽ�������Ƿ���ʾ�������ݾ����Ƿ�Ӧ�ö������ʽ
      document.head.insertAdjacentHTML(
        "beforeend",
        "<style>" + this.css + (show_sensitive ? this.css_ss : "") + "</style>"
      );

      // ʹ��MutationObserver�����ĵ��䶯����ʵʱ���������ڵ�
      let observer = new MutationObserver((ms) =>
        ms.forEach((m) => m.addedNodes.forEach((node) => this.detect(node)))
      );
      observer.observe(document.body, { childList: true, subtree: true }); // �����۲���
    },
    /**
     * �������Ľڵ㣬�����������������Ӧ�İ�ť��
     * @param {HTMLElement} node - ��Ҫ���м���DOM�ڵ㡣
     */
    detect: function (node) {
      // ��鵱ǰ�ڵ�����ӽڵ����������Ƚڵ��Ƿ�ΪARTICLE��ǩ������ǣ���Ϊ�����½ڵ���Ӱ�ť
      let article =
        (node.tagName == "ARTICLE" && node) ||
        (node.tagName == "DIV" &&
          (node.querySelector("article") || node.closest("article")));
      if (article) this.addButtonTo(article);

      // ��鵱ǰ�ڵ��Ƿ�ΪLI��ǩ�����ɫΪlistitem���������ǰ�ڵ�ΪDIV��ǩ��������е�li[role="listitem"]�ӽڵ㣬���ǣ���Ϊ��Щý���б�����Ӱ�ť
      let listitems =
        (node.tagName == "LI" &&
          node.getAttribute("role") == "listitem" && [node]) ||
        (node.tagName == "DIV" && node.querySelectorAll('li[role="listitem"]'));
      if (listitems) this.addButtonToMedia(listitems);
    },
    /**
     * ��ָ����������������ذ�ť��
     * @param {HTMLElement} article - ��Ҫ��Ӱ�ť������Ԫ�ء�
     */
    addButtonTo: function (article) {
      // ����Ѿ���⵽�������ظ����
      if (article.dataset.detected) return;
      article.dataset.detected = "true";

      // ��������ѡ��ý��Ԫ�ص�ѡ����
      let media_selector = [
        'a[href*="/photo/1"]',
        'div[role="progressbar"]',
        'div[data-testid="playButton"]',
        'a[href="/settings/content_you_see"]', // ���ص�����
        "div.media-image-container", // ����TweetDeck
        "div.media-preview-container", // ����TweetDeck
        'div[aria-labelledby]>div:first-child>div[role="button"][tabindex="0"]', // ��Ƶ��ʵ���ԣ�
      ];

      // ���Ը���ѡ�����ҵ�ý��Ԫ��
      let media = article.querySelector(media_selector.join(","));

      if (media) {
        // ����������ȡ״̬ID
        let status_id = article
          .querySelector('a[href*="/status/"]')
          .href.split("/status/")
          .pop()
          .split("/")
          .shift();

        // ���Ұ�ť����߲����б�
        let btn_group = article.querySelector(
          'div[role="group"]:last-of-type, ul.tweet-actions, ul.tweet-detail-actions'
        );

        // �ڰ�ť�����ҵ�����ť�ĸ��ڵ�
        let btn_share = Array.from(
          btn_group.querySelectorAll(
            ":scope>div>div, li.tweet-action-item>a, li.tweet-detail-action-item>a"
          )
        ).pop().parentNode;

        // ��¡����ť���������ذ�ť
        let btn_down = btn_share.cloneNode(true);

        // �����Ƿ���TweetDeck�У��԰�ť���в�ͬ������
        if (is_tweetdeck) {
          btn_down.firstElementChild.innerHTML =
            '<svg viewBox="0 0 24 24" style="width: 18px; height: 18px;">' +
            this.svg +
            "</svg>";
          btn_down.firstElementChild.removeAttribute("rel");
          btn_down.classList.replace("pull-left", "pull-right");
        } else {
          btn_down.querySelector("svg").innerHTML = this.svg;
        }

        // ����Ƿ��Ѿ�����
        let is_exist = history.indexOf(status_id) >= 0;

        // ���ð�ť״̬
        this.status(btn_down, "tmd-down");
        this.status(
          btn_down,
          is_exist ? "completed" : "download",
          is_exist ? lang.completed : lang.download
        );

        // �ڰ�ť���в������ذ�ť
        btn_group.insertBefore(btn_down, btn_share.nextSibling);

        // �󶨵���¼�
        btn_down.onclick = () => this.click(btn_down, status_id, is_exist);

        // �����ʾ�������ݣ��Զ������ʾ��ť
        if (show_sensitive) {
          let btn_show = article.querySelector(
            'div[aria-labelledby] div[role="button"][tabindex="0"]:not([data-testid]) > div[dir] > span > span'
          );
          if (btn_show) btn_show.click();
        }
      }

      // ���������еĶ���ͼƬ
      let imgs = article.querySelectorAll('a[href*="/photo/"]');
      if (imgs.length > 1) {
        let status_id = article
          .querySelector('a[href*="/status/"]')
          .href.split("/status/")
          .pop()
          .split("/")
          .shift();
        let btn_group = article.querySelector('div[role="group"]:last-of-type');
        let btn_share = Array.from(
          btn_group.querySelectorAll(":scope>div>div")
        ).pop().parentNode;

        imgs.forEach((img) => {
          // Ϊÿ��ͼƬ���ɶ��������ذ�ť
          let index = img.href.split("/status/").pop().split("/").pop();
          let is_exist = history.indexOf(status_id) >= 0;
          let btn_down = document.createElement("div");
          btn_down.innerHTML =
            '<div><div><svg viewBox="0 0 24 24" style="width: 18px; height: 18px;">' +
            this.svg +
            "</svg></div></div>";
          btn_down.classList.add("tmd-down", "tmd-img");
          this.status(btn_down, "download");
          img.parentNode.appendChild(btn_down);

          // �󶨵���¼�����ֹĬ����Ϊ
          btn_down.onclick = (e) => {
            e.preventDefault();
            this.click(btn_down, status_id, is_exist, index);
          };
        });
      }
    },
    /**
     * Ϊý���б���������ذ�ť
     * @param {Array} listitems - ����ý����Ϣ���б�������
     */
    addButtonToMedia: function (listitems) {
      listitems.forEach((li) => {
        // �����Ѿ��������б���
        if (li.dataset.detected) return;
        li.dataset.detected = "true";

        // ��ȡ״̬ID
        let status_id = li
          .querySelector('a[href*="/status/"]')
          .href.split("/status/")
          .pop()
          .split("/")
          .shift();

        // �����ʷ��¼���Ƿ��Ѵ��ڸ�״̬ID
        let is_exist = history.indexOf(status_id) >= 0;

        // �������ذ�ť
        let btn_down = document.createElement("div");
        btn_down.innerHTML =
          '<div><div><svg viewBox="0 0 24 24" style="width: 18px; height: 18px;">' +
          this.svg +
          "</svg></div></div>";
        btn_down.classList.add("tmd-down", "tmd-media");

        // ���ð�ť״̬
        this.status(
          btn_down,
          is_exist ? "completed" : "download",
          is_exist ? lang.completed : lang.download
        );

        // ����ť��ӵ��б�����
        li.appendChild(btn_down);

        // ���ð�ť����¼�������
        btn_down.onclick = () => this.click(btn_down, status_id, is_exist);
      });
    },
    /**
     * �������ذ�ť����¼�
     * @param {Object} btn - ������İ�ť����
     * @param {String} status_id - ý���״̬ID
     * @param {Boolean} is_exist - ָʾ��ý���Ƿ��Ѵ�������ʷ��¼��
     */
    click: async function (btn, status_id, is_exist, index) {
      // �����ť���ڼ���״̬���򲻽����κβ���
      if (btn.classList.contains("loading")) return;

      // ���ð�ťΪ����״̬
      this.status(btn, "loading");

      // ��ȡ�������ļ����ͱ�����ʷ��¼������
      let out = (await GM_getValue("filename", filename)).split("\n").join("");
      let save_history = await GM_getValue("save_history", true);

      // ��ȡý�����ϸ��Ϣ
      let json = await this.fetchJson(status_id);
      let tweet = json.legacy;
      let user = json.core.user_results.result.legacy;

      // ���岢�����ļ����в�������ֵ��ַ�
      let invalid_chars = {
        "\\": "��",
        "/": "��",
        "|": "��",
        "<": "��",
        ">": "��",
        ":": "��",
        "*": "��",
        "?": "��",
        '"': "��",
        "\u200b": "",
        "\u200c": "",
        "\u200d": "",
        "\u2060": "",
        "\ufeff": "",
        "?": "",
      };

      // ��������ļ����е����ں�ʱ�䲿��
      let datetime = out.match(/{date-time(-local)?:[^{}]+}/)
        ? out
          .match(/{date-time(?:-local)?:([^{}]+)}/)[1]
          .replace(/[\\/|<>*?:"]/g, (v) => invalid_chars[v])
        //        : "YYYYMMDD-hhmmss";
        : "YYYY-MM-DD hh-mm-ss";

      // ׼��������Ϣ
      let info = {};
      info["status-id"] = status_id;
      info["user-name"] = user.name.replace(
        /([\\/|*?:"]|[\u200b-\u200d\u2060\ufeff]|?)/g,
        (v) => invalid_chars[v]
      );
      info["user-id"] = user.screen_name;
      info["date-time"] = this.formatDate(tweet.created_at, datetime);
      info["date-time-local"] = this.formatDate(
        tweet.created_at,
        datetime,
        true
      );
      info["full-text"] = tweet.full_text
        .split("\n")
        .join(" ")
        .replace(/\s*https:\/\/t\.co\/\w+/g, "")
        .replace(
          /[\\/|<>*?:"]|[\u200b-\u200d\u2060\ufeff]/g,
          (v) => invalid_chars[v]
        );

      // ����ý���ļ�����
      let medias = tweet.extended_entities && tweet.extended_entities.media;
      if (index) medias = [medias[index - 1]];

      if (medias.length > 0) {
        let tasks = medias.length;
        let tasks_result = [];
        medias.forEach((media, i) => {
          // ׼��ÿ��ý���ļ���������Ϣ
          info.url =
            media.type == "photo"
              ? media.media_url_https + ":orig"
              : media.video_info.variants
                .filter((n) => n.content_type == "video/mp4")
                .sort((a, b) => b.bitrate - a.bitrate)[0].url;
          info.file = info.url.split("/").pop().split(/[:?]/).shift();
          info["file-name"] = info.file.split(".").shift();
          info["file-ext"] = info.file.split(".").pop();
          info["file-type"] = media.type.replace("animated_", "");
          info.out = (
            out.replace(/\.?{file-ext}/, "") +
            ((medias.length > 1 || index) && !out.match("{file-name}")
              ? "-" + (index ? index - 1 : i)
              : "") +
            ".{file-ext}"
          ).replace(/{([^{}:]+)(:[^{}]+)?}/g, (match, name) => info[name]);

          // �����������
          this.downloader.add({
            url: info.url,
            name: info.out,
            onload: () => {
              tasks -= 1;
              tasks_result.push(
                (medias.length > 1 || index
                  ? (index ? index : i + 1) + ": "
                  : "") + lang.completed
              );
              this.status(btn, null, tasks_result.sort().join("\n"));
              if (tasks === 0) {
                this.status(btn, "completed", lang.completed);
                if (save_history && !is_exist) {
                  history.push(status_id);
                  this.storage(status_id);
                }
              }
            },
            onerror: (result) => {
              tasks = -1;
              tasks_result.push(
                (medias.length > 1 ? i + 1 + ": " : "") + result.details.current
              );
              this.status(btn, "failed", tasks_result.sort().join("\n"));
            },
          });
        });
      } else {
        // ���δ�ҵ�ý���ļ��������ð�ť״̬Ϊʧ��
        this.status(btn, "failed", "MEDIA_NOT_FOUND");
      }
    },
    /**
     * ���°�ť״̬��
     * @param {HTMLElement} btn - Ҫ����״̬�İ�ťԪ�ء�
     * @param {string} css - Ҫ��ӵ�CSS�ࣨ��ѡ����
     * @param {string} title - ��ť�ı��⣨��ѡ����
     * @param {string} style - ҪӦ�õ�������ʽ����ѡ����
     */
    status: function (btn, css, title, style) {
      // ����ṩ��CSS�࣬���Ƴ��ɵ��ಢ����µ���
      if (css) {
        btn.classList.remove("download", "completed", "loading", "failed");
        btn.classList.add(css);
      }
      // ����ṩ�˱��⣬����°�ť����
      if (title) btn.title = title;
      // ����ṩ����ʽ������°�ť��������ʽ
      if (style) btn.style.cssText = style;
    },

    /**
     * �������öԻ���
     */
    settings: async function () {
      // ����Ԫ�صĹ��ߺ���
      const $element = (parent, tag, style, content, css) => {
        let el = document.createElement(tag);
        if (style) el.style.cssText = style;
        if (typeof content !== "undefined") {
          if (tag == "input") {
            if (content == "checkbox") el.type = content;
            else el.value = content;
          } else el.innerHTML = content;
        }
        if (css) css.split(" ").forEach((c) => el.classList.add(c));
        parent.appendChild(el);
        return el;
      };

      // �������öԻ���������ͻ�����ʽ
      let wapper = $element(
        document.body,
        "div",
        "position: fixed; left: 0px; top: 0px; width: 100%; height: 100%; background-color: #0009; z-index: 10;"
      );
      // ����ر����öԻ�����߼�
      let wapper_close;
      wapper.onmousedown = (e) => {
        wapper_close = e.target == wapper;
      };
      wapper.onmouseup = (e) => {
        if (wapper_close && e.target == wapper) wapper.remove();
      };

      // ���������öԻ������ݣ��������⡢ѡ���
      let dialog = $element(
        wapper,
        "div",
        "position: absolute; left: 50%; top: 50%; transform: translateX(-50%) translateY(-50%); width: fit-content; width: -moz-fit-content; background-color: #f3f3f3; border: 1px solid #ccc; border-radius: 10px; color: black;"
      );
      let title = $element(
        dialog,
        "h3",
        "margin: 10px 20px;",
        lang.dialog.title
      );
      let options = $element(
        dialog,
        "div",
        "margin: 10px; border: 1px solid #ccc; border-radius: 5px;"
      );

      // ������ʷ��¼������
      let save_history_label = $element(
        options,
        "label",
        "display: block; margin: 10px;",
        lang.dialog.save_history
      );
      let save_history_input = $element(
        save_history_label,
        "input",
        "float: left;",
        "checkbox"
      );
      save_history_input.checked = await GM_getValue("save_history", true);
      save_history_input.onchange = () => {
        GM_setValue("save_history", save_history_input.checked);
      };

      // �����ʷ��¼�İ�ť���߼�
      let clear_history = $element(
        save_history_label,
        "label",
        "display: inline-block; margin: 0 10px; color: blue;",
        lang.dialog.clear_history
      );
      clear_history.onclick = () => {
        if (confirm(lang.dialog.clear_confirm)) {
          history = [];
          GM_setValue("download_history", []);
        }
      };

      // ��ʾ�������ݵ�����
      let show_sensitive_label = $element(
        options,
        "label",
        "display: block; margin: 10px;",
        lang.dialog.show_sensitive
      );
      let show_sensitive_input = $element(
        show_sensitive_label,
        "input",
        "float: left;",
        "checkbox"
      );
      show_sensitive_input.checked = await GM_getValue("show_sensitive", false);
      show_sensitive_input.onchange = () => {
        show_sensitive = show_sensitive_input.checked;
        GM_setValue("show_sensitive", show_sensitive);
      };

      // �ļ���ģʽ����
      let filename_div = $element(
        dialog,
        "div",
        "margin: 10px; border: 1px solid #ccc; border-radius: 5px;"
      );
      let filename_label = $element(
        filename_div,
        "label",
        "display: block; margin: 10px 15px;",
        lang.dialog.pattern
      );
      let filename_input = $element(
        filename_label,
        "textarea",
        "display: block; min-width: 500px; max-width: 500px; min-height: 100px; font-size: inherit; background: white; color: black;",
        await GM_getValue("filename", filename)
      );
      let filename_tags = $element(
        filename_div,
        "label",
        "display: table; margin: 10px;",
        `
<span class="tmd-tag" title="user name">{user-name}</span>
<span class="tmd-tag" title="The user name after @ sign.">{user-id}</span>
<span class="tmd-tag" title="example: 1234567890987654321">{status-id}</span>
<span class="tmd-tag" title="{date-time} : Posted time in UTC.\n{date-time-local} : Your local time zone.\n\nDefault:\nYYYYMMDD-hhmmss => 20201231-235959\n\nExample of custom:\n{date-time:DD-MMM-YY hh.mm} => 31-DEC-21 23.59">{date-time}</span><br>
<span class="tmd-tag" title="Text content in tweet.">{full-text}</span>
<span class="tmd-tag" title="Type of &#34;video&#34; or &#34;photo&#34; or &#34;gif&#34;.">{file-type}</span>
<span class="tmd-tag" title="Original filename from URL.">{file-name}</span>
      `
      );
      filename_input.selectionStart = filename_input.value.length;
      filename_tags.querySelectorAll(".tmd-tag").forEach((tag) => {
        tag.onclick = () => {
          let ss = filename_input.selectionStart;
          let se = filename_input.selectionEnd;
          filename_input.value =
            filename_input.value.substring(0, ss) +
            tag.innerText +
            filename_input.value.substring(se);
          filename_input.selectionStart = ss + tag.innerText.length;
          filename_input.selectionEnd = ss + tag.innerText.length;
          filename_input.focus();
        };
      });

      // �������õİ�ť�����߼�
      let btn_save = $element(
        title,
        "label",
        "float: right;",
        lang.dialog.save,
        "tmd-btn"
      );
      btn_save.onclick = async () => {
        await GM_setValue("filename", filename_input.value);
        wapper.remove();
      };
    },
    /**
     * �첽��ȡָ��״̬ID��JSON����
     * @param {string} status_id - ����ѯ��״̬ID
     * @returns {Promise<Object>} ����һ��Promise���󣬰���ָ�����ĵ���ϸ��Ϣ
     */
    fetchJson: async function (status_id) {
      // �������URL
      let base_url = `https://${host}/i/api/graphql/NmCeCgkVlsRGS1cAwqtgmw/TweetDetail`;
      // �����ѯ����
      let variables = {
        focalTweetId: status_id,
        with_rux_injections: false,
        includePromotedContent: true,
        withCommunity: true,
        withQuickPromoteEligibilityTweetFields: true,
        withBirdwatchNotes: true,
        withVoice: true,
        withV2Timeline: true,
      };
      // ���幦������
      let features = {
        // ���ֹ������Ե����û����״̬
      };
      // ����������ѯURL
      let url = encodeURI(
        `${base_url}?variables=${JSON.stringify(
          variables
        )}&features=${JSON.stringify(features)}`
      );
      // ��ȡ��ǰҳ���cookies
      let cookies = this.getCookie();
      // ��������ͷ
      let headers = {
        authorization:
          "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        "x-twitter-active-user": "yes",
        "x-twitter-client-language": cookies.lang,
        "x-csrf-token": cookies.ct0,
      };
      // �������guest token������ӵ�����ͷ
      if (cookies.ct0.length == 32) headers["x-guest-token"] = cookies.gt;
      // �����������󲢴�����Ӧ
      let tweet_detail = await fetch(url, { headers: headers }).then((result) =>
        result.json()
      );
      // ����������ϸ��Ϣ
      let tweet_entrie =
        tweet_detail.data.threaded_conversation_with_injections_v2.instructions[0].entries.find(
          (n) => n.entryId == `tweet-${status_id}`
        );
      let tweet_result = tweet_entrie.content.itemContent.tweet_results.result;
      // ����������Ϣ
      return tweet_result.tweet || tweet_result;
    },

    /**
     * ��ȡָ�����Ƶ�cookieֵ
     * @param {string} [name] - ��Ҫ��ȡ��cookie���ƣ���ѡ��Ĭ��Ϊ��ȡ����cookie
     * @returns {Object|string} ���ָ����name���򷵻ظ�cookie��ֵ�����򷵻�����cookie�Ķ���
     */
    getCookie: function (name) {
      let cookies = {};
      // ����document.cookie��ȡ����cookie
      document.cookie
        .split(";")
        .filter((n) => n.indexOf("=") > 0)
        .forEach((n) => {
          n.replace(/^([^=]+)=(.+)$/, (match, name, value) => {
            cookies[name.trim()] = value.trim();
          });
        });
      // ����ָ��������cookie
      return name ? cookies[name] : cookies;
    },

    /**
     * �첽�洢���ݵ����ش洢����GM_setValue��
     * @param {*} value - ��Ҫ�洢�����ݣ��������������͡����Ϊ���飬���ϲ�����ʷ�����У����Ϊ������������ʷ�����в����ڣ������ӵ����������С�
     * @returns {Promise<void>} �������κ�����
     */
    storage: async function (value) {
      let data = await GM_getValue("download_history", []); // ��ȡ��ʷ���ݣ�Ĭ��Ϊ������
      let data_length = data.length;
      // ����ṩ��value��������������ݴ���
      if (value) {
        // ���value�����飬��ϲ�����ʷ������
        if (Array.isArray(value)) data = data.concat(value);
        // ���value��������������ʷ�����в����ڣ�����ӵ�����������
        else if (data.indexOf(value) < 0) data.push(value);
      } else return data; // ���δ�ṩvalue��������ֱ�ӷ�����ʷ����
      // ��������и��£��򱣴浽���ش洢
      if (data.length > data_length) GM_setValue("download_history", data);
    },
    /**
     * ��鲢�����ش洢�е���ʷ��¼�Ƿ��ʱ
     * @param {boolean} is_remove - �Ƿ��Ƴ���ʱ����ʷ��¼
     * @returns {Array} - ������Ƴ���ʷ��¼���򷵻���ʷ��¼���飻�����޷���ֵ
     */
    storage_obsolete: function (is_remove) {
      // �ӱ��ش洢��ȡ��ʷ��¼��������������ʼ��Ϊ������
      let data = JSON.parse(localStorage.getItem("history") || "[]");
      // ���is_removeΪtrue�����Ƴ����ش洢�е���ʷ��¼
      if (is_remove) localStorage.removeItem("history");
      else return data;
    },

    /**
     * ��ʽ�������ַ���
     * @param {Date} i - ��������ڶ���
     * @param {string} o - ���ڸ�ʽ�ַ���
     * @param {boolean} tz - �Ƿ���ʱ��
     * @returns {string} - ��ʽ����������ַ���
     */
    formatDate: function (i, o, tz) {
      // �������ڶ���
      let d = new Date(i);
      // �����Ҫ����ʱ������������ڶ���UTCʱ��
      if (tz) d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      // �·ݵ���д����
      let m = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
      ];
      // �����滻���ڸ�ʽ�ַ����еĸ���Ԫ�صĶ���
      let v = {
        YYYY: d.getUTCFullYear().toString(),
        YY: d.getUTCFullYear().toString(),
        MM: d.getUTCMonth() + 1,
        MMM: m[d.getUTCMonth()],
        DD: d.getUTCDate(),
        hh: d.getUTCHours(),
        mm: d.getUTCMinutes(),
        ss: d.getUTCSeconds(),
        h2: d.getUTCHours() % 12,
        ap: d.getUTCHours() < 12 ? "AM" : "PM",
      };
      // ʹ��������ʽ���滻�����ʽ�������ַ���
      return o.replace(/(YY(YY)?|MMM?|DD|hh|mm|ss|h2|ap)/g, (n) =>
        ("0" + v[n]).substr(-n.length)
      );
    },
    // ����һ������������
    downloader: (function () {
      // ��ʼ����������ر���
      let tasks = [],
        thread = 0,
        max_thread = 2,
        retry = 0,
        max_retry = 2,
        failed = 0,
        notifier,
        has_failed = false;
      // ����һ���������ع����ܵĶ���
      return {
        // ���һ���������񵽶���
        add: function (task) {
          tasks.push(task);
          // �����ǰ�߳���С������߳�������������һ������
          if (thread < max_thread) {
            thread += 1;
            this.next();
          } else this.update();
        },
        // �첽ִ����һ����������
        next: async function () {
          let task = tasks.shift();
          await this.start(task);
          // ������������ҵ�ǰ�߳���δ�ﵽ���ֵ������ִ����һ������
          if (tasks.length > 0 && thread <= max_thread) this.next();
          else thread -= 1;
          this.update();
        },
        // ��ʼ����ָ������
        start: function (task) {
          this.update();
          return new Promise((resolve) => {
            GM_download({
              url: task.url,
              name: task.name,
              onload: (result) => {
                task.onload();
                resolve();
              },
              onerror: (result) => {
                this.retry(task, result);
                resolve();
              },
              ontimeout: (result) => {
                this.retry(task, result);
                resolve();
              },
            });
          });
        },
        // ��������ʧ�ܵ�������������Ի򱨸����
        retry: function (task, result) {
          retry += 1;
          // ����ﵽ������Դ�����������߳�������1
          if (retry == 3) max_thread = 1;
          if (
            (task.retry && task.retry >= max_retry) ||
            (result.details && result.details.current == "USER_CANCELED")
          ) {
            task.onerror(result);
            failed += 1;
          } else {
            // �������߳���Ϊ1�����������Դ���
            if (max_thread == 1) task.retry = (task.retry || 0) + 1;
            this.add(task);
          }
        },
        // ������������״̬��Ϣ
        update: function () {
          // ��ʼ�����������״̬֪ͨ��
          if (!notifier) {
            notifier = document.createElement("div");
            notifier.title = "Twitter Media Downloader";
            notifier.classList.add("tmd-notifier");
            notifier.innerHTML = "<label>0</label>|<label>0</label>";
            document.body.appendChild(notifier);
          }
          // ����ʧ���������ʾ�����ṩ���ѡ��
          if (failed > 0 && !has_failed) {
            has_failed = true;
            notifier.innerHTML += "|";
            let clear = document.createElement("label");
            notifier.appendChild(clear);
            clear.onclick = () => {
              notifier.innerHTML = "<label>0</label>|<label>0</label>";
              failed = 0;
              has_failed = false;
              this.update();
            };
          }
          // ����֪ͨ���е����ؽ��Ⱥ�״̬
          notifier.firstChild.innerText = thread;
          notifier.firstChild.nextElementSibling.innerText = tasks.length;
          if (failed > 0) notifier.lastChild.innerText = failed;
          if (thread > 0 || tasks.length > 0 || failed > 0)
            notifier.classList.add("running");
          else notifier.classList.remove("running");
        },
      };
    })(),
    // ����֧�ֵ����Լ�������ı�
    language: {
      en: {
        download: "Download",
        completed: "Download Completed",
        settings: "Settings",
        dialog: {
          title: "Download Settings",
          save: "Save",
          save_history: "Remember download history",
          clear_history: "(Clear)",
          clear_confirm: "Clear download history?",
          show_sensitive: "Always show sensitive content",
          pattern: "File Name Pattern",
        },
      },
      ja: {
        download: "�������`��",
        completed: "�������`������",
        settings: "�O��",
        dialog: {
          title: "�������`���O��",
          save: "����",
          save_history: "�������`���Ěs�򱣴椹��",
          clear_history: "(���ꥢ)",
          clear_confirm: "�������`���Ěs���������룿",
          show_sensitive: "���󥷥ƥ��֤����ݤ򳣤˱�ʾ����",
          pattern: "�ե��������ѥ��`��",
        },
      },
      zh: {
        download: "����",
        completed: "�������",
        settings: "����",
        dialog: {
          title: "��������",
          save: "����",
          save_history: "�������ؼ�¼",
          clear_history: "(���)",
          clear_confirm: "ȷ��Ҫ������ؼ�¼��",
          show_sensitive: "�Զ���ʾ���е�����",
          pattern: "�ļ�����ʽ",
        },
      },
      "zh-Hant": {
        download: "���d",
        completed: "���d���",
        settings: "�O��",
        dialog: {
          title: "���d�O��",
          save: "����",
          save_history: "�������dӛ�",
          clear_history: "(���)",
          clear_confirm: "�_�JҪ������dӛ䛣�",
          show_sensitive: "�Ԅ��@ʾ���е�����",
          pattern: "�ļ���Ҏ�t",
        },
      },
    },
    css: `
.tmd-down {margin-left: 12px; order: 99;}
.tmd-down:hover > div > div > div > div {color: rgba(29, 161, 242, 1.0);}
.tmd-down:hover > div > div > div > div > div {background-color: rgba(29, 161, 242, 0.1);}
.tmd-down:active > div > div > div > div > div {background-color: rgba(29, 161, 242, 0.2);}
.tmd-down:hover svg {color: rgba(29, 161, 242, 1.0);}
.tmd-down:hover div:first-child:not(:last-child) {background-color: rgba(29, 161, 242, 0.1);}
.tmd-down:active div:first-child:not(:last-child) {background-color: rgba(29, 161, 242, 0.2);}
.tmd-down.tmd-media {position: absolute; right: 0;}
.tmd-down.tmd-media > div {display: flex; border-radius: 99px; margin: 2px;}
.tmd-down.tmd-media > div > div {display: flex; margin: 6px; color: #fff;}
.tmd-down.tmd-media:hover > div {background-color: rgba(255,255,255, 0.6);}
.tmd-down.tmd-media:hover > div > div {color: rgba(29, 161, 242, 1.0);}
.tmd-down.tmd-media:not(:hover) > div > div {filter: drop-shadow(0 0 1px #000);}
.tmd-down g {display: none;}
.tmd-down.download g.download, .tmd-down.completed g.completed, .tmd-down.loading g.loading,.tmd-down.failed g.failed {display: unset;}
.tmd-down.loading svg {animation: spin 1s linear infinite;}
@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}
.tmd-btn {display: inline-block; background-color: #1DA1F2; color: #FFFFFF; padding: 0 20px; border-radius: 99px;}
.tmd-tag {display: inline-block; background-color: #FFFFFF; color: #1DA1F2; padding: 0 10px; border-radius: 10px; border: 1px solid #1DA1F2;  font-weight: bold; margin: 5px;}
.tmd-btn:hover {background-color: rgba(29, 161, 242, 0.9);}
.tmd-tag:hover {background-color: rgba(29, 161, 242, 0.1);}
.tmd-notifier {display: none; position: fixed; left: 16px; bottom: 16px; color: #000; background: #fff; border: 1px solid #ccc; border-radius: 8px; padding: 4px;}
.tmd-notifier.running {display: flex; align-items: center;}
.tmd-notifier label {display: inline-flex; align-items: center; margin: 0 8px;}
.tmd-notifier label:before {content: " "; width: 32px; height: 16px; background-position: center; background-repeat: no-repeat;}
.tmd-notifier label:nth-child(1):before {background-image:url("data:image/svg+xml;charset=utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22><path d=%22M3,14 v5 q0,2 2,2 h14 q2,0 2,-2 v-5 M7,10 l4,4 q1,1 2,0 l4,-4 M12,3 v11%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%222%22 stroke-linecap=%22round%22 /></svg>");}
.tmd-notifier label:nth-child(2):before {background-image:url("data:image/svg+xml;charset=utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22><path d=%22M12,2 a1,1 0 0 1 0,20 a1,1 0 0 1 0,-20 M12,5 v7 h6%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%222%22 stroke-linejoin=%22round%22 stroke-linecap=%22round%22 /></svg>");}
.tmd-notifier label:nth-child(3):before {background-image:url("data:image/svg+xml;charset=utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22><path d=%22M12,0 a2,2 0 0 0 0,24 a2,2 0 0 0 0,-24%22 fill=%22%23f66%22 stroke=%22none%22 /><path d=%22M14.5,5 a1,1 0 0 0 -5,0 l0.5,9 a1,1 0 0 0 4,0 z M12,17 a2,2 0 0 0 0,5 a2,2 0 0 0 0,-5%22 fill=%22%23fff%22 stroke=%22none%22 /></svg>");}
.tmd-down.tmd-img {position: absolute; right: 0; bottom: 0; display: none !important;}
.tmd-down.tmd-img > div {display: flex; border-radius: 99px; margin: 2px; background-color: rgba(255,255,255, 0.6);}
.tmd-down.tmd-img > div > div {display: flex; margin: 6px; color: #fff !important;}
.tmd-down.tmd-img:not(:hover) > div > div {filter: drop-shadow(0 0 1px #000);}
.tmd-down.tmd-img:hover > div > div {color: rgba(29, 161, 242, 1.0);}
:hover > .tmd-down.tmd-img, .tmd-img.loading, .tmd-img.completed, .tmd-img.failed {display: block !important;}
.tweet-detail-action-item {width: 20% !important;}
`,
    css_ss: `
/* show sensitive in media tab */
li[role="listitem"]>div>div>div>div:not(:last-child) {filter: none;}
li[role="listitem"]>div>div>div>div+div:last-child {display: none;}
`,
    svg: `
<g class="download"><path d="M3,14 v5 q0,2 2,2 h14 q2,0 2,-2 v-5 M7,10 l4,4 q1,1 2,0 l4,-4 M12,3 v11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></g>
<g class="completed"><path d="M3,14 v5 q0,2 2,2 h14 q2,0 2,-2 v-5 M7,10 l3,4 q1,1 2,0 l8,-11" fill="none" stroke="#1DA1F2" stroke-width="2" stroke-linecap="round" /></g>
<g class="loading"><circle cx="12" cy="12" r="10" fill="none" stroke="#1DA1F2" stroke-width="4" opacity="0.4" /><path d="M12,2 a10,10 0 0 1 10,10" fill="none" stroke="#1DA1F2" stroke-width="4" stroke-linecap="round" /></g>
<g class="failed"><circle cx="12" cy="12" r="11" fill="#f33" stroke="currentColor" stroke-width="2" opacity="0.8" /><path d="M14,5 a1,1 0 0 0 -4,0 l0.5,9.5 a1.5,1.5 0 0 0 3,0 z M12,17 a2,2 0 0 0 0,4 a2,2 0 0 0 0,-4" fill="#fff" stroke="none" /></g>
`,
  };
})();

TMD.init();
