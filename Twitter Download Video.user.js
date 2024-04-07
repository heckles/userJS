// ==UserScript==
// @name                【mod】Twitter: Download Video
// @name:zh-TW          【mod】Twitter 下載影片
// @name:zh-CN          【mod】Twitter 下载视频
// @name:ja             Twitter ビデオをダウンロード
// @name:ko             Twitter ??? ????
// @name:ru             Twitter Скачать видео
// @version             1.0.7【Mod 1.支持手机端web】
// @description         One button click to direct video download web page.
// @description:zh-TW   即按前往下載影片的網頁。
// @description:zh-CN   一键导向下载视频的网页。
// @description:ja      ボタンをクリックして、ビデオのダウンロードWebページに移動します。
// @description:ko      ? ?? ???? ??? ???? ? ???? ??????.
// @description:ru      Нажмите кнопку, чтобы перейти на страницу загрузки видео.
// @author              Hayao-Gai
// @namespace           https://github.com/HayaoGai
// @icon                https://i.imgur.com/M9oO8K9.png
// @include             https://twitter.com/*
// @include             https://mobile.twitter.com/*
// @grant               none
// ==/UserScript==

/* jshint esversion: 6 */

(function () {
    'use strict';

    // 使用的图标来源于https://www.flaticon.com/authors/freepik
    const svg = `<svg viewBox="0 0 512 512"><path d="M472,313v139c0,11.028-8.972,20-20,20H60c-11.028,0-20-8.972-20-20V313H0v139c0,33.084,26.916,60,60,60h392 c33.084,0,60-26.916,60-60V313H472z"></path></g></g><g><g><polygon points="352,235.716 276,311.716 276,0 236,0 236,311.716 160,235.716 131.716,264 256,388.284 380.284,264"></polygon></svg>`;
    const resource = "https://www.savetweetvid.com/result?url="; // 下载资源的URL基础部分
    let currentUrl = document.location.href; // 当前页面的URL
    let updating = false; // 标记是否正在更新

    init(10); // 初始化函数，监控页面内视频

    locationChange(); // 监听页面URL变化

    window.addEventListener("scroll", update); // 滚动时更新页面

    /**
     * 初始化函数，分批次查找视频
     * @param {number} times 执行次数，控制查找的批次
     */
    function init(times) {
        for (let i = 0; i < times; i++) {
            setTimeout(findVideo1, 500 * i); // 查找播放按钮对应的视频缩略图
            setTimeout(findVideo2, 500 * i); // 查找视频元素
            setTimeout(sensitiveContent, 500 * i); // 检测敏感内容
        }
    }

    /**
     * 查找并处理视频播放按钮对应的视频缩略图
     */
    function findVideo1() {
        document.querySelectorAll("[data-testid='playButton']").forEach(button => {
            button.parentElement.querySelectorAll("img:not(.download-set)").forEach(thumbnail => {
                thumbnail.classList.add("download-set");
                const url = thumbnail.src;
                situation(url, thumbnail);
            });
        });
    }

    /**
     * 查找并处理页面中的视频元素
     */
    function findVideo2() {
        document.querySelectorAll("video:not(.download-set)").forEach(video => {
            video.classList.add("download-set");
            const url = video.poster;
            situation(url, video);
        });
    }

    /**
     * 根据视频URL的类型，决定如何处理该视频
     * @param {string} url 视频或缩略图的URL
     * @param {Element} video 视频元素或缩略图元素
     */
    function situation(url, video) {
        if (url.includes("tweet_")) findMenu(video, "gif"); // 如果是GIF
        else if (url.includes("ext_tw_") || url.includes("amplify_") || url.includes("media")) findMenu(video, "video"); // 如果是视频
        else console.log("Error: Unknown"); // 未知类型
    }

    /**
     * 为视频或缩略图添加下载菜单功能
     * @param {Element} child 视频或缩略图元素
     * @param {string} type 资源类型（如 gif 或 video）
     * @param {boolean} isGif 是否为GIF资源
     */
    function findMenu(child, type) {
        const article = child.closest("article:not(.article-set)");
        if (!article) return;
        article.classList.add("article-set");
        const menus = article.querySelectorAll("[data-testid='caret']");
        menus.forEach(menu => menu.addEventListener("click", () => {
            clickMenu(article, type, false);
            if (type === "gif") clickMenu(article, type, true);
        }));
    }

    // 以下功能未定义，可能是待实现或在其他代码段中定义
    function clickMenu(article, type, isGif) {
        // 处理点击下载菜单的逻辑
    }

    function locationChange() {
        // 监听并处理URL变化的逻辑
    }

    function update() {
        // 滚动时更新页面的逻辑
    }

    function sensitiveContent() {
        // 检测敏感内容的逻辑
    }

})();

/**
 * 点击菜单项，动态添加下载选项，并处理点击下载的行为。
 * @param {HTMLElement} article - 目标文章或内容区域。
 * @param {string} type - 下载内容的类型（如：gif, video等）。
 * @param {string} convert - 转换类型或标识，用于指定下载的特定形式。
 */
function clickMenu(article, type, convert) {
    // 检查是否已存在对应的下载选项，若存在则不重复添加
    if (!!document.querySelector(`.option-download-${convert}-set`)) return;

    // 若菜单项未加载完毕，则等待
    if (!document.querySelector("[role='menuitem']")) {
        setTimeout(() => clickMenu(article, type, convert), 100);
        return;
    }

    // 获取菜单容器，并创建下载选项
    const menu = document.querySelector("[role='menuitem']").parentElement;
    const option = document.createElement("div");
    // 设置下载选项样式及事件监听
    option.style.padding = "5px 0 5px 15px";
    option.className = "css-1dbjc4n r-1loqt21 r-18u37iz r-1ny4l3l r-ymttw5 r-1yzf0co r-o7ynqc r-6416eg r-13qz1uu option-download-set";
    option.addEventListener("mouseenter", () => option.classList.add(getTheme(["r-1u4rsef", "r-1ysxnx4", "r-1uaug3w"])));
    option.addEventListener("mouseleave", () => option.classList.remove(getTheme(["r-1u4rsef", "r-1ysxnx4", "r-1uaug3w"])));
    option.addEventListener("click", () => clickDownload(article, type, convert));

    // 创建并设置下载选项内的图标
    const icon = document.createElement("div");
    icon.className = "css-1dbjc4n r-1777fci";
    icon.innerHTML = svg; // 假设svg是一个全局变量，包含了图标的HTML代码
    const svgElement = icon.querySelector("svg");
    svgElement.setAttribute("class", "r-4qtqp9 r-yyyyoo r-1q142lx r-1xvli5t r-zso239 r-dnmrzs r-bnwqim r-1plcrui r-lrvibr");
    svgElement.classList.add(getTheme(["r-1re7ezh", "r-9ilb82", "r-111h2gw"]));

    // 创建并设置下载选项内的文本
    const text1 = document.createElement("div");
    text1.className = "css-1dbjc4n r-16y2uox r-1wbh5a2";
    text1.style.textAlign = "center";
    text1.style.paddingTop = "15px";
    const text2 = document.createElement("div");
    text2.className = "css-901oao r-1qd0xha r-a023e6 r-16dba41 r-ad9z0x r-bcqeeo r-qvutc0";
    text2.classList.add(getTheme(["r-hkyrab", "r-1fmj7o5", "r-jwli3a"]));
    const text3 = document.createElement("span");
    text3.className = "css-901oao css-16my406 r-1qd0xha r-ad9z0x r-bcqeeo r-qvutc0";
    text3.innerText = getLocalization(type, convert); // 假设getLocalization是一个用于获取本地化文本的函数

    // 将下载选项及其内容添加到菜单中
    menu.prepend(option);
    option.appendChild(icon);
    option.appendChild(text1);
    text1.appendChild(text2);
    text2.appendChild(text3);
}

/**
 * 处理下载选项的点击事件，根据类型和转换标志动态确定并打开下载链接。
 * @param {HTMLElement} article - 目标文章或内容区域。
 * @param {string} type - 下载内容的类型（如：gif, video等）。
 * @param {string} convert - 转换类型或标识，用于指定下载的特定形式。
 */
function clickDownload(article, type, convert) {
    // 根据type和convert动态处理并打开下载链接
    if (type === "gif" && !convert) {
        let link;
        // 动态获取GIF视频链接
        article.querySelectorAll("video").forEach(video => {
            link = video.src;
        });
        if (!link) {
            // 若视频未播放，则从图片链接中提取视频ID并构造下载链接
            const image = [...article.querySelectorAll("img")].find(image => image.src.includes("video"));
            const id = image.src.split(/[/?]/)[4];
            link = `https://video.twimg.com/tweet_video/${id}.mp4`;
        }
        // 打开下载链接
        window.open(link);
    } else {
        // 对于视频类型，获取标题时间元素，从中提取或直接使用URL打开下载链接
        const title = article.querySelector("time");
        const url = !!title ? title.parentElement.href : window.location.href;
        window.open(`${resource}${url}`);
    }
}

/**
 * 根据页面背景色动态选择合适的主题颜色。
 * @param {Array} array - 包含不同主题颜色的数组。
 * @returns {string} - 返回适合当前页面背景色的主题颜色。
 */
function getTheme(array) {
    const body = document.querySelector("body");
    const color = body.style.backgroundColor; // 获取背景颜色
    const red = color.match(/\d+/)[0]; // 提取红色分量的值
    switch (red) {
        case "255":
            return array[0]; // 若背景色为白色，返回白色主题色
        case "0":
            return array[1]; // 若背景色为黑色，返回黑色主题色
        default:
            return array[2]; // 其他情况返回灰色主题色
    }
}

/**
 * 根据当前文档的语言设置和指定类型获取本地化下载字符串。
 * @param {string} type 文件类型，如 "gif" 或 "mp4"。
 * @param {boolean} convert 是否将文件类型转换为查询字符串的一部分。
 * @returns {string} 返回本地化后的下载字符串，包括文件扩展名（如果指定类型需要转换）。
 */
function getLocalization(type, convert) {
    // 初始化下载文本为英文
    let download = "Download";
    // 根据文档的语言设置本地化的下载文本
    switch (document.querySelector("html").lang) {
        case "zh-Hant":
            download = "下載";
            break;
        case "zh":
            download = "下载";
            break;
        case "ja":
            download = "ダウンロード";
            break;
        case "ko":
            download = "????";
            break;
        case "ru":
            download = "Скачать";
            break;
    }

    // 初始化文件扩展名为空字符串
    let extension = "";
    // 如果类型为gif且需要转换，则扩展名为 " GIF"；否则为 " MP4"
    if (type === "gif") extension = convert ? " GIF" : " MP4";

    // 返回本地化后的下载文本，加上文件扩展名（如果有的话）
    return `${download}${extension}`;
}

/**
 * 处理敏感内容警告的“查看”按钮点击事件，以重新运行脚本。
 */
function sensitiveContent() {
    // 选择所有未设置为“已查看”的敏感内容警告视图，并为它们添加点击事件监听器
    document.querySelectorAll(".r-42olwf.r-1vsu8ta:not(.view-set)").forEach(view => {
        view.classList.add("view-set");
        view.addEventListener("click", () => init(3));
    });
}

/**
 * 更新操作的函数，防止短时间内重复更新。
 */
function update() {
    // 如果正在更新，则直接返回，避免重复更新
    if (updating) return;
    updating = true;
    init(3); // 执行初始化操作
    setTimeout(() => { updating = false; }, 1000); // 1秒后重置更新状态
}

/**
 * 监听页面位置变化，以触发相应操作。
 */
function locationChange() {
    // 创建一个观察者对象，用于监听文档位置的变化
    const observer = new MutationObserver(mutations => {
        mutations.forEach(() => {
            // 如果当前URL与之前记录的不同，则执行初始化操作
            if (currentUrl !== document.location.href) {
                currentUrl = document.location.href;
                init(10);
            }
        });
    });
    // 设置观察的目标为文档体，并启用子节点及子树的变动观察
    const target = document.body;
    const config = { childList: true, subtree: true };
    observer.observe(target, config);
}

}) ();
