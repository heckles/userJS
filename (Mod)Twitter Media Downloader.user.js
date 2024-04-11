// ==UserScript==
// @name        【Mod】Twitter Media Downloader
// @description    Save Video/Photo by One-Click.【Mod】1.变更日期格式
// @description:ja ワンクリックで動画・画像を保存する。
// @description:zh-cn 一键保存视频/图片
// @description:zh-tw 一鍵保存視頻/圖片
// @version     1.27-Mod-20240411.02
// @author      AMANE【Mod】by heckles
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
// @downloadURL https://update.greasyfork.org/scripts/491942/%E3%80%90Mod%E3%80%91Twitter%20Media%20Downloader.user.js
// @updateURL https://update.greasyfork.org/scripts/491942/%E3%80%90Mod%E3%80%91Twitter%20Media%20Downloader.user.js
// ==/UserScript==
/* jshint esversion: 8 */

const filename =
  "{date-time}_twitter_{user-name}(@{user-id})_{status-id}_{file-type}";

/**
 * TMD 是一个功能丰富的 Twitter 客户端增强工具，支持自定义设置、多媒体下载等功能。
 */
const TMD = (function () {
  let lang, host, history, show_sensitive, is_tweetdeck;

  // 初始化TMD，注册菜单命令，加载语言、主机名、历史记录等
  return {
    init: async function () {
      // 注册右键菜单命令
      GM_registerMenuCommand(
        (this.language[navigator.language] || this.language.en).settings,
        this.settings
      );

      // 初始化语言、主机名、是否在TweetDeck中
      lang =
        this.language[document.querySelector("html").lang] || this.language.en;
      host = location.hostname;
      is_tweetdeck = host.indexOf("tweetdeck") >= 0;

      // 处理存储历史记录
      history = this.storage_obsolete();
      if (history.length) {
        this.storage(history);
        this.storage_obsolete(true);
      } else history = await this.storage();

      // 读取是否显示敏感内容的设置
      show_sensitive = GM_getValue("show_sensitive", false);

      // 插入CSS样式
      document.head.insertAdjacentHTML(
        "beforeend",
        "<style>" + this.css + (show_sensitive ? this.css_ss : "") + "</style>"
      );

      // 监听DOM变化，以动态添加功能按钮
      let observer = new MutationObserver((ms) =>
        ms.forEach((m) => m.addedNodes.forEach((node) => this.detect(node)))
      );
      observer.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * 检测并处理新加载的DOM节点，以添加功能按钮。
     * @param {Node} node - 需要检测的DOM节点
     */
    detect: function (node) {
      // 在文章或媒体容器中添加下载按钮
      let article =
        (node.tagName == "ARTICLE" && node) ||
        (node.tagName == "DIV" &&
          (node.querySelector("article") || node.closest("article")));
      if (article) this.addButtonTo(article);

      // 在列表项中添加媒体下载按钮
      let listitems =
        (node.tagName == "LI" &&
          node.getAttribute("role") == "listitem" && [node]) ||
        (node.tagName == "DIV" && node.querySelectorAll('li[role="listitem"]'));
      if (listitems) this.addButtonToMedia(listitems);
    },

    /**
     * 在文章中添加功能按钮。
     * @param {Element} article - 需要添加按钮的文章元素
     */
    addButtonTo: function (article) {
      if (article.dataset.detected) return;
      article.dataset.detected = "true";

      // 查找媒体元素并添加下载按钮
      let media_selector = [
        'a[href*="/photo/1"]',
        'div[role="progressbar"]',
        'div[data-testid="playButton"]',
        'a[href="/settings/content_you_see"]', // 隐藏的内容
        "div.media-image-container", // 用于TweetDeck
        "div.media-preview-container", // 用于TweetDeck
        'div[aria-labelledby]>div:first-child>div[role="button"][tabindex="0"]', // 音频（实验性）
      ];
      let media = article.querySelector(media_selector.join(","));
      if (media) {
        // 生成按钮并插入到文章中
        let status_id = article
          .querySelector('a[href*="/status/"]')
          .href.split("/status/")
          .pop()
          .split("/")
          .shift();
        let btn_group = article.querySelector(
          'div[role="group"]:last-of-type, ul.tweet-actions, ul.tweet-detail-actions'
        );
        let btn_share = Array.from(
          btn_group.querySelectorAll(
            ":scope>div>div, li.tweet-action-item>a, li.tweet-detail-action-item>a"
          )
        ).pop().parentNode;
        let btn_down = btn_share.cloneNode(true);

        // 根据是否在TweetDeck中，定制按钮样式
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

        // 处理按钮状态，已下载或未下载
        let is_exist = history.indexOf(status_id) >= 0;
        this.status(btn_down, "tmd-down");
        this.status(
          btn_down,
          is_exist ? "completed" : "download",
          is_exist ? lang.completed : lang.download
        );

        // 在分享按钮后插入下载按钮
        btn_group.insertBefore(btn_down, btn_share.nextSibling);
        // 绑定按钮点击事件
        btn_down.onclick = () => this.click(btn_down, status_id, is_exist);

        // 如果显示敏感内容，自动点击显示敏感内容按钮
        if (show_sensitive) {
          let btn_show = article.querySelector(
            'div[aria-labelledby] div[role="button"][tabindex="0"]:not([data-testid]) > div[dir] > span > span'
          );
          if (btn_show) btn_show.click();
        }
      }

      // 为包含多张图片的文章添加单独下载按钮
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
          let index = img.href.split("/status/").pop().split("/").pop();
          let is_exist = history.indexOf(status_id) >= 0;
          let btn_down = document.createElement("div");
          btn_down.innerHTML =
            '<div><div><svg viewBox="0 0 24 24" style="width: 18px; height: 18px;">' +
            this.svg +
            "</svg></div></div>";
          btn_down.classList.add("tmd-down", "tmd-img");

          // 添加图片下载功能
          this.status(btn_down, "download");
          img.parentNode.appendChild(btn_down);
          btn_down.onclick = (e) => {
            e.preventDefault();
            this.click(btn_down, status_id, is_exist, index);
          };
        });
      }
    },
    /**
     * 向媒体列表项中添加下载按钮
     * @param {Array} listitems - 媒体列表项的数组
     */
    addButtonToMedia: function (listitems) {
      listitems.forEach((li) => {
        // 如果当前列表项已经被检测过，则跳过
        if (li.dataset.detected) return;
        li.dataset.detected = "true";

        // 提取状态ID
        let status_id = li
          .querySelector('a[href*="/status/"]')
          .href.split("/status/")
          .pop()
          .split("/")
          .shift();

        // 检查历史记录中是否已经存在该状态ID
        let is_exist = history.indexOf(status_id) >= 0;

        // 创建下载按钮元素
        let btn_down = document.createElement("div");
        btn_down.innerHTML =
          '<div><div><svg viewBox="0 0 24 24" style="width: 18px; height: 18px;">' +
          this.svg +
          "</svg></div></div>";
        btn_down.classList.add("tmd-down", "tmd-media");

        // 设置按钮状态，已存在则为完成，否则为下载
        this.status(
          btn_down,
          is_exist ? "completed" : "download",
          is_exist ? lang.completed : lang.download
        );

        // 将按钮添加到列表项中
        li.appendChild(btn_down);

        // 设置按钮点击事件处理函数
        btn_down.onclick = () => this.click(btn_down, status_id, is_exist);
      });
    },
    /**
 * 点击按钮时的处理函数，用于下载推文的相关信息和媒体文件。
 * @param {HTMLElement} btn 被点击的按钮元素。
 * @param {string} status_id 推文的ID。
 * @param {boolean} is_exist 表示该推文是否已存在于历史记录中。
 * @param {number} [index] 媒体文件的索引，用于下载特定的媒体文件（可选）。
 */
    click: async function (btn, status_id, is_exist, index) {
      // 如果按钮正在加载中，则不执行任何操作
      if (btn.classList.contains("loading")) return;
      // 设置按钮状态为加载中
      this.status(btn, "loading");
      // 从存储中获取文件名，并移除换行符
      let out = (await GM_getValue("filename", filename)).split("\n").join("");
      // 获取是否保存历史记录的设置
      let save_history = await GM_getValue("save_history", true);
      // 获取推文的JSON数据
      let json = await this.fetchJson(status_id);
      // 解析推文和用户信息
      let tweet = json.legacy;
      let user = json.core.user_results.result.legacy;
      // 定义无效字符及其替换字符
      let invalid_chars = {
        "\\": "＼",
        "/": "／",
        "|": "｜",
        "<": "＜",
        ">": "＞",
        ":": "：",
        "*": "＊",
        "?": "？",
        '"': "＂",
        "\u200b": "",
        "\u200c": "",
        "\u200d": "",
        "\u2060": "",
        "\ufeff": "",
        "🔞": "",
      };
      // 解析或设定日期时间格式
      let datetime = out.match(/{date-time(-local)?:[^{}]+}/)
        ? out
          .match(/{date-time(?:-local)?:([^{}]+)}/)[1]
          .replace(/[\\/|<>*?:"]/g, (v) => invalid_chars[v])
        : "YYYY-MM-DD hh-mm-ss";
      // 准备存储信息的对象
      let info = {};
      // 填充信息对象，包括推文ID、用户名、用户ID、日期时间等
      info["status-id"] = status_id;
      info["user-name"] = user.name.replace(
        /([\\/|*?:"]|[\u200b-\u200d\u2060\ufeff]|🔞)/g,
        (v) => invalid_chars[v]
      );
      info["user-id"] = user.screen_name;
      info["date-time"] = this.formatDate(tweet.created_at, datetime);
      info["date-time-local"] = this.formatDate(
        tweet.created_at,
        datetime,
        true
      );
      // 处理推文的完整文本，移除URL，替换无效字符
      info["full-text"] = tweet.full_text
        .split("\n")
        .join(" ")
        .replace(/\s*https:\/\/t\.co\/\w+/g, "")
        .replace(
          /[\\/|<>*?:"]|[\u200b-\u200d\u2060\ufeff]/g,
          (v) => invalid_chars[v]
        );
      // 处理推文中的媒体文件
      let medias = tweet.extended_entities && tweet.extended_entities.media;
      if (index) medias = [medias[index - 1]];
      if (medias.length > 0) {
        // 对每个媒体文件执行下载操作
        let tasks = medias.length;
        let tasks_result = [];
        medias.forEach((media, i) => {
          // 提取媒体文件的下载URL和相关信息
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
          // 构造输出文件名
          info.out = (
            out.replace(/\.?{file-ext}/, "") +
            ((medias.length > 1 || index) && !out.match("{file-name}")
              ? "-" + (index ? index - 1 : i)
              : "") +
            ".{file-ext}"
          ).replace(/{([^{}:]+)(:[^{}]+)?}/g, (match, name) => info[name]);
          // 添加下载任务
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
              // 更新按钮状态
              this.status(btn, null, tasks_result.sort().join("\n"));
              if (tasks === 0) {
                // 所有任务完成后，更新按钮状态为完成，并保存历史记录
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
              // 下载失败时更新按钮状态
              this.status(btn, "failed", tasks_result.sort().join("\n"));
            },
          });
        });
      } else {
        // 如果没有找到媒体文件，更新按钮状态为失败
        this.status(btn, "failed", "MEDIA_NOT_FOUND");
      }
    },
    /**
     * 更新按钮的状态。
     * @param {Element} btn - 需要更新状态的按钮元素。
     * @param {string} css - 按钮需要添加的CSS类，用于改变按钮的样式。
     * @param {string} title - 按钮的标题，用于提示信息。
     * @param {string} style - 直接应用于按钮的内联样式，用于更精细的样式控制。
     */
    status: function (btn, css, title, style) {
      // 如果提供了css参数，则移除按钮现有的状态类并添加新的CSS类
      if (css) {
        btn.classList.remove("download", "completed", "loading", "failed");
        btn.classList.add(css);
      }
      // 如果提供了title参数，则更新按钮的标题
      if (title) btn.title = title;
      // 如果提供了style参数，则更新按钮的内联样式
      if (style) btn.style.cssText = style;
    },
    /**
     * 弹出设置对话框的异步函数。
     * 该函数动态创建一个包含设置选项的对话框，允许用户修改保存历史和敏感内容显示等设置。
     * 用户确认更改后，更新相应的设置并关闭对话框。
     */
    settings: async function () {
      // 创建元素的辅助函数
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

      // 创建对话框外层容器
      let wapper = $element(
        document.body,
        "div",
        "position: fixed; left: 0px; top: 0px; width: 100%; height: 100%; background-color: #0009; z-index: 10;",
      );

      // 处理对话框的关闭逻辑
      let wapper_close;
      wapper.onmousedown = (e) => {
        wapper_close = e.target == wapper;
      };
      wapper.onmouseup = (e) => {
        if (wapper_close && e.target == wapper) wapper.remove();
      };

      // 创建对话框内容容器
      let dialog = $element(
        wapper,
        "div",
        "position: absolute; left: 50%; top: 50%; transform: translateX(-50%) translateY(-50%); width: fit-content; width: -moz-fit-content; background-color: #f3f3f3; border: 1px solid #ccc; border-radius: 10px; color: black;",
      );

      // 设置对话框标题
      let title = $element(
        dialog,
        "h3",
        "margin: 10px 20px;",
        lang.dialog.title
      );

      // 创建设置选项容器
      let options = $element(
        dialog,
        "div",
        "margin: 10px; border: 1px solid #ccc; border-radius: 5px;",
      );

      // 保存历史记录选项
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

      // 清除历史记录按钮
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

      // 显示敏感内容选项
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

      // 文件名设置容器
      let filename_div = $element(
        dialog,
        "div",
        "margin: 10px; border: 1px solid #ccc; border-radius: 5px;",
      );

      // 文件名标签和输入框
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

      // 文件名模式标签
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

      // 设置文件名输入框的初始选中位置，并为标签添加点击事件
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

      // 保存设置按钮
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
 * 异步获取指定状态ID的JSON数据
 * @param {string} status_id - 待查询的状态ID
 * @returns {Promise<Object>} 返回一个Promise对象，包含指定推文的详细信息
 */
    fetchJson: async function (status_id) {
      // 定义基础URL
      let base_url = `https://${host}/i/api/graphql/NmCeCgkVlsRGS1cAwqtgmw/TweetDetail`;
      // 定义查询变量
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
      // 定义功能特性
      let features = {
        // 各种功能特性的布尔值配置
      };
      // 构建完整查询URL
      let url = encodeURI(
        `${base_url}?variables=${JSON.stringify(
          variables
        )}&features=${JSON.stringify(features)}`
      );
      // 获取当前页面的cookies
      let cookies = this.getCookie();
      // 定义请求headers
      let headers = {
        authorization:
          "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        "x-twitter-active-user": "yes",
        "x-twitter-client-language": cookies.lang,
        "x-csrf-token": cookies.ct0,
      };
      // 如果存在guest token，则添加到headers中
      if (cookies.ct0.length == 32) headers["x-guest-token"] = cookies.gt;
      // 发起HTTP请求并解析响应为JSON
      let tweet_detail = await fetch(url, { headers: headers }).then((result) =>
        result.json()
      );
      // 从响应中提取推文详细信息
      let tweet_entrie =
        tweet_detail.data.threaded_conversation_with_injections_v2.instructions[0].entries.find(
          (n) => n.entryId == `tweet-${status_id}`
        );
      let tweet_result = tweet_entrie.content.itemContent.tweet_results.result;
      // 返回推文信息
      return tweet_result.tweet || tweet_result;
    },

    /**
     * 获取指定名称的cookie值
     * @param {string} [name] - 待获取的cookie名称，可选，默认为获取所有cookie
     * @returns {Object|string} 如果指定了name，则返回该cookie的值；否则返回所有cookie的键值对对象
     */
    getCookie: function (name) {
      // 解析document.cookie获取所有cookie
      let cookies = {};
      document.cookie
        .split(";")
        .filter((n) => n.indexOf("=") > 0)
        .forEach((n) => {
          n.replace(/^([^=]+)=(.+)$/, (match, name, value) => {
            cookies[name.trim()] = value.trim();
          });
        });
      // 返回指定名称的cookie值或所有cookie
      return name ? cookies[name] : cookies;
    },

    /**
     * 异步存储数据到本地存储（如GM_setValue）
     * @param {*} value - 待存储的数据，可以是任意类型。如果为数组，则会合并到现有数据中；如果为其他类型且不在现有数据中，则会添加。
     * @returns {Promise<void>} 不返回任何内容
     */
    storage: async function (value) {
      // 获取当前存储的历史数据
      let data = await GM_getValue("download_history", []);
      let data_length = data.length;
      // 如果提供了value，进行数据处理和存储
      if (value) {
        if (Array.isArray(value)) data = data.concat(value);
        else if (data.indexOf(value) < 0) data.push(value);
      } else return data; // 如果未提供value，直接返回当前数据
      // 如果数据有更新，则保存
      if (data.length > data_length) GM_setValue("download_history", data);
    },
    storage_obsolete: function (is_remove) {
      let data = JSON.parse(localStorage.getItem("history") || "[]");
      if (is_remove) localStorage.removeItem("history");
      else return data;
    },
    formatDate: function (i, o, tz) {
      let d = new Date(i);
      if (tz) d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
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
      return o.replace(/(YY(YY)?|MMM?|DD|hh|mm|ss|h2|ap)/g, (n) =>
        ("0" + v[n]).substr(-n.length)
      );
    },
    downloader: (function () {
      let tasks = [],
        thread = 0,
        max_thread = 2,
        retry = 0,
        max_retry = 2,
        failed = 0,
        notifier,
        has_failed = false;
      return {
        add: function (task) {
          tasks.push(task);
          if (thread < max_thread) {
            thread += 1;
            this.next();
          } else this.update();
        },
        next: async function () {
          let task = tasks.shift();
          await this.start(task);
          if (tasks.length > 0 && thread <= max_thread) this.next();
          else thread -= 1;
          this.update();
        },
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
        retry: function (task, result) {
          retry += 1;
          if (retry == 3) max_thread = 1;
          if (
            (task.retry && task.retry >= max_retry) ||
            (result.details && result.details.current == "USER_CANCELED")
          ) {
            task.onerror(result);
            failed += 1;
          } else {
            if (max_thread == 1) task.retry = (task.retry || 0) + 1;
            this.add(task);
          }
        },
        update: function () {
          if (!notifier) {
            notifier = document.createElement("div");
            notifier.title = "Twitter Media Downloader";
            notifier.classList.add("tmd-notifier");
            notifier.innerHTML = "<label>0</label>|<label>0</label>";
            document.body.appendChild(notifier);
          }
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
          notifier.firstChild.innerText = thread;
          notifier.firstChild.nextElementSibling.innerText = tasks.length;
          if (failed > 0) notifier.lastChild.innerText = failed;
          if (thread > 0 || tasks.length > 0 || failed > 0)
            notifier.classList.add("running");
          else notifier.classList.remove("running");
        },
      };
    })(),
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
        download: "ダウンロード",
        completed: "ダウンロード完了",
        settings: "設定",
        dialog: {
          title: "ダウンロード設定",
          save: "保存",
          save_history: "ダウンロード履歴を保存する",
          clear_history: "(クリア)",
          clear_confirm: "ダウンロード履歴を削除する？",
          show_sensitive: "センシティブな内容を常に表示する",
          pattern: "ファイル名パターン",
        },
      },
      zh: {
        download: "下载",
        completed: "下载完成",
        settings: "设置",
        dialog: {
          title: "下载设置",
          save: "保存",
          save_history: "保存下载记录",
          clear_history: "(清除)",
          clear_confirm: "确认要清除下载记录？",
          show_sensitive: "自动显示敏感的内容",
          pattern: "文件名格式",
        },
      },
      "zh-Hant": {
        download: "下載",
        completed: "下載完成",
        settings: "設置",
        dialog: {
          title: "下載設置",
          save: "保存",
          save_history: "保存下載記錄",
          clear_history: "(清除)",
          clear_confirm: "確認要清除下載記錄？",
          show_sensitive: "自動顯示敏感的内容",
          pattern: "文件名規則",
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
