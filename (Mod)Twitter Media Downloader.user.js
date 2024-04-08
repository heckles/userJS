// ==UserScript==
// @name        (Mod)Twitter Media Downloader
// @name:ja     (Mod)Twitter Media Downloader
// @name:zh-cn  (Mod)Twitter 媒体下载
// @name:zh-tw  (Mod)Twitter 媒體下載
// @description    Save Video/Photo by One-Click.【Mod】1.修改下载文件名格式
// @description:ja ワンクリックで動画?画像を保存する。
// @description:zh-cn 一键保存视频/图片
// @description:zh-tw 一鍵保存視頻/圖片
// @version     1.27-Mod-20240408
// @author      AMANE【Mod by heckles】
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
// @downloadURL https://update.greasyfork.org/scripts/491942/%28Mod%29Twitter%20Media%20Downloader.user.js
// @updateURL https://update.greasyfork.org/scripts/491942/%28Mod%29Twitter%20Media%20Downloader.user.js
// ==/UserScript==
/* jshint esversion: 8 */

/**
 * 生成推特文件名格式
 *
 * 该文件名格式用于标识推特用户、发布日期时间、状态ID和文件类型。
 * 它采用特定的字符串模板，通过替换模板中的占位符来生成最终的文件名。
 *
 * @param {string} userName 用户名
 * @param {number} userId 用户ID
 * @param {string} dateTime 发布的日期和时间，应为符合特定格式的字符串
 * @param {string} statusId 状态ID，即推文的唯一标识符
 * @param {string} fileType 文件类型，如jpg、png等
 * @returns {string} 根据提供的参数生成的推特文件名
 */
const filename =
  //  "twitter_{user-name}(@{user-id})_{date-time}_{status-id}_{file-type}";
  "{date-time}_twitter_{user-name}(@{user-id})_{status-id}_{file-type}";
/**
 * TMD 是一个封装了各种功能的自执行函数，用于实现语言环境配置、存储管理、敏感内容显示控制等。
 * */
const TMD = (function () {
  let lang, host, history, show_sensitive, is_tweetdeck;
  // 返回一个包含各种功能的方法的对象
  return {
    /**
     * 初始化函数，负责设置语言、检测环境、初始化存储及设置界面样式等。
     * */
    init: async function () {
      // 注册右键菜单命令，根据用户语言设置显示的文本
      GM_registerMenuCommand(
        (this.language[navigator.language] || this.language.en).settings,
        this.settings
      );
      lang =
        this.language[document.querySelector("html").lang] || this.language.en; // 设置当前语言
      host = location.hostname; // 获取当前域名
      is_tweetdeck = host.indexOf("tweetdeck") >= 0; // 检查是否在TweetDeck环境中
      history = this.storage_obsolete(); // 试图从旧存储中获取历史记录

      // 如果存在历史记录，则使用旧存储机制，否则使用新的存储机制
      if (history.length) {
        this.storage(history);
        this.storage_obsolete(true);
      } else history = await this.storage(); // 异步获取存储的历史记录

      show_sensitive = GM_getValue("show_sensitive", false); // 获取是否显示敏感内容的设置
      // 动态插入样式表，根据是否显示敏感内容决定是否应用额外的样式
      document.head.insertAdjacentHTML(
        "beforeend",
        "<style>" + this.css + (show_sensitive ? this.css_ss : "") + "</style>"
      );

      // 使用MutationObserver监听文档变动，以实时处理新增节点
      let observer = new MutationObserver((ms) =>
        ms.forEach((m) => m.addedNodes.forEach((node) => this.detect(node)))
      );
      observer.observe(document.body, { childList: true, subtree: true }); // 启动观察者
    },
    /**
     * 检测给定的节点，并根据其类型添加相应的按钮。
     * @param {HTMLElement} node - 需要进行检测的DOM节点。
     */
    detect: function (node) {
      // 检查当前节点或其子节点或最近的祖先节点是否为ARTICLE标签，如果是，则为该文章节点添加按钮
      let article =
        (node.tagName == "ARTICLE" && node) ||
        (node.tagName == "DIV" &&
          (node.querySelector("article") || node.closest("article")));
      if (article) this.addButtonTo(article);

      // 检查当前节点是否为LI标签且其角色为listitem，或如果当前节点为DIV标签则查找所有的li[role="listitem"]子节点，若是，则为这些媒体列表项添加按钮
      let listitems =
        (node.tagName == "LI" &&
          node.getAttribute("role") == "listitem" && [node]) ||
        (node.tagName == "DIV" && node.querySelectorAll('li[role="listitem"]'));
      if (listitems) this.addButtonToMedia(listitems);
    },
    /**
     * 向指定的文章中添加下载按钮。
     * @param {HTMLElement} article - 需要添加按钮的文章元素。
     */
    addButtonTo: function (article) {
      // 如果已经检测到，则不再重复添加
      if (article.dataset.detected) return;
      article.dataset.detected = "true";

      // 定义用于选择媒体元素的选择器
      let media_selector = [
        'a[href*="/photo/1"]',
        'div[role="progressbar"]',
        'div[data-testid="playButton"]',
        'a[href="/settings/content_you_see"]', // 隐藏的内容
        "div.media-image-container", // 用于TweetDeck
        "div.media-preview-container", // 用于TweetDeck
        'div[aria-labelledby]>div:first-child>div[role="button"][tabindex="0"]', // 音频（实验性）
      ];

      // 尝试根据选择器找到媒体元素
      let media = article.querySelector(media_selector.join(","));

      if (media) {
        // 从文章中提取状态ID
        let status_id = article
          .querySelector('a[href*="/status/"]')
          .href.split("/status/")
          .pop()
          .split("/")
          .shift();

        // 查找按钮组或者操作列表
        let btn_group = article.querySelector(
          'div[role="group"]:last-of-type, ul.tweet-actions, ul.tweet-detail-actions'
        );

        // 在按钮组中找到分享按钮的父节点
        let btn_share = Array.from(
          btn_group.querySelectorAll(
            ":scope>div>div, li.tweet-action-item>a, li.tweet-detail-action-item>a"
          )
        ).pop().parentNode;

        // 克隆分享按钮并创建下载按钮
        let btn_down = btn_share.cloneNode(true);

        // 根据是否在TweetDeck中，对按钮进行不同的设置
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

        // 检查是否已经下载
        let is_exist = history.indexOf(status_id) >= 0;

        // 设置按钮状态
        this.status(btn_down, "tmd-down");
        this.status(
          btn_down,
          is_exist ? "completed" : "download",
          is_exist ? lang.completed : lang.download
        );

        // 在按钮组中插入下载按钮
        btn_group.insertBefore(btn_down, btn_share.nextSibling);

        // 绑定点击事件
        btn_down.onclick = () => this.click(btn_down, status_id, is_exist);

        // 如果显示敏感内容，自动点击显示按钮
        if (show_sensitive) {
          let btn_show = article.querySelector(
            'div[aria-labelledby] div[role="button"][tabindex="0"]:not([data-testid]) > div[dir] > span > span'
          );
          if (btn_show) btn_show.click();
        }
      }

      // 处理文章中的多张图片
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
          // 为每张图片生成独立的下载按钮
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

          // 绑定点击事件，防止默认行为
          btn_down.onclick = (e) => {
            e.preventDefault();
            this.click(btn_down, status_id, is_exist, index);
          };
        });
      }
    },
    /**
     * 为媒体列表项添加下载按钮
     * @param {Array} listitems - 包含媒体信息的列表项数组
     */
    addButtonToMedia: function (listitems) {
      listitems.forEach((li) => {
        // 跳过已经检测过的列表项
        if (li.dataset.detected) return;
        li.dataset.detected = "true";

        // 提取状态ID
        let status_id = li
          .querySelector('a[href*="/status/"]')
          .href.split("/status/")
          .pop()
          .split("/")
          .shift();

        // 检查历史记录中是否已存在该状态ID
        let is_exist = history.indexOf(status_id) >= 0;

        // 创建下载按钮
        let btn_down = document.createElement("div");
        btn_down.innerHTML =
          '<div><div><svg viewBox="0 0 24 24" style="width: 18px; height: 18px;">' +
          this.svg +
          "</svg></div></div>";
        btn_down.classList.add("tmd-down", "tmd-media");

        // 设置按钮状态
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
     * 处理下载按钮点击事件
     * @param {Object} btn - 被点击的按钮对象
     * @param {String} status_id - 媒体的状态ID
     * @param {Boolean} is_exist - 指示该媒体是否已存在于历史记录中
     */
    click: async function (btn, status_id, is_exist, index) {
      // 如果按钮处于加载状态，则不进行任何操作
      if (btn.classList.contains("loading")) return;

      // 设置按钮为加载状态
      this.status(btn, "loading");

      // 读取并处理文件名和保存历史记录的设置
      let out = (await GM_getValue("filename", filename)).split("\n").join("");
      let save_history = await GM_getValue("save_history", true);

      // 获取媒体的详细信息
      let json = await this.fetchJson(status_id);
      let tweet = json.legacy;
      let user = json.core.user_results.result.legacy;

      // 定义并处理文件名中不允许出现的字符
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

      // 处理输出文件名中的日期和时间部分
      let datetime = out.match(/{date-time(-local)?:[^{}]+}/)
        ? out
          .match(/{date-time(?:-local)?:([^{}]+)}/)[1]
          .replace(/[\\/|<>*?:"]/g, (v) => invalid_chars[v])
        //        : "YYYYMMDD-hhmmss";
        : "YYYY-MM-DD hh-mm-ss";

      // 准备下载信息
      let info = {};
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
      info["full-text"] = tweet.full_text
        .split("\n")
        .join(" ")
        .replace(/\s*https:\/\/t\.co\/\w+/g, "")
        .replace(
          /[\\/|<>*?:"]|[\u200b-\u200d\u2060\ufeff]/g,
          (v) => invalid_chars[v]
        );

      // 处理媒体文件下载
      let medias = tweet.extended_entities && tweet.extended_entities.media;
      if (index) medias = [medias[index - 1]];

      if (medias.length > 0) {
        let tasks = medias.length;
        let tasks_result = [];
        medias.forEach((media, i) => {
          // 准备每个媒体文件的下载信息
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
        // 如果未找到媒体文件，则设置按钮状态为失败
        this.status(btn, "failed", "MEDIA_NOT_FOUND");
      }
    },
    /**
     * 更新按钮状态。
     * @param {HTMLElement} btn - 要更新状态的按钮元素。
     * @param {string} css - 要添加的CSS类（可选）。
     * @param {string} title - 按钮的标题（可选）。
     * @param {string} style - 要应用的内联样式（可选）。
     */
    status: function (btn, css, title, style) {
      // 如果提供了CSS类，则移除旧的类并添加新的类
      if (css) {
        btn.classList.remove("download", "completed", "loading", "failed");
        btn.classList.add(css);
      }
      // 如果提供了标题，则更新按钮标题
      if (title) btn.title = title;
      // 如果提供了样式，则更新按钮的内联样式
      if (style) btn.style.cssText = style;
    },

    /**
     * 弹出设置对话框。
     */
    settings: async function () {
      // 创建元素的工具函数
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

      // 创建设置对话框的容器和基本样式
      let wapper = $element(
        document.body,
        "div",
        "position: fixed; left: 0px; top: 0px; width: 100%; height: 100%; background-color: #0009; z-index: 10;"
      );
      // 处理关闭设置对话框的逻辑
      let wapper_close;
      wapper.onmousedown = (e) => {
        wapper_close = e.target == wapper;
      };
      wapper.onmouseup = (e) => {
        if (wapper_close && e.target == wapper) wapper.remove();
      };

      // 创建并设置对话框内容，包括标题、选项等
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

      // 保存历史记录的设置
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

      // 清除历史记录的按钮和逻辑
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

      // 显示敏感内容的设置
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

      // 文件名模式设置
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

      // 保存设置的按钮及其逻辑
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
        // 各种功能特性的启用或禁用状态
      };
      // 构建完整查询URL
      let url = encodeURI(
        `${base_url}?variables=${JSON.stringify(
          variables
        )}&features=${JSON.stringify(features)}`
      );
      // 获取当前页面的cookies
      let cookies = this.getCookie();
      // 定义请求头
      let headers = {
        authorization:
          "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        "x-twitter-active-user": "yes",
        "x-twitter-client-language": cookies.lang,
        "x-csrf-token": cookies.ct0,
      };
      // 如果存在guest token，则添加到请求头
      if (cookies.ct0.length == 32) headers["x-guest-token"] = cookies.gt;
      // 发起网络请求并处理响应
      let tweet_detail = await fetch(url, { headers: headers }).then((result) =>
        result.json()
      );
      // 解析推文详细信息
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
     * @param {string} [name] - 需要获取的cookie名称，可选，默认为获取所有cookie
     * @returns {Object|string} 如果指定了name，则返回该cookie的值；否则返回所有cookie的对象
     */
    getCookie: function (name) {
      let cookies = {};
      // 解析document.cookie获取所有cookie
      document.cookie
        .split(";")
        .filter((n) => n.indexOf("=") > 0)
        .forEach((n) => {
          n.replace(/^([^=]+)=(.+)$/, (match, name, value) => {
            cookies[name.trim()] = value.trim();
          });
        });
      // 返回指定或所有cookie
      return name ? cookies[name] : cookies;
    },

    /**
     * 异步存储数据到本地存储（如GM_setValue）
     * @param {*} value - 需要存储的数据，可以是任意类型。如果为数组，则会合并到历史数据中；如果为其他类型且历史数据中不存在，则会添加到数据数组中。
     * @returns {Promise<void>} 不返回任何内容
     */
    storage: async function (value) {
      let data = await GM_getValue("download_history", []); // 获取历史数据，默认为空数组
      let data_length = data.length;
      // 如果提供了value参数，则进行数据处理
      if (value) {
        // 如果value是数组，则合并到历史数据中
        if (Array.isArray(value)) data = data.concat(value);
        // 如果value不是数组且在历史数据中不存在，则添加到数据数组中
        else if (data.indexOf(value) < 0) data.push(value);
      } else return data; // 如果未提供value参数，则直接返回历史数据
      // 如果数据有更新，则保存到本地存储
      if (data.length > data_length) GM_setValue("download_history", data);
    },
    /**
     * 检查并处理本地存储中的历史记录是否过时
     * @param {boolean} is_remove - 是否移除过时的历史记录
     * @returns {Array} - 如果不移除历史记录，则返回历史记录数组；否则无返回值
     */
    storage_obsolete: function (is_remove) {
      // 从本地存储获取历史记录，如果不存在则初始化为空数组
      let data = JSON.parse(localStorage.getItem("history") || "[]");
      // 如果is_remove为true，则移除本地存储中的历史记录
      if (is_remove) localStorage.removeItem("history");
      else return data;
    },

    /**
     * 格式化日期字符串
     * @param {Date} i - 输入的日期对象
     * @param {string} o - 日期格式字符串
     * @param {boolean} tz - 是否考虑时区
     * @returns {string} - 格式化后的日期字符串
     */
    formatDate: function (i, o, tz) {
      // 创建日期对象
      let d = new Date(i);
      // 如果需要考虑时区，则调整日期对象到UTC时区
      if (tz) d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      // 月份的缩写数组
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
      // 用于替换日期格式字符串中的各种元素的对象
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
      // 使用正则表达式和替换规则格式化日期字符串
      return o.replace(/(YY(YY)?|MMM?|DD|hh|mm|ss|h2|ap)/g, (n) =>
        ("0" + v[n]).substr(-n.length)
      );
    },
    // 定义一个下载器对象
    downloader: (function () {
      // 初始化下载器相关变量
      let tasks = [],
        thread = 0,
        max_thread = 2,
        retry = 0,
        max_retry = 2,
        failed = 0,
        notifier,
        has_failed = false;
      // 返回一个具有下载管理功能的对象
      return {
        // 添加一个下载任务到队列
        add: function (task) {
          tasks.push(task);
          // 如果当前线程数小于最大线程数，则启动下一个任务
          if (thread < max_thread) {
            thread += 1;
            this.next();
          } else this.update();
        },
        // 异步执行下一个下载任务
        next: async function () {
          let task = tasks.shift();
          await this.start(task);
          // 如果还有任务且当前线程数未达到最大值，继续执行下一个任务
          if (tasks.length > 0 && thread <= max_thread) this.next();
          else thread -= 1;
          this.update();
        },
        // 开始下载指定任务
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
        // 处理下载失败的情况，尝试重试或报告错误
        retry: function (task, result) {
          retry += 1;
          // 如果达到最大重试次数，将最大线程数降至1
          if (retry == 3) max_thread = 1;
          if (
            (task.retry && task.retry >= max_retry) ||
            (result.details && result.details.current == "USER_CANCELED")
          ) {
            task.onerror(result);
            failed += 1;
          } else {
            // 如果最大线程数为1，则增加重试次数
            if (max_thread == 1) task.retry = (task.retry || 0) + 1;
            this.add(task);
          }
        },
        // 更新下载器的状态信息
        update: function () {
          // 初始化或更新下载状态通知器
          if (!notifier) {
            notifier = document.createElement("div");
            notifier.title = "Twitter Media Downloader";
            notifier.classList.add("tmd-notifier");
            notifier.innerHTML = "<label>0</label>|<label>0</label>";
            document.body.appendChild(notifier);
          }
          // 更新失败任务的提示，并提供清除选项
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
          // 更新通知器中的下载进度和状态
          notifier.firstChild.innerText = thread;
          notifier.firstChild.nextElementSibling.innerText = tasks.length;
          if (failed > 0) notifier.lastChild.innerText = failed;
          if (thread > 0 || tasks.length > 0 || failed > 0)
            notifier.classList.add("running");
          else notifier.classList.remove("running");
        },
      };
    })(),
    // 定义支持的语言及其相关文本
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
