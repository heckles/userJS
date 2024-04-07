// ==UserScript==
// @name                ��mod��Twitter: Download Video
// @name:zh-TW          ��mod��Twitter ���dӰƬ
// @name:zh-CN          ��mod��Twitter ������Ƶ
// @name:ja             Twitter �ӥǥ���������`��
// @name:ko             Twitter ??? ????
// @name:ru             Twitter ���ܧѧ�ѧ�� �ӧڧէ֧�
// @version             1.0.7��Mod 1.֧���ֻ���web��
// @description         One button click to direct video download web page.
// @description:zh-TW   ����ǰ�����dӰƬ�ľW퓡�
// @description:zh-CN   һ������������Ƶ����ҳ��
// @description:ja      �ܥ���򥯥�å����ơ��ӥǥ��Υ������`��Web�ک`�����ƄӤ��ޤ���
// @description:ko      ? ?? ???? ??? ???? ? ???? ??????.
// @description:ru      ���ѧاާڧ�� �ܧߧ��ܧ�, ����ҧ� ��֧�֧ۧ�� �ߧ� ����ѧߧڧ�� �٧ѧԧ��٧ܧ� �ӧڧէ֧�.
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

    // ʹ�õ�ͼ����Դ��https://www.flaticon.com/authors/freepik
    const svg = `<svg viewBox="0 0 512 512"><path d="M472,313v139c0,11.028-8.972,20-20,20H60c-11.028,0-20-8.972-20-20V313H0v139c0,33.084,26.916,60,60,60h392 c33.084,0,60-26.916,60-60V313H472z"></path></g></g><g><g><polygon points="352,235.716 276,311.716 276,0 236,0 236,311.716 160,235.716 131.716,264 256,388.284 380.284,264"></polygon></svg>`;
    const resource = "https://www.savetweetvid.com/result?url="; // ������Դ��URL��������
    let currentUrl = document.location.href; // ��ǰҳ���URL
    let updating = false; // ����Ƿ����ڸ���

    init(10); // ��ʼ�����������ҳ������Ƶ

    locationChange(); // ����ҳ��URL�仯

    window.addEventListener("scroll", update); // ����ʱ����ҳ��

    /**
     * ��ʼ�������������β�����Ƶ
     * @param {number} times ִ�д��������Ʋ��ҵ�����
     */
    function init(times) {
        for (let i = 0; i < times; i++) {
            setTimeout(findVideo1, 500 * i); // ���Ҳ��Ű�ť��Ӧ����Ƶ����ͼ
            setTimeout(findVideo2, 500 * i); // ������ƵԪ��
            setTimeout(sensitiveContent, 500 * i); // �����������
        }
    }

    /**
     * ���Ҳ�������Ƶ���Ű�ť��Ӧ����Ƶ����ͼ
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
     * ���Ҳ�����ҳ���е���ƵԪ��
     */
    function findVideo2() {
        document.querySelectorAll("video:not(.download-set)").forEach(video => {
            video.classList.add("download-set");
            const url = video.poster;
            situation(url, video);
        });
    }

    /**
     * ������ƵURL�����ͣ�������δ������Ƶ
     * @param {string} url ��Ƶ������ͼ��URL
     * @param {Element} video ��ƵԪ�ػ�����ͼԪ��
     */
    function situation(url, video) {
        if (url.includes("tweet_")) findMenu(video, "gif"); // �����GIF
        else if (url.includes("ext_tw_") || url.includes("amplify_") || url.includes("media")) findMenu(video, "video"); // �������Ƶ
        else console.log("Error: Unknown"); // δ֪����
    }

    /**
     * Ϊ��Ƶ������ͼ������ز˵�����
     * @param {Element} child ��Ƶ������ͼԪ��
     * @param {string} type ��Դ���ͣ��� gif �� video��
     * @param {boolean} isGif �Ƿ�ΪGIF��Դ
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

    // ���¹���δ���壬�����Ǵ�ʵ�ֻ�������������ж���
    function clickMenu(article, type, isGif) {
        // ���������ز˵����߼�
    }

    function locationChange() {
        // ����������URL�仯���߼�
    }

    function update() {
        // ����ʱ����ҳ����߼�
    }

    function sensitiveContent() {
        // ����������ݵ��߼�
    }

})();

/**
 * ����˵����̬�������ѡ������������ص���Ϊ��
 * @param {HTMLElement} article - Ŀ�����»���������
 * @param {string} type - �������ݵ����ͣ��磺gif, video�ȣ���
 * @param {string} convert - ת�����ͻ��ʶ������ָ�����ص��ض���ʽ��
 */
function clickMenu(article, type, convert) {
    // ����Ƿ��Ѵ��ڶ�Ӧ������ѡ����������ظ����
    if (!!document.querySelector(`.option-download-${convert}-set`)) return;

    // ���˵���δ������ϣ���ȴ�
    if (!document.querySelector("[role='menuitem']")) {
        setTimeout(() => clickMenu(article, type, convert), 100);
        return;
    }

    // ��ȡ�˵�����������������ѡ��
    const menu = document.querySelector("[role='menuitem']").parentElement;
    const option = document.createElement("div");
    // ��������ѡ����ʽ���¼�����
    option.style.padding = "5px 0 5px 15px";
    option.className = "css-1dbjc4n r-1loqt21 r-18u37iz r-1ny4l3l r-ymttw5 r-1yzf0co r-o7ynqc r-6416eg r-13qz1uu option-download-set";
    option.addEventListener("mouseenter", () => option.classList.add(getTheme(["r-1u4rsef", "r-1ysxnx4", "r-1uaug3w"])));
    option.addEventListener("mouseleave", () => option.classList.remove(getTheme(["r-1u4rsef", "r-1ysxnx4", "r-1uaug3w"])));
    option.addEventListener("click", () => clickDownload(article, type, convert));

    // ��������������ѡ���ڵ�ͼ��
    const icon = document.createElement("div");
    icon.className = "css-1dbjc4n r-1777fci";
    icon.innerHTML = svg; // ����svg��һ��ȫ�ֱ�����������ͼ���HTML����
    const svgElement = icon.querySelector("svg");
    svgElement.setAttribute("class", "r-4qtqp9 r-yyyyoo r-1q142lx r-1xvli5t r-zso239 r-dnmrzs r-bnwqim r-1plcrui r-lrvibr");
    svgElement.classList.add(getTheme(["r-1re7ezh", "r-9ilb82", "r-111h2gw"]));

    // ��������������ѡ���ڵ��ı�
    const text1 = document.createElement("div");
    text1.className = "css-1dbjc4n r-16y2uox r-1wbh5a2";
    text1.style.textAlign = "center";
    text1.style.paddingTop = "15px";
    const text2 = document.createElement("div");
    text2.className = "css-901oao r-1qd0xha r-a023e6 r-16dba41 r-ad9z0x r-bcqeeo r-qvutc0";
    text2.classList.add(getTheme(["r-hkyrab", "r-1fmj7o5", "r-jwli3a"]));
    const text3 = document.createElement("span");
    text3.className = "css-901oao css-16my406 r-1qd0xha r-ad9z0x r-bcqeeo r-qvutc0";
    text3.innerText = getLocalization(type, convert); // ����getLocalization��һ�����ڻ�ȡ���ػ��ı��ĺ���

    // ������ѡ���������ӵ��˵���
    menu.prepend(option);
    option.appendChild(icon);
    option.appendChild(text1);
    text1.appendChild(text2);
    text2.appendChild(text3);
}

/**
 * ��������ѡ��ĵ���¼����������ͺ�ת����־��̬ȷ�������������ӡ�
 * @param {HTMLElement} article - Ŀ�����»���������
 * @param {string} type - �������ݵ����ͣ��磺gif, video�ȣ���
 * @param {string} convert - ת�����ͻ��ʶ������ָ�����ص��ض���ʽ��
 */
function clickDownload(article, type, convert) {
    // ����type��convert��̬��������������
    if (type === "gif" && !convert) {
        let link;
        // ��̬��ȡGIF��Ƶ����
        article.querySelectorAll("video").forEach(video => {
            link = video.src;
        });
        if (!link) {
            // ����Ƶδ���ţ����ͼƬ��������ȡ��ƵID��������������
            const image = [...article.querySelectorAll("img")].find(image => image.src.includes("video"));
            const id = image.src.split(/[/?]/)[4];
            link = `https://video.twimg.com/tweet_video/${id}.mp4`;
        }
        // ����������
        window.open(link);
    } else {
        // ������Ƶ���ͣ���ȡ����ʱ��Ԫ�أ�������ȡ��ֱ��ʹ��URL����������
        const title = article.querySelector("time");
        const url = !!title ? title.parentElement.href : window.location.href;
        window.open(`${resource}${url}`);
    }
}

/**
 * ����ҳ�汳��ɫ��̬ѡ����ʵ�������ɫ��
 * @param {Array} array - ������ͬ������ɫ�����顣
 * @returns {string} - �����ʺϵ�ǰҳ�汳��ɫ��������ɫ��
 */
function getTheme(array) {
    const body = document.querySelector("body");
    const color = body.style.backgroundColor; // ��ȡ������ɫ
    const red = color.match(/\d+/)[0]; // ��ȡ��ɫ������ֵ
    switch (red) {
        case "255":
            return array[0]; // ������ɫΪ��ɫ�����ذ�ɫ����ɫ
        case "0":
            return array[1]; // ������ɫΪ��ɫ�����غ�ɫ����ɫ
        default:
            return array[2]; // ����������ػ�ɫ����ɫ
    }
}

/**
 * ���ݵ�ǰ�ĵ����������ú�ָ�����ͻ�ȡ���ػ������ַ�����
 * @param {string} type �ļ����ͣ��� "gif" �� "mp4"��
 * @param {boolean} convert �Ƿ��ļ�����ת��Ϊ��ѯ�ַ�����һ���֡�
 * @returns {string} ���ر��ػ���������ַ����������ļ���չ�������ָ��������Ҫת������
 */
function getLocalization(type, convert) {
    // ��ʼ�������ı�ΪӢ��
    let download = "Download";
    // �����ĵ����������ñ��ػ��������ı�
    switch (document.querySelector("html").lang) {
        case "zh-Hant":
            download = "���d";
            break;
        case "zh":
            download = "����";
            break;
        case "ja":
            download = "�������`��";
            break;
        case "ko":
            download = "????";
            break;
        case "ru":
            download = "���ܧѧ�ѧ��";
            break;
    }

    // ��ʼ���ļ���չ��Ϊ���ַ���
    let extension = "";
    // �������Ϊgif����Ҫת��������չ��Ϊ " GIF"������Ϊ " MP4"
    if (type === "gif") extension = convert ? " GIF" : " MP4";

    // ���ر��ػ���������ı��������ļ���չ��������еĻ���
    return `${download}${extension}`;
}

/**
 * �����������ݾ���ġ��鿴����ť����¼������������нű���
 */
function sensitiveContent() {
    // ѡ������δ����Ϊ���Ѳ鿴�����������ݾ�����ͼ����Ϊ������ӵ���¼�������
    document.querySelectorAll(".r-42olwf.r-1vsu8ta:not(.view-set)").forEach(view => {
        view.classList.add("view-set");
        view.addEventListener("click", () => init(3));
    });
}

/**
 * ���²����ĺ�������ֹ��ʱ�����ظ����¡�
 */
function update() {
    // ������ڸ��£���ֱ�ӷ��أ������ظ�����
    if (updating) return;
    updating = true;
    init(3); // ִ�г�ʼ������
    setTimeout(() => { updating = false; }, 1000); // 1������ø���״̬
}

/**
 * ����ҳ��λ�ñ仯���Դ�����Ӧ������
 */
function locationChange() {
    // ����һ���۲��߶������ڼ����ĵ�λ�õı仯
    const observer = new MutationObserver(mutations => {
        mutations.forEach(() => {
            // �����ǰURL��֮ǰ��¼�Ĳ�ͬ����ִ�г�ʼ������
            if (currentUrl !== document.location.href) {
                currentUrl = document.location.href;
                init(10);
            }
        });
    });
    // ���ù۲��Ŀ��Ϊ�ĵ��壬�������ӽڵ㼰�����ı䶯�۲�
    const target = document.body;
    const config = { childList: true, subtree: true };
    observer.observe(target, config);
}

}) ();
