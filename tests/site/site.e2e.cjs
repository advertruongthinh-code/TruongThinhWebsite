#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:8787").replace(
  /\/+$/,
  "",
);
const BASE_ORIGIN = new URL(BASE_URL).origin;
const ROUTES = ["/vi/", "/vi/residential/", "/vi/commercial/", "/vi/advertising-products/", "/vi/about/"];
const ADVERTISING_CATEGORY_SLUGS = ["kiosk-posm", "mobile-retail", "signage-raised-letters", "office-signs-wayfinding", "led-displays-lightboxes", "print-decals"];
const CANONICAL_ROUTES = [
  ...ROUTES,
  ...ADVERTISING_CATEGORY_SLUGS.map((slug) => `/vi/advertising-products/${slug}/`),
  // Trang cụm, sản phẩm (taxonomy R4) mà rail hai tầng trang gốc link tới.
  ...require("../../src/site/advertising-products/catalog.mjs").ADVERTISING_PAGES
    .map((page) => `/vi/advertising-products/${page.vi}/`),
];
const DIRECT_SERVICE_ROUTES = ["/vi/residential/", "/vi/commercial/", "/vi/advertising-products/"];
const VIEWPORTS = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
];
const HEADER_VIEWPORTS = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  ...[749, 750, 751, 760, 768, 820, 950, 960, 961, 1024, 1200, 1201, 1440].map((width) => ({
    width,
    height: 900,
  })),
];
const SSR_CMS_HYDRATION_CASES = [
  {
    route: "/vi/advertising-products/",
    locale: "vi",
    title: "Sản phẩm Quảng cáo — Trường Thịnh",
    description:
      "Công trình quảng cáo Trường Thịnh: khảo sát, tư vấn, sản xuất và lắp đặt kiosk, xe bán hàng, bảng hiệu và hộp đèn.",
    heroTitle: "để thương hiệu luôn trong tầm mắt",
    navigationLabel: "Sản phẩm Quảng cáo",
  },
  {
    route: "/en/advertising-products/",
    locale: "en",
    title: "Advertising products — Trường Thịnh",
    description:
      "Trường Thịnh advertising projects: survey, consultation, production and installation of kiosks, mobile retail carts, signage and light boxes.",
    heroTitle: "Keep your brand always in sight",
    navigationLabel: "Advertising products",
  },
  {
    route: "/en/about/",
    locale: "en",
    title: "About — Trường Thịnh",
    description: "Trường Thịnh experience, workshop, and way of working.",
    requiresStaticFallbackMismatch: true,
  },
];
const REPORT_DIR = process.env.TT_E2E_REPORT_DIR
  ? path.resolve(process.env.TT_E2E_REPORT_DIR)
  : path.join(__dirname, "reports");
const FAILURE_DIR = path.join(REPORT_DIR, "failures");
const REPORT_PATH = path.join(REPORT_DIR, "latest.json");
const SITE_ROOT = path.join(__dirname, "..", "..", "src", "site");
const PUBLIC_HTML = [
  ["index.html", "home"],
  ["residential/index.html", "residential"],
  ["commercial/index.html", "commercial"],
  ["advertising-products/index.html", "advertising-products"],
  ["about/index.html", "about"],
];

const startedAt = Date.now();
const results = [];
let browser;

const assert = require("node:assert");

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function routeSlug(route) {
  return route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "-");
}

function safeFileName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

function pageUrl(route) {
  return new URL(route, `${BASE_URL}/`).href;
}

function canonicalPathname(value) {
  const pathname = new URL(value, `${BASE_URL}/`).pathname;
  return pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
}

function prepareReportDirectories() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.rmSync(FAILURE_DIR, { recursive: true, force: true });
  fs.mkdirSync(FAILURE_DIR, { recursive: true });
}

function assertPersistentNavigationContracts() {
  const root = SITE_ROOT;
  const brandLockupPath = path.join(
    root,
    "assets/brand/truong-thinh-lockup.svg",
  );
  const barbaUrl = "/assets/vendor/barba-2.10.3.umd.js";
  const bootstraps = [];

  assert(
    fs.existsSync(brandLockupPath),
    "The canonical Trường Thịnh SVG lockup is missing",
  );
  const brandLockupSource = fs.readFileSync(brandLockupPath, "utf8");
  const brandGeometryAttributes = (source) => [...source.matchAll(
    /\b(?:viewBox|transform|d|x|y|font-family|font-size|font-weight|letter-spacing|word-spacing|textLength|lengthAdjust|fill)="[^"]*"/g,
  )].map((match) => match[0]);
  assert(
    /<svg\b[^>]*viewBox="[^\"]*594(?:\.0+)?[^\"]*"/.test(
      brandLockupSource,
    ) &&
      /<g\b(?=[^>]*\bid="truong-thinh-lockup")[^>]*\bfill="currentColor"[^>]*>/.test(
        brandLockupSource,
      ) &&
      /<g\b(?=[^>]*\bid="truong-thinh-mark")[^>]*\bclass="[^"]*\bbrand-lockup__mark\b"[^>]*>/.test(
        brandLockupSource,
      ) &&
      /<text\b(?=[^>]*\bid="truong-thinh-title")(?=[^>]*\bclass="[^"]*\bbrand-lockup__title\b")[^>]*\bfont-weight="600"[^>]*>/.test(
        brandLockupSource,
      ) &&
      /<text\b(?=[^>]*\bid="truong-thinh-subtitle")(?=[^>]*\bclass="[^"]*\bbrand-lockup__subtitle\b")[^>]*\bfont-weight="600"[^>]*>/.test(
        brandLockupSource,
      ) &&
      (brandLockupSource.match(/<path\b/g) || []).length === 4 &&
      (brandLockupSource.match(/<text\b/g) || []).length === 2 &&
      !/<(?:use|image|style|metadata|clipPath|foreignObject)\b|\bhref\s*=|\bxlink:href\s*=/.test(
        brandLockupSource,
      ),
    "The canonical Trường Thịnh lockup must keep four mark paths and two live text nodes",
  );

  PUBLIC_HTML.forEach(([relativePath, namespace]) => {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert(
      source.includes(
          '<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon-black.svg" media="(prefers-color-scheme: light)" />',
        ) &&
        source.includes(
          '<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon-white.svg" media="(prefers-color-scheme: dark)" />',
        ) &&
        (source.match(/<link rel="icon"/g) || []).length === 2 &&
        !source.includes('<link rel="icon" href="data:," />'),
      `${relativePath} does not expose the adaptive Trường Thịnh favicon set`,
    );
    assert(
      /class="menu-close"[\s\S]*?<div class="menu-close__icon">[\s\S]*?<svg/.test(source),
      `${relativePath} does not expose an atomic close-icon motion wrapper`,
    );
    assert(
      /<div class="menu-close__icon">\s*<svg width="100%" height="100%" aria-hidden="true">\s*<line class="top" x1="0" y1="0" x2="100%" y2="100%"\s*\/>\s*<line class="middle" x1="100%" y1="0" x2="0" y2="100%"\s*\/>\s*<\/svg>\s*<\/div>/.test(source),
      `${relativePath} close icon does not retain the live full-extent line geometry`,
    );
    const bootstrap = source.match(
      /<script>\s*\(\(\) => \{[\s\S]*?window\.__tt(?:MotionBoot|BootFailOpenCount)[\s\S]*?<\/script>/,
    )?.[0];
    const bodyTag = source.match(/<body\b[^>]*>/)?.[0] || "";
    const containerTag =
      source.match(/<div\b[^>]*class="[^"]*\bpage-shell\b[^"]*"[^>]*>/)?.[0] ||
      "";
    const usesLocalEditorialMotion = [
      "index.html",
      "residential/index.html",
      "commercial/index.html",
      "advertising-products/index.html",
      "about/index.html",
    ].includes(relativePath);
    const scriptOrder = [
      usesLocalEditorialMotion ? "gsap-3.15.0.min.js" : "gsap@3.13.0",
      ...(usesLocalEditorialMotion ? ["SplitText-3.15.0.min.js"] : []),
      'src="/assets/vendor/locomotive-scroll-4.1.4.min.js"',
      barbaUrl,
      'src="/detail.js"',
      'src="/motion.js"',
    ].map((token) => source.lastIndexOf(token));

    assert(
      bodyTag.includes('data-barba="wrapper"'),
      `${relativePath} is not the persistent Barba wrapper`,
    );
    assert(
      containerTag.includes('data-barba="container"') &&
        containerTag.includes(`data-barba-namespace="${namespace}"`) &&
        containerTag.includes("data-scroll-container"),
      `${relativePath} has an invalid Barba/scroll container`,
    );
    assert(
      (source.match(/data-barba="container"/g) || []).length === 1,
      `${relativePath} does not contain exactly one Barba container`,
    );
    assert(
      scriptOrder.every((position) => position >= 0) &&
        scriptOrder.every(
          (position, index) => index === 0 || position > scriptOrder[index - 1],
        ),
      `${relativePath} has the wrong GSAP/Locomotive/Barba/detail/motion order`,
    );
    if (relativePath === "index.html") {
      assert(
        !source.includes("gsap@3.13.0") &&
          (source.match(/<script defer src="\/assets\/vendor\/gsap-3\.15\.0\.min\.js"><\/script>/g) || []).length === 1 &&
          (source.match(/<script defer src="\/assets\/vendor\/SplitText-3\.15\.0\.min\.js"><\/script>/g) || []).length === 1,
        "Home must load one paired local GSAP/SplitText set without the old CDN GSAP",
      );
    }
    assert(
      !/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net/.test(source),
      `${relativePath} must self-host fonts and libraries instead of Google Fonts or jsDelivr`,
    );
    assert(bootstrap, `${relativePath} has no motion startup handshake`);
    bootstraps.push(bootstrap.replaceAll("\r\n", "\n"));
    assert(
      Buffer.byteLength(bootstrap) <= 2_600 &&
        bootstrap.split(/\r?\n/).length <= 65,
      `${relativePath} motion handshake is too large (${Buffer.byteLength(bootstrap)} bytes, ${bootstrap.split(/\r?\n/).length} lines)`,
    );
    assert(
      bootstrap.includes("window.__ttMotionBoot") &&
        bootstrap.includes('addEventListener("error"') &&
        bootstrap.includes("if(b.claimed)return") &&
        bootstrap.includes("window.TruongThinhDetail?.mount") &&
        bootstrap.includes('addEventListener("pageshow"') &&
        bootstrap.includes('document.addEventListener("DOMContentLoaded",fail,{once:true,...s})') &&
        !bootstrap.includes("setTimeout(fail") &&
        !bootstrap.includes("__ttBootFailOpenCount") &&
        !bootstrap.includes("motion-failed") &&
        !/onerror\s*=/.test(source),
      `${relativePath} does not use the minimal capture-error handshake`,
    );
    const headerSource = source.match(/<header\b[\s\S]*?<\/header>/)?.[0];
    const menuSource = source.match(
      /<dialog\b(?=[^>]*\bid="site-menu")[\s\S]*?<\/dialog>/,
    )?.[0];
    assert(
      headerSource &&
        !/\blanguage-toggle\b|data-language-toggle/.test(headerSource) &&
        menuSource &&
        (menuSource.match(/data-language-option="(?:vi|en)"/g) || []).length === 2 &&
        (menuSource.match(/class="menu-group"/g) || []).length === 4 &&
        (menuSource.match(/class="menu-group__title"/g) || []).length === 4 &&
        (menuSource.match(/class="menu-group__links"/g) || []).length === 4 &&
        [15, 17].includes((menuSource.match(/class="menu-option"/g) || []).length) &&
        !/<a\b[^>]*href="[^"]*#|data-menu-projects|data-social-placeholder/.test(menuSource) &&
        /class="menu-appointment"[\s\S]*?data-menu-calendar viewBox="0 0 58\.09 57\.82"/.test(menuSource) &&
        !/class="menu-foot"/.test(menuSource),
      `${relativePath} must own locale, appointment, and four groups inside the full menu only`,
    );
    assert(
      // Header giữ nhãn đầy đủ; full menu tách tiêu đề nhỏ/lớn nên nhãn đầy đủ nằm ở aria-label.
      (source.match(/(?:data-vi|\saria-label)="Sản phẩm Quảng cáo"/g) || []).length >=
        2 &&
        (source.match(/data-en(?:-aria-label)?="Advertising products"/g) || []).length >= 2,
      `${relativePath} has inconsistent project/product labels in the header or full menu`,
    );
    assert(
      headerSource &&
        /<a\b(?=[^>]*\bid="header-logo")(?=[^>]*\bclass="[^"]*\bbrand\b)/.test(
          headerSource,
        ) &&
        /<nav\b(?=[^>]*\bid="header-menu-items")(?=[^>]*\bclass="[^"]*\bdesktop-nav\b)[^>]*>\s*<ul>[\s\S]*<li[\s\S]*<\/ul>/.test(
          headerSource,
        ) &&
        (headerSource.match(/<li(?:\s[^>]*)?>\s*<a\b/g) || []).length === 3 &&
        /<button\b(?=[^>]*\bid="header-menu-toggle")(?=[^>]*\bclass="[^"]*\bmenu-button\b)/.test(
          headerSource,
        ) &&
        /<svg\b(?=[^>]*\bid="header-toggle-svg")/.test(headerSource),
      `${relativePath} does not expose the persistent reference-compatible header shell`,
    );
    const headerBrand = headerSource?.match(
      /<a\b(?=[^>]*\bid="header-logo")[\s\S]*?<\/a>/,
    )?.[0];
    assert(
      headerBrand &&
        headerBrand.includes(
          'aria-label="TRƯỜNG THỊNH NỘI THẤT · QUẢNG CÁO — Trang chủ"',
        ) &&
        headerBrand.includes(
          'data-en-aria-label="TRƯỜNG THỊNH INTERIORS · ADVERTISING — Home"',
        ) &&
        /<svg class="brand-lockup" viewBox="[^"]*594[^"]*" aria-hidden="true" data-parity-media>[\s\S]*?<g class="brand-lockup__geometry" fill="currentColor">[\s\S]*?<\/svg>/.test(
          headerBrand,
        ) &&
        (headerBrand.match(/<path\b/g) || []).length === 4 &&
        (headerBrand.match(/<text\b/g) || []).length === 2 &&
        /<text\b(?=[^>]*\bclass="[^"]*\bbrand-lockup__title\b)[^>]*\bfont-weight="600"[^>]*>/.test(
          headerBrand,
        ) &&
        /<text\b(?=[^>]*\bclass="[^"]*\bbrand-lockup__subtitle\b)[^>]*\bfont-weight="600"[^>]*>/.test(
          headerBrand,
        ) &&
        !/<span class="brand-copy"|<use\b|<image\b|<script\b|<style\b|<metadata\b/.test(
          headerBrand,
        ),
      `${relativePath} must inline the sanitized Trường Thịnh mark geometry and live text`,
    );
    const menuBrand = menuSource?.match(
      /<a\b(?=[^>]*\bclass="[^"]*\bmenu-brand\b)[\s\S]*?<\/a>/,
    )?.[0];
    assert(
      menuBrand &&
        /<svg class="brand-lockup" viewBox="[^"]*594[^"]*" aria-hidden="true" data-parity-media>[\s\S]*?<g class="brand-lockup__geometry" fill="currentColor">[\s\S]*?<\/svg>/.test(
          menuBrand,
        ) &&
        (menuBrand.match(/<path\b/g) || []).length === 4 &&
        (menuBrand.match(/<text\b/g) || []).length === 2 &&
        /<text\b(?=[^>]*\bclass="[^"]*\bbrand-lockup__title\b)[^>]*\bfont-weight="600"[^>]*>/.test(
          menuBrand,
        ) &&
        /<text\b(?=[^>]*\bclass="[^"]*\bbrand-lockup__subtitle\b)[^>]*\bfont-weight="600"[^>]*>/.test(
          menuBrand,
        ) &&
        !/<span class="menu-brand__copy"|<use\b|<image\b|<script\b|<style\b|<metadata\b/.test(
          menuBrand,
        ),
      `${relativePath} full-menu logo must inline the sanitized mark geometry and live text`,
    );
    for (const [location, markup] of [["header", headerBrand], ["menu", menuBrand]]) {
      assert(
        JSON.stringify(brandGeometryAttributes(markup.match(/<svg\b[\s\S]*?<\/svg>/)[0])) ===
          JSON.stringify(brandGeometryAttributes(brandLockupSource)),
        `${relativePath} ${location} logo geometry must match the canonical SVG`,
      );
    }
  });

  assert(
    new Set(bootstraps).size === 1,
    "The five motion startup handshakes are not byte-identical",
  );

  const motionSource = fs.readFileSync(path.join(root, "motion.js"), "utf8");
  const finishCloseSource = motionSource.match(
    /const finishClose = \(restoreFocus = true\) => \{([\s\S]*?)\n  \};/,
  )?.[1] ?? "";
  assert(
    /const introOffset = heroIntroPending && index === 0 \? 1 : 0;/.test(
      motionSource,
    ),
    "Home hero solid intro must match Espacio's measured 1 second reveal",
  );
  const styleSource = fs.readFileSync(path.join(root, "style.css"), "utf8");
  const homeSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const brandCss = styleSource.match(/\.brand\s*\{[\s\S]*?\n\}/)?.[0];
  const detailSource = fs.readFileSync(path.join(root, "detail.js"), "utf8");
  const detailCss = fs.readFileSync(path.join(root, "detail.css"), "utf8");
  const aboutSource = fs.readFileSync(path.join(root, "about/index.html"), "utf8");
  const residentialSource = fs.readFileSync(
    path.join(root, "residential/index.html"),
    "utf8",
  );
  const commercialSource = fs.readFileSync(
    path.join(root, "commercial/index.html"),
    "utf8",
  );
  const projectsSource = fs.readFileSync(
    path.join(root, "advertising-products/index.html"),
    "utf8",
  );
  const storyArrowWrapperCss = styleSource.match(/\.story-arrow\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const storyArrowCss = styleSource.match(/\.story-link svg\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const storyArrowHoverCss = styleSource.match(/\.story-link:hover svg\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert(
    homeSource.includes('<span class="story-arrow">') &&
      homeSource.includes('viewBox="0 0 178.01 39.43"') &&
      homeSource.includes('x1="3.77" x2="174.25" y1="19.71" y2="19.71"') &&
      homeSource.includes('points="156.6 2.07 174.25 19.71 156.6 37.36"') &&
      /width:\s*200px/.test(storyArrowWrapperCss) &&
      /position:\s*relative/.test(storyArrowWrapperCss) &&
      /align-self:\s*center/.test(storyArrowWrapperCss) &&
      /overflow:\s*hidden/.test(storyArrowWrapperCss) &&
      /transform:\s*translateX\(12\.5%\)/.test(storyArrowWrapperCss) &&
      /width:\s*100%/.test(storyArrowCss) &&
      /position:\s*relative/.test(storyArrowCss) &&
      /left:\s*-5px/.test(storyArrowCss) &&
      /top:\s*-0\.5px/.test(storyArrowCss) &&
      /height:\s*auto/.test(storyArrowCss) &&
      /box-sizing:\s*content-box/.test(storyArrowCss) &&
      /vertical-align:\s*middle/.test(storyArrowCss) &&
      /transform:\s*translateX\(-25%\)/.test(storyArrowCss) &&
      /transition:\s*0\.3s cubic-bezier\(0\.4, 0, 0\.2, 1\)/.test(storyArrowCss) &&
      /transform:\s*translateX\(0\)/.test(storyArrowHoverCss),
    "Story arrow must preserve Espacio's SVG geometry, baseline, and hover transition contract",
  );

  const residentialHeroContent = residentialSource.match(
    /<div class="hero-content">[\s\S]*?<\/div>/,
  )?.[0];
  assert(
    /class="hero detail-hero residential-hero"/.test(residentialSource) &&
      residentialHeroContent?.includes("NHÀ PHỐ · CĂN HỘ · HOMESTAY") &&
      residentialHeroContent?.includes('data-en="TOWNHOUSES · APARTMENTS · HOMESTAYS"') &&
      residentialHeroContent?.includes("Nơi tái tạo") &&
      residentialHeroContent?.includes("năng lượng sống") &&
      residentialHeroContent?.includes('data-en="A place to"') &&
      residentialHeroContent?.includes('data-en="recharge"') &&
      !residentialHeroContent?.includes("detail-hero-motto"),
    "Residential hero must use the approved two-line VI/EN copy without the retired motto",
  );

  const commercialHeroContent = commercialSource.match(
    /<div class="hero-content">[\s\S]*?<\/div>/,
  )?.[0];
  assert(
    /class="hero detail-hero commercial-hero"/.test(commercialSource) &&
      commercialHeroContent?.includes("SHOP · F&amp;B · SHOWROOM · VĂN PHÒNG") &&
      commercialHeroContent?.includes('data-en="SHOP · F&amp;B · SHOWROOM · OFFICE"') &&
      commercialHeroContent?.replace(/<[^>]+>/g, "").includes("Thiết kế để bán tốt.") &&
      commercialHeroContent?.replace(/<[^>]+>/g, "").includes("Thi công để vận hành bền.") &&
      commercialHeroContent?.includes('data-en="Designed to sell"') &&
      commercialHeroContent?.includes('data-en="Built to perform"') &&
      !commercialHeroContent?.includes("detail-hero-motto"),
    "Commercial hero must use the approved Espacio-style two-line VI/EN copy without a separate motto",
  );

  const projectsHeroSection = projectsSource.match(
    /<section\b(?=[^>]*\bclass="[^"]*\bdetail-index-hero\b)[\s\S]*?<\/section>/,
  )?.[0];
  const projectsHeroContent = projectsHeroSection?.match(
    /<div\b(?=[^>]*\bclass="[^"]*\bhero-content\b)[^>]*>[\s\S]*?<\/div>/,
  )?.[0];
  assert(
    projectsHeroSection &&
      projectsHeroContent?.includes('class="hero-kicker"') &&
      projectsHeroContent?.includes("Sản phẩm quảng cáo") &&
      projectsHeroContent?.includes('data-en="Advertising products"') &&
      projectsHeroContent?.includes("để thương hiệu") &&
      projectsHeroContent?.includes("luôn trong tầm mắt") &&
      projectsHeroContent?.includes('data-en="Keep your brand"') &&
      projectsHeroContent?.includes('data-en="always in sight"') &&
      !projectsHeroContent?.includes("project-filters") &&
      !projectsHeroContent?.includes("detail-hero-motto") &&
      /class="scroll-cue detail-index-hero__scroll"[\s\S]*?data-scroll-cue[\s\S]*?data-en="SCROLL DOWN"[\s\S]*?CUỘN XUỐNG/.test(
        projectsHeroSection,
      ) &&
      detailCss.includes("height: calc(100svh - 50px);") &&
      detailCss.includes("width: min(calc(100% - 2 * var(--gutter)), 1500px);") &&
      styleSource.includes(".scroll-cue"),
    "Advertising hero must use the approved Projects-style copy, sibling filters, scroll cue, and viewport-minus-50 layout",
  );

  const clientLogoMarquee = homeSource.match(
    /<section\b(?=[^>]*\bclass="[^"]*\bcapability-marquee\b)[\s\S]*?<\/section>/,
  )?.[0];
  const clientLogoGroups = clientLogoMarquee?.match(
    /<div class="client-logo-marquee__group"(?: aria-hidden="true")?>[\s\S]*?<\/div>/g,
  );
  assert(
    clientLogoMarquee?.includes('class="client-logo-marquee__track"') &&
      clientLogoGroups?.length === 2 &&
      (clientLogoGroups[0].match(/class="client-logo-slot/g) || []).length === 12 &&
      (clientLogoGroups[1].match(/class="client-logo-slot/g) || []).length === 12 &&
      /\.client-logo-marquee__track\s*\{[\s\S]*?animation:\s*client-logo-marquee\s+25s\s+linear\s+infinite;/.test(
        styleSource,
      ) &&
      /\.client-logo-marquee__group\s*\{[\s\S]*?grid-template-columns:\s*repeat\(12,\s*var\(--client-logo-slot-width\)\);/.test(
        styleSource,
      ) &&
      /@keyframes client-logo-marquee\s*\{[\s\S]*?transform:\s*translate3d\(-50%,\s*0,\s*0\);/.test(
        styleSource,
      ),
    "The client-logo marquee must use two equal twelve-slot groups on one seamless -50% track",
  );

  assert(
    /const headerIntro = gsap\.timeline\(\{ defaults: \{ ease: "power4\.out" \}, paused: true \}\);[\s\S]*!softNavigation[\s\S]*\.from\(headerLogo, \{ scale: 0, duration: 1\.5 \}\)[\s\S]*header\.querySelectorAll\("#header-menu-items > ul > li"\)[\s\S]*\{ y: -150, duration: 1\.5, stagger: 0\.1 \},\s*0\.3[\s\S]*header\.querySelector\("#header-toggle-svg"\)[\s\S]*\{ scaleX: 0, transformOrigin: "center", duration: 1 \},\s*1\.5/.test(
      motionSource,
    ) && brandCss && !/transition:\s*transform\b/.test(brandCss),
    "The direct-only header intro does not match the audited 0/0.3/1.5s timeline or is masked by a CSS transform transition",
  );
  assert(
    /\.site-header\s*\{[\s\S]*?box-sizing:\s*content-box;[\s\S]*?width:\s*calc\(100% - 70px\);[\s\S]*?padding:\s*35px 35px 0;[\s\S]*?grid-template-columns:\s*var\(--brand-header-track-width\) minmax\(0, 1fr\) 65px;[\s\S]*?grid-template-rows:\s*var\(--header-row-height\);[\s\S]*?align-content:\s*center;[\s\S]*?align-items:\s*normal;[\s\S]*?column-gap:\s*70px;[\s\S]*?\}/.test(
      styleSource,
    ) &&
      /@media \(max-width:\s*1200px\)[\s\S]*?\.site-header\s*\{[\s\S]*?width:\s*calc\(100% - 50px\);[\s\S]*?padding:\s*25px 25px 0;[\s\S]*?grid-template-columns:\s*var\(--brand-header-track-width\) minmax\(0, 1fr\) 65px;[\s\S]*?grid-template-rows:\s*var\(--header-row-height\);[\s\S]*?column-gap:\s*25px;/.test(
        styleSource,
      ) &&
      /\.desktop-nav ul\s*\{[\s\S]*?left:\s*-10%;[\s\S]*?margin:\s*1em 0;[\s\S]*?column-gap:\s*39\.4609375px;/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*1200px\)[\s\S]*?\.desktop-nav ul\s*\{[\s\S]*?left:\s*auto;[\s\S]*?column-gap:\s*44\.4609375px;/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*1024px\)[\s\S]*?\.menu-button\s*\{[\s\S]*?gap:\s*normal 70px;/.test(
        styleSource,
      ) &&
      /@media \(min-width:\s*751px\) and \(max-width:\s*960px\)[\s\S]*?\.desktop-nav\s*\{[\s\S]*?width:\s*min\(435\.875px, 100%\);/.test(
        styleSource,
      ) &&
      /@media \(min-width:\s*961px\) and \(max-width:\s*1200px\)[\s\S]*?\.desktop-nav\s*\{[\s\S]*?width:\s*calc\(100% \+ 30px\);[\s\S]*?min-width:\s*0;[\s\S]*?\.desktop-nav ul\s*\{[\s\S]*?width:\s*fit-content;[\s\S]*?max-width:\s*100%;[\s\S]*?margin-inline:\s*auto;[\s\S]*?grid-template-columns:[\s\S]*?max-content minmax\(0, 44\.4609375px\)[\s\S]*?max-content minmax\(0, 44\.4609375px\)[\s\S]*?max-content;[\s\S]*?column-gap:\s*0;/.test(
        styleSource,
      ) &&
      /\.desktop-nav\.is-space-hidden\s*\{[^}]*visibility:\s*hidden;[^}]*pointer-events:\s*none;/.test(styleSource) &&
      !/grid-template-rows:\s*repeat\(2, auto\);/.test(styleSource) &&
      /const measureDesktopNav = \(\) => \{[\s\S]*?desktopNav\.inert = hidden;/.test(motionSource) &&
      /@media \(max-width:\s*750px\)[\s\S]*?\.site-header\s*\{[\s\S]*?width:\s*calc\(100% - 30px\);[\s\S]*?padding:\s*15px 15px 0;[\s\S]*?grid-template-columns:\s*var\(--brand-header-track-width\) minmax\(0, 1fr\) 65px;[\s\S]*?grid-template-rows:\s*var\(--header-row-height\);[\s\S]*?column-gap:\s*15px;[\s\S]*?\.desktop-nav ul\s*\{\s*display:\s*none;/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*680px\)[\s\S]*?\.menu-button\s*\{[\s\S]*?gap:\s*normal 30px;/.test(
        styleSource,
      ) &&
      /\.site-header\s*\{[\s\S]*?border-bottom:\s*0 solid transparent;/.test(
        styleSource,
      ) &&
      /\.site-header\.is-collapsed\s*\{[\s\S]*?border-bottom:\s*1px solid #d3d3d3;/.test(
        styleSource,
      ),
    "The header separation, gutter, or 750/960/1200 breakpoint contract drifted",
  );
  assert(
    /:root\s*\{[\s\S]*?--brand-header-height:\s*67\.515625px;[\s\S]*?--brand-header-width:\s*260\.981741px;[\s\S]*?--brand-header-track-width:\s*260\.981741px;[\s\S]*?--brand-menu-height:\s*var\(--brand-header-height\);[\s\S]*?--brand-menu-width:\s*var\(--brand-header-width\);/.test(
      styleSource,
    ) &&
      !/\.site-header\.is-collapsed\s*\{[^}]*--brand-header-(?:height|width)\s*:/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*1200px\)[\s\S]*?:root\s*\{[\s\S]*?--brand-header-height:\s*57\.59375px;[\s\S]*?--brand-header-width:\s*222\.62872px;[\s\S]*?--brand-header-track-width:\s*222\.62872px;/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*750px\)[\s\S]*?:root\s*\{[\s\S]*?--brand-header-height:\s*57\.59375px;[\s\S]*?--brand-header-width:\s*222\.62872px;[\s\S]*?--brand-header-track-width:\s*191\.885904px;/.test(
        styleSource,
      ) &&
      /\.brand\s*\{[\s\S]*?display:\s*block;[\s\S]*?width:\s*max-content;[\s\S]*?align-self:\s*start;/.test(
        styleSource,
      ) &&
      /\.brand-lockup\s*\{[\s\S]*?display:\s*block;[\s\S]*?width:\s*auto;[\s\S]*?height:\s*var\(--brand-header-height\);[\s\S]*?overflow:\s*visible;[\s\S]*?fill:\s*currentColor;/.test(
        styleSource,
      ) &&
      /const timing = \{ delay, duration: 1000 - delay, easing: "cubic-bezier\(0\.16, 1, 0\.3, 1\)" \};[\s\S]*?slot\.animate\(\{ clipPath: \["inset\(0 0 -1px 0\)", "inset\(0 0 calc\(100% - 1px\) 0\)"\] \}, \{ \.\.\.timing, fill: "both" \}\);\s*return path\.animate\(\{ clipPath: \["inset\(100% 0 0 0\)", "inset\(0\)"\] \}, \{ \.\.\.timing, fill: "backwards" \}\)/.test(
        motionSource,
      ) &&
      /\.menu-brand\s*\{[\s\S]*?display:\s*block;[\s\S]*?width:\s*max-content;[\s\S]*?justify-self:\s*start;/.test(
        styleSource,
      ) &&
      /\.menu-brand \.brand-lockup\s*\{[\s\S]*?width:\s*auto;[\s\S]*?height:\s*var\(--brand-menu-height\);[\s\S]*?overflow:\s*visible;/.test(
        styleSource,
      ) &&
      !/\.menu-brand \.brand-lockup__copy[\s\S]*?transform:\s*scaleY/.test(
        styleSource,
      ) &&
      !/brand-mark|brand-copy|menu-brand__mark|menu-brand__copy/.test(styleSource),
    "The header and menu lockups must keep the approved precise true-bounds matrix, live text, and visible geometry",
  );
  assert(
    /html\s*\{[\s\S]*?overflow-x:\s*hidden;/.test(styleSource) &&
      /body\s*\{[\s\S]*?overflow-x:\s*visible;/.test(styleSource),
    "The root must contain horizontal overflow while the body matches the live visible overflow contract",
  );
  assert(
    /\.heritage-montage\s*\{[\s\S]*?overflow-x:\s*clip;/.test(styleSource) &&
      /\.heritage-rows\s*\{[\s\S]*?overflow-x:\s*visible;/.test(styleSource) &&
      /\.heritage-text\s*\{[\s\S]*?clip-path:\s*inset\([\s\S]*?-0\.12em[\s\S]*?-0\.12em[\s\S]*?\);/.test(
        styleSource,
      ),
    "The heritage montage must contain layout overflow without clipping first or last glyph ink",
  );
  assert(
    /\.desktop-nav\s*\{[\s\S]*?font-size:\s*1rem;[\s\S]*?font-weight:\s*700;/.test(
      styleSource,
    ) &&
      /\.desktop-nav li\.selected a::after[\s\S]*?transform:\s*scaleX\(1\);[\s\S]*?transform-origin:\s*left center;/.test(
        styleSource,
      ) &&
      !/\.desktop-nav li\.selected a,[\s\S]*?\.desktop-nav a\[aria-current="page"\]\s*\{[\s\S]*?pointer-events:\s*none;/.test(styleSource) &&
      /\.menu-button svg\s*\{[\s\S]*?width:\s*35px;[\s\S]*?height:\s*19px;[\s\S]*?stroke-width:\s*3;/.test(
        styleSource,
      ),
    "Header nav typography, selected underline, or hamburger geometry drifted",
  );
  assert(
    /\.menu-group::after\s*\{[\s\S]*?height:\s*100%;[\s\S]*?transform:\s*scaleY\(0\);[\s\S]*?transform-origin:\s*top;[\s\S]*?transition:\s*transform 0\.3s linear;/.test(
      styleSource,
    ) &&
      /\.menu-open \.menu-group::after\s*\{[\s\S]*?transform:\s*scaleY\(1\);/.test(
        styleSource,
      ) &&
      !/transition:\s*height\b/.test(styleSource),
    "Full-menu dividers must animate on the compositor without height layout thrash",
  );
  assert(
    /\.desktop-nav a\s*\{[\s\S]*?scrollbar-color:\s*auto;[\s\S]*?\}/.test(
      styleSource,
    ) &&
      /\.desktop-nav a:focus-visible\s*\{[\s\S]*?outline:\s*none;[\s\S]*?outline-offset:\s*1px;[\s\S]*?\}/.test(
      styleSource,
    ) &&
      !/\.desktop-nav a:focus-visible::after[\s\S]*?transform:\s*scaleX\(1\)/.test(
        styleSource,
      ),
    "Desktop nav focus must match the live outline-only state without opening the hover underline",
  );
  assert(
    /const collapsed = scrollY > 100 \|\| document\.body\.classList\.contains\("is-advertising-photo"\);/.test(motionSource) &&
      /scrollY - directionStartY > 150/.test(motionSource) &&
      /directionStartY - scrollY > 150/.test(motionSource) &&
      /const isMiddle =\s*scrollY > window\.innerHeight \* 0\.5 &&\s*scrollY < pageHeight - window\.innerHeight \* 1\.25;/.test(
        motionSource,
      ) &&
      /const headerHoverMedia = window\.matchMedia\(\s*"\(any-hover: hover\) and \(any-pointer: fine\)"\s*,?\s*\);/.test(
        motionSource,
      ) &&
      /document\.addEventListener\(\s*"mousemove",[\s\S]*headerHoverMedia\.matches && event\.screenY <= 350[\s\S]*classList\.toggle\("forceShow", canForceShow\)/.test(
        motionSource,
      ) &&
      /transform 1s cubic-bezier\(0, 0, 0\.1, 0\.99\)/.test(styleSource),
    "Header collapse, direction accumulation, hide region, pointer force-show, or transform timing drifted",
  );
  assert(
    !/\.language-toggle\s*\{/.test(styleSource) &&
      /header\.querySelector\("#header-logo"\)/.test(motionSource) &&
      /const colorTargets = \[[\s\S]*?headerLogo,[\s\S]*?\.desktop-nav a/.test(
        motionSource,
      ) &&
      !/fillTargets|brand-mark|brand-copy/.test(motionSource) &&
      /const \{ gsap, SplitText \} = window;[\s\S]*?gsap\.registerEase\("expo\.out",\s*\(progress\)\s*=>[\s\S]*?progress === 1 \? 1 : 1 - 2 \*\* \(-10 \* progress\)/.test(
        motionSource,
      ) &&
      /header\.querySelectorAll\("\.menu-button line"\)/.test(motionSource) &&
      /gsap\s*\.timeline\(\{[\s\S]*?duration:\s*0\.3,[\s\S]*?ease:\s*"expo\.out"[\s\S]*?\.to\(colorTargets,\s*\{\s*color(?:\s*:\s*color)?\s*\},\s*0\)[\s\S]*?\.to\(strokeTargets,\s*\{\s*stroke:\s*color\s*\},\s*0\)/.test(
        motionSource,
      ) &&
      /const timing = \{ delay, duration: 1000 - delay, easing: "cubic-bezier\(0\.16, 1, 0\.3, 1\)" \};[\s\S]*?slot\.animate\(\{ clipPath: \["inset\(0 0 -1px 0\)", "inset\(0 0 calc\(100% - 1px\) 0\)"\] \}, \{ \.\.\.timing, fill: "both" \}\);\s*return path\.animate\(\{ clipPath: \["inset\(100% 0 0 0\)", "inset\(0\)"\] \}, \{ \.\.\.timing, fill: "backwards" \}\)/.test(
        motionSource,
      ) &&
      /\.site-header\.is-brand-color \.brand-lockup/.test(styleSource) &&
      /const isExactCurrentUrl[\s\S]*?normalizePathname\(url\.pathname\)[\s\S]*?url\.search === window\.location\.search/.test(
        motionSource,
      ) &&
      motionSource.includes(
        `'[data-site-header] a[aria-current="page"], #site-menu a[aria-current="page"]'`,
      ) &&
      /link\.matches\([\s\S]*?\)\s*&&\s*isExactCurrentUrl\(destination\)[\s\S]*?event\.preventDefault\(\)[\s\S]*?event\.stopImmediatePropagation\(\)/.test(
        motionSource,
      ) &&
      /const currentParentLink =[\s\S]*?residential\|commercial\|advertising-products[\s\S]*?has\("photo"\)[\s\S]*?setPageScroll\(pageState, 0, \{ instant: true \}\);[\s\S]*?closeMenu\(false\)/.test(
        motionSource,
      ) &&
      !/\.menu-nav a\[aria-current="page"\]\s*\{[\s\S]*?pointer-events:\s*none;/.test(styleSource) &&
      /html\.motion-fallback \.site-header \.brand-lockup[\s\S]*?fill:\s*currentColor\s*!important;[\s\S]*?html\.motion-fallback \.site-header \.menu-button line[\s\S]*?stroke:\s*currentColor\s*!important;/.test(
        styleSource,
      ),
    "Header text/hamburger color or the deliberately slower mark-color transition drifted",
  );
  assert(
    /\.menu-head\s*\{[\s\S]*?grid-template-columns:[\s\S]*?170px minmax\(0, 1fr\) minmax\(0, 1fr\) 50px;/.test(
      styleSource,
    ) &&
      /\.menu-nav\s*\{[\s\S]*?overflow-y:\s*scroll;[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*1200px\)[\s\S]*?\.menu-nav\s*\{[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*960px\)[\s\S]*?\.menu-nav\s*\{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*578px\)[\s\S]*?\.menu-nav\s*\{[\s\S]*?grid-template-columns:\s*1fr/.test(
        styleSource,
      ),
    "Full menu does not match the audited 4/3/2/1 scroll-grid contract",
  );
  assert(
    /\.hero\s*\{(?=[^}]*position:\s*relative;)(?=[^}]*z-index:\s*1;)(?=[^}]*display:\s*grid;)(?=[^}]*overflow:\s*hidden;)[^}]*\}/.test(styleSource) &&
      /\.hero-slide\s*\{(?=[^}]*overflow:\s*hidden;)[^}]*\}/.test(styleSource),
    "Home hero must match the live stacking layer and clip scaled media at the slide boundary",
  );
  assert(
    /\.site-menu\s*\{[\s\S]*?display:\s*block;[\s\S]*?opacity:\s*0;[\s\S]*?pointer-events:\s*none;/.test(styleSource) &&
      /\.site-menu\[open\]\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?pointer-events:\s*auto;/.test(styleSource) &&
      /\.site-menu::backdrop\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?transition:\s*none;/.test(styleSource) &&
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.site-menu\s*\{[\s\S]*?animation:\s*none\s*!important;[\s\S]*?transition:\s*all 0s ease 0s\s*!important;/.test(styleSource) &&
      /\.menu-shutters\s*\{(?=[^}]*position:\s*absolute;)(?=[^}]*overflow:\s*visible;)[^}]*\}/.test(styleSource) &&
      /\.menu-shutters i\s*\{[\s\S]*?position:\s*relative;/.test(styleSource) &&
      /\.menu-nav\s*\{[\s\S]*?z-index:\s*10;[\s\S]*?opacity:\s*0;/.test(styleSource) &&
      /\.menu-language\s*\{[\s\S]*?width:\s*max-content;[\s\S]*?overflow:\s*hidden;/.test(styleSource) &&
      /\.menu-close__icon\s*\{[\s\S]*?position:\s*relative;[\s\S]*?display:\s*block;[\s\S]*?width:\s*25px;[\s\S]*?height:\s*25px;[\s\S]*?overflow:\s*visible;[\s\S]*?transition:\s*none;/.test(styleSource) &&
      /\.menu-close__icon svg\s*\{[\s\S]*?stroke:\s*#2f2f2f;[\s\S]*?stroke-width:\s*3;/.test(styleSource) &&
      /\.menu-close__icon svg line\s*\{[\s\S]*?transform-origin:\s*center;[\s\S]*?transition:\s*transform 0\.3s ease-out;/.test(styleSource) &&
      /\.menu-close:hover \.menu-close__icon svg line\s*\{[\s\S]*?transform:\s*rotate\(90deg\);/.test(styleSource) &&
      !/\.menu-close:hover \.menu-close__icon\s*\{/.test(styleSource) &&
      /html\.motion-enabled \.site-menu:not\(\.is-active\) \.menu-brand\s*\{(?=[^}]*transform:\s*translateY\(-140px\);)(?=[^}]*opacity:\s*0;)[^}]*\}/.test(styleSource) &&
      /html\.motion-enabled \.site-menu:not\(\.is-active\) :is\([\s\S]*?\.menu-language > \[data-language-option\],[\s\S]*?\.menu-appointment,[\s\S]*?\.menu-close__icon[\s\S]*?\)\s*\{[\s\S]*?opacity:\s*0;/.test(styleSource) &&
      /html\.motion-enabled \.site-menu:not\(\.is-active\) \.menu-group\s*\{(?=[^}]*transform:\s*translateY\(-140px\);)(?=[^}]*opacity:\s*0;)[^}]*\}/.test(styleSource),
    "Full-menu closed state does not retain the live full-viewport opacity-zero geometry",
  );
  assert(
    motionSource.includes("const menuLanguageItems = [") &&
      motionSource.includes('...menuLanguage.querySelectorAll("[data-language-option]")') &&
      motionSource.includes("const menuAppointmentItems = [menuAppointment]") &&
      motionSource.includes('const menuCloseIcon = closeButton.querySelector(".menu-close__icon")') &&
      !motionSource.includes("menuCoverageAt") &&
      /\.fromTo\(menuBrand,[\s\S]*1\.15\)[\s\S]*\.fromTo\(menuLanguageItems,[\s\S]*1\.15\)[\s\S]*\.fromTo\(menuAppointmentItems,[\s\S]*1\.15\)[\s\S]*\.fromTo\(menuCloseIcon,[\s\S]*1\.4\)[\s\S]*\.fromTo\(menuNav,[\s\S]*1\.05\)[\s\S]*\.fromTo\(menuGroups,[\s\S]*1\.1\)[\s\S]*\.fromTo\(menuDetailItems,[\s\S]*1\.35\)/.test(motionSource) &&
      motionSource.includes("const setReducedMenuState = (opened) => {") &&
      (motionSource.match(/setReducedMenuState\(false\);/g) ?? []).length >= 2 &&
      (motionSource.match(/setReducedMenuState\(true\);/g) ?? []).length === 1 &&
      /if \(reduceMotion\)\s*\{[\s\S]*?setReducedMenuState\(false\);[\s\S]*?\}\s*else if \(!hasGsap\)/.test(finishCloseSource),
    "Full-menu descendant targets or relative GSAP sequence drifted from the live contract",
  );

  assert(
    /barba\.init\(\{[\s\S]*preventRunning:\s*true[\s\S]*timeout:\s*15_000[\s\S]*prefetchIgnore:\s*true/.test(
      motionSource,
    ) && /sync:\s*false/.test(motionSource),
    "Barba does not use the approved lifecycle options",
  );
  assert(
    /duration:\s*0\.75[\s\S]*ease:\s*"power4\.inOut"/.test(motionSource) &&
      /opacity:\s*0,[\s\S]*duration:\s*1,[\s\S]*ease:\s*"power4\.inOut"/.test(
        motionSource,
      ),
    "The approved 0.75s cover / 1s reveal veil timing changed",
  );
  assert(
    /async leave\(data\)[\s\S]*await coverRouteFromMenu\(\)[\s\S]*unmountPage\(\);[\s\S]*data\.current\.container\.hidden\s*=\s*true/.test(
      motionSource,
    ),
    "The outgoing Barba container is not removed from flow while fully covered",
  );
  assert(
    !/const navigateTo\s*=/.test(motionSource),
    "The conflicting full-reload navigateTo interceptor still exists",
  );
  assert(
    /window\.TruongThinhDetail\s*=\s*\{[\s\S]*mount[\s\S]*unmount/.test(
      detailSource,
    ) &&
      /classList\.contains\("motion-fallback"\)[\s\S]*mount\(undefined,\s*\{\s*settled:\s*true\s*\}\)/.test(
        detailSource,
      ),
    "detail.js does not expose an idempotent mount/unmount lifecycle",
  );
  assert(
    !/<style\b/i.test(aboutSource) && detailCss.includes(".about-page .about-hero"),
    "About-only styles are not available after soft navigation",
  );
  assert(
    !fs.existsSync(path.join(root, "products.js")) &&
      !/data-product-directory|data-product-info|data-product-directory-open/.test(
      projectsSource,
      ) &&
      !/src="\/products\.js"/.test(projectsSource),
    "Retired product dialogs/trigger/runtime still exist or load",
  );
  assert(
    /const pinHeaderForRoute = \(\) => \{[\s\S]*transitionDuration = "0s"[\s\S]*classList\.remove\("is-hidden"\)/.test(
      motionSource,
    ) &&
      /const clearRouteEntry = \(\) => \{[\s\S]*classList\.remove\("is-route-pinned"\)/.test(
        motionSource,
      ),
    "Route lifecycle does not synchronously pin and later release the persistent header",
  );
  assert(
    /@media\s*\(scripting:\s*enabled\)[\s\S]*html:not\(\.motion-ready\):not\(\.route-enter\) \.hero-content[\s\S]*opacity:\s*0/.test(
      styleSource,
    ) &&
      /classList\.add\("motion-ready"\)/.test(motionSource) &&
      !/intro\.from\(\s*heroWords,[\s\S]{0,120}autoAlpha:\s*0/.test(
        motionSource,
      ) &&
      !/gsap\.set\(group,\s*\{\s*visibility:\s*"visible"\s*\}\)/.test(
        detailSource,
      ),
    "Direct-load hero text can flash or disappear from the accessibility tree",
  );
  assert(
    /scheduleHeroFrame[\s\S]*data-motion-hero-kicker[\s\S]*is-motion-inview/.test(
      detailSource,
    ) &&
      /scheduleHeroFrame[\s\S]*data-motion-hero-wrapper-zoom[\s\S]*is-motion-inview/.test(
        detailSource,
      ) &&
      /scheduleHeroFrame[\s\S]*data-motion-hero-media[\s\S]*is-motion-inview/.test(
        detailSource,
      ),
    "Detail hero entrance does not wait for an initial painted frame",
  );
  assert(
    /querySelectorAll\("img"\)[\s\S]*draggable\s*=\s*false/.test(detailSource) &&
      /dragstart[\s\S]*preventDefault/.test(detailSource) &&
      /event\.button\s*!==\s*0/.test(detailSource),
    "Gallery still allows native image drag or non-primary pointer capture",
  );
  assert(
    /const heroLabels = selectAll\("\[data-hero-label\]"\)/.test(motionSource) &&
      /heroLabels\.forEach[\s\S]*classList\.toggle\("is-active"/.test(
        motionSource,
      ) &&
      /timelines\.delete\(timeline\)/.test(motionSource),
    "Hero labels or completed timeline cleanup are not synchronized",
  );
  assert(
    /const cancelFrame[\s\S]*frames\.delete\(frame\)/.test(detailSource),
    "Canceled detail animation frames remain tracked",
  );
  assert(
    /window\.__ttMotionBoot\?\.claim\?\.\(\)/.test(motionSource) &&
      /window\.__ttMotionRuntimeHealthy\s*=\s*true/.test(motionSource) &&
      !/__ttBootFailOpen|__ttBootWatchdog|__ttBootFailOpenCount|motion-failed/.test(
        motionSource,
      ),
    "Healthy motion runtime does not claim the startup handshake cleanly",
  );
  assert(
    /<link rel="stylesheet" href="\/detail\.css"\s*\/>/.test(
      fs.readFileSync(path.join(root, "index.html"), "utf8"),
    ),
    "Persistent Home shell does not preload detail styles for soft entries",
  );
  assert(
    (aboutSource.match(/src="\/assets\/content\/shared\/legacy-team\.webp"/g) || [])
      .length === 1 &&
      !/<div class="hero-slides"[^>]*hidden/.test(aboutSource),
    "About still renders a hidden duplicate hero carousel/media request",
  );
}

function assertEspacioTypographyMotionSourceContracts() {
  for (const [relativePath] of PUBLIC_HTML) {
    const source = fs.readFileSync(path.join(SITE_ROOT, relativePath), "utf8");
    assert(
      (source.match(/\bdata-scroll-cue(?!-)/g) || []).length === 1 &&
        /<button\b[^>]*\bdata-scroll-cue\b[\s\S]*?\bdata-scroll-cue-label\b/.test(
          source,
        ),
      `${relativePath} must expose one interactive localized scroll cue`,
    );
  }
}

async function launchBrowser() {
  const requestedExecutable = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const layoutScrollbarOptions = process.env.TT_E2E_ADVERTISING_GRID_ONLY === "1"
    ? { ignoreDefaultArgs: ["--hide-scrollbars"] }
    : {};
  const primaryOptions = {
    headless: true,
    ...layoutScrollbarOptions,
    ...(requestedExecutable ? { executablePath: requestedExecutable } : {}),
  };

  try {
    return await chromium.launch(primaryOptions);
  } catch (primaryError) {
    if (requestedExecutable) throw primaryError;

    const candidates =
      process.platform === "win32"
        ? [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
          ];
    const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!executablePath) throw primaryError;

    console.log(
      `[site-e2e] Playwright Chromium is unavailable; using ${executablePath}`,
    );
    return chromium.launch({ headless: true, executablePath, ...layoutScrollbarOptions });
  }
}

function monitorPage(page) {
  const trackedExternalTypes = new Set(["script", "stylesheet", "font"]);
  const diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    badResponses: [],
  };

  page.on("console", (message) => {
    // Ghi chú hiệu năng GPU driver của Chromium (software GL trong CI) không phải page diagnostic.
    if (/^\[\.WebGL-[^\]]+\]GL Driver Message \([^)]*\bPerformance\b/.test(message.text())) return;
    if (["error", "warning", "warn"].includes(message.type())) {
      diagnostics.consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    try {
      const isSameOrigin = new URL(request.url()).origin === BASE_ORIGIN;
      if (!isSameOrigin && !trackedExternalTypes.has(request.resourceType())) return;
      // Ảnh, video bị hủy khi rời trang hoặc gỡ card (ERR_ABORTED) là hành vi trình duyệt, không phải lỗi tải.
      if (
        request.failure()?.errorText === "net::ERR_ABORTED" &&
        ["image", "media"].includes(request.resourceType())
      ) return;
      diagnostics.requestFailures.push(
        `${request.method()} ${request.url()} — ${
          request.failure()?.errorText || "request failed"
        }`,
      );
    } catch {}
  });
  page.on("response", (response) => {
    try {
      const request = response.request();
      const isSameOrigin = new URL(response.url()).origin === BASE_ORIGIN;
      if (
        response.status() >= 400 &&
        (isSameOrigin || trackedExternalTypes.has(request.resourceType()))
      ) {
        diagnostics.badResponses.push(`${response.status()} ${response.url()}`);
      }
    } catch {}
  });

  return diagnostics;
}

// Locomotive (từ 981px) đi một nấc cố định mỗi lượt lăn (scroll-feel R1), dưới 981px cuộn native:
// lăn từng nấc tới khi header thu gọn (quá 100px) hoặc mở lại.
async function wheelUntilCollapsed(page, collapsed = true) {
  for (let tick = 0; tick < 8; tick += 1) {
    await page.mouse.wheel(0, collapsed ? 220 : -220);
    await page.waitForTimeout(60);
    if ((await page.locator("[data-site-header].is-collapsed").count() > 0) === collapsed) return;
  }
}

async function waitForNavigationCleanup(page) {
  await page.waitForFunction(
    () => {
      if (!document.body) return false;
      const dialog = document.querySelector("#site-menu");
      const opener = document.querySelector("[data-menu-open]");
      const routeVeil = document.querySelector(".route-veil");
      const veilIsHidden =
        !routeVeil ||
        Number.parseFloat(getComputedStyle(routeVeil).opacity) <= 0.001;
      return (
        !document.documentElement.classList.contains("route-enter") &&
        !document.body.classList.contains("is-transitioning") &&
        !document.body.classList.contains("menu-open") &&
        !dialog?.open &&
        opener?.getAttribute("aria-expanded") === "false" &&
        veilIsHidden
      );
    },
    null,
    { timeout: 6_000 },
  );
}

async function waitForLoadedDocument(page) {
  await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});
  await Promise.race([
    page.evaluate(() => document.fonts?.ready),
    page.waitForTimeout(3_000),
  ]).catch(() => {});
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll(".hero-slide img")].every(
        (image) => !image.dataset.src && image.complete,
      ),
    null,
    { timeout: 5_000 },
  );
  await page
    .waitForLoadState("networkidle", { timeout: 5_000 })
    .catch(() => {});
  await waitForNavigationCleanup(page);
}

async function waitForPath(page, expectedPath) {
  await waitForCanonicalPath(page, expectedPath);
  await waitForLoadedDocument(page);
}

async function waitForCanonicalPath(page, expectedPath) {
  const expected = canonicalPathname(expectedPath);
  await page.waitForFunction(
    (target) => {
      const pathname = window.location.pathname === "/"
        ? "/"
        : `${window.location.pathname.replace(/\/+$/, "")}/`;
      return pathname === target;
    },
    expected,
    { timeout: 15_000 },
  );
}

async function findRouteLink(page, scope, expectedPath) {
  const expected = canonicalPathname(expectedPath);
  const links = page.locator(`${scope} a[href]`);
  const index = await links.evaluateAll(
    (anchors, target) =>
      anchors.findIndex((anchor) => {
        const pathname = new URL(anchor.href).pathname;
        const normalized =
          pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
        return normalized === target;
      }),
    expected,
  );
  assert(index >= 0, `${scope} has no route link to ${expected}`);
  return links.nth(index);
}

async function assertDirectRouteContracts(page) {
  const contracts = await page.evaluate(() => {
    const inspect = (selector) => {
      const links = [...document.querySelectorAll(selector)].filter(
        (link) =>
          link.getAttribute("aria-disabled") !== "true" &&
          !link.matches("[data-language-option]"),
      );
      const internal = links
        .map((link) => ({
          href: link.getAttribute("href")?.trim(),
          url: new URL(link.href),
        }))
        .filter(({ url }) => url.origin === window.location.origin);
      return {
        hashHrefs: links
          .map((link) => link.getAttribute("href")?.trim())
          .filter((href) => href?.startsWith("#")),
        hrefs: internal.map(({ href }) => href),
      };
    };
    return {
      brandHref: document
        .querySelector("[data-site-header] .brand")
        ?.getAttribute("href"),
      brandLabel: document
        .querySelector("[data-site-header] .brand")
        ?.getAttribute("aria-label"),
      header: inspect("[data-site-header] a[href]"),
      menuPrimary: inspect(
        "#site-menu .menu-group:not(:last-child) > a.menu-group__title",
      ),
      menuAbout: inspect("#site-menu .menu-group:last-child a[href]"),
    };
  });
  const expectedHeader = ["/vi/", ...DIRECT_SERVICE_ROUTES].sort();
  const expectedMenu = [...DIRECT_SERVICE_ROUTES].sort();
  const expectedAbout = [
    "/vi/about/",
    "/vi/about/?topic=commitment",
    "/vi/about/?topic=contact",
    "/vi/about/?topic=heritage",
    "/vi/about/?topic=process",
  ].sort();
  const headerHrefs = unique(contracts.header.hrefs).sort();
  const menuHrefs = unique(contracts.menuPrimary.hrefs).sort();
  const aboutHrefs = unique(contracts.menuAbout.hrefs).sort();

  assert(
    contracts.brandHref === "/vi/",
    `Header brand href is ${JSON.stringify(contracts.brandHref)}; expected "/vi/"`,
  );
  assert(
    contracts.brandLabel ===
      "TRƯỜNG THỊNH NỘI THẤT · QUẢNG CÁO — Trang chủ",
    `Header brand label is ${JSON.stringify(contracts.brandLabel)}`,
  );
  assert(
    contracts.header.hashHrefs.length === 0,
    `Header contains hash routes: ${contracts.header.hashHrefs.join(", ")}`,
  );
  assert(
    contracts.menuPrimary.hashHrefs.length === 0,
    `Primary menu contains hash routes: ${contracts.menuPrimary.hashHrefs.join(", ")}`,
  );
  assert(
    JSON.stringify(headerHrefs) === JSON.stringify(expectedHeader),
    `Header routes are ${headerHrefs.join(", ")}; expected ${expectedHeader.join(", ")}`,
  );
  assert(
    JSON.stringify(menuHrefs) === JSON.stringify(expectedMenu),
    `Menu routes are ${menuHrefs.join(", ")}; expected ${expectedMenu.join(", ")}`,
  );
  assert(
    JSON.stringify(aboutHrefs) === JSON.stringify(expectedAbout),
    `About routes are ${aboutHrefs.join(", ")}; expected ${expectedAbout.join(", ")}`,
  );
}

async function clickRouteLink(page, link, expectedPath) {
  try {
    await Promise.all([waitForPath(page, expectedPath), link.click()]);
  } catch (error) {
    const state = await page
      .evaluate(() => ({
        barbaCurrent: window.barba?.history?.current,
        barbaRunning: window.barba?.transitions?.isRunning,
        bodyClasses: document.body.className,
        currentUrl: window.location.href,
        routeVeilOpacity: Number.parseFloat(
          getComputedStyle(document.querySelector(".route-veil")).opacity,
        ),
        clickTrace: window.__ttClickTrace,
      }))
      .catch(() => ({}));
    throw new Error(
      `Route click did not reach ${canonicalPathname(expectedPath)}: ${error.message}; state=${JSON.stringify(state)}`,
    );
  }
}

async function traverseHistory(page, direction, expectedPath) {
  const pathReady = waitForPath(page, expectedPath);
  const traversal =
    direction === "back"
      ? page.goBack({ waitUntil: "domcontentloaded", timeout: 15_000 })
      : page.goForward({ waitUntil: "domcontentloaded", timeout: 15_000 });
  await Promise.all([pathReady, traversal]);
}

async function waitForMenuState(page, open) {
  await page.waitForFunction(
    (expectedOpen) => {
      const dialog = document.querySelector("#site-menu");
      const opener = document.querySelector("[data-menu-open]");
      const expectedFocus = expectedOpen
        ? dialog
        : opener;
      return (
        dialog?.open === expectedOpen &&
        document.body.classList.contains("menu-open") === expectedOpen &&
        opener?.getAttribute("aria-expanded") === String(expectedOpen) &&
        (expectedOpen
          ? expectedFocus?.contains(document.activeElement)
          : document.activeElement === expectedFocus)
      );
    },
    open,
    { timeout: 6_000 },
  );
}

async function waitForMenuVisualState(page) {
  await page.waitForFunction(
    () => {
      const dialog = document.querySelector("#site-menu");
      if (!dialog?.open || !dialog.classList.contains("is-active")) return false;
      const dividers = [...document.querySelectorAll("#site-menu .menu-group")]
        .map((group) => ({
          group,
          style: getComputedStyle(group, "::after"),
        }))
        .filter(({ style }) => style.display !== "none");
      const brand = dialog.querySelector(".menu-brand");
      const brandStyle = getComputedStyle(brand);
      const brandMatrix = new DOMMatrixReadOnly(brandStyle.transform);
      return (
        document.activeElement === dialog.querySelector("[data-menu-close]") &&
        Number.parseFloat(brandStyle.opacity) >= 0.999 &&
        Math.abs(brandMatrix.f) <= 0.5 &&
        dividers.every(({ group, style }) => {
          const targetHeight = group.getBoundingClientRect().height;
          const dividerHeight = Number.parseFloat(style.height);
          const matrix = new DOMMatrixReadOnly(style.transform);
          return (
            targetHeight > 0 &&
            Number.isFinite(dividerHeight) &&
            Math.abs(targetHeight - dividerHeight) <= 1 &&
            Math.abs(matrix.d - 1) <= 0.01
          );
        })
      );
    },
    null,
    { timeout: 6_000 },
  );
}

async function closeMenu(page) {
  await page.locator("[data-menu-close]").click();
  await waitForMenuState(page, false);
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll(".menu-shutters i")].every(
        (shutter) => Math.abs(shutter.getBoundingClientRect().height) <= 0.5,
      ),
    null,
    { timeout: 1_000 },
  );
}

async function restoreHeaderForMenu(page) {
  const viewport = await page.viewportSize();
  await page.mouse.move(Math.max(1, Math.floor(viewport.width / 2)), 120);
  await page.mouse.wheel(0, -Math.max(900, viewport.height * 1.25));
  await page.waitForTimeout(120);
  const opener = page.locator("[data-menu-open]");
  await opener.focus();
  await page.waitForFunction(
    () => {
      const opener = document.querySelector("[data-menu-open]");
      const rect = opener?.getBoundingClientRect();
      return (
        document.activeElement === opener &&
        rect?.bottom > 0 &&
        rect?.top < window.innerHeight
      );
    },
    null,
    { timeout: 3_000 },
  );
}

async function openMenu(page) {
  await restoreHeaderForMenu(page);
  await page.locator("[data-menu-open]").click();
  await waitForMenuState(page, true);
  await waitForMenuVisualState(page);
}

async function gotoRoute(page, route) {
  const response = await page.goto(pageUrl(route), {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  assert(response, `No navigation response for ${route}`);
  assert(
    response.status() < 400,
    `Navigation returned ${response.status()} for ${route}`,
  );
  await waitForLoadedDocument(page);
}

async function steppedScroll(page, viewport) {
  await page.mouse.move(
    Math.max(1, Math.floor(viewport.width / 2)),
    Math.max(1, Math.floor(viewport.height / 2)),
  );
  const distance = Math.max(700, Math.floor(viewport.height * 0.95));
  for (let index = 0; index < 90; index += 1) {
    const footerTop = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      return footer ? footer.getBoundingClientRect().top : Infinity;
    });
    if (footerTop <= viewport.height * 0.72) break;
    await page.mouse.wheel(0, distance);
    await page.waitForTimeout(viewport.width >= 981 ? 80 : 35);
    await page.evaluate(async () => {
      const tracks = [...document.querySelectorAll("[data-gallery-track]")].filter(
        (track) => {
          const rect = track.getBoundingClientRect();
          return (
            !track.dataset.qaLazySwept &&
            rect.bottom > 0 &&
            rect.top < innerHeight
          );
        },
      );
      if (!tracks.length) return;
      const paint = () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      // Quét track từng bề rộng một để mọi ảnh lazy (gallery Nhà ở 36 ảnh) đều vào vùng tải.
      for (const track of tracks) {
        for (let left = 0; left < track.scrollWidth; left += track.clientWidth) {
          track.scrollTo({ left, behavior: "instant" });
          await paint();
        }
        track.scrollTo({ left: track.scrollWidth, behavior: "instant" });
        track.dataset.qaLazySwept = "true";
      }
      await paint();
    });
  }
  await page.evaluate(() => {
    document.querySelectorAll("[data-gallery-track]").forEach((track) => {
      track.scrollTo({ left: track.scrollWidth, behavior: "instant" });
    });
  });
}

async function settleLazyImagesAfterSteppedScroll(page) {
  const images = await page.locator('img[loading="lazy"]').elementHandles();
  for (const imageHandle of images) {
    const isVisible = await imageHandle.evaluate((image) => {
      if (!image.isConnected) return false;
      image.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: "auto",
      });
      const style = getComputedStyle(image);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    if (isVisible) {
      await imageHandle.evaluate(
        (image) =>
          new Promise((resolve) => {
            if (!image.isConnected) {
              resolve();
              return;
            }
            if (image.complete && image.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => {
              image.removeEventListener("load", done);
              image.removeEventListener("error", done);
              resolve();
            };
            image.addEventListener("load", done, { once: true });
            image.addEventListener("error", done, { once: true });
            window.setTimeout(done, 1_500);
          }),
      );
    }
  }
}

async function assertPrimaryGallerySweep(page) {
  const state = await page.evaluate(() => {
    const tracks = [...document.querySelectorAll("[data-gallery-track]")];
    return {
      trackCount: tracks.length,
      unsweptTracks: tracks.filter((track) => !track.dataset.qaLazySwept).length,
      unloaded: tracks.flatMap((track, trackIndex) =>
        [...track.querySelectorAll('img[loading="lazy"]')]
          .map((image, imageIndex) => ({
            trackIndex,
            imageIndex,
            source: image.currentSrc || image.src,
            naturalWidth: image.naturalWidth,
          }))
          .filter((image) => image.naturalWidth <= 0),
      ),
    };
  });
  assert(
    state.trackCount === 0 ||
      (state.unsweptTracks === 0 && state.unloaded.length === 0),
    `Primary horizontal gallery sweep failed before recovery: ${JSON.stringify(state)}`,
  );
}

async function inspectRequiredImages(page) {
  await page
    .waitForFunction(
      () =>
        [...document.images]
          .filter((image) => {
            // Required = đã render; ảnh LazySizes mà cửa sổ masonry ảo mount trước khi
            // cuộn (masonry R7, R8) thành required khi nó giao viewport.
            const source = image.getAttribute("src") || image.dataset.src;
            if (!source || source.startsWith("data:") || !image.getClientRects().length) return false;
            if (!image.classList.contains("lazyload")) return true;
            const rect = image.getBoundingClientRect();
            return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
          })
          .every(
            (image) =>
              image.naturalWidth > 0 &&
              (image.complete ||
                performance
                  .getEntriesByName(image.currentSrc)
                  .some((entry) => entry.responseEnd > 0)),
          ),
      null,
      { timeout: 10_000 },
    )
    .catch(() => {});

  return page.evaluate(() =>
    [...document.images]
      .filter((image) => {
        const source = image.getAttribute("src") || image.dataset.src;
        if (!source || source.startsWith("data:") || !image.getClientRects().length) return false;
        if (!image.classList.contains("lazyload")) return true;
        const rect = image.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      })
      .map((image, index) => ({
        index,
        source: image.currentSrc || image.getAttribute("src") || image.dataset.src,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        responseComplete: performance
          .getEntriesByName(image.currentSrc)
          .some((entry) => entry.responseEnd > 0),
      }))
      .filter(
        (image) =>
          image.naturalWidth <= 0 ||
          (!image.complete && !image.responseComplete),
      ),
  );
}

function assertDiagnostics(diagnostics) {
  const issues = [
    ...unique(diagnostics.consoleErrors).map(
      (message) => `console.error: ${message}`,
    ),
    ...unique(diagnostics.pageErrors).map((message) => `pageerror: ${message}`),
    ...unique(diagnostics.requestFailures).map(
      (message) => `requestfailed: ${message}`,
    ),
    ...unique(diagnostics.badResponses).map(
      (message) => `bad response: ${message}`,
    ),
  ];
  assert(issues.length === 0, issues.join("\n"));
}

async function smokePage(page, route, viewport) {
  const diagnostics = monitorPage(page);
  await gotoRoute(page, route);

  const initialOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await steppedScroll(page, viewport);
  await assertPrimaryGallerySweep(page);
  await settleLazyImagesAfterSteppedScroll(page);
  const finalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  const brokenImages = await inspectRequiredImages(page);
  const themeColor = await page
    .locator('meta[name="theme-color"]')
    .getAttribute("content");
  const bootState = await page.evaluate(() => ({
    fallbackActive: document.documentElement.classList.contains("motion-fallback"),
    bootClaimed: window.__ttMotionBoot?.claimed,
    bootFallback: window.__ttMotionBoot?.fallback,
    runtimeHealthy: window.__ttMotionRuntimeHealthy,
  }));

  const issues = [];
  if (themeColor?.toLowerCase() !== "#ffffff") {
    issues.push(`theme color is not white: ${themeColor}`);
  }
  if (initialOverflow > 1) {
    issues.push(`horizontal overflow before scroll: ${initialOverflow}px`);
  }
  if (finalOverflow > 1) {
    issues.push(`horizontal overflow after scroll: ${finalOverflow}px`);
  }
  if (brokenImages.length) {
    issues.push(`images not loaded: ${JSON.stringify(brokenImages)}`);
  }
  if (
    bootState.fallbackActive ||
    bootState.bootFallback ||
    bootState.bootClaimed !== true ||
    bootState.runtimeHealthy !== true
  ) {
    issues.push(`normal path triggered fail-open: ${JSON.stringify(bootState)}`);
  }
  assert(issues.length === 0, issues.join("\n"));
  assertDiagnostics(diagnostics);
}

async function runPageCase(
  name,
  {
    route,
    viewport,
    reducedMotion = "no-preference",
    javaScriptEnabled = true,
    hasTouch = false,
    isMobile = false,
    deviceScaleFactor = 1,
  },
  testBody,
) {
  if (process.env.TT_E2E_P13_NAVBAR_ONLY === "1"
    && process.env.TT_E2E_P13_CASE
    && !name.includes(process.env.TT_E2E_P13_CASE)) return;
  const caseStartedAt = Date.now();
  const context = await browser.newContext({
    viewport,
    locale: "vi-VN",
    colorScheme: "light",
    reducedMotion,
    javaScriptEnabled,
    hasTouch,
    isMobile,
    deviceScaleFactor,
  });
  const page = await context.newPage();
  let failureScreenshot;

  try {
    await testBody(page);
    results.push({
      name,
      route,
      viewport: `${viewport.width}x${viewport.height}`,
      reducedMotion,
      status: "passed",
      durationMs: Date.now() - caseStartedAt,
    });
    console.log(`PASS ${name}`);
  } catch (error) {
    const screenshotName = `${safeFileName(name)}.png`;
    const screenshotPath = path.join(FAILURE_DIR, screenshotName);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: false });
      failureScreenshot = path
        .relative(__dirname, screenshotPath)
        .replaceAll("\\", "/");
    } catch {}
    results.push({
      name,
      route,
      viewport: `${viewport.width}x${viewport.height}`,
      reducedMotion,
      status: "failed",
      durationMs: Date.now() - caseStartedAt,
      error: error instanceof Error ? error.message : String(error),
      ...(failureScreenshot ? { screenshot: failureScreenshot } : {}),
    });
    // Kèm dòng gọi trong file này để biết waitForFunction nào hết giờ khi đọc log CI.
    const at = error?.stack?.split("\n").find((line) => line.includes("site.e2e.cjs"))?.trim() ?? "";
    console.error(`FAIL ${name}\n${error instanceof Error ? error.message : error}\n${at}`);
  } finally {
    await context.close();
  }
}

async function runSmokeMatrix() {
  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      const name = `smoke ${routeSlug(route)} ${viewport.width}x${viewport.height}`;
      await runPageCase(name, { route, viewport }, (page) =>
        smokePage(page, route, viewport),
      );
    }
  }
}

async function runPortalAlignmentChecks() {
  for (const locale of ["vi", "en"]) {
    for (const width of [320, 390, 430, 750, 751, 960, 961, 1024, 1200, 1201, 1329, 1440, 1569, 1920]) {
      const viewport = { width, height: 900 };
      await runPageCase(
        `root portal hierarchy and title anchor ${locale} ${width}x900`,
        { route: `/${locale}/`, viewport },
        async (page) => {
          const diagnostics = monitorPage(page);
          await gotoRoute(page, `/${locale}/`);
          const state = await page.evaluate(() => ({
            cards: [...document.querySelectorAll("#dich-vu .service-portal")].map(
              (card) => {
                const cardRect = card.getBoundingClientRect();
                const upper = card.querySelector(".portal-title__quiet");
                const title = card.querySelector(".portal-title__strong");
                const lower = card.querySelector(".portal-subtitle");
                const upperRect = upper.getBoundingClientRect();
                const titleRect = title.getBoundingClientRect();
                const lowerRect = lower.getBoundingClientRect();
                const upperStyle = getComputedStyle(upper);
                const titleStyle = getComputedStyle(title);
                const lowerStyle = getComputedStyle(lower);
                return {
                  cardCenter: cardRect.top + cardRect.height / 2,
                  relativeTitleCenter:
                    titleRect.top + titleRect.height / 2 - cardRect.top,
                  titleCenter: titleRect.top + titleRect.height / 2,
                  titleFontSize: Number.parseFloat(titleStyle.fontSize),
                  titleWeight: titleStyle.fontWeight,
                  upperFontSize: Number.parseFloat(upperStyle.fontSize),
                  upperWeight: upperStyle.fontWeight,
                  lowerFontSize: Number.parseFloat(lowerStyle.fontSize),
                  lowerWeight: lowerStyle.fontWeight,
                  upperOverflow: upper.scrollWidth - upper.clientWidth,
                  titleOverflow: title.scrollWidth - title.clientWidth,
                  lowerOverflow: lower.scrollWidth - lower.clientWidth,
                  upperWhiteSpace: upperStyle.whiteSpace,
                  titleWhiteSpace: titleStyle.whiteSpace,
                  lowerWhiteSpace: lowerStyle.whiteSpace,
                  upperWithin: upperRect.left >= cardRect.left + 8 && upperRect.right <= cardRect.right - 8,
                  titleWithin: titleRect.left >= cardRect.left + 8 && titleRect.right <= cardRect.right - 8,
                  lowerWithin: lowerRect.left >= cardRect.left + 8 && lowerRect.right <= cardRect.right - 8,
                  upperGap: titleRect.top - upperRect.bottom,
                  lowerGap: lowerRect.top - titleRect.bottom,
                };
              },
            ),
            capabilityCards: [
              ...document.querySelectorAll("#nang-luc .service-portal"),
            ].map((card) => {
              const cardRect = card.getBoundingClientRect();
              const title = card.querySelector(".portal-title-mask");
              const subtitle = card.querySelector(".portal-subtitle");
              const titleRect = title.getBoundingClientRect();
              const subtitleRect = subtitle.getBoundingClientRect();
              const titleStyle = getComputedStyle(title);
              const subtitleStyle = getComputedStyle(subtitle);
              return {
                title: card.querySelector(".portal-line")?.textContent.trim(),
                titleFontSize: Number.parseFloat(titleStyle.fontSize),
                subtitleFontSize: Number.parseFloat(subtitleStyle.fontSize),
                titleOverflow: title.scrollWidth - title.clientWidth,
                subtitleOverflow: subtitle.scrollWidth - subtitle.clientWidth,
                titleWhiteSpace: titleStyle.whiteSpace,
                subtitleWhiteSpace: subtitleStyle.whiteSpace,
                titleWithin: titleRect.left >= cardRect.left + 8 && titleRect.right <= cardRect.right - 8,
                subtitleWithin: subtitleRect.left >= cardRect.left + 8 && subtitleRect.right <= cardRect.right - 8,
                titleCenterOffset:
                  titleRect.top +
                  titleRect.height / 2 -
                  (cardRect.top + cardRect.height / 2),
                gap: subtitleRect.top - titleRect.bottom,
              };
            }),
            advertisingImage: (() => {
              const image = document.querySelector(
                "#dich-vu .service-portal:nth-child(3) img",
              );
              return image
                  ? {
                    // src fallback gốc; currentSrc là variant AVIF/WebP responsive.
                    src: new URL(image.getAttribute("src"), location.href).pathname,
                    declaredWidth: Number(image.getAttribute("width")),
                    declaredHeight: Number(image.getAttribute("height")),
                  }
                : null;
            })(),
            editorial: [
              ...document.querySelectorAll("#bang-chung .editorial-item"),
            ].map((item) => {
              const heading = item.querySelector("h3");
              const body = item.querySelector("p");
              return {
                headingSize: Number.parseFloat(
                  getComputedStyle(heading).fontSize,
                ),
                headingOverflow: heading.scrollWidth - heading.clientWidth,
                bodySize: Number.parseFloat(getComputedStyle(body).fontSize),
              };
            }),
            horizontalOverflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          }));
          const zoomed = await page.evaluate(() => {
            document.documentElement.style.fontSize = "200%";
            const read = (selector) => [...document.querySelectorAll(selector)].map((element) => ({
              fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
              overflow: element.scrollWidth - element.clientWidth,
              whiteSpace: getComputedStyle(element).whiteSpace,
              within: (() => {
                const card = element.closest(".service-portal");
                const cardRect = card.getBoundingClientRect();
                const rect = element.getBoundingClientRect();
                return rect.left >= cardRect.left + 8 && rect.right <= cardRect.right - 8;
              })(),
            }));
            return {
              serviceTitles: read("#dich-vu .portal-title__strong"),
              serviceKickers: read("#dich-vu .portal-title__quiet"),
              serviceSubtitles: read("#dich-vu .portal-subtitle"),
              capabilityTitles: read("#nang-luc .portal-title-mask"),
              capabilitySubtitles: read("#nang-luc .portal-subtitle"),
            };
          });
          for (const [role, samples] of Object.entries(zoomed)) {
            assert(
              samples.length === 3 && samples.every(({ overflow, whiteSpace, within }) => overflow <= 0.5 && whiteSpace === "nowrap" && within),
              `Portal ${role} clips or wraps at 200% text zoom for ${locale} ${width}px: ${JSON.stringify(samples)}`,
            );
            const sizes = samples.map(({ fontSize }) => fontSize);
            assert(
              Math.max(...sizes) - Math.min(...sizes) <= 0.01,
              `Portal ${role} peer sizes differ at ${locale} ${width}px: ${sizes.join(", ")}`,
            );
          }
          assert(
            state.cards.every((card) => card.upperOverflow <= 0.5 && card.titleOverflow <= 0.5 && card.lowerOverflow <= 0.5
              && card.upperWhiteSpace === "nowrap" && card.titleWhiteSpace === "nowrap" && card.lowerWhiteSpace === "nowrap"
              && card.upperWithin && card.titleWithin && card.lowerWithin),
            `Service portal text clips or wraps at ${locale} ${width}px: ${JSON.stringify(state.cards)}`,
          );
          assert(
            state.capabilityCards.every((card) => card.titleOverflow <= 0.5 && card.subtitleOverflow <= 0.5
              && card.titleWhiteSpace === "nowrap" && card.subtitleWhiteSpace === "nowrap"
              && card.titleWithin && card.subtitleWithin),
            `Capability portal text clips or wraps at ${locale} ${width}px: ${JSON.stringify(state.capabilityCards)}`,
          );
          assert(state.cards.length === 3, `Expected 3 portals, found ${state.cards.length}`);
          assert(
            state.capabilityCards[1]?.title ===
              (locale === "vi" ? "Xưởng CNC" : "Workshop & CNC"),
            `Workshop capability copy drifted at ${locale}: ${state.capabilityCards[1]?.title}`,
          );
          assert(
            state.capabilityCards.length === 3 &&
              state.capabilityCards.every(
                (card) =>
                  Math.abs(card.titleCenterOffset) <= 1 &&
                  Math.abs(card.gap - 17.6) <= 0.25,
              ),
            `Capability portal title anchor or gap drifted at ${locale} ${width}px: ${JSON.stringify(state.capabilityCards)}`,
          );
          assert(
            state.advertisingImage?.src ===
              "/assets/content/projects/home-advertising-products-blue-grid.webp" &&
              state.advertisingImage.declaredWidth === 1086 &&
              state.advertisingImage.declaredHeight === 1448,
            `Advertising portal image contract drifted at ${locale} ${width}px: ${JSON.stringify(state.advertisingImage)}`,
          );
          assert(
            state.cards.every(
              (card) =>
                card.titleWeight === "600" &&
                card.titleFontSize > card.upperFontSize &&
                card.upperFontSize >= card.lowerFontSize &&
                card.upperWeight === card.lowerWeight &&
                Math.abs(card.upperGap - 13.6) <= 0.25 &&
                card.lowerGap > card.upperGap + 2 &&
                Math.abs(card.titleCenter - card.cardCenter) <= 1,
            ),
            `Portal hierarchy drifted at ${locale} ${width}px: ${JSON.stringify(state.cards)}`,
          );
          for (const role of ["titleFontSize", "upperFontSize", "lowerFontSize"]) {
            const sizes = state.cards.map((card) => card[role]);
            assert(
              Math.max(...sizes) - Math.min(...sizes) <= 0.01,
              `Service portal ${role} peer sizes differ at ${locale} ${width}px: ${sizes.join(", ")}`,
            );
          }
          const relativeCenters = state.cards.map(
            ({ relativeTitleCenter }) => relativeTitleCenter,
          );
          assert(
            Math.max(...relativeCenters) - Math.min(...relativeCenters) <= 1,
            `Portal relative title Y differs at ${locale} ${width}px: ${relativeCenters.join(", ")}`,
          );
          if (width >= 1024) {
            const titleCenters = state.cards.map(({ titleCenter }) => titleCenter);
            assert(
              Math.max(...titleCenters) - Math.min(...titleCenters) <= 1,
              `Desktop portal absolute title Y differs at ${locale} ${width}px: ${titleCenters.join(", ")}`,
            );
          }
          assert(
            state.horizontalOverflow <= 0,
            `Portal hierarchy introduced ${state.horizontalOverflow}px horizontal overflow`,
          );
          assertDiagnostics(diagnostics);
        },
      );
    }
  }
}

async function runDirectHeaderRouteChecks() {
  const viewport = { width: 1440, height: 900 };
  const routePairs = [
    ["/vi/", "/vi/residential/"],
    ["/vi/residential/", "/vi/commercial/"],
    ["/vi/commercial/", "/vi/advertising-products/"],
    ["/vi/advertising-products/", "/vi/residential/"],
    ["/vi/about/", "/vi/residential/"],
  ];

  for (const [source, destination] of routePairs) {
    await runPageCase(
      `header route ${routeSlug(source)} to ${routeSlug(destination)}`,
      { route: source, viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, source);
        await assertDirectRouteContracts(page);
        const link = await findRouteLink(
          page,
          "[data-site-header]",
          destination,
        );
        await clickRouteLink(page, link, destination);
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runHeaderParityChecks() {
  for (const viewport of HEADER_VIEWPORTS) {
    await runPageCase(
      `header geometry ${viewport.width}`,
      { route: "/vi/", viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, "/vi/");
        await page.waitForTimeout(2_600);
        const expanded = await page.evaluate(() => {
          const rect = (element) => {
            const value = element.getBoundingClientRect();
            return {
              bottom: value.bottom,
              height: value.height,
              left: value.left,
              right: value.right,
              top: value.top,
              width: value.width,
            };
          };
          const header = document.querySelector("[data-site-header]");
          const nav = header.querySelector("#header-menu-items");
          const navList = nav.querySelector("ul");
          const links = [...nav.querySelectorAll("a")];
          const headerStyle = getComputedStyle(header);
          const navStyle = getComputedStyle(nav);
          const listStyle = getComputedStyle(navList);
          return {
            clientWidth: document.documentElement.clientWidth,
            header: rect(header),
            padding: [
              headerStyle.paddingTop,
              headerStyle.paddingRight,
              headerStyle.paddingBottom,
              headerStyle.paddingLeft,
            ].map(Number.parseFloat),
            border: Number.parseFloat(headerStyle.borderBottomWidth),
            tracks: headerStyle.gridTemplateColumns
              .split(" ")
              .map(Number.parseFloat),
            rowTracks: headerStyle.gridTemplateRows
              .split(" ")
              .map(Number.parseFloat),
            gap: Number.parseFloat(headerStyle.columnGap),
            navDisplay: listStyle.display,
            navRows: listStyle.gridTemplateRows.split(" ").length,
            navFont: Number.parseFloat(navStyle.fontSize),
            navLine: Number.parseFloat(navStyle.lineHeight),
            labels: links.map((link) => link.textContent.trim()),
            brand: rect(header.querySelector("#header-logo")),
            lockup: rect(header.querySelector(".brand-lockup")),
            lockupPathCount: header.querySelectorAll(".brand-lockup path").length,
            lockupHasUse: Boolean(header.querySelector(".brand-lockup use")),
            nav: rect(nav),
            navHidden: nav.classList.contains("is-space-hidden"),
            navList: rect(navList),
            navListLeft: Number.parseFloat(listStyle.left),
            navListMargin: [listStyle.marginTop, listStyle.marginBottom].map(
              Number.parseFloat,
            ),
            navLinks: links.map((link) => {
              const linkStyle = getComputedStyle(link);
              return {
                ...rect(link),
                fontFamily: linkStyle.fontFamily,
                fontSize: linkStyle.fontSize,
                fontWeight: linkStyle.fontWeight,
                letterSpacing: linkStyle.letterSpacing,
                lineHeight: linkStyle.lineHeight,
              };
            }),
            firstLink: rect(links[0]),
            lastLink: rect(links.at(-1)),
            menu: rect(header.querySelector("#header-menu-toggle")),
            menuSvg: rect(header.querySelector("#header-toggle-svg")),
            stroke: Number.parseFloat(
              getComputedStyle(header.querySelector(".menu-button line")).strokeWidth,
            ),
            overflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          };
        });
        const desktop = viewport.width > 1200;
        const mobile = viewport.width <= 750;
        const expectedPadding = desktop
          ? [35, 35, 0, 35]
          : mobile
            ? [15, 15, 0, 15]
            : [25, 25, 0, 25];
        const expectedBrandTrack = expectedBrandHeaderTrackWidth(viewport.width);
        const expectedHeaderRow = desktop
          ? 67.515625
          : mobile
            ? 57.59375
            : 60.390625;
        assert(
          Math.abs(expanded.header.width - expanded.clientWidth) <= 1 &&
            Math.abs(expanded.tracks[0] - expectedBrandTrack) <= 1 &&
            Math.abs(expanded.tracks.at(-1) - 65) <= 1 &&
            expanded.rowTracks.length === 1 &&
            Math.abs(expanded.rowTracks[0] - expectedHeaderRow) <= 0.01 &&
            Math.abs(
              expanded.header.height -
                (expectedHeaderRow + expectedPadding[0] + expectedPadding[2]),
            ) <= 0.02 &&
            Math.abs(expanded.gap - (desktop ? 70 : mobile ? 15 : 25)) <= 1 &&
            Math.abs(expanded.border) <= 0.1 &&
            expanded.padding.every(
              (value, index) => Math.abs(value - expectedPadding[index]) <= 1,
            ),
          `Expanded header geometry drifted at ${viewport.width}: ${JSON.stringify(expanded)}`,
        );
        assert(
          expanded.navDisplay === (mobile ? "none" : "grid") &&
            // R2: nav sẽ wrap thì bị ẩn, để header giữ một hàng.
            (mobile || expanded.navRows === 1) &&
            Math.abs(expanded.navFont - 16) <= 0.1 &&
            Math.abs(expanded.navLine - 22.4) <= 0.2 &&
            JSON.stringify(expanded.labels) ===
              JSON.stringify([
                "Không gian Nhà ở",
                "Không gian Kinh doanh",
                "Sản phẩm Quảng cáo",
              ]) &&
            expanded.lockupPathCount === 4 &&
            !expanded.lockupHasUse,
          `Header navigation contract drifted at ${viewport.width}: ${JSON.stringify(expanded)}`,
        );
        const rhythm = {
          751: { header: 85.391, nav: 60.391 },
          960: { header: 85.391, nav: 60.391 },
          1201: { header: 102.516, nav: 60.391 },
          1440: { header: 102.516, nav: 60.391 },
        }[viewport.width];
        if (rhythm) {
          assert(
            Math.abs(expanded.header.height - rhythm.header) <= 0.25 &&
              Math.abs(expanded.nav.height - rhythm.nav) <= 1 &&
              expanded.navListMargin.every((value) => Math.abs(value - 16) <= 0.1) &&
              Math.abs(
                expanded.navListLeft -
                  (viewport.width > 1200 ? expanded.nav.width * -0.1 : 0),
              ) <= 1,
            `Header vertical or x rhythm drifted at ${viewport.width}: ${JSON.stringify(expanded)}`,
          );
        }
        const expectedBrandWidth = expectedBrandHeaderWidth(viewport.width);
        const expectedBrandHeight = expectedBrandHeaderHeight(viewport.width);
        // Logo bám mép trên vùng padding, cùng khoảng với mép trái.
        const expectedBrandX = desktop ? 35 : mobile ? 15 : 25;
        const expectedBrandY = expectedBrandX;
        // Nav ẩn theo R2 (is-space-hidden) thì chỉ còn logo và nút menu.
        const navShown = !mobile && !expanded.navHidden;
        const brandClearance = navShown
          ? expanded.firstLink.left - expanded.brand.right
          : expanded.menuSvg.left - expanded.brand.right;
        const menuClearance = navShown
          ? expanded.menuSvg.left - expanded.lastLink.right
          : Infinity;
        assert(
          Math.abs(expanded.brand.left - expectedBrandX) <= 0.1 &&
            Math.abs(expanded.brand.top - expectedBrandY) <= 0.1 &&
            Math.abs(expanded.brand.width - expectedBrandWidth) <= 0.1 &&
            Math.abs(expanded.brand.height - expectedBrandHeight) <= 0.1 &&
            Math.abs(expanded.lockup.width - expectedBrandWidth) <= 0.1 &&
            Math.abs(expanded.lockup.height - expectedBrandHeight) <= 0.1 &&
            Math.abs(expanded.menuSvg.width - 35) <= 0.1 &&
            Math.abs(expanded.menuSvg.height - 19) <= 0.1 &&
            Math.abs(expanded.stroke - 3) <= 0.1 &&
            brandClearance >= 10 &&
            menuClearance >= 24 &&
            expanded.overflow <= 1,
          `Header controls overlap or overflow at ${viewport.width}: ${JSON.stringify(expanded)}`,
        );

        await page.mouse.move(viewport.width / 2, viewport.height - 80);
        await wheelUntilCollapsed(page);
        await page.waitForTimeout(1_500);
        const collapsed = await page.evaluate(() => {
          const header = document.querySelector("[data-site-header]");
          const style = getComputedStyle(header);
          const lockup = header
            .querySelector(".brand-lockup")
            .getBoundingClientRect();
          const navLinks = [
            ...header.querySelectorAll("#header-menu-items > ul > li > a"),
          ].map((link) => {
            const rect = link.getBoundingClientRect();
            const linkStyle = getComputedStyle(link);
            return {
              left: rect.left,
              width: rect.width,
              fontFamily: linkStyle.fontFamily,
              fontSize: linkStyle.fontSize,
              fontWeight: linkStyle.fontWeight,
              letterSpacing: linkStyle.letterSpacing,
              lineHeight: linkStyle.lineHeight,
            };
          });
          return {
            classes: header.className,
            height: header.getBoundingClientRect().height,
            lockup: [lockup.width, lockup.height],
            navLinks,
            padding: [
              style.paddingTop,
              style.paddingRight,
              style.paddingBottom,
              style.paddingLeft,
            ].map(Number.parseFloat),
            background: style.backgroundColor,
            border: Number.parseFloat(style.borderBottomWidth),
            overflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          };
        });
        const collapsedSide = desktop ? 35 : mobile ? 15 : 25;
        const collapsedHeaderHeight = mobile
          ? 70.640625
          : 81.390625;
        assert(
          collapsed.classes.includes("is-collapsed") &&
            Math.abs(collapsed.height - collapsedHeaderHeight) <= 0.02 &&
            Math.abs(collapsed.lockup[0] - expectedBrandHeaderWidth(viewport.width, true)) <= 0.1 &&
            Math.abs(collapsed.lockup[1] - 49.641) <= 0.1 &&
            collapsed.padding.every(
              (value, index) =>
                Math.abs(value - ([10, collapsedSide, 10, collapsedSide][index])) <=
                1,
            ) &&
            collapsed.background === "rgb(255, 255, 255)" &&
            Math.abs(collapsed.border - 1) <= 0.1 &&
            collapsed.overflow <= 1,
          `Collapsed header geometry drifted at ${viewport.width}: ${JSON.stringify(collapsed)}`,
        );
        if (!mobile) {
          assert(
            collapsed.navLinks.length === expanded.navLinks.length &&
              collapsed.navLinks.every((link, index) => {
                const before = expanded.navLinks[index];
                return (
                  Math.abs(link.left - before.left) <= 1 &&
                  Math.abs(link.width - before.width) <= 1 &&
                  link.fontFamily === before.fontFamily &&
                  link.fontSize === before.fontSize &&
                  link.fontWeight === before.fontWeight &&
                  link.letterSpacing === before.letterSpacing &&
                  link.lineHeight === before.lineHeight
                );
              }),
            `Header links shifted or changed typography between expanded and sticky states at ${viewport.width}: ${JSON.stringify({ expanded: expanded.navLinks, collapsed: collapsed.navLinks })}`,
          );
        }
        assertDiagnostics(diagnostics);
      },
    );
  }

  await runPageCase(
    "header direct intro and soft-navigation persistence",
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      await page.addInitScript(() => {
        window.__ttHeaderIntroWrites = [];
        const startedAt = performance.now();
        document.addEventListener("readystatechange", () => {
          if (document.readyState !== "interactive") return;
          const targets = [
            ["logo", document.querySelector("#header-logo")],
            ...[
              ...document.querySelectorAll("#header-menu-items > ul > li"),
            ].map((element, index) => [`nav-${index}`, element]),
            ["toggle", document.querySelector("#header-toggle-svg")],
          ];
          targets.forEach(([target, element]) => {
            const style = element.style;
            Object.defineProperty(style, "transform", {
              configurable: true,
              get() {
                return CSSStyleDeclaration.prototype.getPropertyValue.call(
                  style,
                  "transform",
                );
              },
              set(value) {
                window.__ttHeaderIntroWrites.push({
                  target,
                  time: performance.now() - startedAt,
                  // Giờ tick GSAP: timeline neo play vào tick trước nên long task giữa hai tick làm giờ thật lệch
                  // còn giờ tick thì không.
                  tick: (window.gsap?.ticker.time ?? Number.NaN) * 1_000,
                  value,
                });
                CSSStyleDeclaration.prototype.setProperty.call(
                  style,
                  "transform",
                  value,
                );
              },
            });
          });
        });
      });
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await page.waitForTimeout(3_300);
      const intro = await page.evaluate(() => ({
        final: {
          logo: new DOMMatrixReadOnly(
            getComputedStyle(document.querySelector("#header-logo")).transform,
          ).a,
          nav: [...document.querySelectorAll("#header-menu-items > ul > li")].map(
            (element) =>
              new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
          ),
          toggle: new DOMMatrixReadOnly(
            getComputedStyle(document.querySelector("#header-toggle-svg")).transform,
          ).a,
        },
        writes: window.__ttHeaderIntroWrites || [],
      }));
      const setup = intro.writes.find(
        (write) => write.target === "logo" && /^scale\(0(?:, 0)?\)/.test(write.value),
      );
      const navSetup = intro.writes.filter(
        (write) => /^nav-\d$/.test(write.target) && /-150(?:\.0+)?px/.test(write.value),
      );
      const toggleSetup = intro.writes.find(
        (write) => write.target === "toggle" && /^scale\(0(?:, 1)?\)/.test(write.value),
      );
      assert(
        setup && new Set(navSetup.map((write) => write.target)).size === 3 && toggleSetup,
        "Direct header intro never exposed its audited start state",
      );
      const afterSetup = intro.writes.filter((write) => write.time >= setup.time);
      const logoStart = afterSetup.find(
        (write) => write.target === "logo" && !/^scale\(0(?:, 0)?\)/.test(write.value),
      )?.tick - setup.tick;
      const navStart = afterSetup.find(
        (write) =>
          write.target === "nav-0" && !/-150(?:\.0+)?px/.test(write.value),
      )?.tick - setup.tick;
      const toggleStart = afterSetup.find(
        (write) => write.target === "toggle" && !/^scale\(0(?:, 1)?\)/.test(write.value),
      )?.tick - setup.tick;
      // Intro: nav tại 0.3s, hamburger tại 1.5s (motion.md). Lần ghi đầu của mỗi phần lệch theo frame (long task lúc
      // mount, GSAP lấy giờ tick trước làm mốc play), đo được tới khoảng 150ms trên runner bận, nên khoảng nav tới
      // hamburger (1.2s) cho dung sai 200ms, logo tới nav cho lỏng.
      assert(
        logoStart <= 160 &&
          navStart - logoStart >= 150 &&
          navStart - logoStart <= 380 &&
          toggleStart - navStart >= 1_000 &&
          toggleStart - navStart <= 1_400 &&
          intro.final.logo >= 0.999 &&
          intro.final.nav.every((value) => Math.abs(value) <= 0.1) &&
          intro.final.toggle >= 0.999,
        `Direct header intro timing drifted: ${JSON.stringify({ logoStart, navStart, toggleStart })}`,
      );

      const header = await page.locator("[data-site-header]").elementHandle();
      await page.evaluate(() => {
        window.__ttSoftHeaderFrames = [];
        const startedAt = performance.now();
        const matrix = (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform);
        const sample = () => {
          const logo = document.querySelector("#header-logo");
          const items = [...document.querySelectorAll("#header-menu-items > ul > li")];
          const toggle = document.querySelector("#header-toggle-svg");
          window.__ttSoftHeaderFrames.push({
            logo: matrix(logo).a,
            nav: items.map((item) => matrix(item).m42),
            toggle: matrix(toggle).a,
          });
          if (performance.now() - startedAt < 2_400) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      const link = await findRouteLink(
        page,
        "[data-site-header]",
        "/vi/residential/",
      );
      await clickRouteLink(page, link, "/vi/residential/");
      await page.waitForTimeout(500);
      assert(
        await header.evaluate(
          (element) => element === document.querySelector("[data-site-header]"),
        ),
        "Soft navigation replaced the persistent header",
      );
      const softFrames = await page.evaluate(() => window.__ttSoftHeaderFrames || []);
      assert(
        softFrames.length > 0 &&
          softFrames.every(
            (frame) =>
              Math.abs(frame.logo - 1) <= 0.001 &&
              frame.nav.every((value) => Math.abs(value) <= 0.1) &&
              Math.abs(frame.toggle - 1) <= 0.001,
          ),
        "Header intro replayed during soft navigation",
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "header synchronized tone tween",
    { route: "/vi/", viewport: { width: 768, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await page.waitForTimeout(2_600);
      const trace = await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = "auto";
        const header = document.querySelector("[data-site-header]");
        const read = () => [
          getComputedStyle(header.querySelector(".brand-lockup")).fill,
          getComputedStyle(header.querySelector("#header-logo")).color,
          getComputedStyle(header.querySelector(".desktop-nav a")).color,
          getComputedStyle(header.querySelector(".menu-button line")).stroke,
        ];
        const frames = [];
        const startedAt = performance.now();
        scrollTo(0, 101);
        await new Promise((resolve) => {
          const sample = () => {
            frames.push({ time: performance.now() - startedAt, values: read() });
            if (performance.now() - startedAt < 520) requestAnimationFrame(sample);
            else resolve();
          };
          requestAnimationFrame(sample);
        });
        return frames;
      });
      const changed = trace[0].values.map((_, index) =>
        trace.findIndex(
          (frame) => frame.values[index] !== "rgb(255, 255, 255)",
        ),
      );
      const firstChanged = Math.min(...changed);
      const settled = trace.findIndex(
        (frame) =>
          frame.values.every((value) => value === "rgb(47, 47, 47)"),
      );
      assert(
        firstChanged >= 0 &&
          Math.max(...changed) - firstChanged <= 1 &&
          settled > firstChanged &&
          trace[settled].time - trace[firstChanged].time <= 380,
        `Header tone tween drifted: ${JSON.stringify({ changed, settled })}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "header scroll direction pointer and interaction motion",
    // 961 tới 980px: nav còn hiện (dưới 961px nav ẩn theo R2) và cuộn native (Locomotive từ 981px).
    { route: "/vi/residential/", viewport: { width: 970, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/residential/");
      await page.waitForTimeout(2_600);
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        scrollTo(0, 100);
      });
      await page.waitForTimeout(80);
      assert(
        !(await page.locator("[data-site-header]").evaluate((element) =>
          element.classList.contains("is-collapsed"),
        )),
        "Header collapsed at the 100px boundary",
      );
      await page.evaluate(() => scrollTo(0, 101));
      await page.waitForTimeout(80);
      assert(
        await page.locator("[data-site-header]").evaluate((element) =>
          element.classList.contains("is-collapsed"),
        ),
        "Header did not collapse above 100px",
      );
      await page.evaluate(() => scrollTo(0, 0));
      await page.mouse.move(100, 700);
      for (let index = 0; index < 8; index += 1) {
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(70);
      }
      await page.waitForTimeout(1_050);
      const hidden = await page.locator("[data-site-header]").evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          classes: element.className,
          height: element.getBoundingClientRect().height,
          top: element.getBoundingClientRect().top,
          duration: style.transitionDuration,
          timing: style.transitionTimingFunction,
        };
      });
      assert(
        hidden.classes.includes("is-hidden") &&
          Math.abs(hidden.top + hidden.height) <= 1 &&
          hidden.duration.includes("1s") &&
          hidden.timing.includes("cubic-bezier(0, 0, 0.1, 0.99)"),
        `Header did not hide with the audited transform: ${JSON.stringify(hidden)}`,
      );
      await page.locator("[data-site-header]").dispatchEvent("pointermove", {
        pointerType: "touch",
        screenY: 100,
      });
      assert(
        !(await page.locator("[data-site-header]").evaluate((element) =>
          element.classList.contains("forceShow"),
        )),
        "A touch pointer unexpectedly triggered the mouse-only force-show region",
      );
      await page.mouse.move(100, 100);
      await page.waitForTimeout(1_050);
      assert(
        await page.locator("[data-site-header]").evaluate(
          (element) =>
            element.classList.contains("forceShow") &&
            Math.abs(element.getBoundingClientRect().top) <= 1,
        ),
        "A real top-region PointerEvent did not force-show the header",
      );
      await page.mouse.move(100, 700);
      await page.waitForTimeout(1_050);
      assert(
        await page.locator("[data-site-header]").evaluate(
          (element) =>
            !element.classList.contains("forceShow") &&
            element.getBoundingClientRect().top < -80,
        ),
        "Leaving the pointer force-show region did not restore the hidden state",
      );
      for (let index = 0; index < 3; index += 1) {
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(70);
      }
      await page.waitForTimeout(1_050);
      assert(
        await page.locator("[data-site-header]").evaluate(
          (element) =>
            !element.classList.contains("is-hidden") &&
            Math.abs(element.getBoundingClientRect().top) <= 1,
        ),
        "A 150px upward direction change did not show the header",
      );

      const activeLink = page.locator('.desktop-nav a[aria-current="page"]');
      const hoverLink = page.locator(".desktop-nav a").nth(1);
      const underline = await activeLink.evaluate((element) => {
        const style = getComputedStyle(element, "::after");
        return {
          bottom: style.bottom,
          height: style.height,
          transform: new DOMMatrixReadOnly(style.transform).a,
        };
      });
      assert(
        underline.height === "3px" &&
          underline.bottom === "-4px" &&
          Math.abs(underline.transform - 1) <= 0.01,
        `Selected underline geometry drifted: ${JSON.stringify(underline)}`,
      );
      await hoverLink.hover();
      await page.waitForTimeout(350);
      const hoverScale = await hoverLink.evaluate(
        (element) => new DOMMatrixReadOnly(getComputedStyle(element, "::after").transform).a,
      );
      assert(Math.abs(hoverScale - 1) <= 0.01, "Nav underline did not reveal on hover");
      await page.locator("#header-menu-toggle").hover();
      await page.waitForTimeout(350);
      const lines = await page.locator("#header-toggle-svg line").evaluateAll((elements) =>
        elements.map(
          (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
        ),
      );
      assert(
        Math.abs(lines[0] - 0.5) <= 0.01 &&
          Math.abs(lines[1] - 2) <= 0.01 &&
          Math.abs(lines[2] - 0.5) <= 0.01,
        `Hamburger hover geometry drifted: ${JSON.stringify(lines)}`,
      );

      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        window.TruongThinhMotion.setLogicalScroll(600);
      });
      await page.mouse.move(100, 100);
      await page.waitForTimeout(1_050);
      const initial = await page.evaluate(() => {
        window.__ttSelectedHeader = document.querySelector("[data-site-header]");
        return {
          historyLength: history.length,
          logicalScroll: window.TruongThinhMotion.getLogicalScroll(),
          timeOrigin: performance.timeOrigin,
          url: window.location.href,
        };
      });
      const assertReturnedTop = async (input) => {
        const state = await page.evaluate(() => ({
          headerIdentity:
            window.__ttSelectedHeader === document.querySelector("[data-site-header]"),
          historyLength: history.length,
          logicalScroll: window.TruongThinhMotion.getLogicalScroll(),
          timeOrigin: performance.timeOrigin,
          url: window.location.href,
        }));
        assert(
            state.headerIdentity &&
              state.historyLength === initial.historyLength &&
              Math.abs(state.logicalScroll) <= 0.5 &&
              state.timeOrigin === initial.timeOrigin &&
              state.url === initial.url,
          `Selected nav ${input} did not return the current parent to top: ${JSON.stringify({ initial, state })}`,
        );
      };

      const box = await activeLink.boundingBox();
      assert(box, "Selected desktop link has no pointer geometry");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
      await assertReturnedTop("pointer click");
      assert(
        (await activeLink.evaluate((element) => getComputedStyle(element).pointerEvents)) !==
          "none",
        "Selected desktop link blocks pointer events",
      );

      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(600));
      await activeLink.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      await assertReturnedTop("keyboard Enter");
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "touch input cannot force-show the hidden header",
    {
      route: "/vi/residential/",
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/residential/");
      await page.waitForTimeout(2_600);
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        scrollTo(0, 500);
      });
      await page.waitForTimeout(80);
      await page.evaluate(() => scrollTo(0, 700));
      await page.waitForTimeout(1_050);
      // Điện thoại: header khuất bằng transform đi theo cuộn (phone-header-scroll R2), không dùng is-hidden.
      const headerHidden = (element) => element.getBoundingClientRect().bottom <= 0;
      assert(
        await page.locator("[data-site-header]").evaluate(headerHidden),
        "Touch-only context could not establish the hidden header state",
      );
      await page.touchscreen.tap(100, 100);
      await page.evaluate(() =>
        document.dispatchEvent(
          new MouseEvent("mousemove", { bubbles: true, screenY: 100 }),
        ),
      );
      await page.waitForTimeout(120);
      assert(
        await page.locator("[data-site-header]").evaluate(
          (element) =>
            !element.classList.contains("forceShow") &&
            element.getBoundingClientRect().bottom <= 0,
        ),
        "Touch-only context triggered the mouse-only force-show region",
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runPersistentBarbaNavigationChecks() {
  const viewport = { width: 1440, height: 900 };
  await runPageCase(
    "persistent Barba header and page lifecycle",
    { route: "/vi/", viewport },
    async (page) => {
      await page.addInitScript(() => {
        window.__ttLocomotiveActive = 0;
        window.__ttLocomotiveMax = 0;
        Object.defineProperty(window, "LocomotiveScroll", {
          configurable: true,
          set(Base) {
            class TrackedLocomotiveScroll extends Base {
              constructor(...args) {
                super(...args);
                this.__ttTrackedAlive = true;
                window.__ttLocomotiveActive += 1;
                window.__ttLocomotiveMax = Math.max(
                  window.__ttLocomotiveMax,
                  window.__ttLocomotiveActive,
                );
              }

              destroy() {
                if (this.__ttTrackedAlive) {
                  this.__ttTrackedAlive = false;
                  window.__ttLocomotiveActive -= 1;
                }
                return super.destroy();
              }
            }
            Object.defineProperty(window, "LocomotiveScroll", {
              configurable: true,
              writable: true,
              value: TrackedLocomotiveScroll,
            });
          },
        });
      });
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      const header = await page.locator("[data-site-header]").elementHandle();
      assert(header, "Persistent header is missing");

      await page.evaluate(() => {
        window.__ttRouteTrace = [];
        const startedAt = performance.now();
        const timer = window.setInterval(() => {
          const veil = document.querySelector(".route-veil");
          const transitioning = document.body.classList.contains(
            "is-transitioning",
          );
          window.__ttRouteTrace.push({
            time: performance.now() - startedAt,
            opacity: Number.parseFloat(getComputedStyle(veil).opacity),
            transitioning,
          });
          if (
            window.__ttRouteTrace.some((sample) => sample.transitioning) &&
            !transitioning &&
            Number.parseFloat(getComputedStyle(veil).opacity) <= 0.001
          ) {
            window.clearInterval(timer);
          }
        }, 16);
      });

      for (const destination of [
        "/vi/residential/",
        "/vi/commercial/",
        "/vi/advertising-products/",
        "/vi/residential/",
      ]) {
        await page.evaluate(() => {
          window.__ttOutgoingContainer = document.querySelector(
            '[data-barba="container"]',
          );
          window.__ttContainerTrace = [];
          window.__ttHeaderTrace = [];
          const header = document.querySelector("[data-site-header]");
          header.style.transitionDuration = "0s";
          header.classList.add("is-hidden");
          void header.offsetHeight;
          header.style.removeProperty("transition-duration");
          document.addEventListener(
            "click",
            (event) => {
              window.__ttClickTrace = {
                defaultPrevented: event.defaultPrevented,
                href: event.target.closest("a[href]")?.href || "",
              };
              const startedAt = performance.now();
              const sample = () => {
                const veil = document.querySelector(".route-veil");
                const rect = header.getBoundingClientRect();
                const style = getComputedStyle(header);
                const channel = (value) =>
                  Number.parseFloat(value.match(/[\d.]+/)?.[0] || "NaN");
                const tone = [
                  getComputedStyle(header.querySelector(".brand-lockup")).fill,
                  getComputedStyle(header.querySelector("#header-logo")).color,
                  getComputedStyle(header.querySelector(".desktop-nav a")).color,
                  getComputedStyle(header.querySelector(".menu-button line")).stroke,
                ].map(channel);
                window.__ttHeaderTrace.push({
                  time: performance.now() - startedAt,
                  veilOpacity: Number.parseFloat(getComputedStyle(veil).opacity),
                  ink: header.classList.contains("is-ink"),
                  tone,
                  top: rect.top,
                  bottom: rect.bottom,
                  display: style.display,
                  opacity: Number.parseFloat(style.opacity),
                  visibility: style.visibility,
                });
              };
              sample();
              const timer = window.setInterval(() => {
                sample();
                if (
                  window.__ttHeaderTrace.some(
                    (entry) => entry.veilOpacity >= 0.99,
                  ) &&
                  !document.body.classList.contains("is-transitioning") &&
                  Number.parseFloat(
                    getComputedStyle(document.querySelector(".route-veil")).opacity,
                  ) <= 0.001
                ) {
                  window.clearInterval(timer);
                }
              }, 8);
            },
            { once: true },
          );
          const startedAt = performance.now();
          const timer = window.setInterval(() => {
            const veilOpacity = Number.parseFloat(
              getComputedStyle(document.querySelector(".route-veil")).opacity,
            );
            const containers = [
              ...document.querySelectorAll('[data-barba="container"]'),
            ];
            const outgoing = window.__ttOutgoingContainer;
            const visibleContainers = containers.filter((container) => {
              const style = getComputedStyle(container);
              const rect = container.getBoundingClientRect();
              return (
                !container.hidden &&
                style.display !== "none" &&
                Number.parseFloat(style.opacity) > 0.99 &&
                rect.bottom > 0 &&
                rect.top < window.innerHeight
              );
            }).length;
            window.__ttContainerTrace.push({
              time: performance.now() - startedAt,
              veilOpacity,
              transitioning: document.body.classList.contains("is-transitioning"),
              outgoingHidden: Boolean(outgoing?.hidden),
              visibleContainers,
            });
            if (
              window.__ttContainerTrace.some((sample) => sample.transitioning) &&
              !document.body.classList.contains("is-transitioning") &&
              veilOpacity <= 0.001
            ) {
              window.clearInterval(timer);
            }
          }, 8);
        });
        const link = await findRouteLink(
          page,
          "[data-site-header]",
          destination,
        );
        await Promise.all([
          waitForPath(page, destination),
          link.evaluate((element) => element.click()),
        ]);
        assert(
          await header.evaluate(
            (element) => element === document.querySelector("[data-site-header]"),
          ),
          `Header identity changed while entering ${destination}`,
        );
        const state = await page.evaluate(() => ({
          timeOrigin: performance.timeOrigin,
          containers: document.querySelectorAll('[data-barba="container"]').length,
          activeScroll: window.__ttLocomotiveActive,
          maxScroll: window.__ttLocomotiveMax,
          container: (() => {
            const element = document.querySelector('[data-barba="container"]');
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
              opacity: Number.parseFloat(style.opacity),
              pointerEvents: style.pointerEvents,
              intersectsViewport:
                rect.bottom > 0 && rect.top < window.innerHeight,
            };
          })(),
          veilOpacity: Number.parseFloat(
            getComputedStyle(document.querySelector(".route-veil")).opacity,
          ),
          headerTrace: window.__ttHeaderTrace || [],
          trace: window.__ttContainerTrace || [],
        }));
        assert(state.timeOrigin === timeOrigin, "Soft navigation replaced the document");
        assert(state.containers === 1, `Found ${state.containers} Barba containers`);
        assert(
          state.activeScroll === 1 && state.maxScroll === 1,
          `Locomotive instances active/max: ${state.activeScroll}/${state.maxScroll}`,
        );
        assert(
          state.container.opacity === 1 &&
            state.container.pointerEvents !== "none" &&
            state.container.intersectsViewport &&
            state.veilOpacity <= 0.001,
          `Settled ${destination} container is not visible and interactive`,
        );
        assert(
          state.headerTrace.length > 0 &&
            state.headerTrace.every(
              (sample) =>
                sample.bottom > 0 &&
                sample.top < viewport.height &&
                sample.display !== "none" &&
                sample.visibility === "visible" &&
                sample.opacity >= 0.99,
            ),
          `Header left the viewport while entering ${destination}: ${JSON.stringify(state.headerTrace.slice(0, 4))}`,
        );
        const coverIndex = state.headerTrace.findIndex(
          (sample) => sample.veilOpacity >= 0.99,
        );
        const startsLight = state.headerTrace[0]?.tone.some((value) => value > 80);
        const partialIndex = state.headerTrace.findIndex(
          (sample, index) =>
            index < coverIndex &&
            sample.tone.every((value) => value > 48 && value < 254),
        );
        const settledIndex = state.headerTrace.findIndex(
          (sample) => sample.tone.every((value) => Math.abs(value - 47) <= 1),
        );
        const monotonicCover = state.headerTrace
          .slice(0, coverIndex + 1)
          .every(
            (sample, index, samples) =>
              index === 0 ||
              sample.tone.every(
                (value, toneIndex) => value <= samples[index - 1].tone[toneIndex] + 2,
              ),
          );
        assert(
          coverIndex >= 0 &&
            state.headerTrace
              .slice(0, coverIndex + 1)
              .every((sample) => sample.ink) &&
            (!startsLight ||
              (state.headerTrace[0].tone.some(
                (value) => Math.abs(value - 47) > 1,
              ) &&
                partialIndex >= 0 &&
                settledIndex > partialIndex &&
                settledIndex <= coverIndex &&
                monotonicCover)),
          `Header route tone did not tween monotonically and settle before reveal for ${destination}: ${JSON.stringify(
            { coverIndex, monotonicCover, partialIndex, settledIndex, trace: state.headerTrace.slice(0, 12) },
          )}`,
        );
        const firstHidden = state.trace.find((sample) => sample.outgoingHidden);
        assert(
          firstHidden?.veilOpacity >= 0.99,
          `Outgoing ${destination} container left flow before the veil covered it`,
        );
        assert(
          state.trace.every(
            (sample) =>
              sample.veilOpacity >= 0.99 || sample.visibleContainers === 1,
          ),
          `${destination} exposed a blank or duplicate-content frame`,
        );
      }

      // About là native document load (shell R6), nên đọc soft-route trace trước.
      const trace = await page.evaluate(() => window.__ttRouteTrace || []);
      await openMenu(page);
      const aboutLink = await findRouteLink(page, "#site-menu", "/vi/about/");
      await clickRouteLink(page, aboutLink, "/vi/about/");
      const aboutState = await page.evaluate(() => ({
        minHeight: Number.parseFloat(
          getComputedStyle(document.querySelector(".about-hero")).minHeight,
        ),
        containers: document.querySelectorAll('[data-barba="container"]').length,
      }));
      assert(aboutState.minHeight > 600, "About styles disappeared after soft entry");
      assert(aboutState.containers === 1, "About entry left duplicate containers");

      const coveredIndex = trace.findIndex((sample) => sample.opacity >= 0.99);
      const transitionIndex = trace.findIndex((sample) => sample.transitioning);
      const revealStartedIndex = trace.findIndex(
        (sample, index) => index > coveredIndex && sample.opacity < 0.99,
      );
      const finishedIndex = trace.findIndex(
        (sample, index) =>
          index > revealStartedIndex &&
          !sample.transitioning &&
          sample.opacity <= 0.001,
      );
      assert(
        transitionIndex >= 0 &&
          coveredIndex > transitionIndex &&
          revealStartedIndex > coveredIndex &&
          finishedIndex > revealStartedIndex,
        `Route trace did not record cover → swap → reveal: ${JSON.stringify({ transitionIndex, coveredIndex, revealStartedIndex, finishedIndex, head: trace.slice(0, 6), length: trace.length })}`,
      );
      const coverMs = trace[coveredIndex].time - trace[transitionIndex].time;
      const revealMs =
        trace[finishedIndex].time - trace[revealStartedIndex].time;
      // Cover 0.75s power4.inOut (motion.md) đạt opacity 0.99 ở khoảng 0.62s; is-transitioning gắn sau khi tween
      // đã chạy vài frame nên đo được ngắn hơn.
      assert(
        coverMs >= 450 && coverMs <= 1_000,
        `Route cover took ${coverMs.toFixed(0)}ms`,
      );
      assert(
        revealMs >= 650 && revealMs <= 1_250,
        `Route reveal took ${revealMs.toFixed(0)}ms`,
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runEspacioRouteLogoTimingChecks() {
  const viewport = { width: 1440, height: 900 };
  await runPageCase(
    "Espacio route logo destination timing",
    { route: "/vi/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await page.evaluate(() => {
        window.__ttEspacioRouteTrace = [];
        const channel = (value) =>
          Number.parseFloat(value.match(/[\d.]+/)?.[0] || "NaN");
        const startedAt = performance.now();
        const timer = window.setInterval(() => {
          const header = document.querySelector("[data-site-header]");
          const veil = document.querySelector(".route-veil");
          const container = document.querySelector(
            '[data-barba="container"]:not([hidden])',
          );
          const sample = {
            time: performance.now() - startedAt,
            namespace: container?.dataset.barbaNamespace || "",
            transitioning: document.body.classList.contains("is-transitioning"),
            veil: Number.parseFloat(getComputedStyle(veil).opacity),
            logo: channel(getComputedStyle(header.querySelector("#header-logo")).color),
            brandColor: header.classList.contains("is-brand-color"),
          };
          window.__ttEspacioRouteTrace.push(sample);
          if (
            sample.namespace === "residential" &&
            !sample.transitioning &&
            sample.veil <= 0.001
          ) {
            window.clearInterval(timer);
          }
        }, 8);
      });
      const residentialLink = await findRouteLink(
        page,
        "[data-site-header]",
        "/vi/residential/",
      );
      await clickRouteLink(page, residentialLink, "/vi/residential/");
      const ordinaryTrace = await page.evaluate(
        () => window.__ttEspacioRouteTrace || [],
      );
      const destinationIndex = ordinaryTrace.findIndex(
        (sample) => sample.namespace === "residential",
      );
      const destinationToneUnderCover = ordinaryTrace.findIndex(
        (sample, index) =>
          index >= destinationIndex && sample.veil >= 0.99 && sample.logo > 80,
      );
      assert(
        destinationIndex >= 0 && destinationToneUnderCover >= destinationIndex,
        `Residential destination tone did not start while the route veil was opaque: ${JSON.stringify(
          ordinaryTrace.slice(Math.max(0, destinationIndex - 2), destinationIndex + 18),
        )}`,
      );
      // logo-route-crossfade R2: tới Residential (hero ảnh) mark đậm dưới veil rồi sang trắng, không qua CMYK.
      assert(
        !ordinaryTrace.some(
          (sample) => sample.transitioning && sample.brandColor,
        ),
        "Residential route painted the CMYK mark during the transition",
      );

      await page.evaluate(() => {
        window.__ttEspacioAdvertisingTrace = [];
        const rgb = (value) =>
          (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const startedAt = performance.now();
        const timer = window.setInterval(() => {
          const header = document.querySelector("[data-site-header]");
          const veil = document.querySelector(".route-veil");
          const container = document.querySelector(
            '[data-barba="container"]:not([hidden])',
          );
          const sample = {
            time: performance.now() - startedAt,
            namespace: container?.dataset.barbaNamespace || "",
            transitioning: document.body.classList.contains("is-transitioning"),
            veil: Number.parseFloat(getComputedStyle(veil).opacity),
            colorState: header.classList.contains("is-brand-color"),
            fills: [...header.querySelectorAll(".brand-lockup__mark path")].map(
              (path) => rgb(getComputedStyle(path).fill),
            ),
            wordmark: rgb(
              getComputedStyle(header.querySelector(".brand-lockup__title")).fill,
            ),
          };
          window.__ttEspacioAdvertisingTrace.push(sample);
          if (
            sample.namespace === "advertising-products" &&
            !sample.transitioning &&
            sample.veil <= 0.001
          ) {
            window.clearInterval(timer);
          }
        }, 8);
      });
      const advertisingLink = await findRouteLink(
        page,
        "[data-site-header]",
        "/vi/advertising-products/",
      );
      await clickRouteLink(page, advertisingLink, "/vi/advertising-products/");
      const advertisingTrace = await page.evaluate(
        () => window.__ttEspacioAdvertisingTrace || [],
      );
      const advertisingStart = advertisingTrace.findIndex(
        (sample) => sample.namespace === "advertising-products",
      );
      const startsBlack = advertisingTrace.findIndex(
        (sample, index) =>
          index >= advertisingStart &&
          sample.fills.length === 4 &&
          sample.fills.every((fill) =>
            fill.every((channel) => channel >= 30 && channel <= 70),
          ),
      );
      const endsCmyk = advertisingTrace.findIndex(
        (sample, index) =>
          index >= startsBlack &&
          sample.colorState &&
          sample.fills[1]?.[0] >= 245 &&
          sample.fills[1]?.[1] >= 225 &&
          sample.fills[2]?.[0] >= 220 &&
          sample.fills[2]?.[2] >= 100 &&
          sample.fills[3]?.[1] >= 145 &&
          sample.fills[3]?.[2] >= 210,
      );
      // Tween bắt đầu lúc veil mở, tức mẫu đen cuối trước khi đủ CMYK; mẫu đen đầu tiên còn tính cả lúc chờ veil,
      // runner bận làm khoảng chờ đó dài ra.
      const tweenStart = advertisingTrace.findLastIndex(
        (sample, index) =>
          index < endsCmyk &&
          sample.fills.length === 4 &&
          sample.fills.every((fill) => fill.every((channel) => channel >= 30 && channel <= 70)),
      );
      const colorDuration =
        startsBlack >= 0 && endsCmyk >= 0
          ? advertisingTrace[endsCmyk].time - advertisingTrace[tweenStart].time
          : Number.NaN;
      assert(
        advertisingStart >= 0 && startsBlack >= advertisingStart,
        `Advertising mark did not begin monochrome black: ${JSON.stringify(
          advertisingTrace.slice(Math.max(0, advertisingStart - 2), advertisingStart + 12),
        )}`,
      );
      // logo-route-crossfade R2, R3: lúc veil mở, từng dải tween từ đậm sang CMYK trong 0.3s expo.out (GSAP, không transition CSS).
      assert(
        endsCmyk > startsBlack && colorDuration <= 450,
        `Advertising mark did not complete black-to-CMYK in 0.3s: ${JSON.stringify({
          colorDuration,
          startsBlack,
          endsCmyk,
        })}`,
      );
      assert(
        advertisingTrace
          .slice(advertisingStart)
          .every((sample) =>
            sample.wordmark.every((channel) => channel >= 25 && channel <= 80),
          ),
        "Advertising entry recolored the wordmark instead of the mark only",
      );
      assertDiagnostics(diagnostics);
    },
  );

  let delayedHeroReleased = false;
  await runPageCase(
    "Espacio route reveal does not wait for destination media",
    { route: "/vi/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      // Ảnh tải theo biến thể srcset AVIF/WebP (media-delivery R3).
      await page.route(/residential-detail-x1(?:-(?:480|960))?\.(?:avif|webp)$/, async (requestRoute) => {
        await new Promise((resolve) => setTimeout(resolve, 1_800));
        delayedHeroReleased = true;
        await requestRoute.continue();
      });
      const link = await findRouteLink(
        page,
        "[data-site-header]",
        "/vi/residential/",
      );
      await clickRouteLink(page, link, "/vi/residential/");
      await page.waitForFunction(
        () => {
          const veil = document.querySelector(".route-veil");
          const container = document.querySelector(
            '[data-barba="container"][data-barba-namespace="residential"]',
          );
          return (
            container &&
            Number.parseFloat(getComputedStyle(veil).opacity) < 0.95
          );
        },
        null,
        { timeout: 2_500 },
      );
      const state = await page.evaluate(() => {
        const image = document.querySelector(
          '[data-barba-namespace="residential"] img[src*="residential-detail"]',
        );
        return {
          complete: image?.complete,
          veil: Number.parseFloat(
            getComputedStyle(document.querySelector(".route-veil")).opacity,
          ),
        };
      });
      assert(
        !delayedHeroReleased && state.complete === false && state.veil < 0.95,
        `Route reveal waited for delayed destination media: ${JSON.stringify({ delayedHeroReleased, state })}`,
      );
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-barba-namespace="residential"] img[src*="residential-detail"]',
          )?.complete,
        null,
        { timeout: 5_000 },
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runEspacioScrollCueChecks() {
  await runPageCase(
    "scroll cue letters enter and exit with a uniform stagger",
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      const timing = await page.evaluate(async () => {
        const gsap = window.gsap;
        if (!gsap) return null;
        const originalTimeScale = gsap.globalTimeline.timeScale();
        try {
          gsap.globalTimeline.timeScale(2);
          window.dispatchEvent(new Event("languagechange"));
          const characters = [
            ...document.querySelectorAll(".scroll-cue-char"),
          ];
          const rows = characters.map((character) => ({
            character: character.textContent,
            enterStart: null,
            enterDone: null,
            exitStart: null,
          }));
          const startedAt = performance.now();
          const deadline = startedAt + 4_600;
          // Độ phân giải đo: GSAP chỉ đổi opacity mỗi frame, runner bận có frame 100ms nên hai chữ có thể đổi cùng frame.
          let resolution = 0;
          let lastFrame = startedAt;
          const trackFrame = (now) => {
            resolution = Math.max(resolution, now - lastFrame);
            lastFrame = now;
            if (now < deadline) requestAnimationFrame(trackFrame);
          };
          requestAnimationFrame(trackFrame);
          let lastSample = startedAt;
          while (performance.now() < deadline) {
            const elapsed = performance.now() - startedAt;
            resolution = Math.max(resolution, performance.now() - lastSample);
            lastSample = performance.now();
            characters.forEach((character, index) => {
              const opacity = Number.parseFloat(
                getComputedStyle(character).opacity,
              );
              const row = rows[index];
              if (row.enterStart === null && opacity > 0.05) {
                row.enterStart = elapsed;
              }
              if (row.enterDone === null && opacity >= 0.95) {
                row.enterDone = elapsed;
              }
              if (
                row.enterDone !== null &&
                row.exitStart === null &&
                opacity < 0.95
              ) {
                row.exitStart = elapsed;
              }
            });
            await new Promise((resolve) => window.setTimeout(resolve, 8));
          }
          const intervals = (key) =>
            rows.slice(1).map((row, index) => row[key] - rows[index][key]);
          return {
            rows,
            resolution,
            enterIntervals: intervals("enterStart"),
            exitIntervals: intervals("exitStart"),
          };
        } finally {
          gsap.globalTimeline.timeScale(originalTimeScale);
        }
      });
      // Trung bình nằm trong 25-80ms; từng khoảng chỉ được lệch thêm đúng độ phân giải đo của lần chạy đó.
      const isUniform = (intervals) => {
        const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const slack = Math.max(0, timing.resolution - 17);
        return intervals.length > 0 && mean >= 25 && mean <= 80 &&
          intervals.every((interval) => interval >= 25 - slack && interval <= 80 + slack);
      };
      assert(
        timing &&
          isUniform(timing.enterIntervals) &&
          isUniform(timing.exitIntervals),
        `Scroll cue stagger is not uniform per letter: ${JSON.stringify(timing)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  const cases = [
    ...ROUTES,
    ...ROUTES.map((route) => route.replace(/^\/vi\//, "/en/")),
  ];
  for (const route of cases) {
    const viewport = { width: 1440, height: 900 };
    await runPageCase(
      `Espacio scroll cue ${route}`,
      { route, viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, route);
        const state = await page.evaluate(() => {
          const cue = document.querySelector("[data-scroll-cue]");
          const label = cue?.querySelector("[data-scroll-cue-label]");
          const rect = cue?.getBoundingClientRect();
          const styles = cue ? getComputedStyle(cue) : null;
          return {
            isButton: cue?.tagName === "BUTTON",
            label: label?.textContent.trim() || "",
            characters: [
              ...(label?.querySelectorAll(".scroll-cue-char") || []),
            ].map((character) => character.textContent),
            bottom: rect ? innerHeight - rect.bottom : Number.NaN,
            cueCount: document.querySelectorAll("[data-scroll-cue]").length,
            wordSpacingRatio: styles
              ? Number.parseFloat(styles.wordSpacing) /
                Number.parseFloat(styles.fontSize)
              : Number.NaN,
          };
        });
        const expectedLabel = route.startsWith("/en/")
          ? "SCROLL DOWN"
          : "CUỘN XUỐNG";
        const expectedViewportBottom = route.includes("/advertising-products/")
          ? 95
          : 45;
        assert(
          state.cueCount === 1 &&
            state.isButton &&
            state.label === expectedLabel &&
            state.characters.length ===
              [...expectedLabel].filter((character) => !/\s/u.test(character))
                .length &&
            state.characters.every((character) => !/\s/u.test(character)) &&
            Math.abs(state.bottom - expectedViewportBottom) <= 1 &&
            Math.abs(state.wordSpacingRatio - 0.1) <= 0.01,
          `Scroll cue contract drifted on ${route}: ${JSON.stringify(state)}`,
        );
        if (route === "/vi/advertising-products/") {
          const pathname = new URL(page.url()).pathname;
          await page.evaluate(() =>
            document.querySelector("[data-scroll-cue]")?.click(),
          );
          await page.waitForFunction(
            () => {
              const hero = document.querySelector(".hero");
              const target = hero?.nextElementSibling;
              if (!(target instanceof HTMLElement)) return false;
              return Math.abs(target.getBoundingClientRect().top) <= 120;
            },
            null,
            { timeout: 5_000 },
          );
          assert(
            new URL(page.url()).pathname === pathname,
            "Scroll cue changed route instead of scrolling to the next section",
          );
        }
        assertDiagnostics(diagnostics);
      },
    );
  }

  await runPageCase(
    "Espacio scroll cue responsive offsets",
    {
      route: "/vi/advertising-products/",
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    },
    async (page) => {
      await gotoRoute(page, "/vi/advertising-products/");
      const bottom = await page.locator("[data-scroll-cue]").evaluate((cue) => {
        const rect = cue.getBoundingClientRect();
        return innerHeight - rect.bottom;
      });
      assert(
        Math.abs(bottom - 110) <= 1,
        `Mobile advertising scroll cue viewport offset is ${bottom}px; expected 110px`,
      );
    },
  );

  await runPageCase(
    "scroll cue cycle restarts after soft route and history",
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      const assertFreshCycle = async (label) => {
        await page.waitForSelector(".scroll-cue-char");
        const state = await page
          .locator(".scroll-cue-char")
          .first()
          .evaluate((character) => ({
            opacity: Number.parseFloat(getComputedStyle(character).opacity),
            top: Number.parseFloat(getComputedStyle(character).top),
          }));
        assert(
          state.opacity <= 0.01 && Math.abs(state.top + 20) <= 0.5,
          `${label} did not restart from the Espacio initial delay state: ${JSON.stringify(state)}`,
        );
      };
      const waitForReplacement = async (oldCue) => {
        await page.waitForFunction((cue) => !cue.isConnected, oldCue, {
          timeout: 6_000,
        });
      };

      await gotoRoute(page, "/vi/");
      const homeCue = await page.locator("[data-scroll-cue]").elementHandle();
      const residentialLink = await findRouteLink(
        page,
        "[data-site-header]",
        "/vi/residential/",
      );
      await Promise.all([
        waitForCanonicalPath(page, "/vi/residential/"),
        residentialLink.click(),
      ]);
      await waitForReplacement(homeCue);
      await assertFreshCycle("Soft route entry");

      const residentialCue = await page
        .locator("[data-scroll-cue]")
        .elementHandle();
      await Promise.all([
        waitForCanonicalPath(page, "/vi/"),
        page.goBack({ timeout: 15_000 }),
      ]);
      await waitForReplacement(residentialCue);
      await assertFreshCycle("History entry");
      assertDiagnostics(diagnostics);
    },
  );
}

async function runEspacioTypographyChecks() {
  const localizedRoutes = [
    ...ROUTES,
    ...ROUTES.map((route) => route.replace(/^\/vi\//, "/en/")),
  ];
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    for (const route of localizedRoutes) {
      await runPageCase(
        `Espacio visible typography ${route} ${viewport.width}`,
        {
          route,
          viewport,
          hasTouch: viewport.width === 390,
          isMobile: viewport.width === 390,
        },
        async (page) => {
          const diagnostics = monitorPage(page);
          await gotoRoute(page, route);
          await page.evaluate(() => document.fonts?.ready);
          const state = await page.evaluate(() => {
            const isRendered = (element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                rect.width > 0 &&
                rect.height > 0
              );
            };
            const hasDirectText = (element) =>
              [...element.childNodes].some(
                (node) =>
                  node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
              );
            const excluded = (element) =>
              element.closest(
                ".brand-lockup, svg, script, style, template, .sr-only, [hidden], [aria-hidden='true']",
              );
            const visibleText = [...document.body.querySelectorAll("*")]
              .filter(
                (element) =>
                  hasDirectText(element) && !excluded(element) && isRendered(element),
              )
              .map((element) => {
                const style = getComputedStyle(element);
                return {
                  selector: `${element.tagName.toLowerCase()}.${element.className || ""}`,
                  text: [...element.childNodes]
                    .filter((node) => node.nodeType === Node.TEXT_NODE)
                    .map((node) => node.textContent.trim())
                    .filter(Boolean)
                    .join(" ")
                    .slice(0, 80),
                  size: Number.parseFloat(style.fontSize),
                  weight: Number.parseFloat(style.fontWeight),
                  // Tiêu đề gallery nét mảnh 300 theo mẫu Espacio, owner duyệt (detail-pages R7).
                  galleryTitle: Boolean(element.closest(".detail-gallery > h2")),
                };
              });
            const readRole = (selector) => {
              const element = document.querySelector(selector);
              if (!(element instanceof HTMLElement) || !isRendered(element)) {
                return null;
              }
              const style = getComputedStyle(element);
              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
              return {
                selector,
                size: Number.parseFloat(style.fontSize),
                weight: Number.parseFloat(style.fontWeight),
                capHeight: context.measureText("H").actualBoundingBoxAscent,
              };
            };
            return {
              overflow:
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
              lightText: visibleText.filter((item) => item.weight < 500 && !item.galleryTitle),
              // Phụ đề portal co theo bề rộng card để giữ một dòng (page-home R5), không theo sàn 12.5px.
              tinyText: visibleText.filter((item) => item.size < 12.5 && item.selector !== "span.portal-subtitle"),
              roles: {
                nav: readRole("#header-menu-items a"),
                cue: readRole("[data-scroll-cue]"),
                portal: readRole(".portal-copy strong"),
                editorial: readRole(".editorial-item p"),
                detailLabel: readRole(
                  ".detail-eyebrow, .detail-index-hero__kicker",
                ),
              },
            };
          });
          assert(
            state.overflow <= 1,
            `${route} ${viewport.width}px has ${state.overflow}px horizontal overflow`,
          );
          assert(
            state.lightText.length === 0,
            `${route} ${viewport.width}px has visible text below weight 500: ${JSON.stringify(state.lightText)}`,
          );
          assert(
            state.tinyText.length === 0,
            `${route} ${viewport.width}px has visible text below 12.5px: ${JSON.stringify(state.tinyText)}`,
          );
          assert(
            state.roles.cue &&
              state.roles.cue.weight >= 700 &&
              state.roles.cue.capHeight >= 8 &&
              state.roles.cue.capHeight <= 11,
            `Scroll cue cap-height drifted on ${route}: ${JSON.stringify(state.roles.cue)}`,
          );
          if (viewport.width === 1440) {
            assert(
              state.roles.nav &&
                state.roles.nav.weight >= 700 &&
                state.roles.nav.capHeight >= 10 &&
                state.roles.nav.capHeight <= 13,
              `Desktop nav cap-height drifted on ${route}: ${JSON.stringify(state.roles.nav)}`,
            );
          }
          if (route === "/vi/" || route === "/en/") {
            // Cỡ tiêu đề portal theo bề rộng card (page-home R5): 1440px đo 37px cap-height.
            const portalRange =
              viewport.width === 1440 ? [35, 47] : [31, 46];
            assert(
              state.roles.portal &&
                state.roles.portal.weight >= 600 &&
                state.roles.portal.capHeight >= portalRange[0] &&
                state.roles.portal.capHeight <= portalRange[1],
              `Portal cap-height drifted on ${route}: ${JSON.stringify(state.roles.portal)}`,
            );
          } else if (state.roles.detailLabel) {
            assert(
              state.roles.detailLabel.weight >= 700 &&
                state.roles.detailLabel.capHeight >= 8 &&
                state.roles.detailLabel.capHeight <= 11,
              `Detail label cap-height drifted on ${route}: ${JSON.stringify(state.roles.detailLabel)}`,
            );
          }
          // Dải quy trình chỉ có ở trang detail (detail-pages R8), trang chủ không còn editorial.
          if (state.roles.editorial) {
            assert(
              state.roles.editorial.weight >= 500 &&
                Math.abs(state.roles.editorial.size - 16) <= 0.01 &&
                state.roles.editorial.capHeight >= 11 &&
                state.roles.editorial.capHeight <= 13,
              `Editorial body cap-height drifted on ${route}: ${JSON.stringify(state.roles.editorial)}`,
            );
          }
          assertDiagnostics(diagnostics);
        },
      );
    }
  }
}

async function runBarbaFailureFallbackCheck() {
  const viewport = { width: 1440, height: 900 };
  await runPageCase(
    "Barba request failure hard fallback",
    { route: "/vi/residential/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      let failedBarbaRequest = false;
      await page.route("**/vi/commercial/**", async (route) => {
        const isBarbaRequest = Boolean(route.request().headers()["x-barba"]);
        if (isBarbaRequest && !failedBarbaRequest) {
          failedBarbaRequest = true;
          await route.abort("failed");
          return;
        }
        await route.continue();
      });
      await gotoRoute(page, "/vi/residential/");
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      const link = await findRouteLink(
        page,
        "[data-site-header]",
        "/vi/commercial/",
      );
      await clickRouteLink(page, link, "/vi/commercial/");
      const nextTimeOrigin = await page.evaluate(() => performance.timeOrigin);
      assert(failedBarbaRequest, "The Barba request was not intercepted");
      assert(nextTimeOrigin > timeOrigin, "Failed Barba navigation did not hard reload");
      const filteredFailures = diagnostics.requestFailures.filter(
        (message) => !message.includes("/vi/commercial/"),
      );
      diagnostics.requestFailures = filteredFailures;
      diagnostics.consoleErrors = diagnostics.consoleErrors.filter(
        (message) => !message.includes("net::ERR_FAILED"),
      );
      diagnostics.pageErrors = diagnostics.pageErrors.filter(
        (message) => message !== "Fetch error",
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runHistoryNavigationChecks() {
  const viewport = { width: 390, height: 844 };
  for (const locale of ["vi", "en"]) {
    const homeRoute = `/${locale}/`;
    const residentialRoute = `/${locale}/residential/`;
    await runPageCase(
      `history restores navbar state ${locale}`,
      { route: homeRoute, viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        const setScroll = async (scrollY) => {
          await page.evaluate((value) => {
            document.documentElement.style.scrollBehavior = "auto";
            window.scrollTo(0, value);
          }, scrollY);
          await page.waitForFunction(
            (value) => Math.abs(window.scrollY - value) <= 2,
            scrollY,
          );
          await page.waitForTimeout(80);
        };
        const expectScroll = async (expected, label) => {
          const state = await page.evaluate(() => ({
            actual: window.scrollY,
            maximum: document.documentElement.scrollHeight - innerHeight,
          }));
          const clampedExpected = Math.min(expected, state.maximum);
          assert(
            Math.abs(state.actual - clampedExpected) <= 2,
            `${label}: expected ${clampedExpected}px, received ${state.actual}px`,
          );
        };
        const readHeaderState = () =>
          page.evaluate(() => {
            const header = document.querySelector("[data-site-header]");
            const rect = header?.getBoundingClientRect();
            const scrollContainer = document.querySelector(
              "[data-scroll-container]",
            );
            const scrollTransform = scrollContainer
              ? getComputedStyle(scrollContainer).transform
              : "none";
            const scrollMatrix =
              scrollTransform === "none"
                ? new DOMMatrixReadOnly()
                : new DOMMatrixReadOnly(scrollTransform);
            return {
              classes: header?.className || "",
              top: rect?.top ?? Number.NaN,
              height: rect?.height ?? Number.NaN,
              scrollY: window.scrollY,
              logicalScrollY: document.documentElement.classList.contains(
                "has-scroll-smooth",
              )
                ? Math.abs(scrollMatrix.m42)
                : window.scrollY,
            };
          });
        const expectExpandedVisible = async (label) => {
          const state = await readHeaderState();
          assert(
            !state.classes.includes("is-collapsed") &&
              !state.classes.includes("is-hidden") &&
              state.top >= -1,
            `${label}: expected expanded visible header, received ${JSON.stringify(state)}`,
          );
        };

        await gotoRoute(page, homeRoute);
        await page.evaluate(() => {
          const header = document.querySelector("[data-site-header]");
          header?.classList.add("is-collapsed", "is-hidden");
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: false }),
          );
        });
        await page.waitForTimeout(120);
        await expectExpandedVisible("Non-persisted pageshow at top");
        await setScroll(900);
        const firstResidentialLink = await findRouteLink(
          page,
          "[data-site-header]",
          residentialRoute,
        );
        await Promise.all([
          waitForPath(page, residentialRoute),
          firstResidentialLink.evaluate((link) => link.click()),
        ]);
        await expectScroll(0, "Normal residential entry");
        await setScroll(700);
        const brand = page.locator("[data-site-header] .brand");
        await Promise.all([waitForPath(page, homeRoute), brand.click()]);
        await expectScroll(0, "Logo/Home navigation");
        await expectExpandedVisible("Logo/Home navigation");

        await setScroll(900);
        const residentialLink = await findRouteLink(
          page,
          "[data-site-header]",
          residentialRoute,
        );
        await Promise.all([
          waitForPath(page, residentialRoute),
          residentialLink.evaluate((link) => link.click()),
        ]);
        await expectScroll(0, "Normal residential entry");
        await traverseHistory(page, "back", homeRoute);
        await expectScroll(900, "Back to saved homepage");
        const restoredHome = await readHeaderState();
        assert(
          restoredHome.classes.includes("is-collapsed") &&
            !restoredHome.classes.includes("is-hidden"),
          `Back did not derive sticky homepage header from restored scroll: ${JSON.stringify(restoredHome)}`,
        );
        await page.evaluate(() => {
          window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
          );
        });
        await page.waitForTimeout(120);
        const pageshowHome = await readHeaderState();
        assert(
          pageshowHome.scrollY >= 899 &&
            pageshowHome.classes.includes("is-collapsed") &&
            !pageshowHome.classes.includes("is-hidden"),
          `Persisted pageshow retained stale homepage navbar state: ${JSON.stringify(pageshowHome)}`,
        );

        await traverseHistory(page, "forward", residentialRoute);
        await expectScroll(0, "Forward to residential");
        await expectExpandedVisible("Forward to residential");

        await setScroll(700);
        const beforeResize = await readHeaderState();
        assert(
          beforeResize.classes.includes("is-collapsed"),
          `Resize setup did not establish collapsed header: ${JSON.stringify(beforeResize)}`,
        );
        await page.setViewportSize({ width: 1024, height: 900 });
        await page.waitForTimeout(120);
        const desktopResize = await readHeaderState();
        assert(
          desktopResize.logicalScrollY >= 699 &&
            desktopResize.classes.includes("is-collapsed") &&
            !desktopResize.classes.includes("is-hidden"),
          `Resize retained stale navbar state instead of deriving from current scroll: ${JSON.stringify(desktopResize)}`,
        );
        await page.setViewportSize(viewport);
        await page.waitForTimeout(120);
        const mobileResize = await readHeaderState();
        assert(
          mobileResize.logicalScrollY >= 699 &&
            mobileResize.classes.includes("is-collapsed") &&
            !mobileResize.classes.includes("is-hidden"),
          `Resize back to native scroll retained stale navbar state: ${JSON.stringify(mobileResize)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }

  for (const locale of ["vi", "en"]) {
    const homeRoute = `/${locale}/`;
    const commercialRoute = `/${locale}/commercial/`;
    await runPageCase(
      `soft navigation releases persistent navbar focus ${locale}`,
      { route: homeRoute, viewport: { width: 1440, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        const header = page.locator("[data-site-header]");
        const expectAutoHidden = async (label) => {
          await page.mouse.move(100, 700);
          // Shell R3 chỉ ẩn khi quá 0.5 x viewport; smooth scroll dịch ~43px mỗi bước wheel 100px.
          for (let index = 0; index < 20; index += 1) {
            await page.mouse.wheel(0, 100);
            await page.waitForTimeout(70);
          }
          await page.waitForTimeout(1_050);
          const state = await header.evaluate((element) => ({
            activeInside: element.contains(document.activeElement),
            classes: element.className,
            height: element.getBoundingClientRect().height,
            top: element.getBoundingClientRect().top,
          }));
          assert(
            !state.activeInside &&
              state.classes.includes("is-collapsed") &&
              state.classes.includes("is-hidden") &&
              Math.abs(state.top + state.height) <= 1,
            `${label}: persistent navbar focus prevented auto-hide: ${JSON.stringify(state)}`,
          );
        };

        await gotoRoute(page, homeRoute);
        const commercialLink = await findRouteLink(
          page,
          "[data-site-header]",
          commercialRoute,
        );
        await clickRouteLink(page, commercialLink, commercialRoute);
        await expectAutoHidden("Commercial after soft navigation");

        await page.mouse.move(100, 100);
        await page.waitForTimeout(1_050);
        const brand = page.locator("[data-site-header] .brand");
        await clickRouteLink(page, brand, homeRoute);
        await expectAutoHidden("Homepage after soft navigation return");
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runBfcacheCleanupCheck() {
  const viewport = { width: 1440, height: 900 };
  await runPageCase(
    "persisted pageshow clears menu and route transition state",
    { route: "/vi/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await page.evaluate(() => {
        const dialog = document.querySelector("#site-menu");
        if (dialog && !dialog.open) dialog.showModal();
        document.body.classList.add("menu-open");
        document
          .querySelector("[data-menu-open]")
          ?.setAttribute("aria-expanded", "true");
        document.body.classList.add("is-transitioning");
        document.querySelector(".route-veil")?.style.setProperty("opacity", "1");
        window.dispatchEvent(
          new PageTransitionEvent("pageshow", { persisted: true }),
        );
      });
      await waitForNavigationCleanup(page);

      await openMenu(page);
      await page.locator("[data-menu-close]").click();
      await page.evaluate(() => {
        window.dispatchEvent(
          new PageTransitionEvent("pageshow", { persisted: true }),
        );
      });
      await waitForNavigationCleanup(page);
      await openMenu(page);
      await closeMenu(page);
      assertDiagnostics(diagnostics);
    },
  );
}

// Preview local gửi `no-store` (static-release R8) nên Chrome không cho vào bfcache; probe thay bằng
// header mặc định của Cloudflare cho HTML để đo đúng như production.
async function useProductionCacheHeaders(context) {
  await context.route("**/*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "cache-control": "public, max-age=0, must-revalidate" },
    });
  });
}

async function runRealBfcacheProbe() {
  const executablePath =
    process.env.SYSTEM_CHROME_PATH ||
    (process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : chromium.executablePath());
  assert(
    fs.existsSync(executablePath),
    `System Chrome not found at ${executablePath}`,
  );
  const probeBrowser = await chromium.launch({
    executablePath,
    headless: true,
    ignoreDefaultArgs: ["--disable-back-forward-cache"],
  });
  const reasons = [];
  try {
    const context = await probeBrowser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await useProductionCacheHeaders(context);
    await context.addInitScript(() => {
      window.__ttRealBfcachePageshow = [];
      window.addEventListener("pageshow", (event) => {
        window.__ttRealBfcachePageshow.push({ persisted: event.persisted });
      });
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    cdp.on("Page.backForwardCacheNotUsed", (event) => reasons.push(event));

    await page.goto(pageUrl("/vi/residential/"), {
      waitUntil: "load",
      timeout: 20_000,
    });
    await waitForLoadedDocument(page);
    await page.goto(pageUrl("/robots.txt"), {
      waitUntil: "load",
      timeout: 20_000,
    });
    await page.goBack({ waitUntil: "commit", timeout: 20_000 });
    await page.waitForTimeout(1_000);
    assert(
      canonicalPathname(page.url()) === "/vi/residential/",
      `BFCache probe returned to ${page.url()}`,
    );

    const state = await page.evaluate(() => ({
      pageshow: window.__ttRealBfcachePageshow,
      runtimeHealthy: window.__ttMotionRuntimeHealthy,
    }));
    assert(
      state.pageshow.some((event) => event.persisted),
      `System Chrome did not restore from BFCache; reasons=${JSON.stringify(reasons)}`,
    );
    assert(state.runtimeHealthy, "BFCache-restored page lost its motion runtime");
    await openMenu(page);
    await page.locator("[data-menu-close]").click();
    await waitForMenuState(page, false);
    await context.close();
    console.log(
      `[site-e2e] real BFCache probe passed in Chrome ${await probeBrowser.version()}`,
    );
  } finally {
    await probeBrowser.close();
  }
}

async function runFailOpenRealBfcacheProbe() {
  const executablePath =
    process.env.SYSTEM_CHROME_PATH ||
    (process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : chromium.executablePath());
  assert(
    fs.existsSync(executablePath),
    `System Chrome not found at ${executablePath}`,
  );
  const probeBrowser = await chromium.launch({
    executablePath,
    headless: true,
    ignoreDefaultArgs: ["--disable-back-forward-cache"],
  });
  const reasons = [];
  try {
    const context = await probeBrowser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await useProductionCacheHeaders(context);
    await context.addInitScript(() => {
      window.__ttFailOpenBfcachePageshow = [];
      window.addEventListener("pageshow", (event) => {
        window.__ttFailOpenBfcachePageshow.push({ persisted: event.persisted });
      });
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    cdp.on("Page.backForwardCacheNotUsed", (event) => reasons.push(event));
    await page.route("**/*motion.js*", (route) => route.abort("failed"));

    await page.goto(pageUrl("/vi/advertising-products/?bfcache=fail-open"), {
      waitUntil: "load",
      timeout: 20_000,
    });
    await page.waitForFunction(() =>
      document.documentElement.classList.contains("motion-fallback"),
    );
    await page.locator("[data-menu-open]").click();
    await waitForMenuState(page, true);
    await page.goto(pageUrl("/robots.txt"), {
      waitUntil: "load",
      timeout: 20_000,
    });
    await page.goBack({ waitUntil: "commit", timeout: 20_000 });
    await page.waitForTimeout(1_000);
    assert(
      canonicalPathname(page.url()) === "/vi/advertising-products/",
      `Fail-open BFCache probe returned to ${page.url()}`,
    );
    const state = await page.evaluate(() => ({
      pageshow: window.__ttFailOpenBfcachePageshow,
      fallback: window.__ttMotionBoot?.fallback,
      claimed: window.__ttMotionBoot?.claimed,
      dialogOpen: document.querySelector("#site-menu")?.open,
      menuOpen: document.body.classList.contains("menu-open"),
      expanded: document
        .querySelector("[data-menu-open]")
        ?.getAttribute("aria-expanded"),
    }));
    assert(
      state.pageshow.some((event) => event.persisted),
      `Fail-open page was not restored from BFCache; reasons=${JSON.stringify(reasons)}`,
    );
    assert(
      state.fallback === true &&
        state.claimed === false &&
        !state.dialogOpen &&
        !state.menuOpen &&
        state.expanded === "false",
      `Fail-open BFCache cleanup failed: ${JSON.stringify(state)}`,
    );
    await context.close();
    console.log(
      `[site-e2e] fail-open BFCache probe passed in Chrome ${await probeBrowser.version()}`,
    );
  } finally {
    await probeBrowser.close();
  }
}

async function runInternalLinkCheck() {
  const viewport = { width: 1440, height: 900 };
  await runPageCase(
    "all internal links resolve to valid routes and targets",
    { route: "/vi/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      const internalLinks = [];
      const issues = [];

      for (const route of ROUTES) {
        await gotoRoute(page, route);
        const snapshot = await page.evaluate(
          ({ origin, source }) => {
            const links = [];
            const invalid = [];
            document.querySelectorAll("a[href]").forEach((anchor) => {
              const href = anchor.getAttribute("href");
              try {
                const url = new URL(href, document.baseURI);
                if (url.origin === origin) {
                  links.push({
                    source,
                    href,
                    url: url.href,
                    localeControl: anchor.matches(
                      "[data-language-option]",
                    ),
                  });
                }
              } catch (error) {
                invalid.push({
                  source,
                  href,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            });
            return {
              links,
              invalid,
              fragments: [...document.querySelectorAll('a[href*="#"]')].map(
                (anchor) => anchor.getAttribute("href"),
              ),
            };
          },
          { origin: BASE_ORIGIN, source: route },
        );
        internalLinks.push(...snapshot.links);
        issues.push(
          ...snapshot.fragments.map(
            (href) => `${route}: public fragment link remains: ${href}`,
          ),
        );
        issues.push(
          ...snapshot.invalid.map(
            ({ source, href, error }) =>
              `${source}: invalid href ${JSON.stringify(href)} (${error})`,
          ),
        );
      }

      const destinations = new Map();
      internalLinks.forEach((link) => {
        const url = new URL(link.url);
        url.hash = "";
        destinations.set(url.href, link);
      });
      for (const [url, link] of destinations) {
        const response = await page.context().request.get(url);
        if (response.status() >= 400) {
          issues.push(
            `${link.source}: ${link.href} returned HTTP ${response.status()}`,
          );
        }
        await response.dispose();
      }

      internalLinks.forEach((link) => {
        if (link.localeControl) return;
        const destination = new URL(link.url);
        const targetPath = canonicalPathname(destination.href);
        if (!CANONICAL_ROUTES.some((route) => canonicalPathname(route) === targetPath)) {
          issues.push(
            `${link.source}: ${link.href} points outside canonical routes`,
          );
        }
      });

      assert(issues.length === 0, unique(issues).join("\n"));
      assertDiagnostics(diagnostics);
    },
  );
}

async function runLanguagePersistenceCheck() {
  const viewport = { width: 390, height: 844 };
  await runPageCase(
    "VI EN contract changes and persists on all routes",
    { route: "/vi/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      for (const route of ROUTES) {
        const routeWithState = route === "/vi/" ? "/vi/?locale=test" : route;
        const englishRoute = routeWithState.replace(/^\/vi\//, "/en/");
        await gotoRoute(page, routeWithState);
        await page.waitForFunction(
          () => document.documentElement.lang === "vi",
          null,
          { timeout: 3_000 },
        );

        const initial = await page.evaluate(() => {
          const leaf = [...document.querySelectorAll("main [data-en]")].find(
            (element) =>
              !element.closest("[data-cms], [data-motion-words], [data-motion-lines]") &&
              !element.matches(".hero-word"),
          );
          return {
            // Full menu tách tiêu đề nhỏ/lớn; tên đầy đủ của link là aria-label.
            projectLabels: [
              document
                .querySelector('[data-site-header] a[href="/vi/advertising-products/"]')
                ?.textContent,
              document
                .querySelector('#site-menu .menu-group__title[href="/vi/advertising-products/"]')
                ?.getAttribute("aria-label"),
            ].map((label) => label?.replace(/\s+/g, " ").trim()),
            title: document.title,
            meta: document.querySelector('meta[name="description"]')?.getAttribute("content"),
            text: leaf?.textContent?.replace(/\s+/g, " ").trim(),
          };
        });
        assert(
          initial.projectLabels.every(
            (label) => label === "Sản phẩm Quảng cáo",
          ),
          `${route}: Vietnamese project/product navigation labels differ`,
        );
        await gotoRoute(page, englishRoute);
        await page.waitForFunction(
          () => document.documentElement.lang === "en",
          null,
          { timeout: 3_000 },
        );
        const translated = await page.evaluate(() => {
          const meta = document.querySelector('meta[name="description"][data-en-content]');
          const text = [...document.querySelectorAll("main [data-en]")].find(
            (element) =>
              !element.closest("[data-cms], [data-motion-words], [data-motion-lines]") &&
              !element.matches(".hero-word"),
          );
          const image = document.querySelector("img[data-en-alt]");
          const labelled = document.querySelector("[data-en-aria-label]");
          return {
            // Full menu tách tiêu đề nhỏ/lớn; tên đầy đủ của link là aria-label.
            projectLabels: [
              document
                .querySelector('[data-site-header] a[href="/en/advertising-products/"]')
                ?.textContent,
              document
                .querySelector('#site-menu .menu-group__title[href="/en/advertising-products/"]')
                ?.getAttribute("aria-label"),
            ].map((label) => label?.replace(/\s+/g, " ").trim()),
            title: document.title,
            meta: meta?.getAttribute("content"),
            text: text?.textContent?.replace(/\s+/g, " ").trim(),
            expectedText: text?.dataset.en?.replace(/\s+/g, " ").trim(),
            alt: image?.getAttribute("alt"),
            expectedAlt: image?.dataset.enAlt,
            aria: labelled?.getAttribute("aria-label"),
            expectedAria: labelled?.dataset.enAriaLabel,
          };
        });
        assert(
          translated.title !== initial.title,
          `${route}: title did not translate`,
        );
        assert(
          translated.projectLabels.every(
            (label) => label === "Advertising products",
          ),
          `${route}: English project/product navigation labels differ`,
        );
        assert(
          translated.text !== initial.text &&
            translated.text === translated.expectedText,
          `${route}: visible copy did not translate`,
        );
        assert(
          translated.meta && translated.meta !== initial.meta,
          `${route}: meta description did not translate`,
        );
        assert(
          translated.alt === translated.expectedAlt,
          `${route}: image alt did not translate`,
        );
        assert(
          translated.aria === translated.expectedAria,
          `${route}: aria-label did not translate`,
        );
        if (route === "/vi/") {
          const retainedState = await page.evaluate(() => ({ search: location.search, hash: location.hash }));
          assert(retainedState.search === "?locale=test" && retainedState.hash === "", `${route}: locale switch lost query or retained a fragment`);
        }

        await page.reload({ waitUntil: "domcontentloaded" });
        await waitForLoadedDocument(page);
        await page.waitForFunction(
          () => document.documentElement.lang === "en",
          null,
          { timeout: 3_000 },
        );
        const localeState = await page.locator("#site-menu").evaluate((dialog) => ({
          options: [...dialog.querySelectorAll("[data-language-option]")].map(
            (option) => option.dataset.languageOption,
          ),
          current: dialog
            .querySelector('[data-language-option][aria-current="true"]')
            ?.getAttribute("data-language-option"),
        }));
        assert(
          localeState.current === "en" &&
            JSON.stringify(localeState.options) === JSON.stringify(["vi", "en"]),
          `${route}: menu-owned English state did not persist across reload`,
        );
        await gotoRoute(page, routeWithState);
        assert((await page.evaluate(() => document.documentElement.lang)) === "vi", `${route}: locale toggle did not return to Vietnamese route`);
      }
      assertDiagnostics(diagnostics);
    },
  );
}

async function runLanguageScrollRetentionCheck() {
  const viewport = { width: 390, height: 844 };
  await runPageCase(
    "locale switch stays in-place, keeps reading position, and replays only the visible section",
    { route: "/vi/residential/?qa=scroll", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      const switchLocale = async (expectedUrl) => {
        const expectedLanguage = expectedUrl.startsWith("/en/") ? "en" : "vi";
        const before = await page.evaluate(() => {
          const container = document.querySelector('[data-barba="container"]');
          const candidates = [
            ...container.querySelectorAll(
              "main > section, main > figure, :scope > footer",
            ),
          ];
          const visibleArea = (element) => {
            const rect = element.getBoundingClientRect();
            return Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
          };
          const section = candidates.reduce(
            (best, candidate) =>
              visibleArea(candidate) > visibleArea(best) ? candidate : best,
            candidates[0],
          );
          const target = section?.matches("[data-motion-media]")
            ? section
            : section?.querySelector("[data-motion-media], [data-motion-up], [data-motion-fade]");
          window.__ttLocaleSwitchProbe = {
            container,
            historyLength: history.length,
            languageEvents: [],
            replayEvents: [],
            target,
            targetClassChanges: [],
            timeOrigin: performance.timeOrigin,
          };
          if (target) {
            new MutationObserver(() => {
              window.__ttLocaleSwitchProbe.targetClassChanges.push(
                target.classList.contains("is-motion-inview"),
              );
            }).observe(target, { attributes: true, attributeFilter: ["class"] });
          }
          window.addEventListener(
            "languagechange",
            () => {
              window.__ttLocaleSwitchProbe.languageEvents.push({
                dialogOpen: document.querySelector("#site-menu")?.open,
                language: document.documentElement.lang,
              });
            },
            { once: true },
          );
          window.addEventListener(
            "site:section-replay",
            (event) => {
              window.__ttLocaleSwitchProbe.replayEvents.push({
                detailReplayed: event.detail?.detailReplayed,
                pageReplayed: event.detail?.pageReplayed,
                replayed: event.detail?.replayed,
                sectionMatches: event.detail?.section === section,
                targetMatches: target ? section?.contains(target) || section === target : true,
              });
            },
            { once: true },
          );
          // Đổi ngôn ngữ phủ veil như route mềm (site-shell R5); ghi opacity cao nhất của veil.
          const veil = document.querySelector(".route-veil");
          window.__ttLocaleSwitchProbe.veilPeak = 0;
          const sampleVeil = () => {
            window.__ttLocaleSwitchProbe.veilPeak = Math.max(
              window.__ttLocaleSwitchProbe.veilPeak,
              Number(getComputedStyle(veil).opacity),
            );
            window.requestAnimationFrame(sampleVeil);
          };
          sampleVeil();
          return {
            historyLength: history.length,
            sectionClass: section?.className,
            sectionTag: section?.tagName,
            scrollY: window.scrollY,
            targetPresent: Boolean(target),
            // Nhóm line và word replay qua GSAP không đổi class (detail-pages R5, home R11).
            textPresent: Boolean(section?.querySelector("[data-motion-lines], [data-motion-words]")),
            timeOrigin: performance.timeOrigin,
          };
        });
        await page.evaluate(() => {
          document.querySelector("[data-site-header]")?.classList.remove("is-hidden");
          document.querySelector("[data-menu-open]")?.click();
        });
        await waitForMenuState(page, true);
        await waitForMenuVisualState(page);
        await page
          .locator(`#site-menu [data-language-option="${expectedLanguage}"]`)
          .evaluate((button) => button.click());
        await page.waitForURL(
          (url) =>
            `${url.pathname}${url.search}` === expectedUrl && url.hash === "",
          { timeout: 6_000 },
        );
        await page.waitForFunction(
          (language) =>
            document.documentElement.lang === language &&
            !document.querySelector("#site-menu")?.open &&
            window.__ttLocaleSwitchProbe?.replayEvents.length === 1,
          expectedLanguage,
          { timeout: 6_000 },
        );
        await page.evaluate(() => document.fonts?.ready);
        await page.waitForFunction(
          () => !document.body.classList.contains("is-transitioning"),
          null,
          { timeout: 6_000 },
        );
        const after = await page.evaluate(() => ({
          containerIdentity:
            window.__ttLocaleSwitchProbe.container ===
            document.querySelector('[data-barba="container"]'),
          historyLength: history.length,
          languageEvents: window.__ttLocaleSwitchProbe.languageEvents,
          replayEvents: window.__ttLocaleSwitchProbe.replayEvents,
          scrollY: window.scrollY,
          targetClassChanges: window.__ttLocaleSwitchProbe.targetClassChanges,
          timeOrigin: performance.timeOrigin,
          transitioning: document.body.classList.contains("is-transitioning"),
          veilPeak: window.__ttLocaleSwitchProbe.veilPeak,
        }));
        assert(
          after.containerIdentity &&
            after.timeOrigin === before.timeOrigin &&
            after.historyLength === before.historyLength &&
            !after.transitioning &&
            after.veilPeak === 1,
          `Locale switch replaced the document or skipped the route veil: ${JSON.stringify({ before, after })}`,
        );
        assert(
          after.languageEvents.length === 1 &&
            after.languageEvents[0].language === expectedLanguage &&
            after.languageEvents[0].dialogOpen === false,
          `Language changed before the menu finished closing: ${JSON.stringify(after.languageEvents)}`,
        );
        assert(
          after.replayEvents[0]?.sectionMatches &&
            after.replayEvents[0]?.targetMatches &&
            (before.targetPresent
              ? after.replayEvents[0]?.replayed &&
                after.targetClassChanges.includes(false) &&
                after.targetClassChanges.includes(true)
              : before.textPresent
                ? after.replayEvents[0]?.replayed === true
                : after.replayEvents[0]?.replayed === false &&
                  after.targetClassChanges.length === 0),
          `The dominant section did not restart its motion: ${JSON.stringify({ before, after })}`,
        );
        assert(
          Math.abs(after.scrollY - before.scrollY) <= 2,
          `Locale switch moved the reading position: ${JSON.stringify({ before: before.scrollY, after: after.scrollY })}`,
        );
      };
      const expectScroll = async (expected, label) => {
        const actual = await page.evaluate(() => window.scrollY);
        assert(
          Math.abs(actual - expected) <= 2,
          `${label}: expected ${expected}px, received ${actual}px`,
        );
      };

      await gotoRoute(page, "/vi/residential/?qa=scroll");
      const expectedScroll = await page.evaluate(() => {
        history.replaceState(
          history.state,
          "",
          "/vi/residential/?qa=scroll",
        );
        document.documentElement.style.scrollBehavior = "auto";
        const target = Math.min(1_700, document.documentElement.scrollHeight - innerHeight);
        window.scrollTo(0, target);
        return target;
      });
      await page.waitForFunction(
        (target) => Math.abs(window.scrollY - target) <= 2,
        expectedScroll,
      );

      await switchLocale("/en/residential/?qa=scroll");
      await expectScroll(expectedScroll, "VI to EN");

      await switchLocale("/vi/residential/?qa=scroll");
      await expectScroll(expectedScroll, "EN to VI");

      await gotoRoute(page, "/en/residential/?qa=direct-en");
      await page.locator(".detail-media").scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document
            .querySelector(".detail-media [data-motion-media]")
            ?.classList.contains("is-motion-inview"),
        null,
        { timeout: 3_000 },
      );
      const directEnglishScroll = await page.evaluate(() => {
        const target = document.querySelector(".detail-media");
        const rect = target.getBoundingClientRect();
        const top = Math.max(0, rect.top + window.scrollY - (innerHeight - rect.height) / 2);
        window.scrollTo(0, top);
        return window.scrollY;
      }).then(() => page.evaluate(async () => {
        // Bước nhảy reveal các line group phía trên; SplitText reflow rồi dịch scrollY qua scroll
        // anchoring. Lấy baseline khi vị trí đã giữ 30 frame.
        await document.fonts?.ready;
        let last = window.scrollY;
        for (let stable = 0; stable < 30;) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          stable = window.scrollY === last ? stable + 1 : 0;
          last = window.scrollY;
        }
        return last;
      }));
      await switchLocale("/vi/residential/?qa=direct-en");
      await expectScroll(directEnglishScroll, "direct EN to VI");
      const routeTimeOrigin = await page.evaluate(() => performance.timeOrigin);
      const routeLink = await findRouteLink(
        page,
        "[data-site-header]",
        "/vi/commercial/",
      );
      await Promise.all([
        waitForPath(page, "/vi/commercial/"),
        routeLink.evaluate((link) => link.click()),
      ]);
      assert(
        (await page.evaluate(() => performance.timeOrigin)) === routeTimeOrigin &&
          (await page.evaluate(() => document.documentElement.lang)) === "vi",
        "Locale replaceState broke the next Barba route navigation",
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runLocaleResponsivePreferenceChecks() {
  for (const testCase of [
    {
      label: "desktop smooth scroll",
      reducedMotion: "no-preference",
      viewport: { width: 1440, height: 900 },
    },
    {
      label: "mobile reduced motion",
      reducedMotion: "reduce",
      viewport: { width: 390, height: 844 },
    },
  ]) {
    await runPageCase(
      `in-place locale switch ${testCase.label}`,
      {
        route: "/vi/residential/?qa=locale-mode",
        viewport: testCase.viewport,
        reducedMotion: testCase.reducedMotion,
      },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, "/vi/residential/?qa=locale-mode");
        if (testCase.viewport.width >= 981) {
          await page.mouse.move(
            Math.floor(testCase.viewport.width / 2),
            Math.floor(testCase.viewport.height / 2),
          );
          await page.mouse.wheel(0, 1_200);
          await page.waitForTimeout(900);
        } else {
          await page.evaluate(() => window.scrollTo(0, 1_200));
          await page.waitForTimeout(120);
        }
        const before = await page.evaluate(() => {
          window.__ttLocaleModeProbe = {
            container: document.querySelector('[data-barba="container"]'),
            replay: null,
          };
          window.addEventListener(
            "site:section-replay",
            (event) => {
              window.__ttLocaleModeProbe.replay = {
                reducedMotion: event.detail?.reducedMotion,
                replayed: event.detail?.replayed,
              };
            },
            { once: true },
          );
          return {
            historyLength: history.length,
            scrollY: window.scrollY,
            timeOrigin: performance.timeOrigin,
          };
        });
        await page.evaluate(() => {
          document.querySelector("[data-site-header]")?.classList.remove("is-hidden");
          document.querySelector("[data-menu-open]")?.click();
        });
        await waitForMenuState(page, true);
        await page
          .locator('#site-menu [data-language-option="en"]')
          .evaluate((link) => link.click());
        await page.waitForFunction(
          () =>
            location.pathname === "/en/residential/" &&
            document.documentElement.lang === "en" &&
            !document.querySelector("#site-menu")?.open &&
            window.__ttLocaleModeProbe?.replay &&
            !document.body.classList.contains("is-transitioning"),
          null,
          { timeout: 6_000 },
        );
        const after = await page.evaluate(() => ({
          containerIdentity:
            window.__ttLocaleModeProbe.container ===
            document.querySelector('[data-barba="container"]'),
          historyLength: history.length,
          replay: window.__ttLocaleModeProbe.replay,
          scrollY: window.scrollY,
          timeOrigin: performance.timeOrigin,
          transitioning: document.body.classList.contains("is-transitioning"),
        }));
        assert(
          after.containerIdentity &&
            after.historyLength === before.historyLength &&
            after.timeOrigin === before.timeOrigin &&
            Math.abs(after.scrollY - before.scrollY) <= 2 &&
            !after.transitioning,
          `${testCase.label} replaced the document or moved scroll: ${JSON.stringify({ before, after })}`,
        );
        if (testCase.reducedMotion === "reduce") {
          assert(
            after.replay.reducedMotion === true && after.replay.replayed === false,
            `Reduced motion replayed entrance motion: ${JSON.stringify(after.replay)}`,
          );
        }
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runSsrCmsHydrationCheck(cases = SSR_CMS_HYDRATION_CASES) {
  const viewport = { width: 390, height: 844 };
  for (const expected of cases) {
    await runPageCase(
      `SSR CMS survives hydration ${routeSlug(expected.route)}`,
      { route: expected.route, viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, expected.route);
        const rendered = await page.evaluate(() => {
          const hero = document.querySelector(".hero");
          const normalize = (value) => value.replace(/\s+/g, " ").trim();
          const navigationLabel = (selector) => {
            const link = [...document.querySelectorAll(selector)].find((node) =>
              new URL(node.href).pathname.endsWith("/advertising-products/"),
            );
            const label = link?.matches("[data-vi], [data-en]")
              ? link
              : link?.querySelector("[data-vi], [data-en]");
            // Full menu tách tiêu đề nhỏ/lớn: tên đầy đủ nằm ở aria-label.
            return normalize(link?.getAttribute("aria-label") || label?.textContent || link?.textContent || "");
          };
          const title = document.querySelector("title[data-en]");
          const description = document.querySelector('meta[name="description"]');
          return {
            locale: document.documentElement.lang,
            title: document.title,
            sourceTitle: title?.dataset.en,
            description: description?.getAttribute("content"),
            sourceDescription: description?.dataset.enContent,
            kicker: normalize(hero?.querySelector("[data-cms=\"hero.kicker\"]")?.textContent || ""),
            heroTitle: normalize(hero?.querySelector("h1")?.textContent || ""),
            motto: normalize(hero?.querySelector("[data-cms=\"hero.motto\"]")?.textContent || ""),
            headerLabel: navigationLabel("[data-site-header] a[href]"),
            menuLabel: navigationLabel("#site-menu .menu-group a[href]"),
          };
        });
        assert(rendered.locale === expected.locale, `${expected.route}: wrong rendered locale`);
        // Case này chứng minh D1 SSR thắng static fallback; chỉ CMS Worker với D1 mới serve nó
        // (cms.md, CMS dormant). Với static preview, copy data-en tĩnh phải còn sống thay vào đó.
        if (expected.requiresStaticFallbackMismatch && process.env.TT_E2E_D1 !== "1") {
          assert(
            rendered.title === rendered.sourceTitle && rendered.description === rendered.sourceDescription,
            `${expected.route}: static title or description was replaced after hydration`,
          );
          assertDiagnostics(diagnostics);
          return;
        }
        assert(rendered.title === expected.title, `${expected.route}: D1 title was replaced after hydration`);
        assert(rendered.description === expected.description, `${expected.route}: D1 description was replaced after hydration`);
        if (expected.kicker) {
          assert(rendered.kicker === expected.kicker, `${expected.route}: D1 hero kicker was replaced after hydration`);
        }
        if (expected.motto) {
          assert(rendered.motto === expected.motto, `${expected.route}: D1 hero motto was replaced after hydration`);
        }
        if (expected.heroTitle) {
          assert(rendered.heroTitle === expected.heroTitle, `${expected.route}: D1 hero title was replaced after hydration`);
        }
        if (expected.navigationLabel) {
          assert(
            rendered.headerLabel === expected.navigationLabel && rendered.menuLabel === expected.navigationLabel,
            `${expected.route}: header or full-menu label escaped its entity text`,
          );
        }
        if (expected.requiresStaticFallbackMismatch) {
          assert(
            rendered.sourceTitle !== expected.title && rendered.sourceDescription !== expected.description,
            `${expected.route}: assertion still relies on static data-en fallback values`,
          );
        }
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runMenuChecks() {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await runPageCase(
      `menu open close and route click ${viewport.width}x${viewport.height}`,
      { route: "/vi/", viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, "/vi/?locale=test");
        await restoreHeaderForMenu(page);
        await page.evaluate(() => {
          window.__menuLanguageOpacityTransitions = [];
          document
            .querySelectorAll("#site-menu .menu-language [data-language-option]")
            .forEach((link) => {
              ["transitionrun", "transitionstart", "transitionend", "transitioncancel"].forEach((type) => {
                link.addEventListener(type, (event) => {
                  if (event.propertyName === "opacity") {
                    window.__menuLanguageOpacityTransitions.push(`${type}:${event.propertyName}`);
                  }
                });
              });
            });
        });
        await page.locator("[data-menu-open]").click();
        await waitForMenuState(page, true);
        await page.waitForTimeout(250);
        const earlyFrame = await page.locator("#site-menu").evaluate((dialog) => {
          const shutters = [...dialog.querySelectorAll(".menu-shutters i")];
          const animatedCopy = [
            dialog.querySelector(".menu-brand"),
            dialog.querySelector(".menu-appointment"),
            ...dialog.querySelectorAll(".menu-group"),
            ...dialog.querySelectorAll(".menu-group__number, .menu-group__title, .menu-option"),
            dialog.querySelector(".menu-close__icon"),
          ].filter(Boolean);
          const visibleCopy = animatedCopy.filter((element) => {
            const style = getComputedStyle(element);
            return style.visibility !== "hidden" && Number.parseFloat(style.opacity) > 0.01;
          });
          return {
            coverageIncomplete: shutters.some(
              (shutter) =>
                shutter.getBoundingClientRect().height < window.innerHeight - 1,
            ),
            copyVisible: visibleCopy.length > 0,
            visibleCopy: visibleCopy.map((element) => element.className),
          };
        });
        assert(
          earlyFrame.coverageIncomplete,
          `${viewport.width}x${viewport.height}: menu background finished before sequencing probe`,
        );
        assert(
          !earlyFrame.copyVisible,
          `${viewport.width}x${viewport.height}: menu copy appeared before background coverage ${earlyFrame.visibleCopy.join(",")}`,
        );
        await waitForMenuVisualState(page);
        const menuContract = await page.locator("#site-menu").evaluate((dialog) => ({
          closeText: dialog
            .querySelector("[data-menu-close]")
            ?.textContent?.trim(),
          titles: [...dialog.querySelectorAll(".menu-group__title")].map((link) => link.getAttribute("href")),
          childGroupCount: dialog.querySelectorAll(".menu-group__links").length,
          childItemCount: dialog.querySelectorAll(".menu-option").length,
          titleFontSizes: [...dialog.querySelectorAll(".menu-group__title")].map(
            (link) => Number.parseFloat(getComputedStyle(link).fontSize),
          ),
          fragmentLinkCount: [...dialog.querySelectorAll("a")].filter((link) => link.hash).length,
          dividers: [...dialog.querySelectorAll(".menu-group")].map((group) => {
            const rect = group.getBoundingClientRect();
            const style = getComputedStyle(group, "::after");
            return {
              height: rect.height,
              dividerHeight: Number.parseFloat(style.height) || 0,
              dividerDisplay: style.display,
            };
          }),
          fitsViewport: (() => {
            const rect = dialog.getBoundingClientRect();
            return rect.left >= -1 && rect.top >= -1 && rect.right <= window.innerWidth + 1 && rect.bottom <= window.innerHeight + 1;
          })(),
          scrollSize: `${dialog.scrollWidth}x${dialog.scrollHeight}/${window.innerWidth}x${window.innerHeight}`,
          overlaps: (() => {
            const links = [...dialog.querySelectorAll(".menu-group__title, .menu-option")];
            const overlaps = [];
            for (let index = 0; index < links.length; index += 1) {
              const first = links[index].getBoundingClientRect();
              for (let next = index + 1; next < links.length; next += 1) {
                const second = links[next].getBoundingClientRect();
                const overlapX = Math.min(first.right, second.right) - Math.max(first.left, second.left);
                const overlapY = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
                if (overlapX > 0.5 && overlapY > 0.5) overlaps.push(`${index}:${next}`);
              }
            }
            return overlaps;
          })(),
          languageOpacityTransitions: window.__menuLanguageOpacityTransitions || [],
          brandParity: (() => {
            const measure = (root) => {
              const lockup = root.querySelector(".brand-lockup");
              const dimensions = (element) => {
                const rect = element.getBoundingClientRect();
                return [rect.x, rect.y, rect.width, rect.height];
              };
              return {
                host: dimensions(root),
                lockup: dimensions(lockup),
                pathCount: lockup.querySelectorAll("path").length,
                textCount: lockup.querySelectorAll("text").length,
                hasUse: Boolean(lockup.querySelector("use")),
              };
            };
            return {
              header: measure(document.querySelector("#header-logo")),
              menu: measure(dialog.querySelector(".menu-brand")),
            };
          })(),
        }));
        assert(
          menuContract.closeText === "",
          `${viewport.width}x${viewport.height}: close control must be icon-only`,
        );
        const desktopLogo = viewport.width > 1200;
        const expectedHeaderWidth = expectedBrandHeaderWidth(viewport.width);
        const expectedHeaderHeight = expectedBrandHeaderHeight(viewport.width);
        const expectedMenuHostWidth = desktopLogo ? 260.981741 : 230.299324;
        const expectedMenuLockupWidth = expectedMenuHostWidth;
        const expectedMenuHeight = desktopLogo ? 67.515625 : 59.578125;
        // `.brand` căn start trong hàng header (style.css), nên lockup nằm trên padding đỉnh.
        const headerPadding = desktopLogo ? 35 : viewport.width <= 750 ? 15 : 25;
        const expectedHeaderPosition = [headerPadding, headerPadding];
        const expectedMenuPosition = [desktopLogo ? 35 : 25, desktopLogo ? 35 : 25];
        assert(
          menuContract.brandParity.header.pathCount === 4 &&
            menuContract.brandParity.menu.pathCount === 4 &&
            menuContract.brandParity.header.textCount === 2 &&
            menuContract.brandParity.menu.textCount === 2 &&
            !menuContract.brandParity.header.hasUse &&
            !menuContract.brandParity.menu.hasUse &&
            menuContract.brandParity.header.host.every(
              (value, index) =>
                Math.abs(
                  value -
                    [
                      ...expectedHeaderPosition,
                      expectedHeaderWidth,
                      expectedHeaderHeight,
                    ][index],
                ) <= 0.25,
            ) &&
            menuContract.brandParity.menu.host.every(
              (value, index) =>
                Math.abs(
                  value -
                    [
                      ...expectedMenuPosition,
                      expectedMenuHostWidth,
                      expectedMenuHeight,
                    ][index],
                ) <= 0.25,
            ) &&
            menuContract.brandParity.header.host.every(
              (value, index) =>
                Math.abs(
                  value - menuContract.brandParity.header.lockup[index],
                ) <= 0.1,
            ) &&
            menuContract.brandParity.menu.lockup.every(
              (value, index) =>
                Math.abs(
                  value -
                    [
                      ...expectedMenuPosition,
                      expectedMenuLockupWidth,
                      expectedMenuHeight,
                    ][index],
                ) <= 0.25,
            ) &&
            menuContract.brandParity.menu.host.slice(0, 2).every(
                (value, index) =>
                  Math.abs(
                    value - menuContract.brandParity.menu.lockup[index],
                  ) <= 0.1,
            ),
          `${viewport.width}x${viewport.height}: header or full-menu lockup differs from live Espacio geometry ${JSON.stringify(menuContract.brandParity)}`,
        );
        assert(
          menuContract.childGroupCount === 4 &&
            menuContract.childItemCount === 17 &&
            menuContract.fragmentLinkCount === 0 &&
            JSON.stringify(menuContract.titles) === JSON.stringify([
              "/vi/residential/",
              "/vi/commercial/",
              "/vi/advertising-products/",
              "/vi/about/",
            ]),
          `${viewport.width}x${viewport.height}: menu groups or non-fragment child routes do not match the contract`,
        );
        const dividerIndexes = viewport.width >= 1201
          ? [0, 1, 2]
          : viewport.width >= 961
            ? [0, 1, 3]
            : viewport.width >= 579
              ? [0, 2]
              : [];
        assert(
          menuContract.dividers.every(({ height, dividerHeight, dividerDisplay }, index) =>
            dividerIndexes.includes(index)
              ? dividerDisplay !== "none" && Math.abs(height - dividerHeight) <= 1
              : dividerDisplay === "none" || dividerHeight <= 0.1,
          ),
          `${viewport.width}x${viewport.height}: menu dividers do not span their full grid rows`,
        );
        assert(
          menuContract.fitsViewport,
          `${viewport.width}x${viewport.height}: menu overflows viewport ${menuContract.scrollSize}`,
        );
        assert(
          menuContract.overlaps.length === 0,
          `${viewport.width}x${viewport.height}: settled menu links overlap ${menuContract.overlaps.join(",")}`,
        );
        assert(
          menuContract.titleFontSizes.length === 4 &&
            menuContract.titleFontSizes.every((size) => Math.abs(size - 28.8) <= 0.1),
          `${viewport.width}x${viewport.height}: menu title size drifted from 28.8px (1.8rem) ${JSON.stringify(menuContract.titleFontSizes)}`,
        );
        assert(
          menuContract.languageOpacityTransitions.length === 0,
          `${viewport.width}x${viewport.height}: language options emitted CSS opacity transitions ${menuContract.languageOpacityTransitions.join(",")}`,
        );
        await Promise.all([
          waitForCanonicalPath(page, "/en/"),
          page.locator('[data-language-option="en"]').evaluate((link) => link.click()),
        ]);
        await waitForLoadedDocument(page);
        assert((await page.evaluate(() => document.documentElement.lang)) === "en", "menu locale control did not navigate to English");
        assert((await page.evaluate(() => `${location.search}${location.hash}`)) === "?locale=test", "menu locale control lost query or retained a fragment");
        await openMenu(page);
        await Promise.all([
          waitForCanonicalPath(page, "/vi/"),
          page.locator('[data-language-option="vi"]').evaluate((link) => link.click()),
        ]);
        await waitForLoadedDocument(page);
        assert((await page.evaluate(() => document.documentElement.lang)) === "vi", "menu locale control did not navigate to Vietnamese");
        assert((await page.evaluate(() => `${location.search}${location.hash}`)) === "?locale=test", "menu locale control did not retain query or clear the fragment");
        await openMenu(page);
        const routeLink = await findRouteLink(page, "#site-menu", "/vi/residential/");
        await clickRouteLink(page, routeLink, "/vi/residential/");
        await openMenu(page);
        const currentTitle = page.locator(
          '#site-menu .menu-group__title[aria-current="page"]',
        );
        assert(
          (await currentTitle.count()) === 1,
          `${viewport.width}x${viewport.height}: menu must expose one current title`,
        );
        const currentUrl = page.url();
        const mainFrameNavigations = [];
        const captureNavigation = (request) => {
          if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
            mainFrameNavigations.push(request.url());
          }
        };
        page.on("request", captureNavigation);
        await currentTitle.focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1_900);
        page.off("request", captureNavigation);
        // Shell R6: parent title hiện tại về đỉnh tại chỗ và đóng menu.
        const currentTitleState = await page.locator("#site-menu").evaluate(
          (dialog) => ({
            open: dialog.open,
            bodyOpen: document.body.classList.contains("menu-open"),
            scrollY: window.scrollY,
          }),
        );
        assert(
          page.url() === currentUrl &&
            mainFrameNavigations.length === 0 &&
            !currentTitleState.open &&
            !currentTitleState.bodyOpen &&
            currentTitleState.scrollY <= 1,
          `${viewport.width}x${viewport.height}: current menu title reloaded the page or did not return to the top: ${JSON.stringify(currentTitleState)}`,
        );
        await openMenu(page);
        const crossRouteTitle = await findRouteLink(
          page,
          "#site-menu",
          "/vi/commercial/",
        );
        await crossRouteTitle.focus();
        await Promise.all([
          waitForCanonicalPath(page, "/vi/commercial/"),
          page.keyboard.press("Enter"),
        ]);
        await waitForLoadedDocument(page);
        assertDiagnostics(diagnostics);
      },
    );
  }
}

// Masonry R4/R7: cửa sổ runtime là layout organic đã seed cho lượt vào này.
async function advertisingWindowIds(page, filter) {
  return (await advertisingWindow(page, filter)).map(({ id }) => id);
}

// `width` tính cửa sổ cho layout viewport mà trang chưa resize tới.
function advertisingWindow(page, filter, width = null) {
  return page.evaluate(async ({ filter, width }) => {
    const { ADVERTISING_CATALOG_ARTIFACT: artifact } = await import("/advertising-products/catalog-artifact.mjs");
    const { advertisingFilterRank, compileAdvertisingProductLayout, getVirtualWindow, matchesAdvertisingFilter, normalizeAdvertisingProductSettings } = await import("/advertising-products/layout-core.mjs");
    const { shuffleWithSeed } = await import("/advertising-products/random-order.mjs");
    const pool = artifact.cards.filter((card) => matchesAdvertisingFilter(card, filter));
    const geometry = compileAdvertisingProductLayout({
      cards: artifact.cards,
      categoryOrder: artifact.categories.map((category) => category.slug),
      datasetVersion: artifact.datasetVersion,
      filter,
      layoutViewportWidth: width ?? document.documentElement.clientWidth,
      settings: normalizeAdvertisingProductSettings(artifact.settings),
      presentationOrder: shuffleWithSeed(pool, window.TruongThinhAdvertising.getBrowseState().seed, `grid:${filter}`)
        .sort((left, right) => advertisingFilterRank(left, filter) - advertisingFilterRank(right, filter)).map(({ id }) => id),
      organicOrder: true,
    });
    return getVirtualWindow(geometry, {
      scrollTop: Math.max(0, -document.querySelector("[data-project-grid]").getBoundingClientRect().top),
      viewportHeight: innerHeight, overscan: innerHeight,
    }).items.map((placement) => ({ id: placement.card.id, x: placement.x, y: placement.y }));
  }, { filter, width });
}

// Lấy mẫu masonry morph trong trang, tính giờ từ event kích hoạt: một vòng CDP khi tải nặng có thể dài hơn
// slide 0.4s, nên mẫu lấy từ phía test chỉ thấy card đã settle. `fromMotion`: tính giờ từ frame đầu card có
// transform (slide bắt đầu), vì runner bận có thể chưa dựng layout mới sau 20ms kể từ cú bấm.
const armMorphSamples = (page, { event = "click", delays, id = null, notCategory = null, fromMotion = false }) => page.evaluate(
  ({ event, delays, id, notCategory, fromMotion }) => {
    const grid = document.querySelector("[data-project-grid]");
    let pickedId = id;
    const sample = () => {
      const tile = pickedId
        ? grid.querySelector(`[data-advertising-card="${pickedId}"]`)
        : [...grid.querySelectorAll(".advertising-tile")].find((item) => !item.hidden && item.dataset.advertisingCategory !== notCategory);
      pickedId ||= tile?.dataset.advertisingCard;
      const style = tile ? getComputedStyle(tile) : null;
      const rect = tile?.getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      return {
        id: pickedId,
        delay: style?.transitionDelay,
        duration: style?.transitionDuration,
        property: style?.transitionProperty,
        transform: style?.transform,
        left: Number.parseFloat(style?.left || "0"),
        top: Number.parseFloat(style?.top || "0"),
        visualLeft: rect ? rect.left - gridRect.left : null,
        visualTop: rect ? rect.top - gridRect.top : null,
      };
    };
    window.__ttMorphSamples = new Promise((resolve) => {
      (event === "click" ? document : window).addEventListener(event, () => {
        const samples = [];
        const start = () => delays.forEach((delay, index) => setTimeout(() => {
          samples[index] = sample();
          if (samples.filter(Boolean).length === delays.length) resolve(samples);
        }, delay));
        if (!fromMotion) return start();
        // Hết 1,5s vẫn chưa trượt thì lấy mẫu luôn để assert báo đúng card đứng yên.
        const deadline = performance.now() + 1_500;
        const wait = () => {
          const transform = sample().transform;
          if ((transform && transform !== "none") || performance.now() > deadline) start();
          else requestAnimationFrame(wait);
        };
        requestAnimationFrame(wait);
      }, { capture: true, once: true });
    });
  },
  { event, delays, id, notCategory, fromMotion },
);
const readMorphSamples = (page) => page.evaluate(() => window.__ttMorphSamples);

async function runAdvertisingFilterCheck() {
  const viewport = { width: 1440, height: 900 };
  await runPageCase(
    "advertising filter hides and reflows",
    { route: "/vi/advertising-products/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/advertising-products/");
      await page.waitForFunction(
        () => document.querySelectorAll("[data-project-grid] .advertising-tile").length > 0,
        null,
        { timeout: 3_000 },
      );
      const before = await page.locator("[data-project-grid]").evaluate((grid) => ({
        height: grid.getBoundingClientRect().height,
        tiles: [...grid.querySelectorAll("[data-advertising-category]")].map(
          (tile) => {
            const rect = tile.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            return {
              id: tile.dataset.advertisingCard,
              category: tile.dataset.advertisingCategory,
              left: rect.left - gridRect.left,
              top: rect.top - gridRect.top,
              transform: getComputedStyle(tile).transform,
            };
          },
        ),
      }));
      // Thứ tự random theo lượt vào, nên chọn card đã mount cũng mở cửa sổ của filter riêng nó.
      const categories = ["displays-booths", "mobile-retail", "signage", "office-signs", "led-displays", "printing-decals"];
      const windows = {};
      for (const category of categories) windows[category] = await advertisingWindow(page, category);
      // Card đứng yên chỗ cũ trong layout filter thì không có morph để đo; chọn card phải dời chỗ.
      const survivorTile = before.tiles.find((tile) => windows[tile.category]?.some((entry) =>
        entry.id === tile.id && Math.hypot(entry.x - tile.left, entry.y - tile.top) > 2));
      assert(survivorTile, `No mounted card survives into its filter window: ${JSON.stringify(windows)}`);
      const survivorId = survivorTile.id;
      const filterSlug = survivorTile.category;
      await page.evaluate(() => {
        const grid = document.querySelector("[data-project-grid]");
        const snapshots = [];
        const capture = () => snapshots.push([...grid.querySelectorAll(".advertising-tile")].map((tile) => tile.dataset.advertisingCard));
        const observer = new MutationObserver(capture);
        observer.observe(grid, { childList: true });
        capture();
        window.__ttCohortProbe = { snapshots, observer };
        window.__ttAdvertisingFilterLayout = new Promise((resolve) => {
          window.addEventListener("site:layout", resolve, { once: true });
        });
      });
      await armMorphSamples(page, { delays: [0, 160], id: survivorId, fromMotion: true });
      await page.locator(`[data-advertising-filter="${filterSlug}"]`).click();
      await page.waitForFunction(
        (slug) => {
          return (
            document
              .querySelector(`[data-advertising-filter="${slug}"]`)
              ?.getAttribute("aria-current") === "true"
          );
        },
        filterSlug,
        { timeout: 3_000 },
      );
      const captureTrajectory = () => page.locator("[data-project-grid]").evaluate((grid, id) => {
        const tile = grid.querySelector(`[data-advertising-card="${id}"]`);
        const style = tile ? getComputedStyle(tile) : null;
        const rect = tile?.getBoundingClientRect();
        const gridRect = grid.getBoundingClientRect();
        return {
          delay: style?.transitionDelay,
          duration: style?.transitionDuration,
          property: style?.transitionProperty,
          transform: style?.transform,
          left: Number.parseFloat(style?.left || "0"),
          top: Number.parseFloat(style?.top || "0"),
          visualLeft: rect ? rect.left - gridRect.left : null,
          visualTop: rect ? rect.top - gridRect.top : null,
        };
      }, survivorId);
      const [origin, during] = await readMorphSamples(page);
      assert(
        during.duration?.split(",").some((value) => Math.abs(Number.parseFloat(value) - 0.4) < 0.01) &&
          during.delay?.split(",").every((value) => Math.abs(Number.parseFloat(value)) < 0.01) &&
          during.property?.includes("transform") &&
          during.transform &&
          during.transform !== "none",
        `Masonry transition did not morph the filter survivor ${survivorId}: ${JSON.stringify({ origin, during })}`,
      );
      await page.evaluate(() => window.__ttAdvertisingFilterLayout);
      await page.waitForTimeout(450);
      const settledTrajectory = await captureTrajectory();
      await page.waitForTimeout(80);
      const stableTrajectory = await captureTrajectory();
      const travel = {
        x: settledTrajectory.left - origin.left,
        y: settledTrajectory.top - origin.top,
      };
      const travelDistance = Math.hypot(travel.x, travel.y);
      const originToDestination = Math.hypot(origin.visualLeft - settledTrajectory.left, origin.visualTop - settledTrajectory.top);
      const duringToDestination = Math.hypot(during.visualLeft - settledTrajectory.left, during.visualTop - settledTrajectory.top);
      const observedTravelDistance = Math.hypot(during.visualLeft - origin.visualLeft, during.visualTop - origin.visualTop);
      assert(
        travelDistance > 1 &&
          originToDestination > 2 && observedTravelDistance > 2 && duringToDestination > 2 &&
          duringToDestination < originToDestination &&
          Math.hypot(settledTrajectory.visualLeft - settledTrajectory.left, settledTrajectory.visualTop - settledTrajectory.top) <= 2 &&
          Math.hypot(stableTrajectory.visualLeft - settledTrajectory.visualLeft, stableTrajectory.visualTop - settledTrajectory.visualTop) <= 2,
        `Top-page destination did not travel monotonically from cached origin to settled coordinate: ${JSON.stringify({ origin, during, settledTrajectory, stableTrajectory })}`,
      );

      const after = await page.locator("[data-project-grid]").evaluate((grid) => ({
        height: grid.getBoundingClientRect().height,
        width: grid.clientWidth,
        tiles: [...grid.querySelectorAll("[data-advertising-category]")].map(
          (tile) => {
            const rect = tile.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            return {
              id: tile.dataset.advertisingCard,
              category: tile.dataset.advertisingCategory,
              left: rect.left - gridRect.left,
              top: rect.top - gridRect.top,
              right: rect.right - gridRect.left,
              bottom: rect.bottom - gridRect.top,
              transform: getComputedStyle(tile).transform,
            };
          },
        ),
      }));
      const visible = after.tiles;
      const cohortSnapshots = await page.evaluate(() => {
        const probe = window.__ttCohortProbe;
        probe.observer.disconnect();
        delete window.__ttCohortProbe;
        return probe.snapshots;
      });
      const expectedWindow = await advertisingWindowIds(page, filterSlug);
      assert(JSON.stringify(after.tiles.map((tile) => tile.id).sort()) === JSON.stringify([...expectedWindow].sort()),
        "Settled filter DOM does not equal the expected normal virtual window");
      const allowedCohort = new Set([...before.tiles.map((tile) => tile.id), ...expectedWindow]);
      assert(cohortSnapshots.length > 1 && cohortSnapshots.every((ids) => ids.every((id) => allowedCohort.has(id))),
        `Filter cohort escaped old/new virtual-window union: ${JSON.stringify(cohortSnapshots)}`);
      assert(visible.length > 0, `${filterSlug} filter did not mount a top-page destination window`);
      assert(
        // Cụm gồm cả card có sản phẩm phụ trong cụm (taxonomy R1), nên so với cửa sổ filter thay vì category.
        visible.every((tile) => expectedWindow.includes(tile.id)),
        `A non-${filterSlug} tile remained visible`,
      );
      assert(
        after.height < before.height,
        `Project grid did not shrink: ${before.height}px → ${after.height}px`,
      );
      const noOverlap = visible.every((tile, index) =>
        tile.left >= -1 && tile.top >= -1 && tile.right <= after.width + 1 &&
        visible.slice(index + 1).every((next) =>
          Math.min(tile.right, next.right) - Math.max(tile.left, next.left) <= 1 ||
          Math.min(tile.bottom, next.bottom) - Math.max(tile.top, next.top) <= 1,
        ),
      );
      assert(noOverlap, `Filtered ${filterSlug} geometry overflowed or overlapped`);
      assert(
        (await page
          .locator(`[data-advertising-filter="${filterSlug}"]`)
          .getAttribute("aria-current")) === "true",
        "Active filter did not expose aria-current=true",
      );
      const nextSlug = categories.find((category) => category !== filterSlug);
      const nextId = (await advertisingWindowIds(page, nextSlug))[0];
      const categoryOriginMounted = await page.locator("[data-project-grid]").evaluate((grid, id) =>
        Boolean(grid.querySelector(`[data-advertising-card="${id}"]`)), nextId,
      );
      assert(!categoryOriginMounted, `${nextId} must not be mounted before category-to-category filter morph`);
      await armMorphSamples(page, { delays: [180], id: nextId });
      await page.locator(`[data-advertising-filter="${nextSlug}"]`).click();
      const [categoryDuring] = await readMorphSamples(page);
      assert(
        categoryDuring.duration?.split(",").some((value) => Math.abs(Number.parseFloat(value) - 0.4) < 0.01) &&
          categoryDuring.delay?.split(",").every((value) => Math.abs(Number.parseFloat(value)) < 0.01) &&
          categoryDuring.transform && categoryDuring.transform !== "none",
        `Masonry transition did not generalize to category-to-category destination: ${JSON.stringify({ categoryOriginMounted, categoryDuring })}`,
      );
      await page.waitForTimeout(450);
      await armMorphSamples(page, { delays: [0, 160, 460], notCategory: nextSlug, fromMotion: true });
      await page.locator('[data-advertising-filter="all"]').click();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-advertising-filter="all"]')?.getAttribute("aria-current") === "true",
        null,
        { timeout: 3_000 },
      );
      const [reverseOrigin, reverseDuring, reverseSettled] = await readMorphSamples(page);
      const reverseTravel = {
        x: reverseSettled.left - reverseOrigin.left,
        y: reverseSettled.top - reverseOrigin.top,
      };
      const reverseTravelDistance = Math.hypot(reverseTravel.x, reverseTravel.y);
      const reverseOriginToDestination = Math.hypot(reverseOrigin.visualLeft - reverseSettled.left, reverseOrigin.visualTop - reverseSettled.top);
      const reverseDuringToDestination = Math.hypot(reverseDuring.visualLeft - reverseSettled.left, reverseDuring.visualTop - reverseSettled.top);
      const reverseObservedTravel = Math.hypot(reverseDuring.visualLeft - reverseOrigin.visualLeft, reverseDuring.visualTop - reverseOrigin.visualTop);
      assert(
        reverseOrigin.id === reverseDuring.id &&
          reverseDuring.duration?.split(",").some((value) => Math.abs(Number.parseFloat(value) - 0.4) < 0.01) &&
          reverseDuring.delay?.split(",").every((value) => Math.abs(Number.parseFloat(value)) < 0.01) &&
          reverseDuring.transform && reverseDuring.transform !== "none" &&
          reverseTravelDistance > 1 && reverseOriginToDestination > 2 && reverseObservedTravel > 2 &&
          reverseDuringToDestination > 2 && reverseDuringToDestination < reverseOriginToDestination &&
          Math.hypot(reverseSettled.visualLeft - reverseSettled.left, reverseSettled.visualTop - reverseSettled.top) <= 2 &&
          (!reverseSettled.transform || reverseSettled.transform === "none"),
        `Category-to-all unshared tile did not travel from an old visual slot: ${JSON.stringify({ reverseOrigin, reverseDuring, reverseSettled })}`,
      );
      await page.waitForTimeout(450);
      const beforeResize = await page.locator("[data-project-grid] .advertising-tile").evaluateAll((tiles) =>
        tiles.map((tile) => ({ id: tile.dataset.advertisingCard, x: Number.parseFloat(tile.style.left), y: Number.parseFloat(tile.style.top) })),
      );
      const resizeWindow = await advertisingWindow(page, "all", 1200);
      const resizeTarget = resizeWindow.find((placement) =>
        beforeResize.some((tile) => tile.id === placement.id && Math.hypot(tile.x - placement.x, tile.y - placement.y) > 2),
      );
      assert(resizeTarget, "No mounted card moves between the 1440 and 1200 layouts");
      await armMorphSamples(page, { event: "resize", delays: [180], id: resizeTarget.id });
      await page.setViewportSize({ width: 1200, height: 900 });
      const [resizeDuring] = await readMorphSamples(page);
      assert(
        resizeDuring.duration?.split(",").some((value) => Math.abs(Number.parseFloat(value) - 0.4) < 0.01) &&
          resizeDuring.delay?.split(",").every((value) => Math.abs(Number.parseFloat(value)) < 0.01) &&
          resizeDuring.transform && resizeDuring.transform !== "none",
        `Masonry resize did not retain an active position morph: ${JSON.stringify(resizeDuring)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );
  await runPageCase(
    "advertising filter reduced motion is instant",
    { route: "/vi/advertising-products/", viewport, reducedMotion: "reduce" },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/advertising-products/");
      await page.locator('[data-advertising-filter="mobile-retail"]').click();
      await page.waitForFunction(
        () => document.querySelector('[data-advertising-filter="mobile-retail"]')?.getAttribute("aria-current") === "true",
        null,
        { timeout: 3_000 },
      );
      // Thứ tự card là ngẫu nhiên theo seed nên không có id cố định nào chắc chắn nằm trong cửa sổ ảo; lấy tile đang mount.
      await page.waitForFunction(() => document.querySelector("[data-project-grid] .advertising-tile"), null, { timeout: 3_000 });
      const reduced = await page.locator("[data-project-grid]").evaluate((grid) => {
        const style = getComputedStyle(grid.querySelector(".advertising-tile"));
        return { duration: style.transitionDuration, transform: style.transform };
      });
      assert(
        reduced.duration?.split(",").every((value) => Math.abs(Number.parseFloat(value)) < 0.01) &&
          (!reduced.transform || reduced.transform === "none"),
        `Reduced-motion filter retained position motion: ${JSON.stringify(reduced)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );
  await runPageCase(
    "advertising scroll during filter motion catches up",
    { route: "/vi/advertising-products/?category=mobile-retail", viewport: { width: 679, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/advertising-products/?category=mobile-retail");
      await page.waitForFunction(
        () => document.querySelector('[data-advertising-filter="mobile-retail"]')?.getAttribute("aria-current") === "true",
        null,
        { timeout: 3_000 },
      );
      await page.evaluate(() => {
        window.__ttPendingScrollLayoutEvents = 0;
        window.addEventListener("site:layout", () => {
          window.__ttPendingScrollLayoutEvents += 1;
        });
      });
      await page.locator('[data-advertising-filter="all"]').click();
      await page.waitForTimeout(50);
      const target = await page.locator("[data-project-grid]").evaluate((grid) =>
        grid.getBoundingClientRect().top + window.scrollY + 3000,
      );
      const scrollDuringMotion = await page.evaluate((y) => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, y);
        return window.scrollY;
      }, target);
      assert(scrollDuringMotion >= target - 2, `Native scroll did not reach the target during the filter morph: ${JSON.stringify({ scrollDuringMotion, target })}`);
      await page.waitForTimeout(650);
      const state = await page.locator("[data-project-grid]").evaluate((grid, y) => {
        const gridTop = grid.getBoundingClientRect().top + window.scrollY;
        const localScroll = y - gridTop;
        const expected = { top: Math.max(0, localScroll - innerHeight), bottom: localScroll + innerHeight * 2 };
        const tiles = [...grid.querySelectorAll(".advertising-tile")].map((tile) => ({
          top: Number.parseFloat(tile.style.top),
          bottom: Number.parseFloat(tile.style.top) + Number.parseFloat(tile.style.height),
          instant: getComputedStyle(tile).transitionDuration.split(",").every((value) => Math.abs(Number.parseFloat(value)) < 0.01),
        }));
        return {
          count: tiles.length,
          scrollY: window.scrollY,
          active: document.querySelector('[data-advertising-filter="all"]')?.getAttribute("aria-current"),
          expected,
          intersectsExpectedRange: tiles.some((tile) => tile.top >= expected.top && tile.top < expected.bottom),
          instant: tiles.every((tile) => tile.instant),
          layoutEvents: window.__ttPendingScrollLayoutEvents,
        };
      }, target);
      assert(state.active === "true", `All filter did not remain active during deferred scroll: ${JSON.stringify(state)}`);
      assert(state.scrollY >= target - 2 && state.count > 0 && state.count < 120 && state.intersectsExpectedRange && state.instant && state.layoutEvents === 1, `Virtual window did not catch up after the filter layout without a second site:layout (same page height, scroll-feel R1): ${JSON.stringify(state)}`);
      assertDiagnostics(diagnostics);
    },
  );
}

async function runPublicSelectionCheck({ advertisingOnly = false } = {}) {
  const routeSuffixes = advertisingOnly
    ? [{ name: "Advertising parent", path: "/advertising-products/" }]
    : [
        { name: "Home", path: "/" },
        { name: "Residential", path: "/residential/" },
        { name: "Commercial", path: "/commercial/" },
        { name: "Advertising parent", path: "/advertising-products/" },
        { name: "Advertising detail", path: "/advertising-products/kiosk-posm/" },
      ];
  for (const locale of ["vi", "en"]) {
    for (const route of routeSuffixes) {
      const pathname = `/${locale}${route.path}`;
      await runPageCase(
        `${route.name} public text selection ${locale}`,
        { route: pathname, viewport: { width: 1440, height: 900 } },
        async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, pathname);
        const selection = async () => page.evaluate(() => {
          const selectors = {
            heading: "main h1, main h2",
            body: "main p",
            caption: "main figcaption",
            nav: "[data-site-header] a",
            menu: "#site-menu a",
            filter: "[data-advertising-filter]",
            button: "[data-menu-open]",
          };
          return Object.fromEntries(
            Object.entries(selectors)
              .map(([role, selector]) => [role, document.querySelector(selector)])
              .filter(([, element]) => element)
              .map(([role, element]) => [role, getComputedStyle(element).userSelect]),
          );
        });
        const normal = await selection();
        assert(
          ["heading", "body", "nav", "menu", "button"].every((role) => role in normal) &&
          Object.values(normal).every((value) => value === "auto"),
          `${route.name} ${locale} public text roles lost normal user-select:auto: ${JSON.stringify(normal)}`,
        );
        await page.evaluate(() => document.documentElement.classList.add("has-scroll-dragging"));
        const dragging = await selection();
        assert(
          Object.values(dragging).every((value) => value === "none"),
          `${route.name} ${locale} scroll dragging did not temporarily disable public text selection: ${JSON.stringify(dragging)}`,
        );
        await page.evaluate(() => document.documentElement.classList.remove("has-scroll-dragging"));
        const restored = await selection();
        assert(
          Object.values(restored).every((value) => value === "auto"),
          `${route.name} ${locale} public text selection did not recover after dragging: ${JSON.stringify(restored)}`,
        );
        assertDiagnostics(diagnostics);
        },
      );
    }
  }
}

const runAdvertisingSelectionCheck = () => runPublicSelectionCheck({ advertisingOnly: true });

async function runAdvertisingFreshBarbaReadinessChecks({ expectedCardCount = null } = {}) {
  let runtimeContract;
  if (expectedCardCount !== null) {
    const { buildAdvertisingArtifact } = await import(
      pathToFileURL(path.join(SITE_ROOT, "advertising-products", "catalog.mjs")).href
    );
    const { compileAdvertisingProductLayout: compileAdvertisingLayout, getVirtualWindow } = await import(
      pathToFileURL(path.join(SITE_ROOT, "advertising-products", "layout-core.mjs")).href
    );
    const { shuffleWithSeed } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "random-order.mjs")).href);
    const artifact = buildAdvertisingArtifact();
    if (expectedCardCount === "current") expectedCardCount = artifact.cards.length;
    assert(
      artifact.cards.length === expectedCardCount,
      `Advertising Barba contract expected ${expectedCardCount} cards, got ${artifact.cards.length}`,
    );
    runtimeContract = { artifact, compileAdvertisingLayout, getVirtualWindow, shuffleWithSeed };
  }
  const cases = [
    { locale: "vi", viewport: { width: 1440, height: 900 }, slowVendor: true },
    { locale: "en", viewport: { width: 1440, height: 900 } },
    { locale: "vi", viewport: { width: 390, height: 844 } },
    { locale: "en", viewport: { width: 390, height: 844 } },
  ];
  for (const testCase of cases) {
    const destination = `/${testCase.locale}/advertising-products/`;
    await runPageCase(
      `fresh Home to Advertising Barba readiness ${testCase.locale} ${testCase.viewport.width}px`,
      { route: `/${testCase.locale}/`, viewport: testCase.viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        let vendorIntercepted = false;
        if (testCase.slowVendor) {
          await page.route("**/assets/vendor/masonry-4.2.2.min.js", async (route) => {
            vendorIntercepted = true;
            const response = await route.fetch();
            await new Promise((resolve) => setTimeout(resolve, 180));
            await route.fulfill({ response });
          });
        }
        await gotoRoute(page, `/${testCase.locale}/`);
        assert(
          await page.evaluate(() => typeof window.Masonry !== "function"),
          "fresh Home unexpectedly carried Advertising Masonry before public navigation",
        );
        const linkScope = testCase.viewport.width <= 980 ? "#site-menu" : "[data-site-header]";
        if (linkScope === "#site-menu") await openMenu(page);
        const link = await findRouteLink(page, linkScope, destination);
        await Promise.all([waitForCanonicalPath(page, destination), link.click()]);
        await page.waitForFunction(
          () => {
            const grid = document.querySelector("[data-project-grid].advertising-grid");
            return Boolean(
              document.body.classList.contains("is-transitioning") &&
              grid?.querySelector(".advertising-tile") &&
              window.gsap?.version === "3.15.0" &&
              typeof window.SplitText === "function" &&
              typeof window.Masonry === "function" &&
              window.lazySizes?.loader,
            );
          },
          null,
          { timeout: 6_000 },
        );
        const state = await page.evaluate(async (cardCount) => {
          const grid = document.querySelector("[data-project-grid]");
          const artifactPath = "/advertising-products/catalog-artifact.mjs";
          const artifact = cardCount === null ? null : await import(artifactPath);
          return {
            grids: document.querySelectorAll("[data-project-grid].advertising-grid").length,
            masonry: typeof window.Masonry === "function",
            lazySizes: Boolean(window.lazySizes?.loader),
            splitText: typeof window.SplitText === "function",
            gsap: window.gsap?.version,
            rawNoScript: grid?.textContent.trim().startsWith("<figure") || false,
            noscript: grid?.querySelector("noscript") !== null,
            path: window.location.pathname,
            tiles: grid?.querySelectorAll(".advertising-tile").length || 0,
            tileIds: [...(grid?.querySelectorAll(".advertising-tile") || [])].map(
              (tile) => tile.getAttribute("data-advertising-card"),
            ),
            gridHeight: Number.parseFloat(Reflect.get(grid || {}, "style")?.height || "0"),
            gridTop: grid ? grid.getBoundingClientRect().top + window.scrollY : 0,
            layoutViewportWidth: document.documentElement.clientWidth,
            scrollY: window.scrollY,
            viewportHeight: window.innerHeight,
            artifactCards: artifact?.ADVERTISING_CATALOG_ARTIFACT?.cards?.length ?? null,
            transitioning: document.body.classList.contains("is-transitioning"),
            seed: window.TruongThinhAdvertising?.getBrowseState?.()?.seed ?? null,
          };
        }, expectedCardCount);
        const expectedRuntime = runtimeContract
          ? (() => {
              const layout = runtimeContract.compileAdvertisingLayout({
                cards: runtimeContract.artifact.cards,
                categoryOrder: runtimeContract.artifact.categories.map((category) => category.slug),
                datasetVersion: runtimeContract.artifact.datasetVersion,
                filter: "all",
                layoutViewportWidth: state.layoutViewportWidth,
                // Lưới xếp ngẫu nhiên theo lượt xem (masonry R4): dựng lại cùng seed với runtime.
                presentationOrder: runtimeContract.shuffleWithSeed(runtimeContract.artifact.cards, state.seed, "grid:all")
                  .map(({ id }) => id),
                organicOrder: true,
              });
              const ids = runtimeContract.getVirtualWindow(layout, {
                scrollTop: Math.max(0, state.scrollY - state.gridTop),
                viewportHeight: state.viewportHeight,
                overscan: state.viewportHeight,
              }).items.map((placement) => placement.card.id);
              return {
                ids,
                minHeight: layout.totalPixelHeight,
                maxHeight: layout.totalPixelHeight + state.viewportHeight + 2 * layout.interCardGap,
              };
            })()
          : null;
        assert(
          state.path === destination && state.transitioning && state.grids === 1 && state.tiles > 0 &&
            state.masonry && state.lazySizes && state.splitText && state.gsap === "3.15.0" &&
            !state.rawNoScript && !state.noscript &&
            (expectedCardCount === null || state.artifactCards === expectedCardCount) &&
            (!expectedRuntime || (
              JSON.stringify(state.tileIds) === JSON.stringify(expectedRuntime.ids) &&
              state.gridHeight >= expectedRuntime.minHeight - 0.05 &&
              state.gridHeight <= expectedRuntime.maxHeight + 0.05
            )),
          `fresh Barba Advertising readiness failed: ${JSON.stringify({ state, expectedRuntime })}`,
        );
        if (testCase.slowVendor) assert(vendorIntercepted, "bounded slow-vendor readiness interception did not run");
        await page.waitForFunction(() => !document.body.classList.contains("is-transitioning"));
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runAdvertisingDependencyRecoveryChecks() {
  const vendorPattern = "**/assets/vendor/masonry-4.2.2.min.js";
  const installFailedVendor = (page) => page.evaluate(async () => {
    const script = document.createElement("script");
    script.setAttribute("src", "/assets/vendor/masonry-4.2.2.min.js");
    script.dataset.ttAdvertisingDependency = "/assets/vendor/masonry-4.2.2.min.js";
    script.dataset.ttAdvertisingStatus = "failed";
    document.head.append(script);
    await new Promise((resolve) => script.addEventListener("error", resolve, { once: true }));
  });

  await runPageCase(
    "advertising retries a vendor that failed before readiness listeners",
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      let requests = 0;
      await page.route(vendorPattern, async (route) => {
        requests += 1;
        if (requests === 1) return route.abort("failed");
        const response = await route.fetch();
        return route.fulfill({ response });
      });
      await gotoRoute(page, "/vi/");
      await installFailedVendor(page);
      const diagnostics = monitorPage(page);
      const state = await page.evaluate(async () => {
        await window.TruongThinhDetail.ensureAdvertisingDependencies();
        return { masonry: typeof window.Masonry === "function" };
      });
      assert(state.masonry && requests === 2, `Failed vendor did not retry exactly once: ${JSON.stringify({ state, requests })}`);
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "advertising rejects a failed existing vendor without hanging",
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      await page.route(vendorPattern, (route) => route.abort("failed"));
      await gotoRoute(page, "/vi/");
      await installFailedVendor(page);
      const state = await page.evaluate(async () => {
        const started = performance.now();
        const result = await Promise.race([
          window.TruongThinhDetail.ensureAdvertisingDependencies().then(
            () => "resolved",
            () => "rejected",
          ),
          new Promise((resolve) => setTimeout(() => resolve("timed-out"), 1_500)),
        ]);
        return { elapsed: performance.now() - started, result };
      });
      assert(
        state.result === "rejected" && state.elapsed < 1_500,
        `Failed existing vendor readiness hung instead of rejecting: ${JSON.stringify(state)}`,
      );
    },
  );
}

async function runAdvertisingHistoryRemountChecks() {
  const cases = [
    { locale: "vi", viewport: { width: 1440, height: 900 } },
    { locale: "en", viewport: { width: 390, height: 844 } },
  ];
  for (const testCase of cases) {
    const home = `/${testCase.locale}/`;
    const advertising = `/${testCase.locale}/advertising-products/`;
    await runPageCase(
      `advertising Home history remount ${testCase.locale} ${testCase.viewport.width}px`,
      { route: advertising, viewport: testCase.viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        const clickRoute = async (destination) => {
          const scope = testCase.viewport.width <= 980 ? "#site-menu" : "[data-site-header]";
          if (scope === "#site-menu") await openMenu(page);
          const link = await findRouteLink(page, scope, destination);
          await Promise.all([waitForPath(page, destination), link.click()]);
        };
        const catalogState = () => page.evaluate(() => {
          const grid = document.querySelector("[data-project-grid].advertising-grid");
          return {
            grids: document.querySelectorAll("[data-project-grid].advertising-grid").length,
            masonry: typeof window.Masonry === "function",
            lazySizes: Boolean(window.lazySizes?.loader),
            splitText: typeof window.SplitText === "function",
            raw: grid?.textContent.trim().startsWith("<figure") || false,
            tiles: grid?.querySelectorAll(".advertising-tile").length || 0,
          };
        });
        const assertCatalog = async (label) => {
          await page.waitForFunction(() => document.querySelectorAll("[data-project-grid].advertising-grid .advertising-tile").length > 0);
          const state = await catalogState();
          assert(
            state.grids === 1 && state.tiles > 0 && state.masonry && state.lazySizes && state.splitText && !state.raw,
            `${label} did not converge on one ready catalog: ${JSON.stringify(state)}`,
          );
        };
        await gotoRoute(page, advertising);
        await assertCatalog("initial Advertising");
        await clickRoute(home);
        await clickRoute(advertising);
        await assertCatalog("Advertising after Home");
        try {
          await traverseHistory(page, "back", home);
          await traverseHistory(page, "forward", advertising);
        } catch (error) {
          const state = await page.evaluate(() => ({
            path: window.location.pathname,
            containers: [...document.querySelectorAll("[data-barba=container]")].map((container) => container.dataset.barbaNamespace),
            grids: document.querySelectorAll("[data-project-grid].advertising-grid").length,
          }));
          throw new Error(`Advertising history traversal failed: ${error.message}; state=${JSON.stringify(state)}`);
        }
        await assertCatalog("Advertising after Back/Forward");
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runAdvertisingNoOpScrollCheck() {
  for (const width of [1440, 390]) {
    await runPageCase(
      `advertising same-frontier scroll is a no-op ${width}px`,
      { route: "/vi/advertising-products/", viewport: { width, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, "/vi/advertising-products/");
        await page.waitForFunction(() => document.querySelectorAll(".advertising-tile").length > 0);
        const state = await page.evaluate(async () => {
          const grid = document.querySelector("[data-project-grid]");
          const ids = () => [...grid.querySelectorAll(".advertising-tile")].map((tile) => tile.dataset.advertisingCard).sort().join(",");
          const before = ids();
          const calls = { layouts: 0, reloadItems: 0, events: 0 };
          const masonry = window.Masonry.data(grid);
          const originalLayout = masonry.layout;
          const originalReload = masonry.reloadItems;
          masonry.layout = function (...args) { calls.layouts += 1; return originalLayout.apply(this, args); };
          masonry.reloadItems = function (...args) { calls.reloadItems += 1; return originalReload.apply(this, args); };
          const count = () => { calls.events += 1; };
          window.addEventListener("site:layout", count);
          try {
            for (let index = 0; index < 4; index += 1) {
              window.dispatchEvent(innerWidth > 980
                ? new CustomEvent("site:scroll", { detail: { y: window.scrollY } })
                : new Event("scroll"));
            }
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return { before, after: ids(), ...calls };
          } finally {
            masonry.layout = originalLayout;
            masonry.reloadItems = originalReload;
            window.removeEventListener("site:layout", count);
          }
        });
        assert(
          state.layouts === 0 && state.reloadItems === 0 && state.events === 0 && state.before === state.after,
          `same-frontier scroll committed a catalog layout: ${JSON.stringify(state)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runAdvertisingRapidFilterCheck() {
  const { ADVERTISING_CATEGORIES, buildAdvertisingArtifact } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "catalog.mjs")).href);
  const categorySlugs = ADVERTISING_CATEGORIES.map((category) => category.slug);
  const cards = Array.from({ length: 600 }, (_, index) => {
    const category = categorySlugs[index % categorySlugs.length];
    return {
      id: `rapid-${category}-${String(index).padStart(3, "0")}`,
      category,
      rank: index,
      sourceOrder: Math.floor(index / categorySlugs.length),
      media: {
        src: "/assets/content/projects/advertising-kiosk-posm-cover-v2.webp",
        width: 1536,
        height: 1024,
        altVi: "Mẫu kiểm tra rapid-filter",
        altEn: "Rapid-filter test sample",
      },
      titleVi: `Mẫu ${index}`,
      titleEn: `Sample ${index}`,
    };
  });
  const artifact = buildAdvertisingArtifact({ categories: ADVERTISING_CATEGORIES, cards });
  await runPageCase(
    "advertising rapid filter continues from visual coordinates",
    { route: "/vi/advertising-products/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      await page.addInitScript((injectedArtifact) => {
        Object.defineProperty(window, "__TT_ADVERTISING_ARTIFACT__", {
          configurable: true,
          value: injectedArtifact,
          writable: true,
        });
      }, artifact);
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/advertising-products/");
      await page.waitForFunction(
        () => document.querySelectorAll("[data-project-grid] .advertising-tile").length > 0 &&
          document.querySelector('[data-advertising-filter="all"]')?.getAttribute("aria-current") === "true",
        null,
        { timeout: 3_000 },
      );
      await page.locator("[data-project-grid]").evaluate((grid) => {
        const gridTop = grid.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: gridTop, behavior: "instant" });
        window.dispatchEvent(new Event("scroll"));
      });
      await page.waitForTimeout(50);
      await page.locator('[data-advertising-filter="printing-decals"]').evaluate((control) => control.click());
      await page.waitForTimeout(120);
      const rapidStart = await page.locator("[data-project-grid]").evaluate(async (grid) => {
        const gridRect = grid.getBoundingClientRect();
        const before = [...grid.querySelectorAll(".advertising-tile")]
          .filter((tile) => !tile.hidden)
          .map((tile) => {
            const rect = tile.getBoundingClientRect();
            return { x: rect.left - gridRect.left, y: rect.top - gridRect.top };
          });
        const blockRapidTransitionEnd = (event) => {
          if (event.propertyName === "transform" &&
              event.target?.dataset?.advertisingCategory === "mobile-retail") {
            event.stopImmediatePropagation();
          }
        };
        grid.addEventListener("transitionend", blockRapidTransitionEnd, true);
        grid.__blockRapidTransitionEnd = blockRapidTransitionEnd;
        const scrollBefore = window.scrollY;
        grid.closest('[data-barba-namespace="advertising-products"]')
          ?.querySelector('[data-advertising-filter="mobile-retail"]')?.click();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        // Runtime đọc tọa độ nhìn thấy trong frame sau click, nên card đang trượt đã đi thêm một frame (tới ~14px ở đỉnh
        // tốc độ) so với `before`; lấy thêm mẫu ở frame này để gốc morph khớp một trong hai.
        const frameRect = grid.getBoundingClientRect();
        const beforeFrame = [...grid.querySelectorAll(".advertising-tile")]
          .filter((tile) => !tile.hidden)
          .map((tile) => {
            const rect = tile.getBoundingClientRect();
            return { x: rect.left - frameRect.left, y: rect.top - frameRect.top };
          });
        const membersBeforeScroll = [...grid.querySelectorAll(".advertising-tile")]
          .filter((tile) => !tile.hidden)
          .map((tile) => tile.dataset.advertisingCard);
        const scrollTarget = Math.min(
          document.documentElement.scrollHeight - innerHeight,
          scrollBefore + Math.round(innerHeight * 2),
        );
        const gridDocumentTop = grid.getBoundingClientRect().top + window.scrollY;
        const futureCenter = Math.max(0, scrollTarget - gridDocumentTop) + innerHeight * 0.5;
        const trackedItem = Reflect.get(window, "Masonry").data(grid).items
          .filter((item) => !item.element.hidden && item.element.dataset.advertisingCategory === "mobile-retail")
          .sort((left, right) => Math.abs(left.position.y - futureCenter) - Math.abs(right.position.y - futureCenter))[0];
        if (!trackedItem) throw new Error("Rapid filter did not expose an overlapping mobile-retail item");
        // Giữ transition transform của card theo dõi: hết chuyển động phải là "finished", bị cắt ngang là "idle".
        grid.__rapidMorph = trackedItem.element.getAnimations().find((animation) => animation.transitionProperty === "transform");
        if (!grid.__rapidMorph) throw new Error("Rapid filter did not start a transform transition on the tracked item");
        grid.__rapidOldTransitionEnds = 0;
        trackedItem.on("transitionEnd", () => {
          grid.__rapidOldTransitionEnds += 1;
        });
        window.scrollTo({ top: scrollTarget, behavior: "instant" });
        window.dispatchEvent(new Event("scroll"));
        window.dispatchEvent(new CustomEvent("site:scroll", { detail: { y: window.scrollY } }));
        const morph = {
          duration: grid.__rapidMorph.effect.getComputedTiming().duration,
          to: grid.__rapidMorph.effect.getKeyframes().at(-1).transform,
        };
        return { before, beforeFrame, membersBeforeScroll, morph, scrollBefore, scrollTarget, trackedId: trackedItem.element.dataset.advertisingCard };
      });
      const { before, beforeFrame, membersBeforeScroll, morph, scrollTarget, trackedId } = rapidStart;
      const capture = () => page.locator("[data-project-grid]").evaluate((grid, id) => {
        const tile = [...grid.querySelectorAll(".advertising-tile")]
          .find((item) => !item.hidden && item.dataset.advertisingCard === id);
        const gridRect = grid.getBoundingClientRect();
        const rect = tile?.getBoundingClientRect();
        const style = tile ? getComputedStyle(tile) : null;
        return {
          duration: style?.transitionDuration,
          members: [...grid.querySelectorAll(".advertising-tile")].map((item) => item.dataset.advertisingCard),
          morph: grid.__rapidMorph?.playState,
          staleTransitionEnds: grid.__rapidOldTransitionEnds || 0,
          transform: style?.transform,
          target: { x: Number.parseFloat(style?.left || "0"), y: Number.parseFloat(style?.top || "0") },
          visual: rect ? { x: rect.left - gridRect.left, y: rect.top - gridRect.top } : null,
        };
      }, trackedId);
      const origin = await capture();
      // Runner không GPU raster vùng mới sau cú cuộn xa, frame có thể trễ vài trăm ms; đo giữa chừng theo thời gian
      // của chính transition thay vì đồng hồ.
      await page.waitForFunction(() => {
        const morph = document.querySelector("[data-project-grid]").__rapidMorph;
        return morph?.playState !== "running" || morph.currentTime >= 100;
      }, null, { polling: 10, timeout: 2_000 }).catch(() => {});
      const during = await capture();
      await page.waitForFunction((id) => {
        const grid = document.querySelector("[data-project-grid]");
        return grid.__rapidMorph?.playState !== "running" && !grid.querySelector(`[data-advertising-card="${id}"]`)?.style.transform;
      }, trackedId, { timeout: 2_000 }).catch(() => {});
      const settled = await capture();
      await page.locator("[data-project-grid]").evaluate(async (grid, id) => {
        if (!grid.__blockRapidTransitionEnd) return;
        grid.removeEventListener("transitionend", grid.__blockRapidTransitionEnd, true);
        delete grid.__blockRapidTransitionEnd;
        const tile = grid.querySelector(`[data-advertising-card="${id}"]`);
        tile?.dispatchEvent(new TransitionEvent("transitionend", {
          bubbles: true,
          propertyName: "transform",
        }));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }, trackedId);
      const afterStaleEnd = await capture();
      const seededOrigin = origin.target;
      const nearestOrigin = Math.min(...[...before, ...beforeFrame].map((slot) => Math.hypot(seededOrigin.x - slot.x, seededOrigin.y - slot.y)));
      const travel = Math.hypot(settled.target.x - seededOrigin.x, settled.target.y - seededOrigin.y);
      const progressed = Math.hypot(during.visual.x - seededOrigin.x, during.visual.y - seededOrigin.y);
      // Frame trễ trên runner có thể nhảy qua giữa chừng; transition phải đi trọn từ gốc tới đích trong 0.4s.
      const [morphX, morphY] = (morph.to.match(/-?[\d.]+(?=px)/g) || []).map(Number);
      const morphGap = Math.hypot(seededOrigin.x + morphX - settled.target.x, seededOrigin.y + morphY - settled.target.y);
      const membershipChanged = membersBeforeScroll.length !== settled.members.length ||
        membersBeforeScroll.some((id) => !settled.members.includes(id)) ||
        settled.members.some((id) => !membersBeforeScroll.includes(id));
      const staleEndWasInert = JSON.stringify(afterStaleEnd.members) === JSON.stringify(settled.members) &&
        Math.hypot(afterStaleEnd.visual.x - afterStaleEnd.target.x, afterStaleEnd.visual.y - afterStaleEnd.target.y) <= 2 &&
        Math.hypot(afterStaleEnd.target.x - settled.target.x, afterStaleEnd.target.y - settled.target.y) <= 2 &&
        afterStaleEnd.staleTransitionEnds === 0 &&
        (!afterStaleEnd.transform || afterStaleEnd.transform === "none");
      assert(
        origin.duration?.split(",").some((value) => Math.abs(Number.parseFloat(value) - 0.4) < 0.01) &&
          // Mẫu "during" chỉ có nghĩa khi bắt được giữa chừng; frame trễ trên runner có thể làm transition 0.4s chạy xong
          // trước lần đo (morph "finished"), lúc đó transform đã về none. Ca bị cắt ngang vẫn đỏ ở settled.morph và morphGap.
          (during.morph === "finished" || (during.transform && during.transform !== "none")) &&
          nearestOrigin <= 3 && travel > 1 && progressed > 2 && morph.duration === 400 && morphGap <= 2 &&
          membershipChanged && settled.morph === "finished" &&
          Math.hypot(settled.visual.x - settled.target.x, settled.visual.y - settled.target.y) <= 2 &&
          (!settled.transform || settled.transform === "none") &&
          staleEndWasInert &&
          Math.abs((await page.evaluate(() => window.scrollY)) - scrollTarget) <= 2,
        `Rapid filter snapped instead of continuing the Masonry coordinate morph: ${JSON.stringify({ before, membersBeforeScroll, origin, during, settled, afterStaleEnd, morph, morphGap, nearestOrigin, travel, progressed, membershipChanged, staleEndWasInert, scrollTarget })}`,
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runAdvertisingDirectFailureCheck() {
  await runPageCase(
    "advertising direct persistent vendor failure settles without reload",
    { route: "/vi/advertising-products/?direct-vendor-failure=1", viewport: { width: 1440, height: 900 } },
    async (page) => {
      await page.addInitScript(() => {
        window.name = String(Number(window.name || "0") + 1);
      });
      await page.route("**/assets/vendor/masonry-4.2.2.min.js", (route) => route.abort("failed"));
      await gotoRoute(page, "/vi/advertising-products/?direct-vendor-failure=1");
      await page.waitForFunction(
        () => document.querySelector('[data-barba="container"]')?.dataset.advertisingFallback === "failed",
        null,
        { timeout: 6_000 },
      );
      const state = await page.evaluate(() => {
        const grid = document.querySelector("[data-project-grid]");
        return {
          boots: Number(window.name),
          fallback: document.querySelector('[data-barba="container"]')?.dataset.advertisingFallback,
          hidden: grid?.hidden,
          raw: grid?.textContent.trim().startsWith("<figure") || false,
          transitioning: document.body.classList.contains("is-transitioning"),
        };
      });
      assert(
        state.boots === 1 && state.fallback === "failed" && state.hidden && !state.raw && !state.transitioning,
        `Persistent direct vendor failure reloaded or left unsafe catalog content: ${JSON.stringify(state)}`,
      );
    },
  );
}

async function runProjectsProductsHeroEditorialCheck({ motionOnly = false } = {}) {
  await runPageCase(
    "advertising hero text preserves the approved page-load sequence",
    {
      route: "/vi/advertising-products/",
      viewport: { width: 1440, height: 900 },
    },
    async (page) => {
      const diagnostics = monitorPage(page);
      await page.addInitScript(() => {
        /** @type {Array<Record<string, unknown>>} */
        const samples = [];
        const trace = { done: false, samples };
        Reflect.set(window, "__ttAdvertisingHeroTextTrace", trace);
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            const startedAt = performance.now();
            /** @param {Element | null} target */
            const matrix = (target) =>
              target
                ? new DOMMatrixReadOnly(getComputedStyle(target).transform)
                : null;
            const sample = () => {
              const kicker = document.querySelector(
                "[data-motion-hero-kicker]",
              );
              const title = document.querySelector(
                "[data-motion-words][data-motion-hero-title]",
              );
              const wrapper = document.querySelector(
                "[data-motion-hero-wrapper-zoom]",
              );
              const words = [...(title?.querySelectorAll(".motion-word") || [])];
              const filters = [
                ...document.querySelectorAll("[data-advertising-filter]"),
              ];
              const kickerMatrix = matrix(kicker);
              const wrapperMatrix = matrix(wrapper);
              const elapsed = performance.now() - startedAt;
              trace.samples.push({
                elapsed,
                filterOpacities: filters.map((filter) =>
                  Number.parseFloat(getComputedStyle(filter).opacity),
                ),
                filterTransforms: filters.map((filter) =>
                  matrix(filter)?.f || 0,
                ),
                kickerOpacity: Number.parseFloat(
                  kicker ? getComputedStyle(kicker).opacity : "NaN",
                ),
                kickerX: kickerMatrix?.e || 0,
                motionReady:
                  document.documentElement.classList.contains("motion-ready"),
                wordOpacities: words.map((word) =>
                  Number.parseFloat(getComputedStyle(word).opacity),
                ),
                wrapperScale: wrapperMatrix?.a || 1,
              });
              if (elapsed < 3_200) requestAnimationFrame(sample);
              else trace.done = true;
            };
            requestAnimationFrame(sample);
          },
          { once: true },
        );
      });
      await gotoRoute(page, "/vi/advertising-products/");
      await page.waitForFunction(
        () => Reflect.get(window, "__ttAdvertisingHeroTextTrace")?.done,
        null,
        { timeout: 8_000 },
      );
      const trace = await page.evaluate(
        () => Reflect.get(window, "__ttAdvertisingHeroTextTrace").samples,
      );
      const ready = trace.find((sample) => sample.motionReady);
      const kickerMid = trace.find(
        (sample) =>
          sample.kickerOpacity > 0.05 &&
          sample.kickerOpacity < 0.95 &&
          sample.kickerX < -3,
      );
      const filterStart = trace.find(
        (sample) =>
          sample.filterOpacities.length === 7 &&
          sample.filterOpacities.every((opacity) => opacity <= 0.05) &&
          sample.filterTransforms.every((offset) => offset >= 18),
      );
      const filterMid = trace.find(
        (sample) =>
          sample.filterOpacities.some(
            (opacity) => opacity > 0.05 && opacity < 0.95,
          ) &&
          sample.filterOpacities.some((opacity) => opacity <= 0.05),
      );
      const wordStart = trace.find(
        (sample) =>
          sample.wordOpacities.length === 7 &&
          sample.wordOpacities.every((opacity) => opacity <= 0.05),
      );
      const wordMid = trace.find(
        (sample) =>
          sample.wordOpacities.some((opacity) => opacity >= 0.95) &&
          sample.wordOpacities.some((opacity) => opacity <= 0.05),
      );
      const final = trace.at(-1);

      assert(
        ready?.kickerOpacity <= 0.05 && ready.kickerX <= -55 && kickerMid,
        `Advertising hero kicker skipped its delayed left-to-right reveal: ${JSON.stringify({ ready, kickerMid })}`,
      );
      assert(
        filterStart && filterMid &&
          final.filterOpacities.every((opacity) => opacity >= 0.99) &&
          final.filterTransforms.every((offset) => Math.abs(offset) <= 0.5),
        `Advertising hero filters did not preserve their staggered entrance: ${JSON.stringify({ filterStart, filterMid, final })}`,
      );
      assert(
        wordStart && wordMid &&
          final.wordOpacities.every((opacity) => opacity >= 0.99) &&
          trace[0].wrapperScale >= 1.18 && final.wrapperScale <= 1.01,
        `Advertising hero title left the approved word-fade and wrapper-zoom sequence: ${JSON.stringify({ wordStart, wordMid, first: trace[0], final })}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  if (motionOnly) return;

  const cases = [
    { viewport: { width: 320, height: 640 } },
    { viewport: { width: 390, height: 844 } },
    { viewport: { width: 768, height: 900 } },
    { viewport: { width: 1024, height: 900 } },
    { viewport: { width: 1440, height: 900 } },
    {
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    },
  ];

  for (const locale of ["vi", "en"]) {
    for (const testCase of cases) {
      const { viewport, reducedMotion = "no-preference" } = testCase;
      await runPageCase(
        `projects editorial hero ${locale} ${viewport.width}x${viewport.height} ${reducedMotion}`,
        {
          route: `/${locale}/advertising-products/`,
          viewport,
          reducedMotion,
        },
        async (page) => {
          const diagnostics = monitorPage(page);
          await gotoRoute(page, `/${locale}/advertising-products/`);
          await page.waitForFunction(
            () =>
              [...document.querySelectorAll(".detail-index-hero .project-filter")].every(
                (filter) => {
                  const styles = getComputedStyle(filter);
                  return styles.visibility !== "hidden" && Number.parseFloat(styles.opacity) > 0.99;
                },
              ),
            null,
            { timeout: 5_000 },
          );
          const hero = await page.locator(".detail-index-hero").evaluate((element) => {
            const parseColor = (value) => value.match(/[\d.]+/g)?.map(Number) || [];
            const isInk = (value) => {
              const channels = parseColor(value);
              return channels.length >= 3 && channels[0] <= 64 && channels[1] <= 64 && channels[2] <= 64;
            };
            const isWhite = (value) => {
              const channels = parseColor(value);
              return channels.length >= 3 && channels[0] >= 245 && channels[1] >= 245 && channels[2] >= 245;
            };
            const normalize = (value) => value.replace(/\s+/g, " ").trim();
            const rect = (target) => {
              const bounds = target.getBoundingClientRect();
              return {
                top: bounds.top,
                right: bounds.right,
                bottom: bounds.bottom,
                left: bounds.left,
                width: bounds.width,
                height: bounds.height,
              };
            };
            const heading = element.querySelector("h1");
            const headingRect = rect(heading);
            const lineRects = [...heading.querySelectorAll(".detail-hero-line-mask")].map(rect);
            const textRects = [...heading.querySelectorAll("[data-motion-word-source]")].map((source) => {
              const range = document.createRange();
              range.selectNodeContents(source);
              const bounds = range.getBoundingClientRect();
              return {
                left: bounds.left,
                right: bounds.right,
                width: bounds.width,
                center: bounds.left + bounds.width / 2,
              };
            });
            const activeFilter = element.querySelector('.project-filter[aria-current="true"]');
            const activeFilterStyles = getComputedStyle(activeFilter);
            const header = document.querySelector("[data-site-header]");
            const styles = getComputedStyle(element);
            const heroRect = rect(element);
            const contentRect = rect(element.querySelector(".hero-content"));
            const kicker = element.querySelector(".hero-kicker");
            const kickerRect = rect(kicker);
            const filtersRect = rect(element.querySelector(".project-filters"));
            const scrollCue = element.querySelector(".detail-index-hero__scroll");
            const scrollRect = rect(scrollCue);
            const gridRect = rect(document.querySelector("[data-project-grid]"));
            const firstImageRect = rect(
              document.querySelector("[data-project-grid] img"),
            );
            const mobile = window.innerWidth <= 680;
            const expectedGutter = mobile
              ? 15
              : Number.parseFloat(
                  getComputedStyle(document.documentElement).getPropertyValue("--gutter"),
                );

            return {
              backgroundIsWhite: isWhite(styles.backgroundColor),
              filterBorders: [...element.querySelectorAll(".project-filter")].map((filter) => getComputedStyle(filter).borderStyle),
              hasHeroSlides: element.querySelector(".hero-slides") !== null,
              hasHeroMedia: Boolean(element.querySelector("img, figure")),
              hasHeroKicker: Boolean(kicker),
              hasHeroMotto: element.querySelector(".detail-hero-motto") !== null,
              oneH1: document.querySelectorAll("main h1").length === 1,
              headerIsInk: header?.classList.contains("is-ink") === true,
              headingColorIsInk: isInk(getComputedStyle(heading).color),
              headingFits: heading.scrollWidth <= heading.clientWidth + 1 && headingRect.left >= -1 && headingRect.right <= window.innerWidth + 1 && lineRects.every((line) => line.left >= -1 && line.right <= window.innerWidth + 1),
              headingFontSize: Number.parseFloat(getComputedStyle(heading).fontSize),
              headingLineCount: lineRects.length,
              headingText: normalize(heading.textContent),
              kickerText: normalize(kicker.textContent),
              scrollText: normalize(scrollCue.textContent),
              letterSpacing: Number.parseFloat(getComputedStyle(heading).letterSpacing),
              titleAlignment:
                textRects.length === 2 &&
                (mobile
                  ? textRects.every(
                      (textRect) =>
                        Math.abs(
                          textRect.center -
                            (headingRect.left + headingRect.width / 2),
                        ) <= 2,
                    )
                  : Math.abs(textRects[0].left - headingRect.left) <= 2 &&
                    Math.abs(textRects[1].right - headingRect.right) <= 2),
              activeUnderlineVisible: activeFilterStyles.textDecorationLine.includes("underline") && activeFilterStyles.textDecorationThickness === "3px" && activeFilterStyles.textUnderlineOffset === "4px",
              contentIsWithinHero: [contentRect, kickerRect, headingRect, filtersRect, scrollRect].every(
                (rect) =>
                  rect.top >= heroRect.top - 1 &&
                  rect.bottom <= heroRect.bottom + 1 &&
                  rect.left >= heroRect.left - 1 &&
                  rect.right <= heroRect.right + 1,
              ),
              titleBlockStartsWithinHero: headingRect.top >= heroRect.top - 1,
              kickerLeadsTitle:
                kickerRect.top < headingRect.top &&
                kickerRect.bottom <= headingRect.top + 1,
              // Nhãn cụm dài làm rail tablet xuống nhiều dòng và mọc lên trên; rail vẫn phải nằm dưới tiêu đề hoặc trong 40% dưới hero.
              filtersAreLower: filtersRect.top >= Math.min(headingRect.bottom, heroRect.top + heroRect.height * 0.6),
              viewportMinusFifty:
                heroRect.top <= 1 &&
                Math.abs(heroRect.height - (window.innerHeight - 50)) <= 1,
              gridStartsAtHero:
                Math.abs(gridRect.top - heroRect.bottom) <= 1 &&
                Math.abs(firstImageRect.top - heroRect.bottom) <= 1,
              gridEntersViewport:
                gridRect.top < window.innerHeight &&
                Math.abs(window.innerHeight - gridRect.top - 50) <= 1,
              gridGutterMatches:
                Math.abs(gridRect.left - expectedGutter) <= 1 &&
                Math.abs(window.innerWidth - gridRect.right - expectedGutter) <= 1,
              scrollBottomMatches:
                Math.abs(
                  heroRect.bottom - scrollRect.bottom -
                    (window.innerWidth <= 750 ? 60 : window.innerWidth <= 1200 ? 30 : 45),
                ) <= 1,
              noHorizontalOverflow: document.documentElement.scrollWidth - window.innerWidth <= 1,
              tone: element.dataset.headerTone,
            };
          });

          const expectedTitle =
            locale === "en"
              ? "Keep your brand always in sight"
              : "để thương hiệu luôn trong tầm mắt";
          const expectedKicker =
            locale === "en" ? "Advertising products" : "Sản phẩm quảng cáo";
          const expectedScroll = locale === "en" ? "SCROLL DOWN" : "CUỘN XUỐNG";
          assert(hero.tone === "ink" && hero.headerIsInk, `${locale} ${viewport.width}x${viewport.height}: header did not start in ink tone`);
          assert(hero.backgroundIsWhite && hero.headingColorIsInk, `${locale} ${viewport.width}x${viewport.height}: editorial hero is not white with ink content`);
          assert(!hero.hasHeroSlides && !hero.hasHeroMedia && hero.hasHeroKicker && !hero.hasHeroMotto && hero.oneH1, `${locale} ${viewport.width}x${viewport.height}: Projects-style text hierarchy or media-free hero contract failed`);
          assert(hero.viewportMinusFifty && hero.gridStartsAtHero && hero.gridEntersViewport, `${locale} ${viewport.width}x${viewport.height}: hero does not end 50px before the viewport with the first project row attached`);
          assert(hero.contentIsWithinHero && hero.titleBlockStartsWithinHero, `${locale} ${viewport.width}x${viewport.height}: hero title or controls escape above the hero viewport`);
          assert(hero.kickerText === expectedKicker && hero.kickerLeadsTitle, `${locale} ${viewport.width}x${viewport.height}: hero kicker copy or order changed`);
          assert(hero.headingText === expectedTitle && hero.headingLineCount === 2 && hero.headingFits && hero.titleAlignment, `${locale} ${viewport.width}x${viewport.height}: two-line title overflowed, changed, or lost its reference alignment`);
          assert(hero.headingFontSize <= 112.1 && hero.letterSpacing >= -4.49, `${locale} ${viewport.width}x${viewport.height}: hero title exceeded the editorial type bounds`);
          assert(hero.filterBorders.every((border) => border === "none") && hero.activeUnderlineVisible, `${locale} ${viewport.width}x${viewport.height}: filters are not plain text controls with an active underline`);
          assert(hero.scrollText === expectedScroll && hero.scrollBottomMatches, `${locale} ${viewport.width}x${viewport.height}: localized scroll cue is missing or not at the reference bottom offset`);
          assert(hero.filtersAreLower && hero.gridGutterMatches && hero.noHorizontalOverflow, `${locale} ${viewport.width}x${viewport.height}: lower filter rhythm, grid gutter, or horizontal bounds failed`);
          const kioskFilter = page.locator('[data-advertising-filter="displays-booths"]');
          await kioskFilter.focus();
          assert(
            await kioskFilter.evaluate((filter) => document.activeElement === filter),
            `${locale} ${viewport.width}x${viewport.height}: kiosk filter cannot receive keyboard focus`,
          );

          if (viewport.width <= 390) {
            const firstFilter = page.locator('[data-advertising-filter="all"]');
            const lastFilter = page.locator('[data-advertising-filter="mobile-retail"]');
            await firstFilter.focus();
            for (let index = 0; index < 6; index += 1) {
              await page.keyboard.press("Tab");
            }
            const mobileFilters = await page.locator(".project-filters").evaluate((filters) => {
              const last = filters.lastElementChild;
              const rect = last.getBoundingClientRect();
              const container = filters.getBoundingClientRect();
              return {
                isScrollable: filters.scrollWidth > filters.clientWidth,
                lastFits: rect.left >= container.left - 1 && rect.right <= container.right + 1,
              };
            });
            assert(
              await lastFilter.evaluate((filter) => document.activeElement === filter),
              `${locale} ${viewport.width}x${viewport.height}: Tab did not reach the final mobile filter`,
            );
            assert(mobileFilters.isScrollable && mobileFilters.lastFits, `${locale} ${viewport.width}x${viewport.height}: keyboard focus did not bring the final mobile filter into view`);
            await page.keyboard.press("Enter");
            await page.waitForFunction(
              () => document.querySelector('[data-advertising-filter="mobile-retail"]')?.getAttribute("aria-current") === "true",
              null,
              { timeout: 3_000 },
            );
            await page.keyboard.press("Space");
            assert(
              (await lastFilter.getAttribute("aria-current")) === "true",
              `${locale} ${viewport.width}x${viewport.height}: Space did not preserve final filter activation`,
            );
          }

          assertDiagnostics(diagnostics);
        },
      );
    }
  }
}

async function runAdvertisingGridFocusedChecks() {
  const { ADVERTISING_CATEGORIES, buildAdvertisingArtifact } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "catalog.mjs")).href);
  const { ADVERTISING_LAYOUT_ALGORITHM_VERSION, compileAdvertisingProductLayout: compileAdvertisingLayout } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "layout-core.mjs")).href);
  const { inspectAdvertisingGrid } = await import(pathToFileURL(path.resolve("tests/site/advertising-grid-oracle.mjs")).href);
  const { shuffleWithSeed } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "random-order.mjs")).href);
  const artifact = buildAdvertisingArtifact();
  const categoryOrder = ADVERTISING_CATEGORIES.map((category) => category.slug);
  const matrixWidths = [320, 390, 640, 750, 768, 960, 1024, 1200, 1440, 1920, 2560];
  const contractBoundaryWidths = [750, 960, 1200];
  const columnBoundaryWidths = [500, 735, 990];
  const thresholdWidths = [...new Set([...contractBoundaryWidths, ...columnBoundaryWidths])]
    .flatMap((width) => [width - 1, width, width + 1]);
  const widths = [...new Set([...matrixWidths, ...thresholdWidths])].sort((left, right) => left - right);
  // Bản thuật toán do unit test advertising-products-layout ghim; ở đây chỉ kiểm artifact đi cùng compiler.
  assert(artifact.layoutAlgorithmVersion === ADVERTISING_LAYOUT_ALGORITHM_VERSION, `Advertising artifact version ${artifact.layoutAlgorithmVersion} differs from compiler ${ADVERTISING_LAYOUT_ALGORITHM_VERSION}`);
  assert(
    artifact.cards.every((card) => !Object.prototype.hasOwnProperty.call(card, "presentationCanvas") && !Object.prototype.hasOwnProperty.call(card, "fitMode") && !Object.prototype.hasOwnProperty.call(card, "layoutSpan")),
    "Advertising artifact retained legacy canvas or span authoring fields",
  );
  for (const width of widths) {
    await runPageCase(
      `advertising grid ${width}px`,
      { route: "/vi/advertising-products/", viewport: { width, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, "/vi/advertising-products/");
        await page.waitForFunction(
          () => document.querySelectorAll("[data-project-grid] .advertising-tile").length > 0,
          null,
          { timeout: 3_000 },
        );
        await page.evaluate(() => document.fonts?.ready);
        const measured = await page.locator("[data-project-grid]").evaluate((grid) => {
          const gridBounds = grid.getBoundingClientRect();
          const tiles = [...grid.querySelectorAll(".advertising-tile")].map((tile) => {
            const rect = tile.getBoundingClientRect();
            const media = tile.querySelector(".project-tile__media");
            return {
              id: tile.dataset.advertisingCard,
              left: Number.parseFloat(tile.style.left),
              top: Number.parseFloat(tile.style.top),
              width: Number.parseFloat(tile.style.width),
              height: Number.parseFloat(tile.style.height),
              visualLeft: rect.left - gridBounds.left,
              visualTop: rect.top - gridBounds.top,
              mediaWidth: media?.getBoundingClientRect().width ?? 0,
              mediaHeight: media?.getBoundingClientRect().height ?? 0,
              images: media?.querySelectorAll("img").length ?? 0,
              backplates: media?.querySelectorAll(".advertising-tile__backplate").length ?? 0,
              fitMode: media?.getAttribute("data-media-fit"),
            };
          });
          return {
            viewportWidth: document.documentElement.clientWidth,
            left: gridBounds.left,
            right: document.documentElement.clientWidth - gridBounds.right,
            width: gridBounds.width,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            tiles,
            outerToken: Number.parseFloat(getComputedStyle(grid.closest(".project-index")).getPropertyValue("--advertising-outer")),
            gapToken: Number.parseFloat(getComputedStyle(grid).getPropertyValue("--advertising-gap")),
            captionCount: grid.querySelectorAll("figcaption").length,
          };
        });
        const expectedOuter = measured.viewportWidth <= 750 ? 15 : measured.viewportWidth <= 1200 ? 25 : 35;
        const expectedGap = measured.viewportWidth <= 960 ? 15 : measured.viewportWidth <= 1200 ? 25 : 35;
        // advertising-masonry R5: không có bề rộng tối đa, C = min(4, max(2, floor((W + G) / (220 + G)))).
        const expectedGridWidth = measured.viewportWidth - 2 * expectedOuter;
        const expectedEffectiveOuter = expectedOuter;
        const expectedColumns = Math.min(4, Math.max(2, Math.floor((expectedGridWidth + expectedGap) / (220 + expectedGap))));
        const expectedCardWidth = (expectedGridWidth - expectedGap * (expectedColumns - 1)) / expectedColumns;
        // Lưới xếp theo thứ tự ngẫu nhiên của lượt xem (random browse): dựng lại cùng seed như runtime.
        const seed = await page.evaluate(() => window.TruongThinhAdvertising.getBrowseState().seed);
        const expectedLayout = compileAdvertisingLayout({
          cards: artifact.cards,
          categoryOrder,
          datasetVersion: artifact.datasetVersion,
          settings: artifact.settings,
          filter: "all",
          layoutViewportWidth: measured.viewportWidth,
          presentationOrder: shuffleWithSeed(artifact.cards, seed, "grid:all").map(({ id }) => id),
          organicOrder: true,
        });
        /** @type {Map<string, any>} */
        const expectedById = new Map();
        expectedLayout.placements.forEach((placement) => expectedById.set(placement.card.id, placement));
        assert(expectedLayout.columns >= 2 && expectedLayout.columns <= 4 && expectedLayout.placements.every((placement) => placement.width === 1), `${width}px v6 compiler lost 2..4 columns or one-column photos`);
        const noOverlap = measured.tiles.every((tile, index) => measured.tiles.slice(index + 1).every((next) =>
          Math.min(tile.left + tile.width, next.left + next.width) - Math.max(tile.left, next.left) <= 0.05 ||
          Math.min(tile.top + tile.height, next.top + next.height) - Math.max(tile.top, next.top) <= 0.05,
        ));
        const withinGrid = measured.tiles.every((tile) => tile.left >= -0.05 && tile.left + tile.width <= measured.width + 0.05);
        assert(measured.outerToken === expectedOuter, `${width}px outer token expected ${expectedOuter}, got ${measured.outerToken}`);
        assert(Math.abs(measured.left - expectedEffectiveOuter) <= 0.05, `${width}px effective outer left expected ${expectedEffectiveOuter}, got ${measured.left}`);
        assert(Math.abs(measured.right - expectedEffectiveOuter) <= 0.05, `${width}px effective outer right expected ${expectedEffectiveOuter}, got ${measured.right}`);
        assert(Math.abs(measured.width - expectedGridWidth) <= 0.05, `${width}px grid width expected ${expectedGridWidth}, got ${measured.width}`);
        assert(expectedColumns >= 2 && expectedColumns <= 4, `${width}px expected column contract escaped 2..4: ${expectedColumns}`);
        assert(expectedLayout.columns === expectedColumns, `${width}px compiler columns expected ${expectedColumns}, got ${expectedLayout.columns}`);
        assert(measured.tiles.every((tile) => Math.abs(tile.width - expectedCardWidth) <= 0.05), `${width}px one-column card width drift: ${JSON.stringify(measured.tiles.slice(0, 6))}`);
        assert(measured.gapToken === expectedGap, `${width}px gap token expected ${expectedGap}, got ${measured.gapToken}`);
        assert(measured.overflow <= 1 && withinGrid, `${width}px horizontal overflow or out-of-grid tile: ${JSON.stringify({ overflow: measured.overflow, withinGrid })}`);
        assert(measured.tiles.length > 0 && measured.tiles.length < 120, `${width}px virtual DOM count ${measured.tiles.length}`);
        assert(noOverlap, `${width}px grid has overlapping runtime tiles`);
        assert(measured.captionCount === 0, `${width}px Advertising grid retains caption nodes`);
        assert(measured.tiles.every((tile) => {
          const expected = expectedById.get(tile.id);
          return expected && Math.abs(tile.left - expected.x) <= 0.05 && Math.abs(tile.top - expected.y) <= 0.05 &&
            Math.abs(tile.width - expected.pixelWidth) <= 0.05 && Math.abs(tile.height - expected.pixelHeight) <= 0.05 &&
            Math.abs(tile.mediaWidth - expected.pixelWidth) <= 0.05 && Math.abs(tile.mediaHeight - expected.mediaPixelHeight) <= 0.05 &&
            Math.abs(tile.mediaWidth / tile.mediaHeight - expected.card.media.width / expected.card.media.height) <= 0.01 &&
            Math.abs(tile.height - tile.mediaHeight) <= 0.05 &&
            tile.images === 1 && tile.backplates === 0 && tile.fitMode === null &&
            Math.abs(tile.visualLeft - tile.left) <= 0.05 && Math.abs(tile.visualTop - tile.top) <= 0.05;
        }), `${width}px runtime geometry drifted from v6 shared layout`);
        const oracle = inspectAdvertisingGrid({ layout: expectedLayout, placements: expectedLayout.placements });
        assert(oracle.valid, `${width}px full v6 layout violates one-column stagger/anti-brick oracle: ${JSON.stringify(oracle.violations)}`);

        const firstPass = await page.locator("[data-project-grid]").evaluate((grid) =>
          [...grid.querySelectorAll(".advertising-tile")].map((tile) => `${tile.dataset.advertisingCard}:${tile.style.left}:${tile.style.top}`),
        );
        await page.locator('[data-advertising-filter="displays-booths"]').click();
        await page.locator('[data-advertising-filter="all"]').click();
        // Chờ lưới settle (hết transform, hết fade, không còn animation, vị trí đứng yên giữa hai lần đọc) thay cho
        // 450ms cố định: runner bận còn để card kiosk ở chỗ cũ, card đang mờ dần chưa rời DOM khi đọc.
        await page.waitForFunction(() => {
          const grid = document.querySelector("[data-project-grid]");
          const tiles = [...grid.querySelectorAll(".advertising-tile")];
          const key = tiles.map((tile) => `${tile.dataset.advertisingCard}:${tile.style.left}:${tile.style.top}`).join();
          const settled = !grid.getAnimations({ subtree: true }).length &&
            tiles.every((tile) => getComputedStyle(tile).transform === "none" && getComputedStyle(tile).opacity === "1") &&
            key === window.__ttGridKey;
          window.__ttGridKey = key;
          return settled;
        }, null, { polling: 100, timeout: 5_000 });
        const secondPass = await page.locator("[data-project-grid]").evaluate((grid) =>
          [...grid.querySelectorAll(".advertising-tile")].map((tile) => `${tile.dataset.advertisingCard}:${tile.style.left}:${tile.style.top}`),
        );
        assert(JSON.stringify(secondPass) === JSON.stringify(firstPass), `${width}px filter round-trip changed the loaded deterministic prefix: ${JSON.stringify({ firstPass, secondPass })}`);
        assertDiagnostics(diagnostics);
      },
    );
  }

  for (const width of [751, 1201]) {
    await runPageCase(
      `advertising grid ${width}px with layout scrollbar`,
      { route: "/vi/advertising-products/", viewport: { width, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await page.addInitScript((scrollbarWidth) => {
          const installLayoutScrollbar = () => {
            if (!document.documentElement) return false;
            Object.defineProperty(document.documentElement, "clientWidth", {
              configurable: true,
              get: () => innerWidth - scrollbarWidth,
            });
            const layoutStyle = document.createElement("style");
            layoutStyle.textContent = `body { width: calc(100vw - ${scrollbarWidth}px) !important; }`;
            document.documentElement.prepend(layoutStyle);
            return true;
          };
          if (installLayoutScrollbar()) return;
          const observer = new MutationObserver(() => {
            if (!installLayoutScrollbar()) return;
            observer.disconnect();
          });
          observer.observe(document, { childList: true });
        }, 17);
        await gotoRoute(page, "/vi/advertising-products/");
        await page.waitForFunction(() => {
          const grid = document.querySelector("[data-project-grid]");
          const index = grid?.closest(".project-index");
          if (!grid || !index) return false;
          const outer = Number.parseFloat(getComputedStyle(index).getPropertyValue("--advertising-outer"));
          const expectedOuter = document.documentElement.clientWidth <= 750 ? 15 : document.documentElement.clientWidth <= 1200 ? 25 : 35;
          const expectedWidth = Math.min(document.documentElement.clientWidth - 2 * expectedOuter, 1500);
          return outer === expectedOuter && Math.abs(grid.getBoundingClientRect().width - expectedWidth) <= 0.05;
        });
        const measured = await page.locator("[data-project-grid]").evaluate((grid) => {
          const bounds = grid.getBoundingClientRect();
          const index = grid.closest(".project-index");
          return {
            innerWidth: window.innerWidth,
            clientWidth: document.documentElement.clientWidth,
            left: bounds.left,
            right: document.documentElement.clientWidth - bounds.right,
            width: bounds.width,
            outerToken: Number.parseFloat(getComputedStyle(index).getPropertyValue("--advertising-outer")),
          };
        });
        const expectedOuter = measured.clientWidth <= 750 ? 15 : measured.clientWidth <= 1200 ? 25 : 35;
        const expectedWidth = Math.min(measured.clientWidth - 2 * expectedOuter, 1500);
        const expectedEffectiveOuter = (measured.clientWidth - expectedWidth) / 2;
        assert(measured.innerWidth > measured.clientWidth, `${width}px did not create a layout-scrollbar width split: ${JSON.stringify(measured)}`);
        assert(measured.outerToken === expectedOuter, `${width}px scrollbar outer token expected ${expectedOuter}: ${JSON.stringify(measured)}`);
        assert(Math.abs(measured.width - expectedWidth) <= 0.05, `${width}px scrollbar grid width expected ${expectedWidth}: ${JSON.stringify(measured)}`);
        assert(
          Math.abs(measured.left - expectedEffectiveOuter) <= 0.05 && Math.abs(measured.right - expectedEffectiveOuter) <= 0.05,
          `${width}px scrollbar margins expected ${expectedEffectiveOuter}: ${JSON.stringify(measured)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }

  await runPageCase(
    "advertising legacy rank-v2 artifact fails before Masonry",
    { route: "/vi/advertising-products/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      await page.addInitScript((injectedArtifact) => {
        window.__TT_ADVERTISING_ARTIFACT__ = injectedArtifact;
        window.__ttMasonryConstructs = 0;
      }, { ...artifact, layoutAlgorithmVersion: "advertising-rank-v2" });
      await page.route("**/assets/vendor/masonry-4.2.2.min.js", (route) => route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "window.Masonry = function Masonry() { window.__ttMasonryConstructs += 1; };",
      }));
      await gotoRoute(page, "/vi/advertising-products/");
      await page.waitForFunction(
        () => document.querySelector('[data-barba="container"]')?.dataset.advertisingFallback === "failed",
        null,
        { timeout: 6_000 },
      );
      const state = await page.evaluate(() => ({
        constructs: window.__ttMasonryConstructs,
        fallback: document.querySelector('[data-barba="container"]')?.dataset.advertisingFallback,
        gridHidden: document.querySelector("[data-project-grid]")?.hidden,
      }));
      assert(state.constructs === 0 && state.fallback === "failed" && state.gridHidden, `rank-v2 artifact did not fail before Masonry: ${JSON.stringify(state)}`);
    },
  );

  await runPageCase(
    "advertising empty v6 artifact fails before Masonry",
    { route: "/vi/advertising-products/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      await page.addInitScript((injectedArtifact) => {
        window.__TT_ADVERTISING_ARTIFACT__ = injectedArtifact;
        window.__ttMasonryConstructs = 0;
      }, { ...artifact, cards: [] });
      await page.route("**/assets/vendor/masonry-4.2.2.min.js", (route) => route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "window.Masonry = function Masonry() { window.__ttMasonryConstructs += 1; };",
      }));
      await gotoRoute(page, "/vi/advertising-products/");
      await page.waitForFunction(
        () => document.querySelector('[data-barba="container"]')?.dataset.advertisingFallback === "failed",
        null,
        { timeout: 6_000 },
      );
      const state = await page.evaluate(() => ({
        constructs: window.__ttMasonryConstructs,
        fallback: document.querySelector('[data-barba="container"]')?.dataset.advertisingFallback,
        gridHidden: document.querySelector("[data-project-grid]")?.hidden,
      }));
      assert(state.constructs === 0 && state.fallback === "failed" && state.gridHidden, `empty v6 artifact did not fail before Masonry: ${JSON.stringify(state)}`);
    },
  );
}

async function advertisingArtifactScrollTarget(page, artifact, id) {
  const { compileAdvertisingProductLayout: compileAdvertisingLayout } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "layout-core.mjs")).href);
  const layoutViewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const layout = compileAdvertisingLayout({
    cards: artifact.cards,
    categoryOrder: artifact.categories.map((category) => category.slug),
    datasetVersion: artifact.datasetVersion,
    filter: "all",
    layoutViewportWidth,
  });
  const target = layout.placements.find((placement) => placement.card.id === id);
  if (!target) throw new Error(`artifact placement missing: ${id}`);
  const gridTop = await page.locator("[data-project-grid]").evaluate((grid) => grid.getBoundingClientRect().top + window.scrollY);
  return gridTop + target.y;
}

async function runAdvertisingKeyboardVirtualizationCheck() {
  const { buildAdvertisingArtifact } = await import(
    pathToFileURL(path.join(SITE_ROOT, "advertising-products", "catalog.mjs")).href
  );
  const { compileAdvertisingProductLayout: compileAdvertisingLayout, getVirtualWindow } = await import(
    pathToFileURL(path.join(SITE_ROOT, "advertising-products", "layout-core.mjs")).href
  );
  const { shuffleWithSeed } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "random-order.mjs")).href);
  const artifact = buildAdvertisingArtifact();

  await runPageCase(
    "advertising keyboard crosses virtual frontiers",
    { route: "/vi/advertising-products/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/advertising-products/");
      await page.waitForFunction(() => document.querySelectorAll("[data-project-grid] .advertising-tile").length > 0);
      const layoutViewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
      // Thứ tự Tab theo thứ tự ngẫu nhiên của lượt duyệt (R4): dựng lại cùng seed, cùng pool như runtime.
      const seed = await page.evaluate(() => window.TruongThinhAdvertising.getBrowseState().seed);
      const layout = compileAdvertisingLayout({
        cards: artifact.cards,
        categoryOrder: artifact.categories.map((category) => category.slug),
        datasetVersion: artifact.datasetVersion,
        settings: artifact.settings,
        filter: "all",
        layoutViewportWidth,
        presentationOrder: shuffleWithSeed(artifact.cards, seed, "grid:all").map(({ id }) => id),
        organicOrder: true,
      });
      const expected = layout.placements.map((placement) => placement.card);
      // Trần cửa sổ ảo: số card lớn nhất mà getVirtualWindow trả ở bất kỳ vị trí cuộn nào. Locomotive cuộn mượt (lerp) và
      // runtime nhận vị trí qua site:scroll lệch vài ms so với lúc test đọc gridTop, nên so với đoạn cuộn vừa đo sẽ flake;
      // ảo hóa mất giới hạn thì domCount vượt trần này xa (cả danh sách).
      let maxWindowCount = 0;
      for (let top = 0; top <= layout.totalPixelHeight; top += 4) {
        maxWindowCount = Math.max(maxWindowCount, getVirtualWindow(layout, { scrollTop: top, viewportHeight: 900, overscan: 900 }).items.length);
      }
      const readState = () => page.locator("[data-project-grid]").evaluate((grid) => {
        const activeItem = document.activeElement?.closest("[data-advertising-card]");
        const gridTop = grid.getBoundingClientRect().top + window.scrollY;
        return {
          activeId: activeItem?.getAttribute("data-advertising-card"),
          activeRole: activeItem?.getAttribute("role"),
          activePosition: Number(activeItem?.getAttribute("aria-posinset")),
          activeSetSize: Number(activeItem?.getAttribute("aria-setsize")),
          gridRole: grid.getAttribute("role"),
          domCount: grid.querySelectorAll(".advertising-tile").length,
          mountedPositions: [...grid.querySelectorAll(".advertising-tile")]
            .map((item) => item.getAttribute("aria-posinset"))
            .filter((value) => value !== null)
            .map(Number),
          gridTop,
          scrollY: window.scrollY,
        };
      });

      await page.locator(`[data-advertising-card="${expected[0].id}"] a`).focus();
      const states = [];
      for (let index = 0; index < expected.length; index += 1) {
        if (index > 0) {
          await page.keyboard.press("Tab");
          await page.waitForTimeout(25);
        }
        const state = await readState();
        assert(
          state.activeId === expected[index].id,
          `Tab left canonical advertising order before item ${index + 1}: ${JSON.stringify(state)}`,
        );
        assert(
          state.domCount <= maxWindowCount + 1 && state.domCount < expected.length,
          `Keyboard virtualization became unbounded at item ${index + 1}: ${JSON.stringify({ state, maxWindowCount })}`,
        );
        states.push(state);
      }

      assert(
        states.every((state, index) => state.gridRole === "list" && state.activeRole === "listitem" &&
          state.activePosition === index + 1 && state.activeSetSize === expected.length),
        `Advertising virtual-list semantics drifted: ${JSON.stringify(states.filter((state, index) =>
          state.gridRole !== "list" || state.activeRole !== "listitem" || state.activePosition !== index + 1 || state.activeSetSize !== expected.length))}`,
      );
      // Frontier lùi phụ thuộc tốc độ lerp nên dựng chắc chắn: kéo trang về đầu, card cuối đang focus phải được giữ lại (R7).
      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
      await page.waitForFunction(
        (id) => !document.querySelector(`[data-project-grid] [data-advertising-card="${id}"]`),
        expected.at(-2).id,
      );
      const endState = await readState();
      assert(
        endState.activeId === expected.at(-1).id && endState.mountedPositions.includes(expected.length),
        `Focused advertising card was not retained outside the virtual window: ${JSON.stringify(endState)}`,
      );
      const endMounted = new Set(endState.mountedPositions);
      const firstBackwardPosition = expected.length - 1;
      assert(!endMounted.has(firstBackwardPosition), `No backward virtual frontier remained after item ${expected.length}: ${JSON.stringify([...endMounted])}`);
      for (let index = expected.length - 2; index >= expected.length - 12; index -= 1) {
        await page.keyboard.press("Shift+Tab");
        await page.waitForTimeout(25);
        const state = await readState();
        assert(
          state.activeId === expected[index].id && state.activePosition === index + 1,
          `Shift+Tab failed to cross backward virtual frontier at item ${index + 1}: ${JSON.stringify(state)}`,
        );
      }
      assertDiagnostics(diagnostics);
    },
  );
}

async function runAdvertisingMediaEntranceChecks() {
  const { buildAdvertisingArtifact } = await import(
    pathToFileURL(path.join(SITE_ROOT, "advertising-products", "catalog.mjs")).href
  );
  const { compileAdvertisingProductLayout: compileAdvertisingLayout } = await import(
    pathToFileURL(path.join(SITE_ROOT, "advertising-products", "layout-core.mjs")).href
  );
  const { shuffleWithSeed } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "random-order.mjs")).href);
  const artifact = buildAdvertisingArtifact();
  // Lưới xếp ngẫu nhiên theo lượt xem (masonry R4): card sâu nhất lấy từ layout dựng lại cùng seed với runtime.
  const deepestTarget = async (page) => {
    const seed = await page.evaluate(() => window.TruongThinhAdvertising.getBrowseState().seed);
    const layout = compileAdvertisingLayout({
      cards: artifact.cards,
      categoryOrder: artifact.categories.map((category) => category.slug),
      datasetVersion: artifact.datasetVersion,
      filter: "all",
      layoutViewportWidth: 1440,
      presentationOrder: shuffleWithSeed(artifact.cards, seed, "grid:all").map(({ id }) => id),
      organicOrder: true,
    });
    return layout.placements.reduce((deepest, placement) =>
      placement.y > deepest.y ? placement : deepest);
  };
  // Ảnh tải theo biến thể srcset (media-delivery R3): quy URL biến thể về path WebP gốc để so.
  const basePath = (url) => new URL(url, "http://localhost").pathname
    .replace(/(?:-(?:480|960))?\.(?:avif|webp)$/, ".webp");

  for (const locale of ["vi", "en"]) {
    const route = `/${locale}/advertising-products/`;
    await runPageCase(
      `advertising media entrance ${locale}`,
      { route, viewport: { width: 1440, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        let targetImageDelayed = false;
        let target = null;
        // Preview gửi no-store (static-release R8), demo cache ảnh nội dung một ngày (_headers). Card vào lại cần ảnh
        // có sẵn như demo nên đổi header qua CDP Fetch; page.route sẽ làm Playwright tắt HTTP cache.
        const cdp = await page.context().newCDPSession(page);
        cdp.on("Fetch.requestPaused", async ({ requestId, request, responseStatusCode, responseHeaders = [] }) => {
          if (target !== null && basePath(request.url) === basePath(target.card.media.src)) {
            targetImageDelayed = true;
            await new Promise((resolve) => setTimeout(resolve, 180));
          }
          const { body } = await cdp.send("Fetch.getResponseBody", { requestId });
          await cdp.send("Fetch.fulfillRequest", {
            requestId,
            responseCode: responseStatusCode,
            responseHeaders: [
              ...responseHeaders.filter(({ name }) => name.toLowerCase() !== "cache-control"),
              { name: "Cache-Control", value: "public, max-age=86400" },
            ],
            body,
          }).catch((error) => console.error(error.message));
        });
        await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*/assets/content/*", requestStage: "Response" }] });
        await gotoRoute(page, route);
        await page.waitForFunction(
          () => document.querySelectorAll("[data-project-grid] .advertising-tile").length > 0,
          null,
          { timeout: 6_000 },
        );
        target = await deepestTarget(page);
        const gridTop = await page.locator("[data-project-grid]").evaluate(
          (grid) => grid.getBoundingClientRect().top + window.scrollY,
        );
        const initiallyMounted = await page.locator(
          `[data-advertising-card="${target.card.id}"]`,
        ).count();
        assert(
          initiallyMounted === 0,
          `${locale} media entrance target was already inside the initial virtual window`,
        );

        const trace = await page.evaluate(async ({ targetId, scrollTop }) => {
          const trace = [{
            elapsed: -1,
            imageOpacity: -1,
            imageReady: false,
            currentSrc: "",
            complete: false,
            naturalWidth: 0,
            intersectsViewport: false,
            opacityAnimations: [],
            shellOpacity: -1,
          }];
          const startedAt = performance.now();
          let readyAt = -1;
          window.scrollTo({ top: scrollTop, behavior: "instant" });
          await new Promise((resolve) => {
            const sample = () => {
              const tile = document.querySelector(`[data-advertising-card="${targetId}"]`);
              const image = tile?.querySelector(".advertising-tile__foreground");
              if (tile && image instanceof HTMLImageElement) {
                const imageStyle = getComputedStyle(image);
                const tileRect = tile.getBoundingClientRect();
                trace.push({
                  elapsed: performance.now() - startedAt,
                  imageOpacity: Number.parseFloat(imageStyle.opacity),
                  imageReady: image.classList.contains("is-advertising-media-ready"),
                  currentSrc: image.currentSrc,
                  complete: image.complete,
                  naturalWidth: image.naturalWidth,
                  intersectsViewport: tileRect.bottom > 0 && tileRect.top < innerHeight,
                  // Reveal Kính chạy opacity ảnh bằng Web Animations, không bằng CSS transition (loading glass R2).
                  opacityAnimations: image.getAnimations()
                    .filter((animation) => animation.effect.getKeyframes().some((frame) => "opacity" in frame))
                    .map((animation) => {
                      const { delay, duration, endTime, easing } = animation.effect.getComputedTiming();
                      return { delay, duration, endTime, easing };
                    }),
                  shellOpacity: Number.parseFloat(getComputedStyle(tile).opacity),
                });
                if (image.classList.contains("is-advertising-media-ready") && readyAt < 0) {
                  readyAt = performance.now();
                }
              }
              // Máy tải nặng làm frame thưa: lấy mẫu tới khi ảnh đạt opacity cuối, không theo mốc 750ms cố định.
              if (
                (readyAt < 0 && performance.now() - startedAt < 6_000) ||
                (readyAt >= 0 && trace.at(-1).imageOpacity < 0.999 && performance.now() - readyAt < 3_000)
              ) requestAnimationFrame(sample);
              else resolve(undefined);
            };
            requestAnimationFrame(sample);
          });
          return trace.slice(1);
        }, { targetId: target.card.id, scrollTop: gridTop + target.y - 200 });
        // Ảnh đã ready mà chưa hiện hết vì đang chạy fade opacity (frame thưa có thể không rơi giữa fade).
        const fading = trace.find((sample) => sample.intersectsViewport && sample.imageReady &&
          sample.imageOpacity < 0.98 && sample.opacityAnimations.length > 0);
        const final = trace.at(-1);
        // Nhịp 0.6s (design-system motion.md, ảnh trong card): ảnh hiện 0.13s đến 0.39s, cubic-bezier(0.65, 0, 0.35, 1).
        const fade = fading?.opacityAnimations[0];
        assert(
          targetImageDelayed && fading && final?.imageReady && final.imageOpacity >= 0.999 &&
            final.currentSrc && final.complete && final.naturalWidth > 0 &&
            fade && Math.abs(fade.delay - 130) <= 5 && Math.abs(fade.endTime - 390) <= 5 &&
            fade.easing === "cubic-bezier(0.65, 0, 0.35, 1)" &&
            trace.every((sample) => sample.shellOpacity >= 0.999),
          `${locale} fresh deep card skipped the image-only fade of the 0.6s reveal: ${JSON.stringify(trace)}`,
        );

        const captureReplay = async (cycle) => {
          await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: "instant" }), gridTop);
          await page.waitForFunction(
            (targetId) => !document.querySelector(`[data-advertising-card="${targetId}"]`),
            target.card.id,
            { timeout: 6_000 },
          );
          const replay = await page.evaluate(async ({ targetId, scrollTop }) => {
            const events = [];
            const capture = (event) => {
              if (
                event.target?.classList?.contains("advertising-tile__foreground") &&
                event.target.closest("[data-advertising-card]")?.dataset.advertisingCard === targetId &&
                event.propertyName === "opacity"
              ) {
                events.push(event.type);
              }
            };
            for (const type of ["transitionrun", "transitionstart", "transitionend"]) {
              document.addEventListener(type, capture, true);
            }
            window.scrollTo({ top: scrollTop, behavior: "instant" });
            const samples = [];
            const startedAt = performance.now();
            let mountedAt = -1;
            let readyAt = -1;
            await new Promise((resolve) => {
              const sample = () => {
                const tile = document.querySelector(`[data-advertising-card="${targetId}"]`);
                const image = tile?.querySelector(".advertising-tile__foreground");
                if (tile && image) {
                  if (mountedAt < 0) mountedAt = performance.now();
                  if (
                    readyAt < 0 &&
                    image.classList.contains("is-advertising-media-ready")
                  ) readyAt = performance.now();
                  const rect = tile.getBoundingClientRect();
                  samples.push({
                    opacity: Number.parseFloat(getComputedStyle(image).opacity),
                    ready: image.classList.contains("is-advertising-media-ready"),
                    intersectsViewport: rect.bottom > 0 && rect.top < innerHeight,
                    shellOpacity: Number.parseFloat(getComputedStyle(tile).opacity),
                    // Skeleton là canvas, Kính reveal có data-glass-reveal (loading-glass R1, R2).
                    overlay: Boolean(tile.querySelector("canvas, [data-glass-reveal]")),
                    animations: tile.getAnimations({ subtree: true })
                      .filter((animation) => animation.playState === "running").length,
                  });
                }
                if (
                  (mountedAt < 0 && performance.now() - startedAt < 3_000) ||
                  (mountedAt >= 0 && readyAt < 0 && performance.now() - mountedAt < 3_000) ||
                  (readyAt >= 0 && performance.now() - readyAt < 750)
                ) requestAnimationFrame(sample);
                else resolve(undefined);
              };
              requestAnimationFrame(sample);
            });
            for (const type of ["transitionrun", "transitionstart", "transitionend"]) {
              document.removeEventListener(type, capture, true);
            }
            return { events, samples, decodeMs: readyAt - mountedAt };
          }, { targetId: target.card.id, scrollTop: gridTop + target.y - 200 });
          // loading-glass R3: card vào lại sau khi ra hẳn viewport (kể cả ảo hóa gắn lại) hiện ảnh thẳng ở opacity
          // cuối, không skeleton, Kính hay crossfade. Ảo hóa tạo img mới, ảnh lấy từ cache vẫn cần giải mã nên được
          // trống lúc giải mã: một tới ba frame, tới 300ms trên máy cloud bận; trần 500ms bắt lỗi chờ thứ khác. Runner
          // bận có một frame dài 590ms, nên trống tối đa ba frame cũng tính là giải mã dù quá 500ms.
          const visible = replay.samples.filter((sample) => sample.intersectsViewport);
          const firstReady = visible.findIndex((sample) => sample.ready);
          const blankFrames = replay.samples.findIndex((sample) => sample.ready);
          assert(
            firstReady >= 0 && (replay.decodeMs <= 500 || blankFrames <= 3) &&
              visible.every((sample, index) => (index < firstReady ? sample.opacity === 0 : sample.ready &&
                sample.opacity >= 0.999) && sample.shellOpacity >= 0.999 && !sample.overlay &&
                sample.animations === 0) &&
              replay.events.length === 0,
            `${locale} media re-entry cycle ${cycle} replayed its entrance instead of showing at once: ${JSON.stringify(replay)}`,
          );
          const partial = await page.evaluate(async (targetId) => {
            const events = [];
            const capture = (event) => {
              if (
                event.target?.classList?.contains("advertising-tile__foreground") &&
                event.target.closest("[data-advertising-card]")?.dataset.advertisingCard === targetId &&
                event.propertyName === "opacity"
              ) {
                events.push(event.type);
              }
            };
            document.addEventListener("transitionrun", capture, true);
            window.scrollBy(0, 24);
            await new Promise((resolve) => setTimeout(resolve, 180));
            document.removeEventListener("transitionrun", capture, true);
            const tile = document.querySelector(`[data-advertising-card="${targetId}"]`);
            const rect = tile?.getBoundingClientRect();
            return {
              events,
              intersectsViewport: Boolean(rect && rect.bottom > 0 && rect.top < innerHeight),
            };
          }, target.card.id);
          assert(
            partial.intersectsViewport && partial.events.length === 0,
            `${locale} partial visibility restarted media fade in cycle ${cycle}: ${JSON.stringify(partial)}`,
          );
        };
        await captureReplay(1);
        await captureReplay(2);
        assertDiagnostics(diagnostics);
      },
    );

    await runPageCase(
      `advertising media entrance reduced ${locale}`,
      { route, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, route);
        await page.waitForFunction(
          () => document.querySelectorAll("[data-project-grid] .advertising-tile").length > 0,
          null,
          { timeout: 6_000 },
        );
        const target = await deepestTarget(page);
        const gridTop = await page.locator("[data-project-grid]").evaluate(
          (grid) => grid.getBoundingClientRect().top + window.scrollY,
        );
        await page.evaluate(
          (scrollTop) => window.scrollTo({ top: scrollTop, behavior: "instant" }),
          gridTop + target.y - 200,
        );
        await page.waitForFunction(
          (targetId) => document.querySelector(
            `[data-advertising-card="${targetId}"] .advertising-tile__foreground.is-advertising-media-ready`,
          ),
          target.card.id,
          { timeout: 6_000 },
        );
        const state = await page.locator(
          `[data-advertising-card="${target.card.id}"]`,
        ).evaluate((tile) => {
          const image = tile.querySelector(".advertising-tile__foreground");
          const imageStyle = getComputedStyle(image);
          return {
            reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
            imageOpacity: Number.parseFloat(imageStyle.opacity),
            transitionDurations: imageStyle.transitionDuration
              .split(",")
              .map((value) => Number.parseFloat(value)),
            shellOpacity: Number.parseFloat(getComputedStyle(tile).opacity),
          };
        });
        assert(
          state.reduced && state.imageOpacity >= 0.999 &&
            state.transitionDurations.every((duration) => duration <= 0.01) &&
            state.shellOpacity >= 0.999,
          `${locale} reduced-motion media entrance was not instant: ${JSON.stringify(state)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runAdvertisingMediaFocusedChecks() {
  const { ADVERTISING_CATEGORIES, buildAdvertisingArtifact } = await import(
    pathToFileURL(path.join(SITE_ROOT, "advertising-products", "catalog.mjs")).href
  );
  const { advertisingFilterRank, compileAdvertisingProductLayout: compileAdvertisingLayout, getVirtualWindow, matchesAdvertisingFilter } = await import(
    pathToFileURL(path.join(SITE_ROOT, "advertising-products", "layout-core.mjs")).href
  );
  const { shuffleWithSeed } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "random-order.mjs")).href);
  const artifact = buildAdvertisingArtifact();
  const categoryOrder = artifact.categories.map((category) => category.slug);
  // Số card mỗi nhóm do catalog quyết định (taxonomy còn thêm ảnh); ở đây kiểm media không trùng, rank liền, FIFO.
  const expectedCounts = Object.fromEntries(categoryOrder.map((slug) => [slug, artifact.cards.filter((card) => card.category === slug).length]));
  const expectedMediaPaths = new Set(
    artifact.cards.map((card) => new URL(card.media.src, "http://localhost").pathname),
  );
  const expectedCardCount = Object.values(expectedCounts).reduce((sum, count) => sum + count, 0);
  assert(artifact.cards.length === expectedCardCount, `Advertising artifact expected ${expectedCardCount} cards, got ${artifact.cards.length}`);
  assert(expectedMediaPaths.size === expectedCardCount, `Advertising artifact expected ${expectedCardCount} unique media paths, got ${expectedMediaPaths.size}`);
  assert(
    artifact.cards.every((card, index) => card.rank === index),
    `Advertising artifact ranks must be continuous from 0 through ${expectedCardCount - 1}`,
  );
  for (const category of artifact.categories) {
    const cards = artifact.cards
      .filter((card) => card.category === category.slug)
      .sort((left, right) => left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id));
    const layout = compileAdvertisingLayout({
      cards: artifact.cards,
      categoryOrder,
      datasetVersion: artifact.datasetVersion,
      filter: category.slug,
      layoutViewportWidth: 1440,
    });
    // Layout cụm gồm cả card có sản phẩm phụ trong cụm (taxonomy R1), xếp theo sourceOrder rồi id.
    const pool = artifact.cards.filter((card) => matchesAdvertisingFilter(card, category.slug))
      .sort((left, right) => left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id));
    assert(
      cards.length === expectedCounts[category.slug] &&
        cards.every((card, index) => card.sourceOrder === index) &&
        layout.placements.length === pool.length &&
        layout.placements.every((placement, index) => placement.card.id === pool[index].id),
      `${category.slug} count or FIFO source order drifted`,
    );
  }
  const rankedLayout = compileAdvertisingLayout({
    cards: artifact.cards,
    categoryOrder,
    datasetVersion: artifact.datasetVersion,
    filter: "all",
    layoutViewportWidth: 1440,
  });
  assert(
    rankedLayout.placements.length === expectedCardCount &&
      rankedLayout.placements.map((placement) => placement.card.rank).sort((left, right) => left - right)
        .every((rank, index) => rank === index),
    `All layout did not retain all ${expectedCardCount} ranked cards`,
  );
  // Lưới xếp theo thứ tự ngẫu nhiên của lượt xem (random browse): dựng lại cùng seed, cùng pool như runtime.
  const browseLayout = async (page, filter, layoutViewportWidth) => {
    const seed = await page.evaluate(() => window.TruongThinhAdvertising.getBrowseState().seed);
    const pool = artifact.cards.filter((card) => matchesAdvertisingFilter(card, filter));
    return compileAdvertisingLayout({
      cards: artifact.cards,
      categoryOrder,
      datasetVersion: artifact.datasetVersion,
      filter,
      layoutViewportWidth,
      presentationOrder: shuffleWithSeed(pool, seed, `grid:${filter}`)
        .sort((left, right) => advertisingFilterRank(left, filter) - advertisingFilterRank(right, filter)).map(({ id }) => id),
      organicOrder: true,
    });
  };

  const readGridState = (page) => page.locator("[data-project-grid]").evaluate((grid) => {
    const bounds = grid.getBoundingClientRect();
    const tiles = [...grid.querySelectorAll(".advertising-tile:not([hidden])")].map((tile) => {
      const rect = tile.getBoundingClientRect();
      const image = tile.querySelector(".advertising-tile__foreground");
      return {
        id: tile.dataset.advertisingCard,
        category: tile.dataset.advertisingCategory,
        left: Number.parseFloat(tile.style.left),
        top: Number.parseFloat(tile.style.top),
        width: Number.parseFloat(tile.style.width),
        height: Number.parseFloat(tile.style.height),
        visualLeft: rect.left - bounds.left,
        visualTop: rect.top - bounds.top,
        source: image?.dataset.src || (image?.currentSrc ? new URL(image.currentSrc).pathname : ""),
        transitionDuration: getComputedStyle(tile).transitionDuration,
        transform: getComputedStyle(tile).transform,
      };
    });
    return {
      tiles,
      totalDomCount: grid.querySelectorAll(".advertising-tile").length,
      gridTop: bounds.top + window.scrollY,
      gridWidth: bounds.width,
      gridHeight: Number.parseFloat(grid.style.height),
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      rawHtmlText: /(?:<|&lt;)figure\b/i.test(grid.textContent),
      noscript: grid.querySelector("noscript") !== null,
      activeFilter: document.querySelector('[data-advertising-filter][aria-current="true"]')?.getAttribute("data-advertising-filter"),
      categoryQuery: new URLSearchParams(location.search).get("category"),
      pathname: location.pathname,
    };
  });
  const assertGridState = (state, layout, label) => {
    const localScroll = Math.max(0, state.scrollY - state.gridTop);
    const expected = getVirtualWindow(layout, {
      scrollTop: localScroll,
      viewportHeight: state.viewportHeight,
      overscan: state.viewportHeight,
    }).items;
    const expectedById = new Map(expected.map((placement) => [placement.card.id, placement]));
    const overlap = state.tiles.some((first, index) => state.tiles.slice(index + 1).some((second) =>
      Math.min(first.left + first.width, second.left + second.width) - Math.max(first.left, second.left) > 0.05 &&
      Math.min(first.top + first.height, second.top + second.height) - Math.max(first.top, second.top) > 0.05,
    ));
    const checks = {
      order: JSON.stringify(state.tiles.map((tile) => tile.id)) === JSON.stringify(expected.map((placement) => placement.card.id)),
      geometry: state.tiles.every((tile) => {
          const placement = expectedById.get(tile.id);
          return placement && Math.abs(tile.left - Reflect.get(placement, "x")) <= 0.05 &&
            Math.abs(tile.top - Reflect.get(placement, "y")) <= 0.05 &&
            Math.abs(tile.width - Reflect.get(placement, "pixelWidth")) <= 0.05 &&
            Math.abs(tile.height - Reflect.get(placement, "pixelHeight")) <= 0.05 &&
            Math.abs(tile.visualLeft - tile.left) <= 1 && Math.abs(tile.visualTop - tile.top) <= 1 &&
            tile.transitionDuration.split(",").every((value) => Math.abs(Number.parseFloat(value)) < 0.01) &&
            (!tile.transform || tile.transform === "none") &&
            tile.left >= -0.05 && tile.left + tile.width <= state.gridWidth + 0.05;
        }),
      boundedDom: state.tiles.length > 0 && state.tiles.length < expectedCardCount && state.totalDomCount === state.tiles.length,
      gridHeight: state.gridHeight >= layout.totalPixelHeight - 0.05
        && state.gridHeight <= layout.totalPixelHeight + state.viewportHeight + 2 * layout.interCardGap + 0.05,
      safeSurface: state.overflow <= 1 && !overlap && !state.rawHtmlText && !state.noscript,
    };
    assert(Object.values(checks).every(Boolean),
      `${label} virtual window, geometry, or source-text safety failed: ${JSON.stringify({ checks, state, expected: expected.map((placement) => placement.card.id) })}`);
  };

  await runPageCase(
    `advertising ${expectedCardCount}-media lazy virtual window`,
    { route: "/vi/advertising-products/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      const mediaRequestPaths = new Set();
      const mediaResponseStatuses = new Map();
      // Trình duyệt tải variant responsive (name.avif, name-480.webp, name-960.avif...); quy về file gốc của card.
      const mediaPath = (url) => new URL(url).pathname.replace(/(?:-(?:480|960))?\.(?:avif|webp)$/, ".webp");
      page.on("request", (request) => {
        const pathname = mediaPath(request.url());
        if (request.resourceType() === "image" && pathname.startsWith("/assets/content/projects/advertising/")) {
          mediaRequestPaths.add(pathname);
        }
      });
      page.on("response", (response) => {
        const pathname = mediaPath(response.url());
        if (response.request().resourceType() !== "image" || !pathname.startsWith("/assets/content/projects/advertising/")) return;
        const previous = mediaResponseStatuses.get(pathname);
        mediaResponseStatuses.set(pathname, previous ? `${previous},${response.status()}` : String(response.status()));
      });
      await gotoRoute(page, "/vi/advertising-products/");
      await page.waitForFunction(
        () => document.querySelectorAll("[data-project-grid] .advertising-tile").length > 0,
        null,
        { timeout: 6_000 },
      );
      await page.waitForTimeout(500);
      const initial = await readGridState(page);
      const pageLayout = await browseLayout(page, "all", 1440);
      assertGridState(initial, pageLayout, "initial direct load");
      await page.waitForFunction(() => document.querySelector("[data-project-grid] .advertising-tile__foreground")?.classList.contains("is-advertising-media-ready"));
      const hoverTile = page.locator("[data-project-grid] .advertising-tile").first();
      await hoverTile.hover();
      await page.waitForTimeout(700);
      const naturalHoverScale = await hoverTile.locator(".advertising-tile__foreground").evaluate((image) =>
        new DOMMatrixReadOnly(getComputedStyle(image).transform).a,
      );
      assert(naturalHoverScale >= 1.14, `Natural advertising hover scale is ${naturalHoverScale}`);
      const initialTileIds = initial.tiles.map((tile) => tile.id);
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      const initialRequests = new Set(mediaRequestPaths);
      const initialSources = new Set(initial.tiles.map((tile) => tile.source));
      assert(
        initialRequests.size > 0 && initialRequests.size < expectedCardCount &&
          [...initialRequests].every((pathname) => initialSources.has(pathname)),
        `Initial lazy requests escaped the mounted virtual window: ${JSON.stringify({ requests: [...initialRequests], sources: [...initialSources] })}`,
      );

      for (const language of ["en", "vi"]) {
        await openMenu(page);
        await page.locator(`#site-menu [data-language-option="${language}"]`).click();
        await page.waitForFunction(
          (expected) =>
            document.documentElement.lang === expected &&
            location.pathname === `/${expected}/advertising-products/` &&
            !document.querySelector("#site-menu")?.hasAttribute("open") &&
            // Chờ chuyển trang đổi ngôn ngữ xong: trang còn thu phóng và menu chưa nhận click.
            !document.body.classList.contains("is-transitioning"),
          language,
          { timeout: 6_000 },
        );
        await page.waitForTimeout(500);
        const localized = await readGridState(page);
        assertGridState(localized, pageLayout, `${language} locale round-trip`);
        assert(
          JSON.stringify(localized.tiles.map((tile) => tile.id)) === JSON.stringify(initialTileIds) &&
            (await page.evaluate(() => performance.timeOrigin)) === timeOrigin,
          `${language} locale round-trip replaced the ${expectedCardCount}-card runtime window`,
        );
      }

      for (const category of artifact.categories) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.locator(`[data-advertising-filter="${category.slug}"]`).click();
        await page.waitForFunction(
          (slug) => document.querySelector(`[data-advertising-filter="${slug}"]`)?.getAttribute("aria-current") === "true",
          category.slug,
          { timeout: 3_000 },
        );
        // Card chỉ được đặt cố định khi transition chạy hết (R6); runner bận làm việc đó muộn hơn 400ms.
        await page.waitForFunction(
          () => [...document.querySelectorAll("[data-project-grid] .advertising-tile")].every((tile) => !tile.style.transform),
          null,
          { timeout: 3_000 },
        );
        const filteredLayout = await browseLayout(page, category.slug, 1440);
        const filtered = await readGridState(page);
        assertGridState(filtered, filteredLayout, `${category.slug} filter`);
        assert(
          // Cụm có trang riêng nên URL là path trang cụm, không còn ?category= (taxonomy R4).
          filtered.activeFilter === category.slug && filtered.categoryQuery === null &&
            filtered.pathname === `/vi/advertising-products/${category.slugVi}/` &&
            filtered.tiles.every((tile) => matchesAdvertisingFilter(artifact.cards.find(({ id }) => id === tile.id), category.slug)),
          `${category.slug} filter retained a wrong category or URL state`,
        );
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator('[data-advertising-filter="all"]').click();
      await page.waitForFunction(
        () => document.querySelector('[data-advertising-filter="all"]')?.getAttribute("aria-current") === "true",
        null,
        { timeout: 3_000 },
      );
      await page.waitForTimeout(500);
      await page.setViewportSize({ width: 1200, height: 900 });
      await page.waitForTimeout(500);
      const resizedLayout = await browseLayout(page, "all", 1200);
      assertGridState(await readGridState(page), resizedLayout, "1200px resize");

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(500);
      await page.waitForFunction(() => {
        const card = document.querySelector("[data-project-grid] .advertising-tile");
        const image = card?.querySelector(".advertising-tile__foreground");
        return image?.classList.contains("is-advertising-media-ready")
          && Number.parseFloat(getComputedStyle(image).opacity) >= 0.999;
      });
      const replayFixtureId = await page.locator("[data-project-grid] .advertising-tile").first().evaluate((card) => {
        window.__ttAdvertisingOneShotNode = card;
        return card.dataset.advertisingCard;
      });
      const gridTop = await page.locator("[data-project-grid]").evaluate((grid) => grid.getBoundingClientRect().top + window.scrollY);
      const step = 450;
      for (let localY = 0; localY <= pageLayout.totalPixelHeight; localY += step) {
        const requestedBefore = new Set(mediaRequestPaths);
        await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), gridTop + localY);
        await page.waitForTimeout(180);
        const state = await readGridState(page);
        assertGridState(state, pageLayout, `stepped scroll ${localY}px`);
        const mounted = new Set(state.tiles.map((tile) => tile.source));
        const requestedNow = [...mediaRequestPaths].filter((pathname) => !requestedBefore.has(pathname));
        assert(
          requestedNow.every((pathname) => mounted.has(pathname)),
          `Lazy request started outside the mounted window at ${localY}px: ${JSON.stringify({ requestedNow, mounted: [...mounted] })}`,
        );
      }
      await page.waitForFunction(
        () => window.__ttAdvertisingOneShotNode && !window.__ttAdvertisingOneShotNode.isConnected,
        null,
        { timeout: 3_000 },
      );
      await page.waitForTimeout(800);
      const requested = new Set(mediaRequestPaths);
      const responded = new Set(mediaResponseStatuses.keys());
      const badResponses = [...mediaResponseStatuses].filter(([, statuses]) =>
        statuses.split(",").some((status) => Number(status) !== 200));
      assert(
        requested.size === expectedCardCount && [...expectedMediaPaths].every((pathname) => requested.has(pathname)) &&
          responded.size === requested.size && [...requested].every((pathname) => responded.has(pathname)) &&
          badResponses.length === 0,
        `Stepped lazy sweep did not load exactly the ${expectedCardCount} approved media paths with HTTP 200: ${JSON.stringify({ requested: [...requested], expected: [...expectedMediaPaths], badResponses })}`,
      );

      await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), gridTop);
      await page.waitForFunction(
        (id) => {
          const current = document.querySelector(`[data-project-grid] [data-advertising-card="${id}"]`);
          const image = current?.querySelector(".advertising-tile__foreground");
          return current && current !== window.__ttAdvertisingOneShotNode
            && image?.classList.contains("is-advertising-media-ready");
        },
        replayFixtureId,
        { timeout: 3_000 },
      );
      const replay = await page.locator("[data-project-grid]").evaluate((grid, id) => {
        const current = grid.querySelector(`[data-advertising-card="${id}"]`);
        const image = current?.querySelector(".advertising-tile__foreground");
        return {
          oldConnected: window.__ttAdvertisingOneShotNode?.isConnected,
          sameNode: current === window.__ttAdvertisingOneShotNode,
          ready: image?.classList.contains("is-advertising-media-ready"),
          opacity: image ? Number.parseFloat(getComputedStyle(image).opacity) : -1,
          // Con trỏ còn nằm trên card gắn lại thì hover zoom chạy; đó không phải hiệu ứng vào của ảnh.
          runningAnimations: current?.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running"
            && !animation.effect?.target?.matches(".media-hover-zoom:hover")).length ?? -1,
        };
      }, replayFixtureId);
      // loading-glass R3, masonry R8: card đã tải ảnh gắn lại thì hiện ảnh ngay, không chạy lại hiệu ứng vào.
      assert(
        !replay.oldConnected && !replay.sameNode && replay.ready &&
          replay.opacity >= 0.999 && replay.runningAnimations === 0,
        `Virtual remount replayed its media entrance instead of showing it at once: ${JSON.stringify(replay)}`,
      );
      await page.waitForFunction(
        () => {
          const image = document.querySelector("[data-project-grid] .advertising-tile__foreground");
          return image && Number.parseFloat(getComputedStyle(image).opacity) >= 0.999;
        },
        null,
        { timeout: 2_000 },
      );
      const focusedCard = page.locator("[data-project-grid] .advertising-tile").first();
      const focusedId = await focusedCard.getAttribute("data-advertising-card");
      await focusedCard.evaluate((card) => card.setAttribute("data-qa-focus-retention", "true"));
      await focusedCard.locator("a").focus();
      const focusedBefore = await page.locator("[data-project-grid]").evaluate((grid) => ({
        activeId: document.activeElement?.closest("[data-advertising-card]")?.getAttribute("data-advertising-card"),
        retained: grid.querySelector("[data-qa-focus-retention]")?.getAttribute("data-advertising-card"),
      }));
      assert(
        focusedId && focusedBefore.activeId === focusedId && focusedBefore.retained === focusedId,
        `Virtual card did not receive focus before deep scroll: ${JSON.stringify({ focusedId, focusedBefore })}`,
      );
      const focusedTarget = gridTop + Math.max(0, pageLayout.totalPixelHeight - 900);
      // html có scroll-behavior: smooth; cuộn tức thì để cửa sổ ảo đo đúng tại focusedTarget.
      await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: "instant" }), focusedTarget);
      await page.waitForTimeout(400);
      const focusedWindowCount = getVirtualWindow(pageLayout, {
        scrollTop: Math.max(0, focusedTarget - gridTop),
        viewportHeight: 900,
        overscan: 900,
      }).items.length;
      const focusedState = await page.locator("[data-project-grid]").evaluate((grid, id) => {
        const retained = grid.querySelector(`[data-advertising-card="${id}"]`);
        return {
          activeId: document.activeElement?.closest("[data-advertising-card]")?.getAttribute("data-advertising-card"),
          retained: retained?.getAttribute("data-qa-focus-retention"),
          connected: retained?.isConnected,
          totalDomCount: grid.querySelectorAll(".advertising-tile").length,
        };
      }, focusedId);
      assert(
        focusedId && focusedState.activeId === focusedId && focusedState.retained === "true" && focusedState.connected &&
          focusedState.totalDomCount <= focusedWindowCount + 1 && focusedState.totalDomCount < expectedCardCount,
        `Focused virtual card was replaced or DOM became unbounded: ${JSON.stringify({ focusedId, focusedBefore, focusedWindowCount, focusedState })}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runAdvertisingCompatibilityChecks();
}
async function runAdvertisingCompatibilityChecks() {
  const { ADVERTISING_CATEGORIES, ADVERTISING_LEGACY_CATEGORIES } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "catalog.mjs")).href);
  const categoryTitles = new Map(ADVERTISING_LEGACY_CATEGORIES.map((category) => [category.slug, { vi: category.titleVi, en: category.titleEn }]));
  // Trang tương thích chuyển tới trang cụm mới theo slug của locale (taxonomy R4); EN mobile-retail là chính trang cụm.
  const clusterPath = (slug, locale) => `/${locale}/advertising-products/${ADVERTISING_CATEGORIES.find((category) => category.legacySlug === slug)?.[locale === "en" ? "slugEn" : "slugVi"]}/`;
  for (const locale of ["vi", "en"]) {
    for (const slug of ADVERTISING_CATEGORY_SLUGS) {
      await runPageCase(
        `advertising compatibility ${locale}/${slug}`,
        { route: `/${locale}/advertising-products/${slug}/?photo=stale-photo&tag=stale-tag&category=stale-category`, viewport: { width: 390, height: 844 } },
        async (page) => {
          const diagnostics = monitorPage(page);
          await gotoRoute(page, `/${locale}/advertising-products/${slug}/?photo=stale-photo&tag=stale-tag&category=stale-category`);
          const url = new URL(page.url());
          assert(
            url.origin === BASE_ORIGIN && canonicalPathname(url) === clusterPath(slug, locale) &&
              !url.searchParams.has("category") && !url.searchParams.has("photo") && !url.searchParams.has("tag"),
            `${locale}/${slug} did not cleanly replace to its cluster page: ${url}`,
          );
          const photoState = await page.locator("[data-advertising-photo-view]").evaluate((view) => ({ hidden: view.hidden, active: view.dataset.advertisingPhotoId || null }));
          assert(photoState.hidden && !photoState.active, `compatibility route must leave the reusable photo view inactive: ${JSON.stringify(photoState)}`);
          assertDiagnostics(diagnostics);
        },
      );
    }
  }
  for (const [locale, slug] of [["vi", "kiosk-posm"], ["en", "print-decals"]]) {
    await runPageCase(
      `advertising compatibility no-js fallback ${locale}/${slug}`,
      { route: `/${locale}/advertising-products/${slug}/`, viewport: { width: 390, height: 844 } },
      async (page) => {
        const response = await page.request.get(pageUrl(`/${locale}/advertising-products/${slug}/`));
        const html = await response.text();
        assert(response.ok() && html.includes(`<link rel="canonical" href="${clusterPath(slug, locale)}"`) && /<noscript[\s>]/i.test(html) && html.includes(`url=${clusterPath(slug, locale)}`) && html.replaceAll("&amp;", "&").includes(categoryTitles.get(slug)?.[locale]), `${locale}/${slug} raw localized fallback drifted`);
      },
    );
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const noJsPage = await context.newPage();
    try {
      await noJsPage.goto(pageUrl(`/${locale}/advertising-products/${slug}/`), { waitUntil: "domcontentloaded" });
      await noJsPage.waitForURL((url) => canonicalPathname(url) === clusterPath(slug, locale), { timeout: 5_000 });
    } finally { await context.close(); }
  }
}

// Bị thay bởi AD-BROWSE-R1 photo detail; CAROUSEL_ONLY alias hóa compatibility để tránh assertion composition đã retire.
async function runAdvertisingThreeThousandCardProbe() {
  const { ADVERTISING_CATEGORIES, buildAdvertisingArtifact } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "catalog.mjs")).href);
  const { advertisingFilterRank, compileAdvertisingProductLayout: compileAdvertisingLayout, getVirtualWindow, matchesAdvertisingFilter } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "layout-core.mjs")).href);
  const { shuffleWithSeed } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "random-order.mjs")).href);
  const { inspectAdvertisingGrid } = await import(pathToFileURL(path.resolve("tests/site/advertising-grid-oracle.mjs")).href);
  const svg = (width, height, fill) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${fill}"/></svg>`)}`;
  const viewport = { width: 1440, height: 900 };
  const interCardGap = 35;
  // R5: masonry rộng bằng viewport trừ hai lề, không còn bề rộng tối đa.
  const cardWidth = (viewport.width - 70 - interCardGap * 3) / 4;
  const captionPixelHeight = 0;
  const quantum = 0.125 * cardWidth;
  const rowStep = 8 * cardWidth;
  const patterns = [[2, 3, 4], [3, 5, 2], [4, 2, 5], [5, 4, 3]];
  const bottoms = [];
  const cards = Array.from({ length: 3000 }, (_, index) => {
    const row = Math.floor(index / 4);
    const column = index % 4;
    const deltas = patterns[row % patterns.length];
    const phases = [0, deltas[0] * quantum, (deltas[0] + deltas[1]) * quantum, (deltas[0] + deltas[1] + deltas[2]) * quantum];
    const bottom = (row + 1) * rowStep + phases[column];
    const top = row ? bottoms[index - 4] + interCardGap : 0;
    const mediaPixelHeight = bottom - top - captionPixelHeight;
    bottoms.push(bottom);
    return {
      id: `benchmark-${String(index).padStart(4, "0")}`,
      category: "displays-booths",
      rank: index,
      sourceOrder: index,
      media: {
        src: svg(cardWidth, mediaPixelHeight, ["#8ba9bf", "#c0aa88", "#8da88d", "#b38b8b"][column]),
        // Media contract đòi width/height nguyên dương; nhân 4 rồi làm tròn để giữ tỷ lệ gốc.
        width: Math.round(cardWidth * 4),
        height: Math.round(mediaPixelHeight * 4),
        altVi: "Mẫu kiểm tra ảo hóa",
        altEn: "Virtualization test sample",
      },
      titleVi: `Mẫu ${index}`,
      titleEn: `Sample ${index}`,
    };
  });
  const artifact = buildAdvertisingArtifact({ categories: ADVERTISING_CATEGORIES, cards });
  const feasibleLayout = compileAdvertisingLayout({
    cards: artifact.cards,
    categoryOrder: artifact.categories.map((category) => category.slug),
    datasetVersion: artifact.datasetVersion,
    settings: artifact.settings,
    filter: "all",
    layoutViewportWidth: viewport.width,
  });
  const feasibleInspection = inspectAdvertisingGrid({ layout: feasibleLayout, placements: feasibleLayout.placements });
  assert(feasibleInspection.valid && feasibleLayout.placements.length === 3000 && feasibleLayout.diagnostics.operations <= 300000, `3K fixture is not independently feasible: ${JSON.stringify({ operations: feasibleLayout.diagnostics.operations, violations: feasibleInspection.violations.slice(0, 3) })}`);
  // Lưới xếp theo thứ tự ngẫu nhiên của lượt duyệt (R4): dựng lại cùng seed, cùng pool như runtime.
  const browseLayout = async (page, filter, layoutViewportWidth) => {
    const seed = await page.evaluate(() => window.TruongThinhAdvertising.getBrowseState().seed);
    const pool = artifact.cards.filter((card) => matchesAdvertisingFilter(card, filter));
    return compileAdvertisingLayout({
      cards: artifact.cards,
      categoryOrder: artifact.categories.map((category) => category.slug),
      datasetVersion: artifact.datasetVersion,
      settings: artifact.settings,
      filter,
      layoutViewportWidth,
      presentationOrder: shuffleWithSeed(pool, seed, `grid:${filter}`)
        .sort((left, right) => advertisingFilterRank(left, filter) - advertisingFilterRank(right, filter)).map(({ id }) => id),
      organicOrder: true,
    });
  };
  const scrollTargetFor = async (page, layout, id) => {
    const target = layout.placements.find((placement) => placement.card.id === id);
    if (!target) throw new Error(`artifact placement missing: ${id}`);
    const gridTop = await page.locator("[data-project-grid]").evaluate((grid) => grid.getBoundingClientRect().top + window.scrollY);
    return gridTop + target.y;
  };
  // html có scroll-behavior: smooth; cuộn instant để vị trí có ngay.
  const scrollInstant = (page, top) => page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: "instant" }), top);
  await runPageCase(
    "advertising 3000-card virtual window",
    { route: "/vi/advertising-products/", viewport },
    async (page) => {
      await page.addInitScript((injectedArtifact) => {
        window.__TT_ADVERTISING_ARTIFACT__ = injectedArtifact;
      }, artifact);
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/advertising-products/");
      await page.waitForFunction(
        () => document.querySelectorAll("[data-project-grid] .advertising-tile").length > 0,
        null,
        { timeout: 3_000 },
      );
      const composition = await page.locator("[data-project-grid]").evaluate((grid, injectedArtifact) => {
        const records = new Map(injectedArtifact.cards.map((card) => [card.id, card]));
        return [...grid.querySelectorAll(".advertising-tile")].slice(0, 28).map((tile) => {
          const record = records.get(tile.dataset.advertisingCard);
          const media = tile.querySelector(".project-tile__media");
          const foreground = tile.querySelector(".advertising-tile__foreground");
          const bounds = media.getBoundingClientRect();
          return {
            id: record.id,
            expectedRatio: record.media.width / record.media.height,
            renderedRatio: bounds.width / bounds.height,
            layoutSpan: Number(tile.dataset.advertisingSpan),
            fitAttribute: media.getAttribute("data-media-fit"),
            backplates: media.querySelectorAll(".advertising-tile__backplate").length,
            foregrounds: media.querySelectorAll(".advertising-tile__foreground").length,
            foregroundAlt: foreground?.alt,
            foregroundFit: foreground ? getComputedStyle(foreground).objectFit : null,
          };
        });
      }, artifact);
      assert(composition.every((entry) => entry.layoutSpan === 1 && Math.abs(entry.renderedRatio - entry.expectedRatio) <= 0.01), `one-column media geometry drift: ${JSON.stringify(composition)}`);
      assert(composition.every((entry) => entry.fitAttribute === null && entry.backplates === 0 && entry.foregrounds === 1 && entry.foregroundAlt === "Mẫu kiểm tra ảo hóa"), `natural media gained legacy canvas treatment: ${JSON.stringify(composition)}`);
      const initialGeometryHeight = await page.locator("[data-project-grid]").evaluate((grid) => Number.parseFloat(grid.style.height));
      assert(initialGeometryHeight > 200_000, `3000-card injection did not reach runtime: grid height ${initialGeometryHeight}`);
      const deepLayout = await browseLayout(page, "all", await page.evaluate(() => document.documentElement.clientWidth));
      // Card sâu là card ở vị trí trình bày 2800 của lượt duyệt, không phải id cố định.
      const deepId = deepLayout.placements[2800].card.id;
      const target = await scrollTargetFor(page, deepLayout, deepId);
      await scrollInstant(page, target);
      await page.waitForTimeout(600);
      const nearFrontier = await page.locator("[data-project-grid]").evaluate((grid, deepId) => {
        const tiles = [...grid.querySelectorAll(".advertising-tile")];
        const rectangles = tiles.map((tile) => {
          const rect = tile.getBoundingClientRect();
          return { id: tile.dataset.advertisingCard, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        });
        const overlap = rectangles.some((first, index) => rectangles.slice(index + 1).some((second) =>
          Math.min(first.right, second.right) - Math.max(first.left, second.left) > 0.5 &&
          Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 0.5,
        ));
        return {
          count: tiles.length,
          has2800: Boolean(grid.querySelector(`[data-advertising-card="${deepId}"]`)),
          ids: tiles.map((tile) => tile.dataset.advertisingCard),
          hasEarly: Boolean(grid.querySelector('[data-advertising-card="tt-0000"]')),
          height: Number.parseFloat(grid.style.height),
          gridTop: grid.getBoundingClientRect().top + window.scrollY,
          scrollY: window.scrollY,
          overflow: document.documentElement.scrollWidth - innerWidth,
          overlap,
          prefix: tiles.slice(0, 24).map((tile) => `${tile.dataset.advertisingCard}:${tile.style.left}:${tile.style.top}`),
        };
      }, deepId);
      const expectedDeepWindow = getVirtualWindow(deepLayout, {
        scrollTop: Math.max(0, nearFrontier.scrollY - nearFrontier.gridTop),
        viewportHeight: viewport.height,
        overscan: viewport.height,
      }).items.map((placement) => placement.card.id);
      assert(nearFrontier.has2800 && !nearFrontier.hasEarly && JSON.stringify(nearFrontier.ids) === JSON.stringify(expectedDeepWindow), `index 2800 virtual window diverged from the full layout: ${JSON.stringify({ count: nearFrontier.count, actual: nearFrontier.ids, expected: expectedDeepWindow, scrollY: nearFrontier.scrollY })}`);
      assert(nearFrontier.count > 0 && nearFrontier.count < 120, `3000-card DOM window is unbounded: ${nearFrontier.count}`);
      assert(nearFrontier.height > target, "geometry spacer does not preserve deep scroll extent");
      assert(nearFrontier.scrollY >= target - 2, "deep scroll position was not retained");
      assert(nearFrontier.overflow <= 1 && !nearFrontier.overlap, "deep virtual window has overflow or overlap");

      await page.locator('[data-advertising-filter="mobile-retail"]').click();
      await page.locator('[data-advertising-filter="all"]').click();
      await scrollInstant(page, target);
      await page.waitForTimeout(600);
      const afterFilter = await page.locator("[data-project-grid]").evaluate((grid) => ({
        scrollY: window.scrollY,
        prefix: [...grid.querySelectorAll(".advertising-tile")].slice(0, 24).map((tile) => `${tile.dataset.advertisingCard}:${tile.style.left}:${tile.style.top}`),
      }));
      assert(afterFilter.scrollY >= target - 2, "filter round-trip shifted deep scroll position");
      assert(JSON.stringify(afterFilter.prefix) === JSON.stringify(nearFrontier.prefix), "filter round-trip changed the remounted deterministic window");

      await page.setViewportSize({ width: 1200, height: 900 });
      await page.waitForTimeout(500);
      const resizedLayout = await browseLayout(page, "all", await page.evaluate(() => document.documentElement.clientWidth));
      const resizedTarget = await scrollTargetFor(page, resizedLayout, deepId);
      await scrollInstant(page, resizedTarget);
      await page.waitForTimeout(500);
      const afterResize = await page.locator("[data-project-grid]").evaluate((grid, deepId) => ({
        count: grid.querySelectorAll(".advertising-tile").length,
        overflow: document.documentElement.scrollWidth - innerWidth,
        has2800: Boolean(grid.querySelector(`[data-advertising-card="${deepId}"]`)),
      }), deepId);
      assert(afterResize.count > 0 && afterResize.count < 120 && afterResize.overflow <= 1 && afterResize.has2800, `resize lost the bounded deep virtual window: ${JSON.stringify(afterResize)}`);
      assertDiagnostics(diagnostics);
    },
  );
}

async function runAdvertisingLocaleLifecycleChecks() {
  const { ADVERTISING_CATEGORIES, buildAdvertisingArtifact } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "catalog.mjs")).href);
  const { compileAdvertisingProductLayout: compileAdvertisingLayout } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "layout-core.mjs")).href);
  const { shuffleWithSeed } = await import(pathToFileURL(path.join(SITE_ROOT, "advertising-products", "random-order.mjs")).href);
  const virtualizedCards = Array.from({ length: 3000 }, (_, index) => {
    const kiosk = index < 3;
    const primaryKiosk = index === 0;
    return {
      id: kiosk ? `kiosk-posm-${String(index + 1).padStart(2, "0")}` : `locale-${String(index).padStart(4, "0")}`,
      category: kiosk ? "displays-booths" : "mobile-retail",
      rank: index,
      sourceOrder: kiosk ? index : index - 3,
      media: {
        src: "/assets/content/projects/advertising-kiosk-posm-cover-v2.webp",
        width: 1536,
        height: 1024,
        altVi: primaryKiosk ? "Gian hàng triển lãm do Trường Thịnh thực hiện" : "Mẫu kiểm tra ảo hóa",
        altEn: primaryKiosk ? "Exhibition booths made by Trường Thịnh" : "Virtualization test sample",
      },
      titleVi: primaryKiosk ? "Gian hàng triển lãm" : `Mẫu ${index}`,
      titleEn: primaryKiosk ? "Exhibition booths" : `Sample ${index}`,
    };
  });
  const artifact = buildAdvertisingArtifact({ categories: ADVERTISING_CATEGORIES, cards: virtualizedCards });
  await runPageCase(
    "advertising locale SplitText and focused filter lifecycle",
    { route: "/vi/advertising-products/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await page.addInitScript((injectedArtifact) => {
        window.__TT_ADVERTISING_ARTIFACT__ = injectedArtifact;
      }, artifact);
      await gotoRoute(page, "/vi/advertising-products/");
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      const snapshot = () => page.evaluate(() => {
        const title = document.querySelector("#page-title");
        const lines = [...document.querySelectorAll("[data-motion-lines] .motion-line")];
        return {
          language: document.documentElement.lang,
          title: title?.textContent?.replace(/\s+/g, " ").trim(),
          aria: title?.getAttribute("aria-label"),
          lineCount: lines.length,
          duplicateLines: document.querySelectorAll("[data-motion-lines] .motion-line .motion-line").length > 0,
        };
      });
      const switchLanguage = async (language) => {
        await page.evaluate(() => {
          window.__ttAdvertisingLocaleSettled = false;
          window.addEventListener(
            "site:section-replay",
            () => {
              window.__ttAdvertisingLocaleSettled = true;
            },
            { once: true },
          );
        });
        await openMenu(page);
        await page.locator(`#site-menu [data-language-option="${language}"]`).click();
        await page
          .waitForFunction(
            (expected) => document.documentElement.lang === expected && !document.querySelector("#site-menu")?.open,
            language,
            { timeout: 6_000 },
          )
          .catch((error) => {
            throw new Error(`language ${language} did not settle in place: ${error.message}`);
          });
        await page
          .waitForFunction((expected) => location.pathname.startsWith(`/${expected}/advertising-products/`), language)
          .catch((error) => {
            throw new Error(`language ${language} did not update the route: ${error.message}`);
          });
        await page
          // Replay phát trước khi veil mở xong; menu không mở khi route còn chạy (site-shell R4), nên chờ cả hai.
          .waitForFunction(() => window.__ttAdvertisingLocaleSettled === true && !document.body.classList.contains("is-transitioning"))
          .catch(async (error) => {
            const state = await page.evaluate(() => ({
              language: document.documentElement.lang,
              menuOpen: Boolean(document.querySelector("#site-menu")?.open),
              pathname: location.pathname,
              replayed: window.__ttAdvertisingLocaleSettled,
              transitioning: document.body.classList.contains("is-transitioning"),
            }));
            throw new Error(`language ${language} did not complete its production replay: ${error.message}; ${JSON.stringify({ state, diagnostics })}`);
          });
        assert(await page.evaluate(() => performance.timeOrigin) === timeOrigin, "locale switch must stay in the current document");
      };
      const virtualizeKiosk = async () => {
        // Thứ tự ngẫu nhiên theo lượt duyệt (advertising-masonry R4): dựng lại layout cùng seed để biết vị trí kiosk.
        const seed = await page.evaluate(() => window.TruongThinhAdvertising.getBrowseState().seed);
        const layout = compileAdvertisingLayout({
          cards: artifact.cards,
          categoryOrder: artifact.categories.map((category) => category.slug),
          datasetVersion: artifact.datasetVersion,
          settings: artifact.settings,
          filter: "all",
          layoutViewportWidth: await page.evaluate(() => document.documentElement.clientWidth),
          presentationOrder: shuffleWithSeed(artifact.cards, seed, "grid:all").map(({ id }) => id),
          organicOrder: true,
        });
        const kiosk = layout.placements.find((placement) => placement.card.id === "kiosk-posm-01");
        // Cuộn tới placement xa kiosk nhất để kiosk chắc chắn rời DOM ảo hóa.
        const far = layout.placements.reduce((best, placement) => (Math.abs(placement.y - kiosk.y) > Math.abs(best.y - kiosk.y) ? placement : best));
        const gridTop = await page.locator("[data-project-grid]").evaluate((grid) => grid.getBoundingClientRect().top + window.scrollY);
        await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: "instant" }), gridTop + far.y);
        await page
          .waitForFunction(() => !document.querySelector('[data-advertising-card="kiosk-posm-01"]'))
          .catch((error) => {
            throw new Error(`virtualized kiosk did not leave the DOM: ${error.message}`);
          });
        await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: "instant" }), Math.max(0, gridTop + kiosk.y - 100));
        await page
          .waitForFunction(() => Boolean(document.querySelector('[data-advertising-card="kiosk-posm-01"]')))
          .catch(async (error) => {
            const state = await page.locator("[data-project-grid]").evaluate((grid) => ({
              rectTop: grid.getBoundingClientRect().top,
              scrollY: window.scrollY,
              rendered: [...grid.querySelectorAll(".advertising-tile")].slice(0, 8).map((tile) => tile.dataset.advertisingCard),
            }));
            throw new Error(`virtualized kiosk did not remount: ${error.message}; ${JSON.stringify(state)}`);
          });
      };
      const vi = await snapshot();
      await switchLanguage("en");
      const en = await snapshot();
      await switchLanguage("vi");
      const viAgain = await snapshot();
      assert(vi.language === "vi" && en.language === "en" && viAgain.language === "vi", `locale cycle failed: ${JSON.stringify({ vi, en, viAgain })}`);
      assert(vi.title === "để thương hiệu luôn trong tầm mắt" && vi.aria === vi.title && en.title === "Keep your brand always in sight" && en.aria === en.title && viAgain.title === vi.title && viAgain.aria === vi.title && !vi.duplicateLines && !en.duplicateLines && !viAgain.duplicateLines, `SplitText locale content/ARIA/wrappers drifted: ${JSON.stringify({ vi, en, viAgain })}`);

      await page.locator("#cta-title").scrollIntoViewIfNeeded();
      await page.waitForTimeout(280);
      const activeReveal = () => page.evaluate(() => {
        const lines = [...document.querySelectorAll("#cta-title .motion-line")];
        const values = lines.map((line) => {
          const style = getComputedStyle(line);
          return new DOMMatrixReadOnly(style.transform).f;
        });
        return { count: lines.length, values, nested: document.querySelectorAll("#cta-title .motion-line .motion-line").length };
      });
      const beforeResize = await activeReveal();
      await page.setViewportSize({ width: 1200, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(220);
      const afterResize = await activeReveal();
      const resized = await snapshot();
      assert(beforeResize.count > 0 && beforeResize.nested === 0 && afterResize.count > 0 && afterResize.nested === 0 && !resized.duplicateLines && resized.lineCount > 0 && afterResize.values.some((value, index) => Math.abs(value - beforeResize.values[index]) > 0.1) && afterResize.values.some((value) => value > -20), `SplitText active resize/font lifecycle snapped or duplicated wrappers: ${JSON.stringify({ beforeResize, afterResize, resized })}`);

      await page.setViewportSize({ width: 960, height: 900 });
      await page.waitForTimeout(400);
      await switchLanguage("en");
      await virtualizeKiosk();
      const localizedCard = await page.locator("[data-project-grid]").evaluate((grid) => {
        const card = grid.querySelector('[data-advertising-card="kiosk-posm-01"]');
        const link = card?.querySelector("a");
        const image = card?.querySelector(".advertising-tile__foreground");
        return { filter: document.querySelector('[data-advertising-filter="all"]')?.textContent?.trim(), captionCount: card?.querySelectorAll("figcaption").length, alt: image?.alt, href: link?.getAttribute("href") };
      });
      assert(localizedCard.filter === "All" && localizedCard.captionCount === 0 && localizedCard.alt === "Exhibition booths made by Trường Thịnh" && localizedCard.href === "/en/advertising-products/?category=displays-booths&photo=kiosk-posm-01", `English catalog locale or title-removal contract did not survive remount: ${JSON.stringify(localizedCard)}`);

      await switchLanguage("vi");
      await virtualizeKiosk();
      const localizedViCard = await page.locator("[data-project-grid]").evaluate((grid) => {
        const card = grid.querySelector('[data-advertising-card="kiosk-posm-01"]');
        const link = card?.querySelector("a");
        const image = card?.querySelector(".advertising-tile__foreground");
        return { filter: document.querySelector('[data-advertising-filter="all"]')?.textContent?.trim(), captionCount: card?.querySelectorAll("figcaption").length, alt: image?.alt, href: link?.getAttribute("href") };
      });
      assert(localizedViCard.filter === "Tất cả" && localizedViCard.captionCount === 0 && localizedViCard.alt === "Gian hàng triển lãm do Trường Thịnh thực hiện" && localizedViCard.href === "/vi/advertising-products/?category=displays-booths&photo=kiosk-posm-01", `Vietnamese catalog locale or title-removal contract did not survive remount: ${JSON.stringify(localizedViCard)}`);

      await page.locator(".advertising-tile a").first().focus();
      await page.evaluate(() => document.querySelector('[data-advertising-filter="mobile-retail"]')?.click());
      await page.waitForTimeout(250);
      const filterFocus = await page.evaluate(() => {
        const active = document.activeElement;
        const zero = [...document.querySelectorAll(".advertising-tile")].filter((tile) => {
          if (tile.hidden) return false;
          const rect = tile.getBoundingClientRect();
          return Math.abs(rect.left) < 0.5 && Math.abs(rect.top) < 0.5;
        }).length;
        return { active: active?.getAttribute("data-advertising-filter"), zero };
      });
      assert(filterFocus.active === "mobile-retail" && filterFocus.zero === 0, `focused filter left stale fallback tile: ${JSON.stringify(filterFocus)}`);
      assertDiagnostics(diagnostics);
    },
  );
}

async function runResidentialHeroTextCheck() {
  const cases = [
    { viewport: { width: 320, height: 844 } },
    { viewport: { width: 390, height: 844 } },
    { viewport: { width: 768, height: 900 } },
    { viewport: { width: 1024, height: 900 } },
    { viewport: { width: 1440, height: 900 } },
    {
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    },
  ];

  for (const locale of ["vi", "en"]) {
    for (const testCase of cases) {
      const { viewport, reducedMotion = "no-preference" } = testCase;
      await runPageCase(
        `residential hero text ${locale} ${viewport.width}x${viewport.height} ${reducedMotion}`,
        { route: `/${locale}/residential/`, viewport, reducedMotion },
        async (page) => {
          const diagnostics = monitorPage(page);
          await gotoRoute(page, `/${locale}/residential/`);
          await page.waitForFunction(
            () => {
              const kicker = document.querySelector(".residential-hero .hero-kicker");
              const title = document.querySelector(".residential-hero h1");
              const words = [...(title?.querySelectorAll(".motion-word") || [])];
              const sources = [
                ...(title?.querySelectorAll("[data-motion-word-source]") || []),
              ];
              const visibleTitleNodes = matchMedia(
                "(prefers-reduced-motion: reduce)",
              ).matches
                ? sources
                : words;
              return (
                kicker &&
                title &&
                Number.parseFloat(getComputedStyle(kicker).opacity) > 0.99 &&
                visibleTitleNodes.length > 0 &&
                visibleTitleNodes.every(
                  (word) => Number.parseFloat(getComputedStyle(word).opacity) > 0.99,
                )
              );
            },
            null,
            { timeout: 4_000 },
          );

          const hero = await page.locator(".residential-hero").evaluate((element) => {
            const rect = (node) => {
              const value = node.getBoundingClientRect();
              return {
                top: value.top,
                right: value.right,
                bottom: value.bottom,
                left: value.left,
                width: value.width,
                height: value.height,
              };
            };
            const textRect = (node) => {
              const range = document.createRange();
              range.selectNodeContents(node);
              return rect(range);
            };
            const normalize = (value) => value.replace(/\s+/g, " ").trim();
            const content = element.querySelector(".hero-content");
            const kicker = element.querySelector(".hero-kicker");
            const heading = element.querySelector("h1");
            const sources = [...heading.querySelectorAll("[data-motion-word-source]")];
            const contentRect = rect(content);
            const kickerTextRect = textRect(kicker);
            const textRects = sources.map(textRect);
            const sourceFontSizes = sources.map((source) =>
              Number.parseFloat(getComputedStyle(source).fontSize),
            );
            const contentCenter = contentRect.left + contentRect.width / 2;

            return {
              kicker: normalize(kicker.textContent),
              title: normalize(heading.textContent),
              lines: sources.map((source) => normalize(source.textContent)),
              hasMotto: element.querySelector(".detail-hero-motto") !== null,
              slideCount: element.querySelectorAll(".hero-slide").length,
              mediaCount: element.querySelectorAll("[data-motion-hero-media]").length,
              motionToggleCount: element.querySelectorAll("[data-motion-toggle]").length,
              scrollCueCount: element.querySelectorAll("[data-scroll-cue]").length,
              contentRect,
              kickerTextRect,
              textRects,
              sourceFontSizes,
              contentCenter,
              textCenters: textRects.map((value) => value.left + value.width / 2),
              uppercase: getComputedStyle(heading).textTransform === "uppercase",
              verticalOrder:
                kickerTextRect.bottom < textRects[0].top &&
                textRects[0].top < textRects[1].top,
              inViewport: [kickerTextRect, ...textRects].every(
                (value) =>
                  value.top >= -1 &&
                  value.bottom <= window.innerHeight + 1 &&
                  value.left >= -1 &&
                  value.right <= window.innerWidth + 1,
              ),
              noHorizontalOverflow:
                document.documentElement.scrollWidth - window.innerWidth <= 1,
            };
          });

          const expected =
            locale === "vi"
              ? {
                  kicker: "NHÀ PHỐ · CĂN HỘ · HOMESTAY",
                  title: "Nơi tái tạo năng lượng sống",
                  lines: ["Nơi tái tạo", "năng lượng sống"],
                }
              : {
                  kicker: "TOWNHOUSES · APARTMENTS · HOMESTAYS",
                  title: "A place to recharge",
                  lines: ["A place to", "recharge"],
                };
          assert(
            hero.kicker === expected.kicker &&
              hero.title === expected.title &&
              JSON.stringify(hero.lines) === JSON.stringify(expected.lines) &&
              !hero.hasMotto &&
              hero.slideCount === 1 &&
              hero.mediaCount === 1 &&
              hero.motionToggleCount === 0 &&
              hero.scrollCueCount === 1,
            `${locale} ${viewport.width}x${viewport.height}: residential hero copy or reading order drifted`,
          );
          assert(
            hero.uppercase &&
              hero.verticalOrder &&
              hero.inViewport &&
              hero.noHorizontalOverflow &&
              hero.contentRect.width <= 1001,
            `${locale} ${viewport.width}x${viewport.height}: residential hero text escaped its Espacio-style bounds`,
          );

          if (viewport.width > 680) {
            assert(
              Math.abs(hero.textRects[0].left - hero.contentRect.left) <= 2 &&
                Math.abs(hero.textRects[1].right - hero.contentRect.right) <= 2 &&
                Math.abs(hero.kickerTextRect.left - hero.contentRect.left - 8) <= 2 &&
                hero.sourceFontSizes.every((size) => size <= 112.1),
              `${locale} ${viewport.width}x${viewport.height}: residential desktop title lost its left/right composition`,
            );
          } else {
            assert(
              hero.textCenters.every(
                (center) => Math.abs(center - hero.contentCenter) <= 2,
              ) && Math.abs(
                hero.kickerTextRect.left + hero.kickerTextRect.width / 2 - hero.contentCenter,
              ) <= 2,
              `${locale} ${viewport.width}x${viewport.height}: residential mobile title is not centered`,
            );
          }
          assertDiagnostics(diagnostics);
        },
      );
    }
  }
}

async function runCommercialHeroTextCheck() {
  const cases = [
    { viewport: { width: 320, height: 844 } },
    { viewport: { width: 390, height: 844 } },
    { viewport: { width: 768, height: 900 } },
    { viewport: { width: 1024, height: 900 } },
    { viewport: { width: 1440, height: 900 } },
    {
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    },
  ];

  for (const locale of ["vi", "en"]) {
    for (const testCase of cases) {
      const { viewport, reducedMotion = "no-preference" } = testCase;
      await runPageCase(
        `commercial hero text ${locale} ${viewport.width}x${viewport.height} ${reducedMotion}`,
        { route: `/${locale}/commercial/`, viewport, reducedMotion },
        async (page) => {
          const diagnostics = monitorPage(page);
          await gotoRoute(page, `/${locale}/commercial/`);
          await page.waitForFunction(
            () => {
              const kicker = document.querySelector(".commercial-hero .hero-kicker");
              const title = document.querySelector(".commercial-hero h1");
              const words = [...(title?.querySelectorAll(".motion-word") || [])];
              const sources = [
                ...(title?.querySelectorAll("[data-motion-word-source]") || []),
              ];
              const visibleTitleNodes = matchMedia(
                "(prefers-reduced-motion: reduce)",
              ).matches
                ? sources
                : words;
              return (
                kicker &&
                title &&
                Number.parseFloat(getComputedStyle(kicker).opacity) > 0.99 &&
                visibleTitleNodes.length > 0 &&
                visibleTitleNodes.every(
                  (word) => Number.parseFloat(getComputedStyle(word).opacity) > 0.99,
                )
              );
            },
            null,
            { timeout: 4_000 },
          );

          const hero = await page.locator(".commercial-hero").evaluate((element) => {
            const rect = (node) => {
              const value = node.getBoundingClientRect();
              return {
                top: value.top,
                right: value.right,
                bottom: value.bottom,
                left: value.left,
                width: value.width,
                height: value.height,
              };
            };
            const textRect = (node) => {
              const range = document.createRange();
              range.selectNodeContents(node);
              return rect(range);
            };
            const normalize = (value) => value.replace(/\s+/g, " ").trim();
            const content = element.querySelector(".hero-content");
            const kicker = element.querySelector(".hero-kicker");
            const heading = element.querySelector("h1");
            const sources = [...heading.querySelectorAll("[data-motion-word-source]")];
            const contentRect = rect(content);
            const kickerTextRect = textRect(kicker);
            const textRects = sources.map(textRect);
            const sourceStyles = sources.map((source) => getComputedStyle(source));
            const contentCenter = contentRect.left + contentRect.width / 2;

            return {
              kicker: normalize(kicker.textContent),
              title: normalize(heading.textContent),
              lines: sources.map((source) => normalize(source.textContent)),
              hasMotto: element.querySelector(".detail-hero-motto") !== null,
              slideCount: element.querySelectorAll(".hero-slide").length,
              mediaCount: element.querySelectorAll("[data-motion-hero-media]").length,
              motionToggleCount: element.querySelectorAll("[data-motion-toggle]").length,
              scrollCueCount: element.querySelectorAll("[data-scroll-cue]").length,
              contentRect,
              kickerTextRect,
              textRects,
              sourceFontSizes: sourceStyles.map((style) =>
                Number.parseFloat(style.fontSize),
              ),
              contentCenter,
              // Phone treo dấu chấm (.text-hang-end): tâm tính theo phần chữ, không gồm dấu.
              letterCenters: sources.map((source) => {
                const value = textRect(source.querySelector("[data-en]") ?? source);
                return value.left + value.width / 2;
              }),
              uppercase: getComputedStyle(heading).textTransform === "uppercase",
              verticalOrder:
                kickerTextRect.bottom < textRects[0].top &&
                textRects[0].top < textRects[1].top,
              inViewport: [kickerTextRect, ...textRects].every(
                (value) =>
                  value.top >= -1 &&
                  value.bottom <= window.innerHeight + 1 &&
                  value.left >= -1 &&
                  value.right <= window.innerWidth + 1,
              ),
              noHorizontalOverflow:
                document.documentElement.scrollWidth - window.innerWidth <= 1,
            };
          });

          const expected =
            locale === "vi"
              ? {
                  kicker: "SHOP · F&B · SHOWROOM · VĂN PHÒNG",
                  title: "Thiết kế để bán tốt. Thi công để vận hành bền.",
                  lines: ["Thiết kế để bán tốt.", "Thi công để vận hành bền."],
                }
              : {
                  kicker: "SHOP · F&B · SHOWROOM · OFFICE",
                  title: "Designed to sell. Built to perform.",
                  lines: ["Designed to sell.", "Built to perform."],
                };
          assert(
            hero.kicker === expected.kicker &&
              hero.title === expected.title &&
              JSON.stringify(hero.lines) === JSON.stringify(expected.lines) &&
              !hero.hasMotto &&
              hero.slideCount === 1 &&
              hero.mediaCount === 1 &&
              hero.motionToggleCount === 0 &&
              hero.scrollCueCount === 1,
            `${locale} ${viewport.width}x${viewport.height}: commercial hero copy or reading order drifted`,
          );
          assert(
            hero.uppercase &&
              hero.verticalOrder &&
              hero.inViewport &&
              hero.noHorizontalOverflow &&
              hero.contentRect.width <= 1001,
            `${locale} ${viewport.width}x${viewport.height}: commercial hero text escaped its Espacio-style bounds`,
          );

          if (viewport.width > 680) {
            assert(
                Math.abs(hero.textRects[0].left - hero.contentRect.left) <= 2 &&
                Math.abs(hero.textRects[1].right - hero.contentRect.right) <= 2 &&
                Math.abs(hero.kickerTextRect.left - hero.contentRect.left - 8) <= 2 &&
                hero.sourceFontSizes.every((size) => size <= 92.1),
              `${locale} ${viewport.width}x${viewport.height}: commercial desktop title lost its left/right composition`,
            );
          } else {
            assert(
              hero.letterCenters.every(
                (center) => Math.abs(center - hero.contentCenter) <= 2,
              ) &&
                Math.abs(
                  hero.kickerTextRect.left +
                    hero.kickerTextRect.width / 2 -
                    hero.contentCenter,
                ) <= 2,
              `${locale} ${viewport.width}x${viewport.height}: commercial mobile title is not centered`,
            );
          }
          assertDiagnostics(diagnostics);
        },
      );
    }
  }
}

async function runGalleryCheck() {
  const viewport = { width: 1440, height: 900 };
  await runPageCase(
    "commercial gallery layout and mouse drag",
    { route: "/vi/commercial/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/commercial/");
      const track = page.locator("[data-gallery-track]");
      await page.waitForFunction(
        () => {
          const element = document.querySelector("[data-gallery-track]");
          return element && element.scrollWidth > element.clientWidth;
        },
        null,
        { timeout: 3_000 },
      );
      // R7: ảnh cùng chiều cao, rộng theo tỷ lệ thật, caption dưới ảnh, không nút prev/next.
      const layout = await track.evaluate((element) =>
        [...element.querySelectorAll(".detail-gallery__item")].map((item) => {
          const img = item.querySelector("img");
          const image = img.getBoundingClientRect();
          const caption = item.querySelector("figcaption").getBoundingClientRect();
          return {
            height: image.height,
            ratioDrift: Math.abs(
              image.width / image.height - img.getAttribute("width") / img.getAttribute("height"),
            ),
            captionGap: caption.top - image.bottom,
          };
        }),
      );
      const heights = layout.map((item) => item.height);
      assert(
        layout.length >= 2 &&
          Math.max(...heights) - Math.min(...heights) <= 1 &&
          Math.abs(heights[0] - 720) <= 1 &&
          layout.every((item) => item.ratioDrift < 0.01 && Math.abs(item.captionGap - 10) <= 1),
        `Gallery images are not equal height, true ratio and captioned below: ${JSON.stringify(layout)}`,
      );
      assert(
        (await page.locator("[data-gallery-prev], [data-gallery-next]").count()) === 0,
        "Gallery still renders prev/next buttons",
      );

      await track.evaluate((element) => {
        element.scrollLeft = 0;
        window.__ttGalleryDrag = {
          pointerCancels: 0,
          nativeDrags: 0,
          maxLeft: 0,
        };
        element.addEventListener("scroll", () => {
          window.__ttGalleryDrag.maxLeft = Math.max(
            window.__ttGalleryDrag.maxLeft,
            element.scrollLeft,
          );
        });
        element.addEventListener("pointercancel", () => {
          window.__ttGalleryDrag.pointerCancels += 1;
        });
        element.addEventListener("dragstart", () => {
          window.__ttGalleryDrag.nativeDrags += 1;
        });
      });
      await track.scrollIntoViewIfNeeded();
      const imageBox = await page
        .locator("[data-gallery-track] img")
        .first()
        .boundingBox();
      assert(imageBox, "Gallery image has no mouse target");
      const startX = imageBox.x + imageBox.width * 0.72;
      // Giữa phần visible của ảnh; scroll-padding dưới sticky header có thể để tâm của nó dưới fold.
      const y = (Math.max(imageBox.y, 0) + Math.min(imageBox.y + imageBox.height, viewport.height)) / 2;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(startX - 220, y, { steps: 12 });
      await page.mouse.up();
      const drag = await page.evaluate(() => window.__ttGalleryDrag);
      assert(
        drag.maxLeft >= 150,
        `Gallery mouse drag moved only ${drag.maxLeft.toFixed(0)}px`,
      );
      assert(
        drag.nativeDrags === 0 && drag.pointerCancels === 0,
        `Gallery emitted ${drag.nativeDrags} dragstart / ${drag.pointerCancels} pointercancel events`,
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runEarlyHeroAccessibilityCheck() {
  const viewport = { width: 1440, height: 900 };
  await runPageCase(
    "direct hero stays in early accessibility tree without a final-state flash",
    { route: "/vi/residential/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      let releaseMotion;
      const motionGate = new Promise((resolve) => {
        releaseMotion = resolve;
      });
      await page.route("**/*motion.js*", async (route) => {
        await motionGate;
        await route.continue();
      });
      const response = await page.goto(pageUrl("/vi/residential/"), {
        waitUntil: "commit",
        timeout: 20_000,
      });
      assert(response && response.status() < 400, "Residential commit failed");
      await page.locator("h1").waitFor({ state: "attached" });
      await page.waitForFunction(
        () =>
          [...document.styleSheets].some((sheet) =>
            sheet.href?.endsWith("/style.css"),
          ),
        null,
        { timeout: 3_000 },
      );
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Accessibility.enable");
      const tree = await cdp.send("Accessibility.getFullAXTree");
      const heading = tree.nodes.find(
        (node) =>
          node.role?.value === "heading" &&
          node.properties?.some(
            (property) =>
              property.name === "level" && property.value?.value === 1,
          ),
      );
      assert(
        heading?.name?.value?.toLowerCase().includes("nơi tái tạo"),
        `Early AX h1 missing: ${JSON.stringify(heading?.name?.value)}`,
      );
      const early = await page.locator("h1").evaluate((element) => {
        const style = getComputedStyle(element);
        const contentStyle = getComputedStyle(
          element.closest(".hero-content") || element,
        );
        const veil = document.querySelector(".route-veil");
        return {
          opacity: Number.parseFloat(contentStyle.opacity),
          veilOpacity: veil ? Number.parseFloat(getComputedStyle(veil).opacity) : 0,
          visibility: style.visibility,
        };
      });
      releaseMotion();
      // Direct load giữ hero dưới route-enter veil thay vì fade nội dung.
      assert(
        (early.opacity <= 0.01 || early.veilOpacity >= 0.99) && early.visibility === "visible",
        `Early hero is not opacity-held and AX-visible: ${JSON.stringify(early)}`,
      );
      await page.waitForLoadState("domcontentloaded");
      await waitForLoadedDocument(page);
      const final = await page.locator("h1").evaluate((element) => {
        const style = getComputedStyle(element);
        const contentStyle = getComputedStyle(
          element.closest(".hero-content") || element,
        );
        return {
          opacity: Number.parseFloat(contentStyle.opacity),
          visibility: style.visibility,
        };
      });
      assert(
        final.opacity >= 0.99 && final.visibility === "visible",
        `Hero did not finish visible: ${JSON.stringify(final)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runDetailHeroEntryChecks() {
  const viewport = { width: 1440, height: 900 };
  for (const entry of [
    {
      route: "/vi/advertising-products/",
      selector: "[data-motion-hero-wrapper-zoom]",
      label: "project hero wrapper",
    },
    {
      route: "/vi/about/",
      selector: "[data-motion-hero-media]",
      label: "about hero media",
    },
    {
      route: "/vi/residential/",
      selector: "[data-motion-hero-media]",
      label: "residential hero media",
    },
    {
      route: "/vi/commercial/",
      selector: "[data-motion-hero-media]",
      label: "commercial hero media",
    },
  ]) {
    await runPageCase(
      `${entry.label} direct entry runs 1.2 to 1 over 2.5s`,
      { route: entry.route, viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await page.addInitScript((selector) => {
          window.__ttDirectHeroTrace = { done: false, samples: [] };
          const findTarget = () => {
            const target = document.querySelector(selector);
            if (!target) {
              requestAnimationFrame(findTarget);
              return;
            }
            const startedAt = performance.now();
            const sample = () => {
              const matrix = new DOMMatrixReadOnly(
                getComputedStyle(target).transform,
              );
              const elapsed = performance.now() - startedAt;
              window.__ttDirectHeroTrace.samples.push({
                elapsed,
                inview: target.classList.contains("is-motion-inview"),
                scale: matrix.a,
              });
              if (elapsed < 4_000) requestAnimationFrame(sample);
              else window.__ttDirectHeroTrace.done = true;
            };
            sample();
          };
          requestAnimationFrame(findTarget);
        }, entry.selector);
        const response = await page.goto(pageUrl(entry.route), {
          waitUntil: "domcontentloaded",
          timeout: 20_000,
        });
        assert(response && response.status() < 400, `${entry.label} load failed`);
        await page.waitForFunction(() => window.__ttDirectHeroTrace?.done, null, {
          timeout: 8_000,
        });
        const trace = await page.evaluate(() => window.__ttDirectHeroTrace);
        const start = trace.samples[0];
        // Zoom chạy khi veil mở; runner bận làm lúc bắt đầu trễ vài trăm ms nên đo từ frame đầu scale giảm.
        const moving = trace.samples.find((sample) => sample.scale < start.scale - 0.005);
        const middle = trace.samples.find((sample) => moving && sample.elapsed >= moving.elapsed + 350);
        const end = trace.samples.at(-1);
        assert(
          start.scale >= 1.18 && moving?.elapsed <= 1_500 && middle?.scale > 1.01,
          `${entry.label} did not expose a painted 1.2 start: ${JSON.stringify({ start, moving, middle })}`,
        );
        assert(
          end.inview && end.scale <= 1.01,
          `${entry.label} did not settle near scale 1: ${JSON.stringify(end)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }

  const softEntries = [
    {
      label: "project hero wrapper",
      selector: "[data-motion-hero-wrapper-zoom]",
      source: "/vi/",
      destination: "/vi/advertising-products/",
      trigger: async (page) => {
        const link = await findRouteLink(
          page,
          "[data-site-header]",
          "/vi/advertising-products/",
        );
        await link.click();
      },
    },
  ];

  for (const entry of softEntries) {
    await runPageCase(
      `${entry.label} soft entry runs 1.2 to 1 over 2.5s`,
      { route: entry.source, viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, entry.source);
        await page.evaluate((selector) => {
          window.__ttSoftHeroTrace = { done: false, samples: [] };
          let attached = false;
          const attach = (target) => {
            if (attached) return;
            attached = true;
            const startedAt = performance.now();
            const sample = () => {
              const matrix = new DOMMatrixReadOnly(
                getComputedStyle(target).transform,
              );
              const elapsed = performance.now() - startedAt;
              window.__ttSoftHeroTrace.samples.push({
                elapsed,
                inview: target.classList.contains("is-motion-inview"),
                scale: matrix.a,
              });
              if (elapsed >= 2_700) {
                window.__ttSoftHeroTrace.done = true;
                return;
              }
              requestAnimationFrame(sample);
            };
            sample();
          };
          const observer = new MutationObserver(() => {
            const target = document.querySelector(selector);
            if (!target) return;
            observer.disconnect();
            attach(target);
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }, entry.selector);
        await entry.trigger(page);
        await waitForPath(page, entry.destination);
        await page.waitForFunction(() => window.__ttSoftHeroTrace?.done, null, {
          timeout: 8_000,
        });
        const trace = await page.evaluate(() => window.__ttSoftHeroTrace);
        const start = trace.samples[0];
        const middle = trace.samples.find((sample) => sample.elapsed >= 350);
        const end = trace.samples.at(-1);
        assert(
          start.scale >= 1.18 &&
            middle.scale < start.scale &&
            middle.scale > 1.01,
          `${entry.label} soft entry missed its painted start: ${JSON.stringify({ start, middle })}`,
        );
        assert(
          end.inview && end.scale <= 1.01,
          `${entry.label} soft entry did not settle: ${JSON.stringify(end)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }
}

// fonts.ready bỏ qua subset unicode-range chưa được yêu cầu; subset đến muộn rewrap các hàng filter.
async function projectFinalGeometry(page) {
  let previous = await readProjectFinalGeometry(page);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(100);
    const current = await readProjectFinalGeometry(page);
    if (JSON.stringify(current) === JSON.stringify(previous)) return current;
    previous = current;
  }
  return previous;
}

async function readProjectFinalGeometry(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        top: value.top,
        left: value.left,
        width: value.width,
        height: value.height,
      };
    };
    const selectors = {
      header: "[data-site-header]",
      hero: ".detail-index-hero",
      content: ".detail-index-hero .hero-content",
      heading: ".detail-index-hero h1",
      filters: ".detail-index-hero .project-filters",
    };
    const elements = Object.fromEntries(
      Object.entries(selectors).map(([name, selector]) => [
        name,
        document.querySelector(selector),
      ]),
    );
    const veil = document.querySelector(".route-veil");
    const container = document.querySelector('[data-barba="container"]');
    const contentStyle = getComputedStyle(elements.content);
    const header = elements.header;
    return {
      rects: Object.fromEntries(
        Object.entries(elements).map(([name, element]) => [name, rect(element)]),
      ),
      filterRects: [...document.querySelectorAll(".project-filter")].map(rect),
      lineRects: [...document.querySelectorAll(".detail-hero-line-mask")].map(rect),
      headerLeafTone: [
        getComputedStyle(header.querySelector(".brand-lockup")).fill,
        getComputedStyle(header.querySelector("#header-logo")).color,
        getComputedStyle(header.querySelector(".desktop-nav a")).color,
        getComputedStyle(header.querySelector(".menu-button line")).stroke,
      ],
      bodyTransitioning: document.body.classList.contains("is-transitioning"),
      containerHidden: container.hidden,
      contentOpacity: Number.parseFloat(contentStyle.opacity),
      contentTransform: contentStyle.transform,
      fallbackActive: document.documentElement.classList.contains("motion-fallback"),
      headingInsideHero:
        elements.heading.getBoundingClientRect().top >=
          elements.hero.getBoundingClientRect().top &&
        elements.heading.getBoundingClientRect().bottom <=
          elements.hero.getBoundingClientRect().bottom,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      veilOpacity: Number.parseFloat(getComputedStyle(veil).opacity),
      veilPointerEvents: getComputedStyle(veil).pointerEvents,
    };
  });
}

function assertProjectGeometryMatch(normal, fallback, label) {
  const compareRect = (expected, actual, target) => {
    for (const key of ["top", "left", "width", "height"]) {
      assert(
        Math.abs(expected[key] - actual[key]) <= 1,
        `${label} ${target}.${key} drifted ${Math.abs(expected[key] - actual[key]).toFixed(2)}px`,
      );
    }
  };
  for (const [name, expected] of Object.entries(normal.rects)) {
    compareRect(expected, fallback.rects[name], name);
  }
  assert(
    normal.filterRects.length === fallback.filterRects.length &&
      normal.lineRects.length === fallback.lineRects.length,
    `${label} final-state element count changed`,
  );
  normal.filterRects.forEach((rect, index) =>
    compareRect(rect, fallback.filterRects[index], `filter-${index}`),
  );
  normal.lineRects.forEach((rect, index) =>
    compareRect(rect, fallback.lineRects[index], `line-${index}`),
  );
}

async function homeFinalGeometry(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        top: value.top,
        left: value.left,
        width: value.width,
        height: value.height,
      };
    };
    const selectors = {
      header: "[data-site-header]",
      hero: ".hero",
      slides: ".hero-slides",
      content: ".hero-content",
      portal: ".service-portal",
    };
    const elements = Object.fromEntries(
      Object.entries(selectors).map(([name, selector]) => [
        name,
        document.querySelector(selector),
      ]),
    );
    const veil = document.querySelector(".route-veil");
    const container = document.querySelector('[data-barba="container"]');
    const header = elements.header;
    return {
      rects: Object.fromEntries(
        Object.entries(elements).map(([name, element]) => [name, rect(element)]),
      ),
      headerLeafTone: [
        getComputedStyle(header.querySelector(".brand-lockup")).fill,
        getComputedStyle(header.querySelector("#header-logo")).color,
        getComputedStyle(header.querySelector(".desktop-nav a")).color,
        getComputedStyle(header.querySelector(".menu-button line")).stroke,
      ],
      bodyTransitioning: document.body.classList.contains("is-transitioning"),
      containerHidden: container.hidden,
      contentOpacity: Number.parseFloat(getComputedStyle(elements.content).opacity),
      fallbackActive: document.documentElement.classList.contains("motion-fallback"),
      headerVisible:
        elements.header.getBoundingClientRect().bottom > 0 &&
        elements.header.getBoundingClientRect().top < innerHeight,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      veilOpacity: Number.parseFloat(getComputedStyle(veil).opacity),
      veilPointerEvents: getComputedStyle(veil).pointerEvents,
    };
  });
}

function assertHomeGeometryMatch(normal, fallback, label) {
  for (const [name, expected] of Object.entries(normal.rects)) {
    for (const key of ["top", "left", "width", "height"]) {
      const drift = Math.abs(expected[key] - fallback.rects[name][key]);
      assert(drift <= 1, `${label} ${name}.${key} drifted ${drift.toFixed(2)}px`);
    }
  }
}

async function runMotionAbortFailOpenChecks() {
  for (const fixture of [
    { route: "/vi/", expected: 255, label: "dark home" },
    { route: "/vi/advertising-products/", expected: 47, label: "ink projects" },
  ]) {
    await runPageCase(
      `post-route-pin fallback restores header leaves on ${fixture.label}`,
      { route: fixture.route, viewport: { width: 1440, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, fixture.route);
        await page.waitForTimeout(2_600);
        let pendingRoute;
        let releaseRoute;
        let markRouteSeen;
        const routeSeen = new Promise((resolve) => {
          markRouteSeen = resolve;
        });
        await page.route("**/vi/residential/**", async (route) => {
          pendingRoute = route;
          markRouteSeen();
          await new Promise((resolve) => {
            releaseRoute = resolve;
          });
        });
        // Route đang giữ mà case fail sớm sẽ làm context.close() treo; luôn nhả route.
        try {
          const target = await findRouteLink(
            page,
            "[data-site-header]",
            "/vi/residential/",
          );
          await target.evaluate((element) => element.click());
          // Có giới hạn: route không tới thì báo trạng thái trang thay vì treo tới timeout của job CI.
          let stalled;
          const seenOrStalled = await Promise.race([
            routeSeen.then(() => "seen"),
            new Promise((resolve) => {
              stalled = setTimeout(() => resolve("stalled"), 15_000);
            }),
          ]);
          clearTimeout(stalled);
          if (seenOrStalled === "stalled") {
            const state = await page.evaluate(() => ({
              path: location.pathname,
              body: document.body.className,
              header: document.querySelector("[data-site-header]")?.className,
              boot: window.__ttMotionBoot,
            })).catch((error) => ({ evaluateError: error.message }));
            releaseRoute?.();
            throw new Error(`Route /vi/residential/ was never requested after click: ${JSON.stringify(state)}`);
          }
          await page.waitForFunction(() =>
            document.querySelector("[data-site-header]")?.classList.contains("is-route-pinned"),
          );
          await page.evaluate(() => {
            document.documentElement.classList.add("motion-fallback");
            document.body.classList.remove(
              "is-transitioning",
              "menu-open",
              "motion-paused",
            );
          });
          const tone = await page.evaluate(() => {
            const header = document.querySelector("[data-site-header]");
            const channel = (value) =>
              Number.parseFloat(value.match(/[\d.]+/)?.[0] || "NaN");
            return [
              getComputedStyle(header.querySelector(".brand-lockup")).fill,
              getComputedStyle(header.querySelector("#header-logo")).color,
              getComputedStyle(header.querySelector(".desktop-nav a")).color,
              getComputedStyle(header.querySelector(".menu-button line")).stroke,
            ].map(channel);
          });
          assert(
            tone.every((value) => Math.abs(value - fixture.expected) <= 1),
            `Fallback did not restore ${fixture.label} leaf tone: ${JSON.stringify(tone)}`,
          );
          assertDiagnostics(diagnostics);
          await pendingRoute.abort("failed");
          releaseRoute();
          await page.unroute("**/vi/residential/**");
        } finally {
          releaseRoute?.();
        }
      },
    );
  }

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await runPageCase(
      `motion abort matches settled home geometry ${viewport.width}x${viewport.height}`,
      { route: "/vi/", viewport },
      async (page) => {
        await gotoRoute(page, "/vi/");
        await page.waitForTimeout(2_800);
        const normal = await homeFinalGeometry(page);
        await page.route("**/*motion.js*", (route) => route.abort("failed"));
        await page.goto(pageUrl(`/vi/?motion-abort=${viewport.width}`), {
          waitUntil: "load",
          timeout: 20_000,
        });
        await page.waitForFunction(() =>
          document.documentElement.classList.contains("motion-fallback"),
        );
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        const fallback = await homeFinalGeometry(page);
        assertHomeGeometryMatch(normal, fallback, `${viewport.width}x${viewport.height}`);
        assert(
          fallback.fallbackActive &&
            fallback.headerVisible &&
            JSON.stringify(fallback.headerLeafTone) ===
              JSON.stringify(normal.headerLeafTone) &&
            fallback.contentOpacity >= 0.99 &&
            !fallback.containerHidden &&
            !fallback.bodyTransitioning &&
            fallback.horizontalOverflow <= 1 &&
            fallback.veilOpacity <= 0.001 &&
            fallback.veilPointerEvents === "none",
          `Home fail-open is not final-state safe: ${JSON.stringify({ normal, fallback })}`,
        );
      },
    );
  }

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await runPageCase(
      `motion abort matches settled projects geometry ${viewport.width}x${viewport.height}`,
      { route: "/vi/advertising-products/", viewport },
      async (page) => {
        const pageErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await gotoRoute(page, "/vi/advertising-products/");
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(2_800);
        const normal = await projectFinalGeometry(page);
        const healthy = await page.evaluate(() => ({
          claimed: window.__ttMotionBoot?.claimed,
          fallback: window.__ttMotionBoot?.fallback,
          runtime: window.__ttMotionRuntimeHealthy,
        }));
        assert(
          healthy.claimed === true &&
            healthy.fallback === false &&
            healthy.runtime === true,
          `Healthy startup used fallback: ${JSON.stringify(healthy)}`,
        );

        await page.route("**/*motion.js*", (route) => route.abort("failed"));
        const started = Date.now();
        const response = await page.goto(
          pageUrl(`/vi/advertising-products/?motion-abort=${viewport.width}`),
          { waitUntil: "load", timeout: 20_000 },
        );
        assert(response && response.status() < 400, "Project fail-open load failed");
        await page.waitForFunction(
          () => document.documentElement.classList.contains("motion-fallback"),
          null,
          { timeout: 4_000 },
        );
        const captureErrorMs = Date.now() - started;
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        const fallback = await projectFinalGeometry(page);
        assertProjectGeometryMatch(
          normal,
          fallback,
          `${viewport.width}x${viewport.height}`,
        );
        assert(
          captureErrorMs < 2_000 &&
            fallback.fallbackActive &&
            JSON.stringify(fallback.headerLeafTone) ===
              JSON.stringify(normal.headerLeafTone) &&
            fallback.contentOpacity >= 0.99 &&
            fallback.headingInsideHero &&
            !fallback.containerHidden &&
            fallback.horizontalOverflow <= 1 &&
            fallback.veilOpacity <= 0.001 &&
            fallback.veilPointerEvents === "none" &&
            !fallback.bodyTransitioning,
          `Project capture-error fallback is not final-state safe: ${JSON.stringify({ captureErrorMs, normal, fallback })}`,
        );

        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Accessibility.enable");
        const tree = await cdp.send("Accessibility.getFullAXTree");
        const heading = tree.nodes.find(
          (node) =>
            node.role?.value === "heading" &&
            node.properties?.some(
              (property) =>
                property.name === "level" && property.value?.value === 1,
            ),
        );
        assert(
          heading?.name?.value === "để thương hiệu luôn trong tầm mắt",
          `Fail-open h1 missing from AX tree: ${JSON.stringify(heading?.name?.value)}`,
        );
        // Grid mount cửa sổ ảo (masonry R7): so category đã mount, không so số lượng.
        const filterState = await page.evaluate(() => {
          const categories = [
            ...document.querySelectorAll("[data-project-grid] [data-advertising-category]"),
          ].map((tile) => tile.dataset.advertisingCategory);
          return {
            kioskTiles: categories.filter((category) => category === "displays-booths").length,
            otherTiles: categories.filter((category) => category !== "displays-booths").length,
          };
        });
        assert(
          filterState.otherTiles > 0 && filterState.kioskTiles > 0,
          `Fail-open fixture cannot prove filtering: ${JSON.stringify(filterState)}`,
        );
        await page.locator('[data-advertising-filter="displays-booths"]').click();
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-advertising-filter="displays-booths"]')
              ?.getAttribute("aria-current") === "true",
        );
        const filteredState = await page.evaluate(() => ({
          visible: [
            ...document.querySelectorAll(
              "[data-project-grid] [data-advertising-category]",
            ),
          ]
            .filter((tile) => !tile.hidden)
            .map((tile) => tile.dataset.advertisingCategory),
        }));
        assert(
          filteredState.visible.length > 0 &&
            filteredState.visible.every((category) => category === "displays-booths"),
          `Fail-open filter did not isolate kiosk tiles: ${JSON.stringify(filteredState)}`,
        );
        await page.locator('[data-advertising-filter="all"]').click();
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-advertising-filter="all"]')
              ?.getAttribute("aria-current") === "true" &&
            [
              ...document.querySelectorAll(
                "[data-project-grid] [data-advertising-category]",
              ),
            ].some((tile) => !tile.hidden && tile.dataset.advertisingCategory !== "displays-booths"),
        );
        await page.locator("[data-menu-open]").click();
        await waitForMenuState(page, true);
        await page.locator("[data-menu-close]").click();
        await waitForMenuState(page, false);
        assert(pageErrors.length === 0, pageErrors.join("\n"));
      },
    );
  }

  await runPageCase(
    "fallback locale links work in the full menu",
    { route: "/vi/", viewport: { width: 390, height: 844 } },
    async (page) => {
      await page.route("**/*motion.js*", (route) => route.abort("failed"));
      for (const route of ["", "advertising-products/"]) {
        const viPath = `/vi/${route}`;
        const enPath = `/en/${route}`;
        const expectFallbackScroll = async () => {
          await page.waitForFunction(() =>
            document.documentElement.classList.contains("motion-fallback"),
          );
          await page.waitForFunction(() => Math.abs(window.scrollY - 640) <= 2);
        };
        const switchLocale = async (language, expectedPath) => {
          await page.locator("[data-menu-open]").click();
          await waitForMenuState(page, true);
          await Promise.all([
            page.waitForURL(
              (url) =>
                url.pathname === expectedPath &&
                url.search === "?fallback=locale" &&
                url.hash === "",
            ),
            page.locator(`[data-language-option="${language}"]`).click(),
          ]);
          await expectFallbackScroll();
        };
        await page.goto(pageUrl(`${viPath}?fallback=locale`), {
          waitUntil: "load",
        });
        await page.waitForFunction(() =>
          document.documentElement.classList.contains("motion-fallback"),
        );
        // Chờ catalog Advertising dựng xong: catalog gắn sau khi đã cuộn sẽ kéo trang từ 640 về khoảng 132.
        await page.evaluate(() => window.TruongThinhDetail?.mount());
        await page.evaluate(() => {
          document.documentElement.style.scrollBehavior = "auto";
          window.scrollTo(0, 640);
        });
        await page.waitForFunction(() => Math.abs(window.scrollY - 640) <= 2);
        await switchLocale("en", enPath);
        await switchLocale("vi", viPath);
        await page.waitForFunction(
          () => !document.body.classList.contains("menu-open"),
        );
      }
    },
  );

  await runPageCase(
    "motion failure fails open without an opaque veil",
    { route: "/vi/residential/", viewport: { width: 390, height: 844 } },
    async (page) => {
      await page.route("**/*motion.js*", (route) => route.abort("failed"));
      await page.goto(pageUrl("/vi/residential/"), { waitUntil: "load" });
      await page.waitForFunction(() =>
        document.documentElement.classList.contains("motion-fallback"),
      );
      const state = await page.evaluate(() => {
        const header = document.querySelector("[data-site-header]");
        const veil = document.querySelector(".route-veil");
        const headerRect = header.getBoundingClientRect();
        return {
          brandColor: getComputedStyle(document.querySelector(".brand")).color,
          headerVisible: headerRect.bottom > 0 && headerRect.top < innerHeight,
          routeEnter: document.documentElement.classList.contains("route-enter"),
          veilOpacity: Number.parseFloat(getComputedStyle(veil).opacity),
          veilPointerEvents: getComputedStyle(veil).pointerEvents,
        };
      });
      assert(
        state.brandColor === "rgb(255, 255, 255)" &&
          state.headerVisible &&
          !state.routeEnter &&
          state.veilOpacity <= 0.001 &&
          state.veilPointerEvents === "none",
        `Route veil did not fail open: ${JSON.stringify(state)}`,
      );
    },
  );

  await runPageCase(
    "slow motion keeps the route veil until the runtime claims",
    { route: "/vi/advertising-products/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      await page.route("**/*motion.js*", async (route) => {
        const response = await route.fetch();
        await new Promise((resolve) => setTimeout(resolve, 3_400));
        await route.fulfill({ response });
      });
      const navigation = page.goto(pageUrl("/vi/advertising-products/?slow-motion=1"), {
        waitUntil: "load",
        timeout: 20_000,
      });
      await page.waitForFunction(() => document.body, null, { timeout: 3_000 });
      // Quá watchdog 2.5 s cũ, trang vẫn phải bị veil, không fail open.
      await page.waitForTimeout(2_800);
      const waiting = await page.evaluate(() => ({
        routeEnter: document.documentElement.classList.contains("route-enter"),
        fallback: document.documentElement.classList.contains("motion-fallback"),
        veilOpacity: Number.parseFloat(getComputedStyle(document.querySelector(".route-veil")).opacity),
        claimed: window.__ttMotionBoot?.claimed,
      }));
      assert(
        waiting.routeEnter && !waiting.fallback && waiting.veilOpacity >= 0.99 && waiting.claimed === false,
        `Slow motion did not hold the veil: ${JSON.stringify(waiting)}`,
      );
      await navigation;
      await page.waitForFunction(
        () =>
          window.__ttMotionRuntimeHealthy === true &&
          !document.documentElement.classList.contains("route-enter") &&
          Number.parseFloat(getComputedStyle(document.querySelector(".route-veil")).opacity) <= 0.001,
        null,
        { timeout: 6_000 },
      );
      await page.waitForFunction(
        () => Number.parseFloat(getComputedStyle(document.querySelector(".detail-index-hero .hero-content")).opacity) >= 0.99,
        null,
        { timeout: 6_000 },
      );
      const boot = await page.evaluate(() => ({
        claimed: window.__ttMotionBoot?.claimed,
        fallback: window.__ttMotionBoot?.fallback,
        fallbackClass: document.documentElement.classList.contains("motion-fallback"),
      }));
      assert(
        boot.claimed === true && boot.fallback === false && !boot.fallbackClass,
        `Slow motion fell back instead of claiming: ${JSON.stringify(boot)}`,
      );
      await page.evaluate(() => {
        window.__ttLateFilterLayoutEvents = 0;
        window.addEventListener("site:layout", () => {
          window.__ttLateFilterLayoutEvents += 1;
        });
      });
      // Cụm đầu rail nằm ở hàng một; bấm cụm ở hàng dưới thì trang cuộn và header ẩn trước khi mở menu.
      await page.locator('[data-advertising-filter="signage"]').click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-advertising-filter="signage"]')
            ?.getAttribute("aria-current") === "true" &&
          window.__ttLateFilterLayoutEvents === 1,
      );
      await page.waitForTimeout(300);
      assert(
        (await page.evaluate(() => window.__ttLateFilterLayoutEvents)) === 1,
        "Slow motion mounted duplicate filter listeners",
      );
      await page.locator("[data-menu-open]").click();
      await waitForMenuState(page, true);
      await page.locator("[data-menu-close]").click();
      await waitForMenuState(page, false);
    },
  );
}

async function runDelayedDetailFallbackChecks() {
  const detailPattern = "**/*detail.js*";
  const motionPattern = "**/*motion.js*";
  const delayResponse = (delay) => async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, delay));
    await route.fulfill({ response });
  };
  const waitForAdvertisingCatalog = async (page) => {
    await page.waitForFunction(
      () => {
        const grid = document.querySelector("[data-project-grid].advertising-grid");
        return Boolean(
          grid?.querySelector(".advertising-tile") &&
          typeof window.Masonry === "function" &&
          window.lazySizes?.loader &&
          typeof window.SplitText === "function" &&
          window.gsap?.version === "3.15.0",
        );
      },
      null,
      { timeout: 8_000 },
    );
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  };
  const exerciseFilter = async (page, category) => {
    await waitForAdvertisingCatalog(page);
    await page.evaluate(() => {
      if (!window.__ttDelayedDetailMasonryProbe) {
        const layout = window.Masonry.prototype.layout;
        window.__ttDelayedDetailMasonryProbe = true;
        window.Masonry.prototype.layout = function (...args) {
          if (this.element?.matches?.("[data-project-grid].advertising-grid")) {
            window.__ttDelayedDetailMasonryLayouts += 1;
          }
          return layout.apply(this, args);
        };
      }
      window.__ttDelayedDetailMasonryLayouts = 0;
    });
    await page.evaluate((selector) => {
      const control = document.querySelector(selector);
      if (!(control instanceof HTMLElement)) throw new Error(`Missing filter: ${selector}`);
      control.click();
    }, `[data-advertising-filter="${category}"]`);
    await page.waitForFunction(() => window.__ttDelayedDetailMasonryLayouts >= 1, null, { timeout: 3_000 });
    return page.evaluate((activeCategory) => {
      const tiles = [
        ...document.querySelectorAll(
          "[data-project-grid] [data-advertising-category]",
        ),
      ];
      return {
        active: document
          .querySelector(`[data-advertising-filter="${activeCategory}"]`)
          ?.getAttribute("aria-current"),
        masonryLayouts: window.__ttDelayedDetailMasonryLayouts,
        total: tiles.length,
        unique: new Set(tiles.map((tile) => tile.dataset.advertisingCard)).size === tiles.length,
        visible: tiles
          .filter((tile) => !tile.hidden)
          .map((tile) => tile.dataset.advertisingCategory),
      };
    }, category);
  };
  const assertFilter = (state, category, label) => {
    assert(
      state.active === "true" &&
        state.masonryLayouts === 1 &&
        state.unique &&
        state.total < 120 &&
        state.visible.length > 0 &&
        (category === "all"
          ? new Set(state.visible).size > 1
          : state.visible.every((item) => item === category)),
      `${label} filter is inert or duplicated: ${JSON.stringify(state)}`,
    );
  };

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await runPageCase(
      `delayed detail mounts filters once with failed or slow motion ${viewport.width}x${viewport.height}`,
      { route: "/vi/advertising-products/", viewport },
      async (page) => {
        await page.route(detailPattern, delayResponse(4_200));
        await page.route(motionPattern, (route) => route.abort("failed"));
        let abortedNavigationError;
        const abortedNavigation = page
          .goto(
            pageUrl(`/vi/advertising-products/?delayed-detail-abort=${viewport.width}`),
            { waitUntil: "load", timeout: 20_000 },
          )
          .catch((error) => {
            abortedNavigationError = error;
            return null;
          });
        await page.waitForFunction(
          () => document.documentElement.classList.contains("motion-fallback"),
          null,
          { timeout: 5_000 },
        );
        await waitForAdvertisingCatalog(page);
        const abortedResponse = await abortedNavigation;
        assert(
          abortedResponse &&
            !abortedNavigationError &&
            abortedResponse.status() < 400,
          `Delayed-detail abort page did not load: ${abortedNavigationError}`,
        );
        assertFilter(
          await exerciseFilter(page, "displays-booths"),
          "displays-booths",
          "Delayed-detail abort kiosk",
        );
        assertFilter(
          await exerciseFilter(page, "all"),
          "all",
          "Delayed-detail abort All",
        );

        await page.unroute(detailPattern);
        await page.unroute(motionPattern);
        await page.route(detailPattern, delayResponse(4_200));
        await page.route(motionPattern, delayResponse(6_000));
        let delayedNavigationError;
        const delayedNavigation = page
          .goto(
            pageUrl(`/vi/advertising-products/?delayed-detail-veil=${viewport.width}`),
            { waitUntil: "load", timeout: 20_000 },
          )
          .catch((error) => {
            delayedNavigationError = error;
            return null;
          });
        await page.waitForFunction(() => document.body, null, { timeout: 4_000 });
        await page.waitForTimeout(4_500);
        const waiting = await page.evaluate(() => ({
          routeEnter: document.documentElement.classList.contains("route-enter"),
          fallback: document.documentElement.classList.contains("motion-fallback"),
        }));
        assert(
          waiting.routeEnter && !waiting.fallback,
          `Delayed scripts failed open instead of holding the veil: ${JSON.stringify(waiting)}`,
        );
        const delayedResponse = await delayedNavigation;
        assert(
          delayedResponse &&
            !delayedNavigationError &&
            delayedResponse.status() < 400,
          `Delayed-detail veil page did not load: ${delayedNavigationError}`,
        );
        await page.waitForFunction(
          () =>
            window.__ttMotionRuntimeHealthy === true &&
            window.__ttMotionBoot?.fallback === false &&
            !document.documentElement.classList.contains("motion-fallback"),
          null,
          { timeout: 5_000 },
        );
        await waitForLoadedDocument(page);
        await waitForAdvertisingCatalog(page);
        assertFilter(
          await exerciseFilter(page, "displays-booths"),
          "displays-booths",
          "Delayed-detail veil kiosk",
        );
        assertFilter(
          await exerciseFilter(page, "all"),
          "all",
          "Delayed-detail veil All",
        );
      },
    );
  }
}

async function runSlowMotionBootCheck() {
  await runPageCase(
    "slow motion never fails open and switches locale in place after claim",
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      await page.route("**/*motion.js*", async (route) => {
        const response = await route.fetch();
        await new Promise((resolve) => setTimeout(resolve, 4_500));
        await route.fulfill({ response });
      });
      let navigationError;
      const navigation = page
        .goto(pageUrl("/vi/?claim-release=1"), {
          waitUntil: "load",
          timeout: 20_000,
        })
        .catch((error) => {
          navigationError = error;
          return null;
        });
      await page.waitForFunction(() => document.body, null, { timeout: 4_000 });
      await page.waitForTimeout(3_000);
      const waiting = await page.evaluate(() => ({
        routeEnter: document.documentElement.classList.contains("route-enter"),
        fallback: window.__ttMotionBoot?.fallback,
        fallbackClass: document.documentElement.classList.contains("motion-fallback"),
      }));
      assert(
        waiting.routeEnter && waiting.fallback === false && !waiting.fallbackClass,
        `Slow motion failed open before the runtime arrived: ${JSON.stringify(waiting)}`,
      );
      await page.waitForFunction(
        () => window.__ttMotionBoot?.claimed === true && window.__ttMotionRuntimeHealthy === true,
        null,
        { timeout: 5_000 },
      );
      await page.evaluate(() => {
        window.__ttTakeoverHeaderTrace = { done: false, samples: [] };
        const startedAt = performance.now();
        const sample = () => {
          const header = document.querySelector("[data-site-header]");
          const rect = header.getBoundingClientRect();
          const style = getComputedStyle(header);
          const elapsed = performance.now() - startedAt;
          window.__ttTakeoverHeaderTrace.samples.push({
            elapsed,
            bottom: rect.bottom,
            top: rect.top,
            display: style.display,
            opacity: Number.parseFloat(style.opacity),
            visible: rect.bottom > 0 && rect.top < innerHeight,
          });
          if (elapsed < 2_200) requestAnimationFrame(sample);
          else window.__ttTakeoverHeaderTrace.done = true;
        };
        sample();
      });
      const targetRequests = [];
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (
          request.method() === "GET" &&
          url.origin === BASE_ORIGIN &&
          canonicalPathname(url.href) === "/en/" &&
          url.search === "?claim-release=1"
        ) {
          targetRequests.push({
            resourceType: request.resourceType(),
            url: request.url(),
          });
        }
      });
      await page.locator("[data-menu-open]").click();
      await waitForMenuState(page, true);
      await page.locator('[data-language-option="en"]').click();
      await page.waitForURL(
        (url) =>
          canonicalPathname(url.href) === "/en/" &&
          url.search === "?claim-release=1" &&
          url.hash === "",
        { timeout: 8_000 },
      );
      const response = await navigation;
      assert(response && !navigationError, `Claim-race load failed: ${navigationError}`);
      await waitForNavigationCleanup(page);
      await page.waitForFunction(() => window.__ttTakeoverHeaderTrace?.done, null, {
        timeout: 4_000,
      });
      const state = await page.evaluate(() => ({
        claimed: window.__ttMotionBoot?.claimed,
        fallback: window.__ttMotionBoot?.fallback,
        lang: document.documentElement.lang,
        headerSamples: window.__ttTakeoverHeaderTrace.samples,
      }));
      // Runtime swap locale tại chỗ, nên không handler fail-open nào được request trang.
      assert(
        targetRequests.length === 0,
        `Locale switch after claim requested the page: ${JSON.stringify(targetRequests)}`,
      );
      assert(
        state.claimed === true &&
          state.fallback === false &&
          state.lang === "en" &&
          state.headerSamples.length > 30 &&
          state.headerSamples.every(
            (sample) =>
              sample.display !== "none" &&
              sample.opacity >= 0.99 &&
              sample.visible,
          ),
        `Runtime takeover did not settle once: ${JSON.stringify(state)}`,
      );
    },
  );
}

async function runHeroCarouselLifecycleCheck() {
  const viewport = { width: 1440, height: 900 };
  for (const route of ["/vi/residential/", "/vi/commercial/"]) {
    await runPageCase(
      `service hero is a single finite entrance ${route}`,
      { route, viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, route);
        const state = await page.locator(".hero").evaluate((hero) => ({
          slideCount: hero.querySelectorAll(".hero-slide").length,
          mediaCount: hero.querySelectorAll("[data-motion-hero-media]").length,
          labelCount: hero.querySelectorAll("[data-hero-label]").length,
          motionToggleCount: hero.querySelectorAll("[data-motion-toggle]").length,
          scrollCueCount: hero.querySelectorAll("[data-scroll-cue]").length,
        }));
        assert(
          state.slideCount === 1 &&
            state.mediaCount === 1 &&
            state.labelCount === 0 &&
            state.motionToggleCount === 0 &&
            state.scrollCueCount === 1,
          `Service hero still exposes slideshow UI: ${JSON.stringify(state)}`,
        );
        // Zoom vào trang chạy một lần rồi đứng ở scale 1.005, không lặp như slideshow trang chủ.
        await page.waitForTimeout(2_800);
        const scales = [];
        for (let sample = 0; sample < 3; sample += 1) {
          scales.push(
            await page
              .locator(".hero-slide img")
              .evaluate((media) => new DOMMatrixReadOnly(getComputedStyle(media).transform).a),
          );
          await page.waitForTimeout(400);
        }
        assert(
          scales.every((value) => Math.abs(value - 1.005) < 0.001),
          `Service hero image did not settle at 1.005: ${JSON.stringify(scales)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }

  await runPageCase(
    "about hero keeps the scroll cue without chapter tabs",
    { route: "/vi/about/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/about/");
      const state = await page.locator(".about-hero").evaluate((hero) => ({
        chapterCount: hero.querySelectorAll(".about-hero__chapters").length,
        scrollCueCount: hero.querySelectorAll("[data-scroll-cue]").length,
      }));
      assert(
        state.chapterCount === 0 && state.scrollCueCount === 1,
        `About hero chapter/cue contract drifted: ${JSON.stringify(state)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runHeroCrossFadeContinuityChecks() {
  // page-home R3: slide 0 cố định, năm slide sau xáo theo Math.random. Stub cố định cho thứ tự biết trước:
  // hằng 0 giữ nguyên (sort ổn định), dãy giảm dần đảo ngược.
  for (const { stub, expected } of [
    { stub: "zero", expected: "0,1,2,3,4,5" },
    { stub: "descending", expected: "0,5,4,3,2,1" },
  ]) {
    await runPageCase(
      `home hero shuffles later slides per load ${stub}`,
      { route: "/vi/", viewport: { width: 1440, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await page.addInitScript((mode) => {
          let calls = 0;
          if (mode === "zero") Math.random = () => 0;
          if (mode === "descending") Math.random = () => 1 / (calls += 2);
        }, stub);
        await gotoRoute(page, "/vi/");
        const state = await page.evaluate(() => {
          const slides = [...document.querySelectorAll(".hero-slide")];
          return {
            order: slides.map((slide) => slide.dataset.slide).join(","),
            active: slides.findIndex((slide) => slide.classList.contains("is-active")),
            priority: slides[0].querySelector("img").getAttribute("fetchpriority"),
          };
        });
        assert(
          state.active === 0 &&
            state.priority === "high" &&
            state.order === expected,
          `Home hero slide order contract drifted (${stub}): ${JSON.stringify(state)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }

  const cases = [
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    { route: "/vi/", viewport: { width: 390, height: 844 } },
  ];

  for (const testCase of cases) {
    await runPageCase(
      `hero cross-fade preserves incoming zoom continuity ${routeSlug(testCase.route)} ${testCase.viewport.width}`,
      testCase,
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, testCase.route);
        const result = await page.evaluate(async () => {
          const slides = [...document.querySelectorAll(".hero-slide")];
          const scaleOf = (element) => {
            const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
            return Math.hypot(matrix.a, matrix.b);
          };
          const samples = [];
          const times = [];
          let activeIndex = slides.findIndex((slide) =>
            slide.classList.contains("is-active"),
          );
          let transitions = 0;
          let pendingHandoff;
          let maxIncomingStartVelocity = 0;
          window.gsap.globalTimeline.timeScale(4);

          await new Promise((resolve) => {
            let startedAt;
            const sample = (now) => {
              startedAt ??= now;
              const nextActiveIndex = slides.findIndex((slide) =>
                slide.classList.contains("is-active"),
              );
              const current = slides.map((slide) => ({
                opacity: Number.parseFloat(getComputedStyle(slide).opacity),
                scale: scaleOf(slide.querySelector("img")),
              }));
              if (pendingHandoff) {
                const elapsed = Math.max(1, now - pendingHandoff.time) / 1_000;
                maxIncomingStartVelocity = Math.max(
                  maxIncomingStartVelocity,
                  Math.abs(
                    current[pendingHandoff.index].scale - pendingHandoff.scale,
                  ) / elapsed,
                );
                pendingHandoff = undefined;
              }
              if (nextActiveIndex !== activeIndex) {
                transitions += 1;
                activeIndex = nextActiveIndex;
                pendingHandoff = {
                  index: activeIndex,
                  scale: current[activeIndex].scale,
                  time: now,
                };
              }
              samples.push(current);
              times.push(now);
              // Mỗi slide 5s, timeScale 4: 1,25s một slide, cộng 1,2s dư để thấy lần quay vòng.
              if (now - startedAt < slides.length * 1_250 + 1_200) requestAnimationFrame(sample);
              else resolve();
            };
            requestAnimationFrame(sample);
          });

          let maxVisibleScaleJump = 0;
          let maxCrossFadeSumError = 0;
          for (let frame = 1; frame < samples.length; frame += 1) {
            const previous = samples[frame - 1];
            const current = samples[frame];
            // Quy về một frame 60fps: runner bận rơi frame thì zoom đều cũng nhảy xa hơn giữa hai mẫu.
            const frameScale = 1_000 / 60 / Math.max(1_000 / 60, times[frame] - times[frame - 1]);
            current.forEach((sample, index) => {
              if (sample.opacity > 0.01 || previous[index].opacity > 0.01) {
                maxVisibleScaleJump = Math.max(
                  maxVisibleScaleJump,
                  Math.abs(sample.scale - previous[index].scale) * frameScale,
                );
              }
            });
            const visible = current.filter(
              ({ opacity }) => opacity > 0.01 && opacity < 0.99,
            );
            if (visible.length === 2) {
              maxCrossFadeSumError = Math.max(
                maxCrossFadeSumError,
                Math.abs(1 - visible[0].opacity - visible[1].opacity),
              );
            }
          }
          return {
            frames: samples.length,
            slideCount: slides.length,
            transitions,
            maxVisibleScaleJump,
            maxCrossFadeSumError,
            maxIncomingStartVelocity,
          };
        });

        assert(
          result.transitions >= result.slideCount,
          `Hero did not complete a wrapped cycle: ${JSON.stringify(result)}`,
        );
        assert(
          result.maxVisibleScaleJump <= 0.003,
          `Incoming hero image scale jumped during cross-fade: ${JSON.stringify(result)}`,
        );
        assert(
          result.maxCrossFadeSumError <= 0.03,
          `Hero cross-fade opacity lost continuity: ${JSON.stringify(result)}`,
        );
        assert(
          result.maxIncomingStartVelocity <= 0.02,
          `Incoming hero zoom started with a visible velocity step: ${JSON.stringify(result)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runWhiteOverlayMediaFallbackCheck() {
  const viewport = { width: 1440, height: 900 };
  const cases = [
    {
      name: "home hero",
      route: "/vi/?media-fallback=hero",
      asset: "**/home-hero-tube-house-living.webp",
      surface: ".hero",
      image: ".hero-slide.is-active img",
      text: ".hero-content",
      overlay: ".hero-shade",
    },
    {
      name: "home hero reduced motion",
      route: "/vi/?media-fallback=hero-reduced",
      asset: "**/home-hero-tube-house-living.webp",
      surface: ".hero",
      image: ".hero-slide.is-active img",
      text: ".hero-content",
      overlay: ".hero-shade",
      reducedMotion: "reduce",
    },
    {
      name: "about hero",
      route: "/vi/about/?media-fallback=about",
      asset: "**/legacy-team.webp",
      surface: ".about-hero",
      image: ".about-hero__media img",
      text: ".hero-content",
      overlay: ".hero-shade",
    },
    {
      name: "service portal",
      route: "/vi/?media-fallback=portal",
      asset: "**/home-residential-kitchen-v2.webp",
      surface: "#dich-vu .service-portal:first-child",
      image: "img",
      text: ".portal-copy",
      overlay: ".portal-shade",
      scroll: true,
    },
    {
      name: "detail CTA",
      route: "/vi/commercial/?media-fallback=cta",
      asset: "**/commercial-cta-survey.webp",
      surface: ".detail-cta",
      image: ":scope > img, :scope > picture > img",
      text: ".detail-cta__copy",
      pseudoOverlay: true,
      scroll: true,
    },
    {
      name: "legacy closer",
      route: "/vi/?media-fallback=legacy",
      asset: "**/workshop-wide-v2.webp",
      surface: ".legacy-closer",
      image: ":scope > img, :scope > picture > img",
      text: ".legacy-copy",
      overlay: ".legacy-shade",
      scroll: true,
    },
  ];

  for (const testCase of cases) {
    await runPageCase(
      `white overlay media fallback ${testCase.name}`,
      {
        route: testCase.route,
        viewport,
        reducedMotion: testCase.reducedMotion,
      },
      async (page) => {
        const diagnostics = monitorPage(page);
        let releaseMedia;
        let markMediaSeen;
        const mediaGate = new Promise((resolve) => {
          releaseMedia = resolve;
        });
        const mediaSeen = new Promise((resolve) => {
          markMediaSeen = resolve;
        });
        // Gate variant AVIF/WebP responsive nào browser chọn cho asset này.
        const assetName = testCase.asset.replace("**/", "").replace(/\.webp$/, "");
        await page.route(new RegExp(`/${assetName}(?:-\\d+)?\\.(?:webp|avif)$`), async (route) => {
          markMediaSeen();
          await mediaGate;
          await route.continue();
        });

        const response = await page.goto(pageUrl(testCase.route), {
          waitUntil: "domcontentloaded",
          timeout: 20_000,
        });
        assert(response && response.status() < 400, `${testCase.name}: navigation failed`);
        await page.waitForFunction(
          () => Reflect.get(window, "__ttMotionRuntimeHealthy") === true,
        );
        if (testCase.scroll) {
          await page.locator(testCase.surface).scrollIntoViewIfNeeded();
        }
        await Promise.race([
          mediaSeen,
          page.waitForTimeout(5_000).then(() => {
            throw new Error(`${testCase.name}: delayed media request was not observed`);
          }),
        ]);

        const before = await page.locator(testCase.surface).evaluate(
          (surface, selectors) => {
            const image = surface.querySelector(selectors.image);
            const text = surface.querySelector(selectors.text);
            const textStyle = getComputedStyle(text);
            const overlayStyle = selectors.pseudoOverlay
              ? getComputedStyle(surface, "::after")
              : selectors.overlay
                ? getComputedStyle(surface.querySelector(selectors.overlay))
                : null;
            return {
              background: getComputedStyle(surface).backgroundColor,
              imageOpacity: Number.parseFloat(getComputedStyle(image).opacity),
              textColor: textStyle.color,
              textVisible:
                textStyle.visibility !== "hidden" &&
                Number.parseFloat(textStyle.opacity) > 0.99,
              overlayHidden:
                overlayStyle === null ||
                overlayStyle.visibility === "hidden" ||
                overlayStyle.display === "none",
            };
          },
          {
            image: testCase.image,
            text: testCase.text,
            overlay: testCase.overlay,
            pseudoOverlay: testCase.pseudoOverlay,
          },
        );
        assert(
          before.background === "rgb(43, 44, 43)" &&
            before.imageOpacity <= 0.01 &&
            before.textColor === "rgb(255, 255, 255)" &&
            before.textVisible &&
            before.overlayHidden,
          `${testCase.name}: white copy was not protected by the #2b2c2b loading surface: ${JSON.stringify(before)}`,
        );

        releaseMedia();
        await page.waitForFunction(
          ({ surface, image, overlay, pseudoOverlay }) => {
            const loadingSurface = document.querySelector(surface);
            const media = loadingSurface?.querySelector(image);
            const overlayStyle = pseudoOverlay
              ? getComputedStyle(loadingSurface, "::after")
              : overlay
                ? getComputedStyle(loadingSurface?.querySelector(overlay))
                : null;
            return (
              media?.classList.contains("is-overlay-media-ready") &&
              media.complete &&
              media.naturalWidth > 0 &&
              Number.parseFloat(getComputedStyle(media).opacity) > 0.99 &&
              (overlayStyle === null || overlayStyle.visibility !== "hidden")
            );
          },
          {
            surface: testCase.surface,
            image: testCase.image,
            overlay: testCase.overlay,
            pseudoOverlay: testCase.pseudoOverlay,
          },
          { timeout: 6_000 },
        );
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runHomeHeroTypesettingChecks() {
  const viewports = [
    { width: 320, height: 912 },
    { width: 768, height: 912 },
    { width: 1569, height: 912 },
  ];
  const locales = [
    { locale: "vi", lines: ["Làm chắc", "Làm khác"] },
    { locale: "en", lines: ["Built solid.", "Made different."] },
  ];

  for (const { locale, lines: expectedLines } of locales) {
    for (const viewport of viewports) {
      const route = `/${locale}/?hero-typeset-check=1`;
      await runPageCase(
        `home hero copy and line gap ${locale} ${viewport.width}x${viewport.height}`,
        { route, viewport, reducedMotion: "reduce" },
        async (page) => {
          const diagnostics = monitorPage(page);
          await gotoRoute(page, route);
          const state = await page.evaluate(() => {
            const heading = document.querySelector(".hero h1");
            const lines = [...heading.querySelectorAll(".hero-line-mask")];
            const rects = lines.map((line) => line.getBoundingClientRect());
            const fontSize = Number.parseFloat(getComputedStyle(heading).fontSize);
            return {
              lines: lines.map((line) => line.textContent.replace(/\s+/g, " ").trim()),
              gap: rects[1]?.top - rects[0]?.bottom,
              fontSize,
              horizontalOverflow:
                document.documentElement.scrollWidth - document.documentElement.clientWidth,
            };
          });
          const gapRatio = state.gap / state.fontSize;

          assert(
            JSON.stringify(state.lines) === JSON.stringify(expectedLines),
            `Home hero ${locale} copy drifted at ${viewport.width}px: ${JSON.stringify(state.lines)}`,
          );
          assert(
            gapRatio >= 0.045 && gapRatio <= 0.055,
            `Home hero line gap is not the intended subtle 0.05em at ${viewport.width}px: ${JSON.stringify({ gap: state.gap, fontSize: state.fontSize, gapRatio })}`,
          );
          assert(
            state.horizontalOverflow <= 1,
            `Home hero overflowed horizontally at ${viewport.width}px by ${state.horizontalOverflow}px`,
          );
          assertDiagnostics(diagnostics);
        },
      );
    }
  }
}

async function runHomeHeroIntroReadabilityCheck() {
  const route = "/vi/?hero-intro-check=1";
  const viewport = { width: 768, height: 900 };

  await runPageCase(
    "home hero holds a shortened solid surface before the slideshow",
    { route, viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await page.addInitScript(() => {
        window.__ttHeroIntroTrace = { done: false, samples: [] };
        addEventListener(
          "DOMContentLoaded",
          () => {
            let startedAt;
            const sample = (now) => {
              startedAt ??= now;
              const hero = document.querySelector(".hero[data-hero-intro]");
              const slides = [...document.querySelectorAll(".hero-slide")];
              const words = [...document.querySelectorAll(".hero-word")];
              window.__ttHeroIntroTrace.samples.push({
                elapsed: now - startedAt,
                background: hero ? getComputedStyle(hero).backgroundColor : "",
                maxSlideOpacity: Math.max(
                  0,
                  ...slides.map((slide) =>
                    Number.parseFloat(getComputedStyle(slide).opacity),
                  ),
                ),
                visibleWordCount: words.filter(
                  (word) => Number.parseFloat(getComputedStyle(word).opacity) >= 0.95,
                ).length,
                wordCount: words.length,
              });
              if (now - startedAt < 3_400) requestAnimationFrame(sample);
              else window.__ttHeroIntroTrace.done = true;
            };
            requestAnimationFrame(sample);
          },
          { once: true },
        );
      });

      await gotoRoute(page, route);
      await page.waitForFunction(() => window.__ttHeroIntroTrace?.done, null, {
        timeout: 8_000,
      });
      const trace = await page.evaluate(() => window.__ttHeroIntroTrace);
      const solidSamples = trace.samples.filter(
        ({ elapsed }) => elapsed >= 250 && elapsed <= 850,
      );
      const mediaWaitsForShortHold = trace.samples.some(
        ({ elapsed, maxSlideOpacity }) =>
          elapsed >= 900 &&
          elapsed <= 1_000 &&
          maxSlideOpacity <= 0.08 &&
          Number.isFinite(maxSlideOpacity),
      );
      const fadeSamples = trace.samples.filter(
        ({ elapsed }) => elapsed >= 1_100 && elapsed <= 2_450,
      );
      const finalSamples = trace.samples.filter(({ elapsed }) => elapsed >= 2_750);

      // Phủ cả cửa sổ 250-850ms thay vì đếm mẫu: runner bận chạy dưới 60fps nên số frame ít hơn.
      assert(
        solidSamples[0]?.elapsed <= 320 &&
          solidSamples.at(-1).elapsed >= 780 &&
          solidSamples.every(
            ({ background, maxSlideOpacity }) =>
              background === "rgb(43, 44, 43)" && maxSlideOpacity <= 0.02,
          ),
        `Home hero did not hold the solid reading surface: ${JSON.stringify(trace.samples.slice(0, 12))}`,
      );
      assert(
        mediaWaitsForShortHold,
        "Home hero media appeared before the shortened solid hold completed",
      );
      assert(
        fadeSamples.some(
          ({ maxSlideOpacity }) =>
            maxSlideOpacity >= 0.08 && maxSlideOpacity <= 0.92,
        ),
        "Home hero first image did not fade in after the solid hold",
      );
      assert(
        finalSamples.some(({ maxSlideOpacity }) => maxSlideOpacity >= 0.99),
        "Home hero first image did not finish visible",
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "home hero skips the solid hold for reduced motion",
    { route, viewport, reducedMotion: "reduce" },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, route);
      const state = await page.evaluate(() => {
        const slides = [...document.querySelectorAll(".hero-slide")];
        return {
          activeOpacity: Number.parseFloat(
            getComputedStyle(slides.find((slide) => slide.classList.contains("is-active"))).opacity,
          ),
          activeVisibility: getComputedStyle(
            slides.find((slide) => slide.classList.contains("is-active")),
          ).visibility,
        };
      });

      assert(
        state.activeOpacity >= 0.99 && state.activeVisibility === "visible",
        `Reduced-motion home hero did not show its active image immediately: ${JSON.stringify(state)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

}

async function runPhysicalWheelTransformChecks() {
  const cases = [
    { name: "home hero", route: "/vi/", selector: ".hero-slides", axis: "y", limit: 12 },
    { name: "residential hero", route: "/vi/residential/", selector: ".hero-slides", axis: "y", limit: 12 },
    { name: "commercial hero", route: "/vi/commercial/", selector: ".hero-slides", axis: "y", limit: 12 },
    { name: "about hero", route: "/vi/about/", selector: "[data-motion-hero-media]", axis: "y", limit: 12 },
    { name: "home project rail", route: "/vi/", selector: ".project-track", axis: "x", limit: 1 },
  ];

  for (const testCase of cases) {
    await runPageCase(
      `physical wheel keeps ${testCase.name} transform continuous`,
      { route: testCase.route, viewport: { width: 1440, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, testCase.route);
        await page.waitForTimeout(300);
        await page.evaluate((selector) => {
          const target = document.querySelector(selector);
          window.__ttWheelTransformTrace = { marks: [], samples: [] };
          let frames = 0;
          const sample = (time) => {
            const rect = target.getBoundingClientRect();
            window.__ttWheelTransformTrace.samples.push({
              time,
              x: rect.x,
              y: rect.y,
            });
            if ((frames += 1) < 150) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }, testCase.selector);
        await page.waitForTimeout(100);
        await page.evaluate(() =>
          window.__ttWheelTransformTrace.marks.push(performance.now()),
        );
        await page.mouse.move(720, 450);
        await page.mouse.wheel(0, 720);
        await page.waitForTimeout(650);
        await page.evaluate(() =>
          window.__ttWheelTransformTrace.marks.push(performance.now()),
        );
        await page.mouse.wheel(0, 720);
        await page.waitForTimeout(1_800);
        const result = await page.evaluate(({ axis, selector }) => {
          const { marks, samples } = window.__ttWheelTransformTrace;
          const target = document.querySelector(selector);
          const style = getComputedStyle(target);
          const frameRates = samples.slice(1).map((sample, index) => {
            const previous = samples[index];
            const elapsed = Math.max(1, sample.time - previous.time);
            return {
              time: sample.time,
              rate:
                (Math.abs(sample[axis] - previous[axis]) * 16.667) / elapsed,
            };
          });
          const peakAfter = (mark) =>
            Math.max(
              0,
              ...frameRates
                .filter(({ time }) => time >= mark && time <= mark + 620)
                .map(({ rate }) => rate),
            );
          return {
            firstPeak: peakAfter(marks[0]),
            secondPeak: peakAfter(marks[1]),
            transitionProperty: style.transitionProperty,
            transform: style.transform,
            translate: style.translate,
          };
        }, testCase);
        assert(
          Number.isFinite(result.firstPeak) &&
            Number.isFinite(result.secondPeak) &&
            result.firstPeak <= testCase.limit &&
            result.secondPeak <= testCase.limit,
          `${testCase.name} jumped on a physical wheel event: ${JSON.stringify(result)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runNoScriptHeroCheck() {
  const viewport = { width: 390, height: 844 };
  await runPageCase(
    "hero remains visible without JavaScript",
    { route: "/vi/residential/", viewport, javaScriptEnabled: false },
    async (page) => {
      const response = await page.goto(pageUrl("/vi/residential/"), {
        waitUntil: "load",
        timeout: 20_000,
      });
      assert(response && response.status() < 400, "No-script route load failed");
      await page.waitForTimeout(800);
      const state = await page.locator("h1").evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          opacity: Number.parseFloat(style.opacity),
          visibility: style.visibility,
          intersects: rect.bottom > 0 && rect.top < innerHeight,
        };
      });
      assert(
        state.opacity >= 0.99 && state.visibility === "visible" && state.intersects,
        `No-script hero is hidden: ${JSON.stringify(state)}`,
      );
    },
  );
}

async function runHomeMotionRegressionCheck() {
  const motionSource = fs.readFileSync(
    path.join(SITE_ROOT, "motion.js"),
    "utf8",
  );
  const styleSource = fs.readFileSync(
    path.join(SITE_ROOT, "style.css"),
    "utf8",
  );
  assert(
    /const introOffset = heroIntroPending && index === 0 \? 1 : 0;/.test(
      motionSource,
    ) &&
      /\{ scale: 1\.06 \}[\s\S]*scale: 1, duration: 6\.6, ease: "sine\.inOut"[\s\S]*duration: 1\.6[\s\S]*introOffset \+ 5,[\s\S]*\.call\(\(\) => startSlide\(nextIndex\), null, introOffset \+ 5\)/.test(
      motionSource,
      ),
    "The home hero zoom/cross-fade contract changed",
  );
  assert(
    !/@view-transition\s*\{[\s\S]*navigation:\s*auto/.test(styleSource) &&
      !/view-transition-name:\s*site-header/.test(styleSource) &&
      !/["'](?:pageswap|pagereveal)["']/.test(motionSource),
    "Automatic cross-document View Transition code is still active",
  );
  const routeMotionTokens = [
    "const coverRoute = () => {",
    'document.body.classList.add("is-transitioning")',
    "const fade = new Promise((resolve) => {",
    "opacity: 1,",
    "duration: 0.75,",
    'ease: "power4.inOut"',
    "return fade;",
    "async leave(data) {",
    "await coverRouteFromMenu();",
    "data.current.container.hidden = true;",
  ];
  let routeMotionCursor = -1;
  assert(
    routeMotionTokens.every((token) => {
      routeMotionCursor = motionSource.indexOf(token, routeMotionCursor + 1);
      return routeMotionCursor >= 0;
    }) &&
      /const playRouteEnter[\s\S]*opacity:\s*0,[\s\S]*duration:\s*1,[\s\S]*ease:\s*"power4\.inOut"/.test(
        motionSource,
      ),
    "The approved veil entry/exit route motion changed",
  );
  assert(
    /const hardNavigate[\s\S]*window\.location\.assign/.test(
      motionSource,
    ),
    "The route request failure fallback changed",
  );
  assert(
    /const ink =\s*\(routeTransitionActive && !routeDestinationReady\) \|\|/.test(
      motionSource,
    ),
    "Route transitions do not force the header to an ink tone over the white veil",
  );
  const clearRouteSource = motionSource.slice(
    motionSource.indexOf("const clearRouteEntry = () => {"),
    motionSource.indexOf("const playRouteEnter = () => {"),
  );
  assert(
    clearRouteSource.indexOf('document.body.classList.remove("is-transitioning")') <
      clearRouteSource.indexOf("updateHeader()"),
    "Route cleanup recalculates header tone before clearing transition state",
  );
  assert(
    !/is-transitioning \.site-header[\s\S]{0,180}transition:\s*none\s*!important/.test(
      styleSource,
    ),
    "Route navigation still disables all site-header transitions",
  );
  assert(
    !/scrollbar-width:\s*none|::-webkit-scrollbar\s*\{\s*display:\s*none/.test(
      styleSource,
    ),
    "A public horizontal region still hides its scrollbar",
  );
  const viewport = { width: 1440, height: 900 };
  await runPageCase(
    "home masks and project hover preserve copy",
    { route: "/vi/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await page.evaluate(() => window.localStorage.setItem("tt-lang", "vi"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForLoadedDocument(page);

      const contract = await page.evaluate(() => {
        const masks = [
          ...document.querySelectorAll(
            ".heritage-text, .portal-title-mask, .portal-title__quiet, .portal-title__strong",
          ),
        ];
        const subtitles = [
          ...document.querySelectorAll("#dich-vu .portal-subtitle"),
        ];
        const header = document.querySelector("[data-site-header]");
        const brandLockup = header.querySelector(".brand-lockup");
        const veil = document.querySelector(".route-veil");
        const media = [
          ...document.querySelectorAll(".project-card__media"),
        ];
        return {
          paper: getComputedStyle(document.body).backgroundColor,
          fontFamily: getComputedStyle(document.body).fontFamily,
          hasFooterBrand: Boolean(document.querySelector(".footer-brand")),
          masks: masks.map((mask) => {
            const fontSize = Number.parseFloat(
              getComputedStyle(mask.firstElementChild || mask).fontSize,
            );
            return {
              text: mask.textContent.trim(),
              overflow: getComputedStyle(mask).overflow,
              clipPath: getComputedStyle(mask).clipPath,
              inkOverflow: Number.parseFloat(
                getComputedStyle(mask).getPropertyValue(
                  "--mask-ink-overflow",
                ),
              ),
              inkOverflowTop: Number.parseFloat(
                getComputedStyle(mask).getPropertyValue(
                  "--mask-ink-overflow-top",
                ),
              ),
              inkOverflowBottom: Number.parseFloat(
                getComputedStyle(mask).getPropertyValue(
                  "--mask-ink-overflow-bottom",
                ),
              ),
              fontSize,
            };
          }),
          portalSubtitleCount: subtitles.length,
          // Runtime bọc ảnh portal trong media frame và chọn variant (media-delivery R1); đọc src authored.
          portalSources: [...document.querySelectorAll("#dich-vu .service-portal img")].map(
            (image) => new URL(image.getAttribute("src"), location.href).pathname,
          ),
          routeShell: {
            headerZ: Number.parseInt(getComputedStyle(header).zIndex, 10),
            veilZ: Number.parseInt(getComputedStyle(veil).zIndex, 10),
            headerDisplay: getComputedStyle(header).display,
            headerVisibility: getComputedStyle(header).visibility,
            headerOpacity: getComputedStyle(header).opacity,
            brandLockup: [
              Math.round(Number.parseFloat(getComputedStyle(brandLockup).width)),
              Math.round(Number.parseFloat(getComputedStyle(brandLockup).height)),
            ],
          },
          media: media.map((item) => ({
            overflow: getComputedStyle(item).overflow,
            height: item.getBoundingClientRect().height,
          })),
          track: {
            speed: document.querySelector(".project-track")?.dataset.scrollSpeed,
            direction: document.querySelector(".project-track")?.dataset
              .scrollDirection,
          },
          hero: {
            hasIndex: Boolean(document.querySelector(".hero-index")),
            hasKicker: Boolean(document.querySelector(".hero-kicker")),
            sources: [...document.querySelectorAll(".hero-slide img")].map(
              // currentSrc là variant AVIF/WebP runtime (media-delivery R1); so src authored.
              (image) => new URL(image.getAttribute("src"), location.href).pathname,
            ),
          },
          heritage: {
            maxWidth: getComputedStyle(
              document.querySelector(".heritage-rows"),
            ).maxWidth,
            sources: [...document.querySelectorAll(".heritage-image img")].map(
              // currentSrc là variant AVIF/WebP runtime (media-delivery R1); so src authored.
              (image) => new URL(image.getAttribute("src"), location.href).pathname,
            ),
            frames: [...document.querySelectorAll(".heritage-image")].map(
              (frame) => {
                const style = getComputedStyle(frame);
                return [
                  Math.round(Number.parseFloat(style.width)),
                  Math.round(Number.parseFloat(style.height)),
                ];
              },
            ),
          },
        };
      });

      assert(contract.paper === "rgb(255, 255, 255)", "Home paper is not white");
      assert(
        contract.fontFamily.includes("Plus Jakarta Sans"),
        `Primary font changed: ${contract.fontFamily}`,
      );
      assert(!contract.hasFooterBrand, "Footer brand is still rendered");
      assert(
        contract.portalSubtitleCount === 3,
        `Home service portal subtitle count changed: ${contract.portalSubtitleCount}`,
      );
      assert(
        JSON.stringify(contract.portalSources) ===
          JSON.stringify([
            "/assets/content/projects/home-residential-kitchen-v2.webp",
            "/assets/content/projects/home-commercial-fnb-v2.webp",
            "/assets/content/projects/home-advertising-products-blue-grid.webp",
          ]),
        `Home service portal sources changed: ${contract.portalSources.join(", ")}`,
      );
      assert(
        contract.routeShell.headerZ > contract.routeShell.veilZ &&
          contract.routeShell.headerDisplay !== "none" &&
          contract.routeShell.headerVisibility === "visible" &&
          contract.routeShell.headerOpacity === "1" &&
          // Design System Header: lockup mở rộng 260.97 x 67.52 trên 1200px.
          contract.routeShell.brandLockup[0] === 261 &&
          contract.routeShell.brandLockup[1] === 68,
        `Route veil can hide the persistent site header: ${JSON.stringify(contract.routeShell)}`,
      );
      assert(!contract.hero.hasIndex, "Home hero still has the retired slide index");
      assert(!contract.hero.hasKicker, "Home hero still has the retired kicker");
      // Slide 0 cố định; năm slide sau xáo mỗi lần tải (page-home R3) nên so tập hợp.
      const [firstHeroSource, ...laterHeroSources] = contract.hero.sources;
      assert(
        firstHeroSource === "/assets/content/projects/home-hero-tube-house-living.webp" &&
          JSON.stringify(laterHeroSources.sort()) ===
            JSON.stringify([
              "/assets/content/projects/hero-kiosk.webp",
              "/assets/content/projects/home-hero-kitchen-dining.webp",
              "/assets/content/projects/home-hero-office-reception.webp",
              "/assets/content/projects/home-hero-walnut-bedroom.webp",
              "/assets/content/projects/mobile-retail.webp",
            ]),
        `Home hero sources changed: ${contract.hero.sources.join(", ")}`,
      );
      assert(
        contract.heritage.maxWidth === "1300px" &&
          contract.heritage.frames.every(
            ([width, height]) => width === 187 && height === 144,
          ),
        `Heritage montage layout changed: ${contract.heritage.maxWidth}, ${JSON.stringify(contract.heritage.frames)}`,
      );
      assert(
        JSON.stringify(contract.heritage.sources) ===
          JSON.stringify([
            "/assets/content/shared/legacy-hands-384.webp",
            "/assets/content/shared/montage-creativity-designer-wave-wall.webp",
            "/assets/content/shared/montage-commitment-option-3-knot.webp",
            "/assets/content/shared/montage-residential-product-detail.webp",
          ]),
        `Heritage montage sources changed: ${contract.heritage.sources.join(", ")}`,
      );
      assert(contract.masks.length >= 14, "Home text masks are incomplete");
      assert(
        contract.masks.every(
          ({
            overflow,
            clipPath,
            inkOverflow,
            inkOverflowTop,
            inkOverflowBottom,
            fontSize,
          }) =>
            overflow === "visible" &&
            clipPath !== "none" &&
            inkOverflow >= fontSize * 0.2 &&
            inkOverflowTop >= fontSize * 0.2 &&
            inkOverflowBottom >= fontSize * 0.2,
        ),
        "A text mask can clip Vietnamese font ink",
      );
      assert(
        contract.media.length === 5 &&
          contract.media.every(
            ({ overflow, height }) =>
              overflow === "hidden" && Math.abs(height - 420) <= 1,
          ),
        "Project media masks are missing or unequal",
      );
      assert(
        contract.track.speed === "4" &&
          contract.track.direction === "horizontal",
        "Project track lost the reference horizontal parallax",
      );

      const readPortal = () =>
        page.evaluate(() => {
          const card = document.querySelector("#dich-vu .service-portal");
          const title = card.querySelector(".portal-title__quiet");
          const line = title.querySelector(".portal-line");
          const subtitle = card.querySelector(".portal-subtitle");
          return {
            cardTop: card.getBoundingClientRect().top,
            titleTop: title.getBoundingClientRect().top,
            subtitleTop: subtitle?.getBoundingClientRect().top ?? null,
            lineY: new DOMMatrix(getComputedStyle(line).transform).f,
            lineFontSize: Number.parseFloat(getComputedStyle(line).fontSize),
            subtitleOpacity: subtitle
              ? Number.parseFloat(getComputedStyle(subtitle).opacity)
              : null,
          };
        });
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      let portal = await readPortal();
      for (
        let index = 0;
        index < 12 &&
        !(portal.cardTop < viewport.height && portal.titleTop > viewport.height);
        index += 1
      ) {
        await page.mouse.wheel(0, 350);
        await page.waitForTimeout(300);
        portal = await readPortal();
      }
      assert(
        portal.cardTop < viewport.height && portal.titleTop > viewport.height,
        "Could not isolate the portal card-before-title trigger frame",
      );
      assert(
        portal.lineY > portal.lineFontSize * 1.5,
        "Portal title animated when only its card entered",
      );
      // page-home R5: portal dịch vụ mang kicker, title và subtitle.
      assert(portal.subtitleTop !== null, "Portal subtitle is missing");

      for (
        let index = 0;
        index < 8 && portal.titleTop >= viewport.height;
        index += 1
      ) {
        await page.mouse.wheel(0, 350);
        await page.waitForTimeout(250);
        portal = await readPortal();
      }
      assert(
        portal.titleTop < viewport.height,
        "Portal title did not enter the viewport",
      );
      await page.waitForFunction(
        () => {
          const title = document.querySelector(
            "#dich-vu .portal-title__quiet",
          );
          const line = title?.querySelector(".portal-line");
          return (
            title?.getBoundingClientRect().top < window.innerHeight &&
            new DOMMatrix(getComputedStyle(line).transform).f <
              Number.parseFloat(getComputedStyle(line).fontSize) * 1.5
          );
        },
        null,
        { timeout: 1_500 },
      );
      await page.waitForTimeout(2_000);
      portal = await readPortal();
      assert(
        Math.abs(portal.lineY + portal.lineFontSize * 0.1) <= 1,
        `Portal title ended at the wrong y: ${portal.lineY}`,
      );

      const firstCard = page.locator(".project-card").first();
      await firstCard.hover();
      await page.waitForTimeout(700);
      const hover = await firstCard.evaluate((card) => {
        const media = card.querySelector(".project-card__media");
        const image = media.querySelector("img");
        const caption = card.querySelector("figcaption");
        const mediaRect = media.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();
        const captionRect = caption.getBoundingClientRect();
        return {
          scale: new DOMMatrix(getComputedStyle(image).transform).a,
          captionOpacity: Number.parseFloat(getComputedStyle(caption).opacity),
          visibleImageBottom: Math.min(imageRect.bottom, mediaRect.bottom),
          captionTop: captionRect.top,
        };
      });
      assert(hover.scale >= 1.14, `Project hover scale is ${hover.scale}`);
      assert(
        hover.captionOpacity >= 0.99,
        "Project caption did not appear on hover",
      );
      assert(
        hover.visibleImageBottom <= hover.captionTop,
        "Zoomed project image escaped its mask and covered the caption",
      );
      assertDiagnostics(diagnostics);
    },
  );
}

const BRAND_SHELL_VIEWPORTS = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 959, height: 900 },
  { width: 981, height: 900 },
  { width: 1024, height: 900 },
  { width: 1199, height: 900 },
  { width: 1440, height: 900 },
  { width: 1569, height: 900 },
];

const BRAND_HEADER_BBOX_MATRIX = [
  { label: "expanded >1200px", width: 1440, height: 67.516 },
  { label: "expanded 768-1200px at 1200px", width: 1200, height: 57.594 },
  { label: "expanded 768-1200px at 768px", width: 768, height: 57.594 },
  { label: "expanded <=767px", width: 767, height: 57.594 },
  { label: "sticky compact", width: 1440, height: 49.641, sticky: true },
];

const BRAND_LOCKUP_ROUTE_CASES = ["vi", "en"].flatMap((locale) =>
  PUBLIC_HTML.map(([relativePath]) => {
    const suffix =
      relativePath === "index.html"
        ? "/"
        : `/${relativePath.replace(/\/index\.html$/, "")}/`;
    return { locale, route: `/${locale}${suffix}` };
  }),
);

const FOOTER_SOCIALS = ["facebook", "tiktok", "youtube"];
const HEAD_OFFICE_ADDRESS =
  "E16 Khu đô thị Hưng Phú, Phường Phú Tân, tỉnh Vĩnh Long";
function expectedBrandHeaderHeight(width, sticky = false) {
  if (sticky) return 49.641;
  return width > 1200 ? 67.516 : 57.594;
}

async function runSharedMediaHoverPortalChecks() {
  for (const locale of ["vi", "en"]) {
    await runPageCase(
      `shared media-hover portal ${locale}`,
      { route: `/${locale}/`, viewport: { width: 1440, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, `/${locale}/`);
        const allPortals = page.locator("#dich-vu .service-portal, #nang-luc .service-portal");
        assert((await allPortals.count()) === 6, `Expected six shared media portals at ${locale}`);
        for (let index = 0; index < 6; index += 1) {
          const sharedPortal = allPortals.nth(index);
          const sharedImage = sharedPortal.locator(".media-hover-zoom");
          await sharedPortal.scrollIntoViewIfNeeded();
          const beforeRect = await sharedPortal.boundingBox();
          await sharedPortal.hover();
          await page.waitForTimeout(650);
          const state = await sharedImage.evaluate((image) => {
            const style = getComputedStyle(image);
            return {
              scale: new DOMMatrixReadOnly(style.transform).a,
              duration: style.transitionDuration,
              easing: style.transitionTimingFunction,
              origin: style.transformOrigin,
            };
          });
          const afterRect = await sharedPortal.boundingBox();
          assert(Math.abs(state.scale - 1.15) < 0.01
            && state.duration === "0.6s"
            && state.easing === "ease-out"
            && state.origin.startsWith(`${beforeRect.width / 2}px`)
            && Math.abs(beforeRect.width - afterRect.width) <= 0.1
            && Math.abs(beforeRect.height - afterRect.height) <= 0.1,
          `Shared portal ${index + 1} motion drifted at ${locale}: ${JSON.stringify({ state, beforeRect, afterRect })}`);
          await page.mouse.move(0, 0);
        }
        const portal = page.locator("#dich-vu .service-portal").first();
        const image = portal.locator(".media-hover-zoom");
        const subtitle = portal.locator(".portal-subtitle");
        const shadeBefore = await portal.locator(".portal-shade").evaluate((shade) => getComputedStyle(shade).backgroundColor);
        await portal.hover();
        await page.waitForTimeout(650);
        const hover = await image.evaluate((image) => {
          const style = getComputedStyle(image);
          return {
            scale: new DOMMatrixReadOnly(style.transform).a,
            duration: style.transitionDuration,
            easing: style.transitionTimingFunction,
          };
        });
        assert(Math.abs(hover.scale - 1.15) < 0.01, `Portal hover zoom drifted at ${locale}: ${hover.scale}`);
        assert(
          hover.duration === "0.6s" && hover.easing === "ease-out",
          `Portal hover timing drifted at ${locale}: ${JSON.stringify(hover)}`,
        );
        const shadeAfter = await portal.locator(".portal-shade").evaluate((shade) => getComputedStyle(shade).backgroundColor);
        assert(shadeAfter === shadeBefore, `Portal hover must keep the shade at ${locale}`);
        await page.mouse.move(0, 0);
        await portal.focus();
        await page.waitForTimeout(650);
        const focus = await image.evaluate((image) => {
          const style = getComputedStyle(image);
          return {
            scale: new DOMMatrixReadOnly(style.transform).a,
            duration: style.transitionDuration,
            easing: style.transitionTimingFunction,
          };
        });
        assert(Math.abs(focus.scale - 1.15) < 0.01, `Portal keyboard focus zoom drifted at ${locale}: ${focus.scale}`);
        assert(
          focus.duration === "0.6s" && focus.easing === "ease-out",
          `Portal keyboard focus timing drifted at ${locale}: ${JSON.stringify(focus)}`,
        );
        assert(
          Math.abs(await subtitle.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element, "::after").transform).a) - 1) < 0.01,
          `Portal keyboard focus keeps subtitle underline at ${locale}`,
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        const reduced = await image.evaluate((image) => {
          const style = getComputedStyle(image);
          return { transform: style.transform, duration: style.transitionDuration };
        });
        assert(
          reduced.transform === "none" && reduced.duration === "0s",
          `Portal reduced motion removes zoom and transition at ${locale}: ${JSON.stringify(reduced)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }
  for (const route of ["/vi/residential/", "/vi/commercial/", "/vi/about/"]) {
    await runPageCase(
      `shared media-hover detail ${route}`,
      { route, viewport: { width: 1440, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, route);
        const triggers = page.locator(".detail-gallery__item, .detail-duo figure, .detail-cta");
        const count = await triggers.count();
        assert(count >= 3, `Expected gallery, duo and CTA hover targets on ${route}`);
        for (let index = 0; index < count; index += 1) {
          const trigger = triggers.nth(index);
          assert(await trigger.evaluate((element) => element.classList.contains("media-hover-zoom-trigger")),
            `${route} target ${index + 1} is not a shared hover trigger`);
          await trigger.scrollIntoViewIfNeeded();
          await trigger.hover();
          await page.waitForTimeout(650);
          const scale = await trigger.locator(".media-hover-zoom").evaluate((image) =>
            new DOMMatrixReadOnly(getComputedStyle(image).transform).a);
          assert(Math.abs(scale - 1.15) < 0.01, `${route} target ${index + 1} hover zoom drifted: ${scale}`);
          await page.mouse.move(0, 0);
        }
        await page.emulateMedia({ reducedMotion: "reduce" });
        await triggers.first().hover();
        const reduced = await triggers.first().locator(".media-hover-zoom").evaluate((image) => getComputedStyle(image).transform);
        assert(reduced === "none", `${route} reduced motion keeps hover zoom: ${reduced}`);
        assertDiagnostics(diagnostics);
      },
    );
  }
}

function expectedBrandHeaderWidth(width, sticky = false) {
  if (sticky) return 191.885904;
  return width > 1200 ? 260.981741 : 222.62872;
}

function expectedBrandHeaderTrackWidth(width) {
  if (width <= 750) return 191.885904;
  return width > 1200 ? 260.981741 : 222.62872;
}

async function waitForBrandFonts(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
}

function extractSourceFooter(source, relativePath) {
  const matches = [...source.matchAll(/<footer\b[\s\S]*?<\/footer>/g)].map(
    (match) => match[0],
  );
  assert(
    matches.length === 1,
    relativePath + " must contain exactly one canonical footer",
  );
  return matches[0];
}

function extractInlineBrandLockups(source, relativePath) {
  const lockups = [
    ...source.matchAll(
      /<svg\b(?=[^>]*\bclass="[^"]*\bbrand-lockup\b)[^>]*>[\s\S]*?<\/svg>/g,
    ),
  ].map((match) => match[0]);
  assert(
    lockups.length === 2,
    relativePath +
      " must expose exactly two inline brand lockups (header and full menu); found " +
      lockups.length,
  );
  return lockups;
}

function assertBrandShellSourceContracts() {
  const footerSources = [];
  let lockupCount = 0;
  const styleSource = fs.readFileSync(path.join(SITE_ROOT, "style.css"), "utf8");
  const motionSource = fs.readFileSync(path.join(SITE_ROOT, "motion.js"), "utf8");

  PUBLIC_HTML.forEach(([relativePath]) => {
    const source = fs.readFileSync(path.join(SITE_ROOT, relativePath), "utf8");
    const lockups = extractInlineBrandLockups(source, relativePath);
    lockupCount += lockups.length;

    lockups.forEach((lockup, index) => {
      const mark = lockup.match(
        /<g\b(?=[^>]*\bclass="[^"]*\bbrand-lockup__mark\b)[^>]*>[\s\S]*?<\/g>/,
      )?.[0];
      assert(
        mark &&
          (mark.match(/<path\b/g) || []).length === 4 &&
          (lockup.match(/<text\b/g) || []).length === 2 &&
          /<text\b(?=[^>]*\bclass="[^"]*\bbrand-lockup__title\b)[^>]*>/.test(
            lockup,
          ) &&
          /<text\b(?=[^>]*\bclass="[^"]*\bbrand-lockup__subtitle\b)(?=[^>]*\bdata-en="INTERIORS · ADVERTISING")[^>]*>/.test(
            lockup,
          ) &&
          !/\blengthAdjust="spacingAndGlyphs"/.test(lockup) &&
          !/<(?:use|image|style|metadata|title|desc|foreignObject)\b|\bhref\s*=|\bxlink:href\s*=/.test(
            lockup,
          ),
        relativePath +
          " lockup " +
          (index + 1) +
          " must keep four mark paths, two live text nodes, and undistorted locale copy",
      );
    });

    const footer = extractSourceFooter(source, relativePath);
    assert(
      footer.includes('id="lien-he"') && footer.includes(HEAD_OFFICE_ADDRESS),
      relativePath + " footer is missing the confirmed head-office address",
    );

    let previousSocialIndex = -1;
    FOOTER_SOCIALS.forEach((social) => {
      const item = footer.match(
        new RegExp(
          '<(?:a|span|button)\\b(?=[^>]*\\bdata-footer-social="' +
            social +
            '")(?=[^>]*\\baria-label=")[^>]*aria-disabled="true"[^>]*>[\\s\\S]*?<\\/(?:a|span|button)>',
        ),
      )?.[0];
      assert(
        item &&
          !/<(?:a|span|button)\b[^>]*\bhref\s*=/.test(item) &&
          /<svg\b[^>]*\bviewBox="0 0 24 24"/.test(item) &&
          /currentColor/.test(item) &&
          !/\bstroke(?:-width)?=/.test(item) &&
          !/\bfill="none"/.test(item) &&
          (!/^<a\b/.test(item) || /\btabindex="-1"/.test(item)),
        relativePath +
          " footer social placeholder " +
          social +
          " must be inline, monochrome, disabled, and unfocusable",
      );
      const socialIndex = footer.indexOf('data-footer-social="' + social + '"');
      assert(
        socialIndex > previousSocialIndex,
        relativePath + " footer social order changed at " + social,
      );
      previousSocialIndex = socialIndex;
    });
    footerSources.push(footer.replace(/\s+/g, " ").trim());
  });

  assert(
    lockupCount === 10,
    "The five routes must expose ten inline Trường Thịnh lockups; found " +
      lockupCount,
  );
  assert(
    !/\.brand-lockup__(?:title|subtitle|copy)\s*\{[^}]*transform:\s*[^;}]*scale[XY]/.test(
      styleSource,
    ) && !/\blengthAdjust="spacingAndGlyphs"/.test(styleSource),
    "Brand locale width must not scale glyphs",
  );
  assert(
    !/html\[lang="en"\]\s+\.brand-lockup__(?:title|subtitle)\s*\{/.test(
      styleSource,
    ),
    "English brand text must inherit the canonical Vietnamese font size, tracking, and baseline",
  );
  assert(
    new Set(footerSources).size === 1,
    "Footer markup is not canonical across the five public routes",
  );
  assert(
    /--brand-header-height:\s*57\.59375px;/.test(styleSource) &&
      /--brand-header-height:\s*67\.515625px;/.test(styleSource) &&
      /height:\s*min\(49\.640625px,\s*var\(--header-collapsed-row-height\)\)/.test(styleSource) &&
      /--header-row-height:\s*67\.515625px;/.test(styleSource) &&
      /--header-collapsed-row-height:\s*60\.390625px;/.test(styleSource) &&
      /@media \(max-width:\s*1200px\)[\s\S]*?--header-row-height:\s*60\.390625px;[\s\S]*?--header-collapsed-row-height:\s*60\.390625px;/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*750px\)[\s\S]*?--header-row-height:\s*57\.59375px;[\s\S]*?--header-collapsed-row-height:\s*49\.640625px;/.test(
        styleSource,
      ),
    "Header brand bbox and independent Espacio row-height matrices drifted",
  );
  assert(
    /const delay = index \* 70;/.test(motionSource) &&
      !/\.brand-lockup__mark path\s*\{[\s\S]*?transition:\s*fill|is-brand-color-reset/.test(
        styleSource,
      ) &&
      !/logoMotionVariants|searchParams\.get\(\s*"logo-motion"|playHeaderMarkColorMotion/.test(
        motionSource,
      ) &&
      /\.menu-brand \.brand-lockup\s*\{[\s\S]*?--logo-mark-yellow:\s*#ffed00;[\s\S]*?--logo-mark-magenta:\s*#e5097f;[\s\S]*?--logo-mark-cyan:\s*#00a0e3;/.test(
        styleSource,
      ) &&
      !/function resetMenuMarkColor\(/.test(motionSource) &&
      !/\.call\(\(\) => dialog\.classList\.add\("is-brand-color"\)/.test(
        motionSource,
      ) &&
      /\.site-header\.is-brand-color \.brand-lockup/.test(styleSource) &&
      /function syncHeaderBrandSurface\(whiteSurface\b[^)]*\)[\s\S]*?paintHeaderMark\("is-brand-color", \{ from: markBlack \}\)/.test(
        motionSource,
      ) &&
      /classList\.toggle\(\s*"is-logo-ink"\s*,\s*collapsed\s*\)/.test(
        motionSource,
      ) &&
      /function playHeaderLockupScaleMotion\(beforeRect\)[\s\S]*?gsap\.fromTo\([\s\S]*?scaleX[\s\S]*?scaleY[\s\S]*?duration:\s*0\.3,[\s\S]*?ease:\s*"expo\.out"/.test(
        motionSource,
      ) &&
      /if \(collapsedChanged\)[\s\S]*?playHeaderLockupScaleMotion\(logoBeforeRect\)/.test(
        motionSource,
      ) &&
      !/killTweensOf\(logoTarget\)/.test(motionSource),
    "Header/menu mark color must use the selected 1s sequence without dead variants while preserving 0.3s lockup scale",
  );
}

async function runResponsiveResizeRegressionChecks() {
  await runPageCase(
    "responsive resize clears the desktop scroll coordinate system",
    { route: "/vi/", viewport: { width: 1199, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await page.keyboard.press("End");
      await page.waitForTimeout(1_800);
      const desktop = await page.evaluate(() => {
        const shell = document.querySelector(".page-shell");
        const matrix = new DOMMatrixReadOnly(getComputedStyle(shell).transform);
        return {
          scrollY: window.scrollY,
          hasSmooth: document.documentElement.classList.contains("has-scroll-smooth"),
          shellTop: shell.getBoundingClientRect().top,
          shellTransformY: matrix.m42,
        };
      });
      assert(
        desktop.hasSmooth &&
          desktop.scrollY <= 1 &&
          desktop.shellTransformY < -1000,
        "Resize probe did not reach the desktop Locomotive state: " +
          JSON.stringify(desktop),
      );

      await page.setViewportSize({ width: 959, height: 900 });
      await page.waitForTimeout(1_200);
      const mobile = await page.evaluate(() => {
        const shell = document.querySelector(".page-shell");
        const shellStyle = getComputedStyle(shell);
        const shellRect = shell.getBoundingClientRect();
        const landmarks = [
          ...document.querySelectorAll("main > section, main > figure, footer"),
        ].filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < innerHeight;
        });
        return {
          scrollY: window.scrollY,
          shellTop: shellRect.top,
          shellTransform: shellStyle.transform,
          landmarks: landmarks.length,
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      assert(
        Math.abs(mobile.shellTop + mobile.scrollY) <= 4 &&
          (mobile.shellTransform === "none" ||
            mobile.shellTransform === "matrix(1, 0, 0, 1, 0, 0)") &&
          mobile.landmarks > 0 &&
          mobile.overflow <= 1,
        "1199px to 959px resize left native scroll and page-shell transforms doubled: " +
          JSON.stringify({ desktop, mobile }),
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runMenuResizeRegressionCheck() {
  await runPageCase(
    "menu resize does not restart background smooth scroll",
    { route: "/vi/", viewport: { width: 1199, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await openMenu(page);
      await page.setViewportSize({ width: 959, height: 900 });
      await page.waitForTimeout(700);
      await page.setViewportSize({ width: 1199, height: 900 });
      await page.waitForTimeout(1_000);
      const before = await page.evaluate(() => {
        const shell = document.querySelector(".page-shell");
        return {
          menuOpen: document.querySelector("#site-menu")?.open === true,
          bodyOpen: document.body.classList.contains("menu-open"),
          hasSmooth: document.documentElement.classList.contains("has-scroll-smooth"),
          scrollY: window.scrollY,
          shellTop: shell.getBoundingClientRect().top,
          shellTransform: getComputedStyle(shell).transform,
        };
      });
      await page.keyboard.press("End");
      await page.waitForTimeout(1_800);
      const after = await page.evaluate(() => {
        const shell = document.querySelector(".page-shell");
        return {
          menuOpen: document.querySelector("#site-menu")?.open === true,
          bodyOpen: document.body.classList.contains("menu-open"),
          hasSmooth: document.documentElement.classList.contains("has-scroll-smooth"),
          scrollY: window.scrollY,
          shellTop: shell.getBoundingClientRect().top,
          shellTransform: getComputedStyle(shell).transform,
        };
      });
      assert(
        before.menuOpen &&
          before.bodyOpen &&
          !before.hasSmooth &&
          after.menuOpen &&
          after.bodyOpen &&
          !after.hasSmooth &&
          Math.abs(after.scrollY - before.scrollY) <= 2 &&
          Math.abs(after.shellTop - before.shellTop) <= 4 &&
          (after.shellTransform === "none" ||
            after.shellTransform === "matrix(1, 0, 0, 1, 0, 0)"),
        "Open menu crossed 981px and allowed a new smooth instance/background scroll: " +
          JSON.stringify({ before, after }),
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function readBrandLockupRuntimeState(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const value = element?.getBoundingClientRect();
      if (!value) return null;
      return {
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        left: value.left,
        width: value.width,
        height: value.height,
      };
    };
    const union = (elements) => {
      const rects = elements.map(rect).filter(Boolean);
      if (!rects.length) return null;
      const top = Math.min(...rects.map((value) => value.top));
      const right = Math.max(...rects.map((value) => value.right));
      const bottom = Math.max(...rects.map((value) => value.bottom));
      const left = Math.min(...rects.map((value) => value.left));
      return { top, right, bottom, left, width: right - left, height: bottom - top };
    };
    const measure = (root) => {
      const lockup = root?.querySelector(".brand-lockup");
      const mark = lockup?.querySelector(".brand-lockup__mark");
      const title = lockup?.querySelector(".brand-lockup__title");
      const subtitle = lockup?.querySelector(".brand-lockup__subtitle");
      const bbox = (element) => {
        try {
          const value = element?.getBBox?.();
          if (!value) return null;
          return {
            x: value.x,
            y: value.y,
            width: value.width,
            height: value.height,
          };
        } catch {
          return null;
        }
      };
      const visualTextExtent = (element) => {
        try {
          const count = element?.getNumberOfChars?.() || 0;
          const matrix = element?.getScreenCTM?.();
          const style = element && getComputedStyle(element);
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!count || !matrix || !style || !context) return null;
          const sampleSize = 1000;
          const scale = Number.parseFloat(style.fontSize) / sampleSize;
          const text = element.textContent || "";
          context.font = [
            style.fontStyle,
            style.fontWeight,
            sampleSize + "px",
            style.fontFamily,
          ].join(" ");
          const project = (x, y) => ({
            x: matrix.a * x + matrix.c * y + matrix.e,
            y: matrix.b * x + matrix.d * y + matrix.f,
          });
          const extents = [];
          for (let index = 0; index < count; index += 1) {
            const glyph = text[index];
            if (!glyph || /\s/.test(glyph)) continue;
            const point = element.getStartPositionOfChar(index);
            const metrics = context.measureText(glyph);
            const corners = [
              project(
                point.x - metrics.actualBoundingBoxLeft * scale,
                point.y - metrics.actualBoundingBoxAscent * scale,
              ),
              project(
                point.x + metrics.actualBoundingBoxRight * scale,
                point.y + metrics.actualBoundingBoxDescent * scale,
              ),
            ];
            extents.push({
              top: Math.min(...corners.map((corner) => corner.y)),
              right: Math.max(...corners.map((corner) => corner.x)),
              bottom: Math.max(...corners.map((corner) => corner.y)),
              left: Math.min(...corners.map((corner) => corner.x)),
            });
          }
          if (!extents.length) return null;
          const top = Math.min(...extents.map((value) => value.top));
          const bottom = Math.max(...extents.map((value) => value.bottom));
          const left = Math.min(...extents.map((value) => value.left));
          const right = Math.max(...extents.map((value) => value.right));
          return { top, right, bottom, left, width: right - left, height: bottom - top };
        } catch {
          return null;
        }
      };
      const canvasMetricsAt1000 = (element) => {
        if (!element) return null;
        const style = getComputedStyle(element);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return null;
        const sampleSize = 1000;
        const fontSize = Number.parseFloat(style.fontSize);
        const matrix = element.getScreenCTM?.();
        const verticalScale = matrix ? Math.hypot(matrix.c, matrix.d) : 1;
        context.font = [
          style.fontStyle,
          style.fontWeight,
          sampleSize + "px",
          style.fontFamily,
        ].join(" ");
        const cap = context.measureText("H");
        const ink = context.measureText(element.textContent || "");
        const scale = (fontSize / sampleSize) * verticalScale;
        return {
          sampleSize,
          capHeight:
            (cap.actualBoundingBoxAscent + cap.actualBoundingBoxDescent) * scale,
          inkHeight:
            (ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent) * scale,
          inkTop: ink.actualBoundingBoxAscent * scale,
          inkBottom: ink.actualBoundingBoxDescent * scale,
        };
      };
      const baselineY = (element) => {
        try {
          const point = element?.getStartPositionOfChar?.(0);
          const matrix = element?.getScreenCTM?.();
          if (!point || !matrix) return null;
          return matrix.b * point.x + matrix.d * point.y + matrix.f;
        } catch {
          return null;
        }
      };
      const titleNodes = title ? [title] : [];
      const subtitleNodes = subtitle ? [subtitle] : [];
      const text = [...titleNodes, ...subtitleNodes];
      const markRect = union([mark]);
      const textRect = union(text);
      const trueRect = union([mark, ...text]);
      const svgRect = rect(lockup);
      const titleExtent = visualTextExtent(title);
      const subtitleExtent = visualTextExtent(subtitle);
      const textInk = [titleExtent, subtitleExtent].every(Boolean)
        ? {
            top: Math.min(titleExtent.top, subtitleExtent.top),
            right: Math.max(titleExtent.right, subtitleExtent.right),
            bottom: Math.max(titleExtent.bottom, subtitleExtent.bottom),
            left: Math.min(titleExtent.left, subtitleExtent.left),
          }
        : null;
      if (textInk) {
        textInk.width = textInk.right - textInk.left;
        textInk.height = textInk.bottom - textInk.top;
      }
      const inkRect = markRect && textInk
        ? {
            top: Math.min(markRect.top, textInk.top),
            right: Math.max(markRect.right, textInk.right),
            bottom: Math.max(markRect.bottom, textInk.bottom),
            left: Math.min(markRect.left, textInk.left),
          }
        : null;
      if (inkRect) {
        inkRect.width = inkRect.right - inkRect.left;
        inkRect.height = inkRect.bottom - inkRect.top;
      }
      return {
        svgRect,
        markRect,
        textRect,
        trueRect,
        titleRect: rect(title),
        subtitleRect: rect(subtitle),
        titleBBox: bbox(title),
        subtitleBBox: bbox(subtitle),
        titleExtent,
        subtitleExtent,
        textInk,
        inkRect,
        titleMetrics: canvasMetricsAt1000(title),
        subtitleMetrics: canvasMetricsAt1000(subtitle),
        titleBaselineY: baselineY(title),
        subtitleBaselineY: baselineY(subtitle),
        pathCount: mark?.querySelectorAll("path").length || 0,
        hasUse: Boolean(lockup?.querySelector("use")),
        textCount: lockup?.querySelectorAll("text").length || 0,
        titleFontSizes: titleNodes.map((node) =>
          Number.parseFloat(getComputedStyle(node).fontSize),
        ),
        subtitleFontSizes: subtitleNodes.map((node) =>
          Number.parseFloat(getComputedStyle(node).fontSize),
        ),
        subtitleLetterSpacings: subtitleNodes.map((node) => {
          const value = getComputedStyle(node).letterSpacing;
          return value === "normal" ? 0 : Number.parseFloat(value);
        }),
        titleLetterSpacings: titleNodes.map((node) => {
          const value = getComputedStyle(node).letterSpacing;
          return value === "normal" ? 0 : Number.parseFloat(value);
        }),
        titleTransforms: titleNodes.map((node) => getComputedStyle(node).transform),
        subtitleTransforms: subtitleNodes.map(
          (node) => getComputedStyle(node).transform,
        ),
        titleWeights: titleNodes.map((node) => getComputedStyle(node).fontWeight),
        subtitleWeights: subtitleNodes.map(
          (node) => getComputedStyle(node).fontWeight,
        ),
        overflow:
          inkRect &&
          svgRect &&
          {
            left: svgRect.left - inkRect.left,
            right: inkRect.right - svgRect.right,
            top: svgRect.top - inkRect.top,
            bottom: inkRect.bottom - svgRect.bottom,
          },
      };
    };
    return {
      lang: document.documentElement.lang,
      header: measure(document.querySelector("#header-logo")),
      menu: measure(document.querySelector("#site-menu")),
    };
  });
}

function assertBrandLockupRuntimeState(state, label, width) {
  const subtitleToTitleBodyRatio = 0.618;
  const subtitleToTitleBodyTolerance = 0.005;
  const tolerance = 0.5;
  const validate = (measurement, name) => {
    const isVietnamese = state.lang === "vi";
    const y = measurement?.markRect?.height / 6;
    const titleBodyHeight = measurement?.titleMetrics?.capHeight;
    const subtitleBodyHeight = measurement?.subtitleMetrics?.capHeight;
    const interlineInkGap = measurement?.subtitleExtent?.top - measurement?.titleExtent?.bottom;
    const bodyInkHeight = measurement?.textInk?.height;
    const topPadding = measurement?.textInk?.top - measurement?.markRect?.top;
    const bottomPadding = measurement?.markRect?.bottom - measurement?.textInk?.bottom;
    const markToTextInkGap =
      Math.min(
        measurement?.titleExtent?.left || Infinity,
        measurement?.subtitleExtent?.left || Infinity,
      ) - measurement?.markRect?.right;
    assert(
      measurement &&
        measurement.pathCount === 4 &&
        !measurement.hasUse &&
        measurement.textCount === 2 &&
        measurement.titleWeights.length === 1 &&
        measurement.subtitleWeights.length === 1 &&
        measurement.titleWeights[0] === "600" &&
        measurement.subtitleWeights[0] === "600" &&
        measurement.markRect &&
        measurement.textRect &&
        measurement.trueRect &&
        measurement.markRect.height > 0 &&
        measurement.titleMetrics?.sampleSize === 1000 &&
        measurement.subtitleMetrics?.sampleSize === 1000 &&
        titleBodyHeight > 0 &&
        subtitleBodyHeight > 0 &&
        measurement.titleExtent &&
        measurement.subtitleExtent &&
        measurement.textInk &&
        Number.isFinite(y) &&
        Math.abs(subtitleBodyHeight / titleBodyHeight - subtitleToTitleBodyRatio) <=
          subtitleToTitleBodyTolerance &&
        interlineInkGap >= -tolerance &&
        Math.abs(topPadding - y) <= tolerance &&
        Math.abs(markToTextInkGap - y) <= tolerance &&
        measurement.subtitleExtent.top >= measurement.titleExtent.bottom - tolerance &&
        measurement.titleExtent &&
        measurement.subtitleExtent &&
        measurement.titleExtent.width > 0 &&
        measurement.subtitleExtent.width > 0 &&
        Math.abs(measurement.titleExtent.width - measurement.subtitleExtent.width) <= tolerance &&
        (isVietnamese
          ? Math.abs(bodyInkHeight - 4 * y) <= tolerance &&
            Math.abs(bottomPadding - y) <= tolerance &&
            Math.abs(measurement.titleExtent.left - measurement.subtitleExtent.left) <= tolerance &&
            Math.abs(measurement.titleExtent.right - measurement.subtitleExtent.right) <= tolerance &&
            interlineInkGap <= 0.5 * y + tolerance
          : Math.abs(measurement.titleFontSizes[0] - 46.68365) <= 0.001 &&
            Math.abs(measurement.subtitleFontSizes[0] - 28.8505) <= 0.001 &&
            measurement.titleLetterSpacings[0] === 0 &&
            measurement.subtitleLetterSpacings[0] === 0 &&
            measurement.titleTransforms[0] === "none" &&
            measurement.subtitleTransforms[0] === "none"),
      label +
        " " +
        name +
        " must keep the locale brand metrics and fitted title/subtitle widths: " +
        JSON.stringify({
          lang: state.lang,
          checks: {
            bodyRatio: Math.abs(subtitleBodyHeight / titleBodyHeight - subtitleToTitleBodyRatio) <= subtitleToTitleBodyTolerance,
            accentBounds: Math.abs(bodyInkHeight - 4 * y) <= tolerance,
            topPadding: Math.abs(topPadding - y) <= tolerance,
            bottomPadding: Math.abs(bottomPadding - y) <= tolerance,
            markGap: Math.abs(markToTextInkGap - y) <= tolerance,
            leftEdge: Math.abs(measurement.titleExtent.left - measurement.subtitleExtent.left) <= tolerance,
            rightEdge: Math.abs(measurement.titleExtent.right - measurement.subtitleExtent.right) <= tolerance,
            compactGap: interlineInkGap >= -tolerance && interlineInkGap <= 0.5 * y + tolerance,
            width: Math.abs(measurement.titleExtent.width - measurement.subtitleExtent.width) <= tolerance,
          },
          y,
          titleBodyHeight,
          subtitleBodyHeight,
          interlineInkGap,
          bodyInkHeight,
          topPadding,
          bottomPadding,
          markToTextInkGap,
          measurement,
        }),
    );
    assert(
      Object.values(measurement.overflow).every((value) => Number(value) <= tolerance),
      label +
        " " +
        name +
        " true lockup ink escapes its SVG viewBox: " +
        JSON.stringify(measurement),
    );
    assert(
      measurement.svgRect.right - measurement.textInk.right >= 0.5,
      label + " " + name + " text ink must retain clearance inside the logo hit area",
    );
  };
  validate(state.header, "header");
  validate(state.menu, "menu");
}

function assertBrandLocaleMetricParity(viState, enState, label) {
  const tolerance = 0.5;
  for (const name of ["header", "menu"]) {
    const vi = viState[name];
    const en = enState[name];
    const viBaselineGap = vi.subtitleBaselineY - vi.titleBaselineY;
    const enBaselineGap = en.subtitleBaselineY - en.titleBaselineY;
    assert(
      vi.titleFontSizes[0] === en.titleFontSizes[0] &&
        vi.subtitleFontSizes[0] === en.subtitleFontSizes[0] &&
        vi.titleLetterSpacings[0] === en.titleLetterSpacings[0] &&
        vi.subtitleLetterSpacings[0] === en.subtitleLetterSpacings[0] &&
        vi.titleTransforms[0] === en.titleTransforms[0] &&
        vi.subtitleTransforms[0] === en.subtitleTransforms[0] &&
        Math.abs(viBaselineGap - enBaselineGap) <= tolerance &&
        ["top", "right", "bottom", "left"].every(
          (edge) => Math.abs(vi.titleExtent[edge] - en.titleExtent[edge]) <= tolerance,
        ) &&
        Math.abs(vi.titleExtent.width - en.titleExtent.width) <= tolerance &&
        Math.abs(en.subtitleExtent.width - en.titleExtent.width) <= tolerance,
      `${label} ${name} English text must inherit Vietnamese character metrics while fitting the canonical title width: ` +
        JSON.stringify({ vi, en, viBaselineGap, enBaselineGap }),
    );
  }
}

async function runBrandLockupRuntimeChecks() {
  for (const viewport of BRAND_SHELL_VIEWPORTS) {
    await runPageCase(
      "brand lockup true bbox " + viewport.width,
      { route: "/vi/", viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, "/vi/");
        await waitForBrandFonts(page);
        await openMenu(page);
        await waitForBrandFonts(page);
        const state = await readBrandLockupRuntimeState(page);
        assertBrandLockupRuntimeState(
          state,
          viewport.width + "x" + viewport.height,
          viewport.width,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }

  await runPageCase(
    "brand lockup English inherits Vietnamese character metrics",
    { route: "/vi/", viewport: { width: 390, height: 844 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await waitForBrandFonts(page);
      await openMenu(page);
      await waitForBrandFonts(page);
      const viState = await readBrandLockupRuntimeState(page);
      await gotoRoute(page, "/en/");
      await waitForBrandFonts(page);
      await openMenu(page);
      await waitForBrandFonts(page);
      const enState = await readBrandLockupRuntimeState(page);
      assertBrandLocaleMetricParity(viState, enState, "390x844");
      assertDiagnostics(diagnostics);
    },
  );

  for (const { locale, route } of BRAND_LOCKUP_ROUTE_CASES) {
    await runPageCase(
      `brand lockup text width ${locale} ${route}`,
      { route, viewport: { width: 390, height: 844 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, route);
        await waitForBrandFonts(page);
        await openMenu(page);
        await waitForBrandFonts(page);
        const state = await readBrandLockupRuntimeState(page);
        assertBrandLockupRuntimeState(state, route + " 390x844", 390);
        const subtitles = await page
          .locator(".brand-lockup__subtitle")
          .allTextContents();
        const titles = await page
          .locator(".brand-lockup__title")
          .allTextContents();
        const expectedSubtitle =
          locale === "en" ? "INTERIORS · ADVERTISING" : "NỘI THẤT · QUẢNG CÁO";
        assert(
          titles.length === 2 &&
            titles.every((text) => text.replace(/\s+/g, " ").trim() === "TRƯỜNG THỊNH") &&
            subtitles.length === 2 &&
            subtitles.every(
              (text) => text.replace(/\s+/g, " ").trim() === expectedSubtitle,
            ),
          `${route} must render both live brand title/subtitle nodes for ${locale}: ` +
            JSON.stringify({ titles, subtitles }),
        );
        assertDiagnostics(diagnostics);
      },
    );
  }

  await runPageCase(
    "brand lockup English desktop geometry",
    { route: "/en/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/en/");
      await waitForBrandFonts(page);
      await openMenu(page);
      await waitForBrandFonts(page);
      assertBrandLockupRuntimeState(
        await readBrandLockupRuntimeState(page),
        "/en/ 1440x900",
        1440,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "brand lockup English subtitle",
    { route: "/en/", viewport: { width: 390, height: 844 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/en/");
      await page.waitForFunction(
        () => document.documentElement.lang === "en",
      );
      const subtitles = await page
        .locator(".brand-lockup__subtitle")
        .allTextContents();
      assert(
        subtitles.length === 2 &&
          subtitles.every(
            (text) => text.replace(/\s+/g, " ").trim() === "INTERIORS · ADVERTISING",
          ),
        "English route must translate both header and full-menu brand subtitles: " +
          JSON.stringify(subtitles),
      );
      assertDiagnostics(diagnostics);
    },
  );

  if (process.env.TT_E2E_BRAND_LOCKUP_ONLY !== "1") {
    await runBrandColorMotionCheck();
  }
}

async function runBrandColorMotionCheck() {
  for (const { locale, viewport } of [
    { locale: "vi", viewport: { width: 390, height: 844 } },
    { locale: "vi", viewport: { width: 1440, height: 900 } },
    { locale: "en", viewport: { width: 1440, height: 900 } },
  ]) {
    const route = `/${locale}/advertising-products/`;
    await runPageCase(
      `direct white-surface header replays black to CMYK ${locale} ${viewport.width}`,
      { route, viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await page.addInitScript(() => {
          window.__ttWhiteSurfaceLogoTrace = { done: false, samples: [] };
          const findMark = () => {
            const paths = [
              ...document.querySelectorAll(
                "#header-logo .brand-lockup__mark path",
              ),
            ];
            if (paths.length !== 4) {
              requestAnimationFrame(findMark);
              return;
            }
            const startedAt = performance.now();
            const sample = () => {
              const elapsed = performance.now() - startedAt;
              window.__ttWhiteSurfaceLogoTrace.samples.push({
                elapsed,
                fills: paths.map((path) => getComputedStyle(path).fill),
                underlay: [
                  ...document.querySelectorAll(
                    "#header-logo .brand-lockup__mark-underlay path",
                  ),
                ].map((path) => path.getAttribute("fill")),
                totals: paths.map((path) => {
                  const timing = path.getAnimations()[0]?.effect?.getTiming();
                  return timing ? timing.delay + timing.duration : 0;
                }),
              });
              // Animation 1s bắt đầu khi trang mount, có lúc sau mốc lấy mẫu 130ms: lấy mẫu tới khi lớp đen đã gỡ
              // (trần 2.5s) thay vì dừng cứng ở 1.15s.
              const underlayGone = !document.querySelector("#header-logo .brand-lockup__mark-underlay path");
              if (elapsed < 1_150 || (!underlayGone && elapsed < 2_500)) requestAnimationFrame(sample);
              else window.__ttWhiteSurfaceLogoTrace.done = true;
            };
            sample();
          };
          requestAnimationFrame(findMark);
        });
        const response = await page.goto(pageUrl(route), {
          waitUntil: "domcontentloaded",
          timeout: 20_000,
        });
        assert(response && response.status() < 400, `${route} load failed`);
        await page.waitForFunction(
          () => window.__ttWhiteSurfaceLogoTrace?.done,
          null,
          { timeout: 4_000 },
        );
        const trace = await page.evaluate(
          () => window.__ttWhiteSurfaceLogoTrace.samples,
        );
        const black = [
          "rgb(43, 42, 41)",
          "rgb(43, 42, 41)",
          "rgb(43, 42, 41)",
          "rgb(43, 42, 41)",
        ];
        const cmyk = [
          "rgb(43, 42, 41)",
          "rgb(255, 237, 0)",
          "rgb(229, 9, 127)",
          "rgb(0, 160, 227)",
        ];
        // CMYK mọc lên trên lớp đen; bốn dải cùng xong ở 1s rồi lớp đen bị gỡ. Lấy mẫu đã gắn animation: runner bận có
        // frame đã đổi màu đích nhưng animation chưa gắn (totals 0).
        const rising = trace.find(
          ({ fills, underlay, totals }) =>
            JSON.stringify(underlay) === JSON.stringify(black) &&
            JSON.stringify(fills) === JSON.stringify(cmyk) &&
            totals.every((total) => total > 0),
        );
        const settled = trace.at(-1);
        assert(
          rising?.totals.every((total) => total === 1000) &&
            settled.underlay.length === 0 &&
            JSON.stringify(settled.fills) === JSON.stringify(cmyk),
          `Direct white-surface mark did not rise CMYK over black in 1s: ${JSON.stringify({ rising, settled })}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }

  await runPageCase(
    "direct heritage fragment resolves header mark to CMYK",
    { route: "/vi/#tay-nghe", viewport: { width: 1440, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/#tay-nghe");
      await page.evaluate(() => {
        document.documentElement.style.overflow = "auto";
        window.location.hash = "tay-nghe";
      });
      await page.waitForFunction(
        () =>
          Math.abs(
            document.querySelector("#tay-nghe")?.getBoundingClientRect().top ||
              Infinity,
          ) < window.innerHeight,
        null,
        { timeout: 4_000 },
      );
      await page.waitForTimeout(1_100);
      const state = await page.evaluate(() => {
        const header = document.querySelector("[data-site-header]");
        return {
          className: header?.className || "",
          fills: [
            ...header?.querySelectorAll(".brand-lockup__mark path") || [],
          ].map((path) => getComputedStyle(path).fill),
        };
      });
      const cmyk = [
        "rgb(43, 42, 41)",
        "rgb(255, 237, 0)",
        "rgb(229, 9, 127)",
        "rgb(0, 160, 227)",
      ];
      assert(
        state.className.includes("is-brand-color") &&
          !state.className.includes("is-brand-inverse") &&
          JSON.stringify(state.fills) === JSON.stringify(cmyk),
        `Direct #tay-nghe header mark must be CMYK on its white surface: ${JSON.stringify(state)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "hamburger brand enters with CMYK mark from first visible frame",
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await waitForBrandFonts(page);
      const before = await page.evaluate(() => {
        const readTiming = (path) => ({ fill: getComputedStyle(path).fill });
        const menuPaths = [
          ...document.querySelectorAll(
            "#site-menu .menu-brand .brand-lockup__mark path",
          ),
        ];
        const headerPaths = [
          ...document.querySelectorAll(
            "#header-logo .brand-lockup__mark path",
          ),
        ];
        return {
          header: headerPaths.map(readTiming),
          menu: menuPaths.map(readTiming),
        };
      });
      assert(
        JSON.stringify(before.menu.map(({ fill }) => fill)) ===
          JSON.stringify([
            "rgb(43, 42, 41)",
            "rgb(255, 237, 0)",
            "rgb(229, 9, 127)",
            "rgb(0, 160, 227)",
          ]) &&
          before.header.length === 4,
        "Closed hamburger mark or header sequence does not preserve its CMYK/1s color contract: " +
          JSON.stringify(before),
      );
      await page.locator("[data-menu-open]").click();
      await page.waitForFunction(() => {
        const brand = document.querySelector("#site-menu .menu-brand");
        return (
          document.querySelector("#site-menu")?.open &&
          Number.parseFloat(getComputedStyle(brand).opacity) > 0.001
        );
      });
      const firstVisible = await page.evaluate(() => {
        const brand = document.querySelector("#site-menu .menu-brand");
        const matrix = new DOMMatrixReadOnly(getComputedStyle(brand).transform);
        return {
          opacity: Number.parseFloat(getComputedStyle(brand).opacity),
          translateY: matrix.m42,
          menuFills: [
            ...document.querySelectorAll(
              "#site-menu .menu-brand .brand-lockup__mark path",
            ),
          ].map((path) => getComputedStyle(path).fill),
          headerFills: [
            ...document.querySelectorAll(
              "#header-logo .brand-lockup__mark path",
            ),
          ].map((path) => getComputedStyle(path).fill),
        };
      });
      assert(
        firstVisible.opacity > 0.001 &&
          firstVisible.translateY >= -140.5 &&
          firstVisible.translateY <= 0.5 &&
          JSON.stringify(firstVisible.menuFills) ===
            JSON.stringify([
              "rgb(43, 42, 41)",
              "rgb(255, 237, 0)",
              "rgb(229, 9, 127)",
              "rgb(0, 160, 227)",
            ]) &&
          JSON.stringify(firstVisible.headerFills) ===
            JSON.stringify(before.header.map(({ fill }) => fill)),
        "Hamburger first visible frame must be CMYK while preserving its -140px to 0px entrance and header color: " +
          JSON.stringify({ before, firstVisible }),
      );
      await page.waitForTimeout(700);
      const after = await page.evaluate(() => ({
        fills: [
          ...document.querySelectorAll(
            "#site-menu .menu-brand .brand-lockup__mark path",
          ),
        ].map((path) => getComputedStyle(path).fill),
      }));
      assert(
        JSON.stringify(after.fills) ===
          JSON.stringify([
            "rgb(43, 42, 41)",
            "rgb(255, 237, 0)",
            "rgb(229, 9, 127)",
            "rgb(0, 160, 227)",
          ]),
        "Hamburger mark changed after first visible CMYK frame: " +
          JSON.stringify(after),
      );

      await closeMenu(page);
      await page.locator("[data-menu-open]").click();
      await page.waitForFunction(() => {
        const brand = document.querySelector("#site-menu .menu-brand");
        return (
          document.querySelector("#site-menu")?.open &&
          Number.parseFloat(getComputedStyle(brand).opacity) > 0.001
        );
      });
      const reopened = await page.evaluate(() => [
        ...document.querySelectorAll(
          "#site-menu .menu-brand .brand-lockup__mark path",
        ),
      ].map((path) => getComputedStyle(path).fill));
      assert(
        JSON.stringify(reopened) ===
          JSON.stringify([
            "rgb(43, 42, 41)",
            "rgb(255, 237, 0)",
            "rgb(229, 9, 127)",
            "rgb(0, 160, 227)",
          ]),
        "Reopened hamburger mark flashed monochrome before its first visible frame: " +
          JSON.stringify(reopened),
      );
      await closeMenu(page);
      const readHeaderFills = () =>
        page.locator("#header-logo").evaluate((logo) => [
          ...logo.querySelectorAll(".brand-lockup__mark path"),
        ].map((path) => getComputedStyle(path).fill));
      const expandedFills = await readHeaderFills();
      await page.mouse.move(720, 820);
      await wheelUntilCollapsed(page);
      await page.waitForFunction(() =>
        document
          .querySelector("[data-site-header]")
          ?.classList.contains("is-collapsed"),
      );
      await page.waitForTimeout(1_100);
      const stickyFills = await readHeaderFills();
      await page.keyboard.press("Home");
      await page.waitForFunction(() =>
        !document
          .querySelector("[data-site-header]")
          ?.classList.contains("is-collapsed"),
      );
      await page.waitForTimeout(1_100);
      const returnedFills = await readHeaderFills();
      assert(
        expandedFills.every((fill) => fill === "rgb(255, 255, 255)") &&
          JSON.stringify(stickyFills) ===
            JSON.stringify([
              "rgb(43, 42, 41)",
              "rgb(255, 237, 0)",
              "rgb(229, 9, 127)",
              "rgb(0, 160, 227)",
            ]) &&
          returnedFills.every((fill) => fill === "rgb(255, 255, 255)"),
        "Header mark did not complete both monochrome-to-CMYK directions: " +
          JSON.stringify({ expandedFills, stickyFills, returnedFills }),
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "reduced-motion hamburger mark starts CMYK",
    {
      route: "/vi/",
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await openMenu(page);
      const reduced = await page.evaluate(() => {
        const brand = document.querySelector("#site-menu .menu-brand");
        const matrix = new DOMMatrixReadOnly(getComputedStyle(brand).transform);
        return {
          opacity: Number.parseFloat(getComputedStyle(brand).opacity),
          translateY: matrix.m42,
          fills: [
            ...document.querySelectorAll(
              "#site-menu .menu-brand .brand-lockup__mark path",
            ),
          ].map((path) => getComputedStyle(path).fill),
        };
      });
      assert(
        reduced.opacity >= 0.999 &&
          Math.abs(reduced.translateY) <= 0.5 &&
          JSON.stringify(reduced.fills) ===
            JSON.stringify([
              "rgb(43, 42, 41)",
              "rgb(255, 237, 0)",
              "rgb(229, 9, 127)",
              "rgb(0, 160, 227)",
            ]),
        "Reduced-motion hamburger mark must be visible at its CMYK endpoint: " +
          JSON.stringify(reduced),
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "white-to-white soft route preserves CMYK mark",
    { route: "/vi/", viewport: { width: 390, height: 844 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      const cmyk = [
        "rgb(43, 42, 41)",
        "rgb(255, 237, 0)",
        "rgb(229, 9, 127)",
        "rgb(0, 160, 227)",
      ];
      const black = cmyk.map(() => "rgb(43, 42, 41)");
      await gotoRoute(page, "/vi/");
      await page.locator("#tay-nghe").scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-site-header]")
            ?.classList.contains("is-brand-color"),
        null,
        { timeout: 4_000 },
      );
      await page.waitForTimeout(1_100);
      const before = await page.evaluate(() =>
        [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map(
          (path) => getComputedStyle(path).fill,
        ),
      );
      assert(
        JSON.stringify(before) === JSON.stringify(cmyk),
        `White section did not settle to CMYK before soft route: ${JSON.stringify(before)}`,
      );
      await page.evaluate(() => {
        const trace = { running: true, samples: [] };
        window.__ttWhiteToWhiteTrace = trace;
        const sample = () => {
          if (!trace.running) return;
          trace.samples.push(
            [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map(
              (path) => getComputedStyle(path).fill,
            ),
            // Lớp cũ bên dưới cũng là màu đang hiển thị khi mark mọc.
            [
              ...document.querySelectorAll(
                "#header-logo .brand-lockup__mark-underlay path",
              ),
            ]
              .slice(0, 4)
              .map((path) => path.getAttribute("fill")),
          );
          requestAnimationFrame(sample);
        };
        sample();
      });
      const link = await findRouteLink(
        page,
        "[data-site-header]",
        "/vi/advertising-products/",
      );
      await Promise.all([
        waitForPath(page, "/vi/advertising-products/"),
        link.evaluate((node) => node.click()),
      ]);
      await page.waitForTimeout(1_100);
      const after = await page.evaluate(() => {
        const trace = window.__ttWhiteToWhiteTrace;
        if (trace) trace.running = false;
        return {
          fills: [
            ...document.querySelectorAll(
              "#header-logo .brand-lockup__mark path",
            ),
          ].map((path) => getComputedStyle(path).fill),
          samples: trace?.samples || [],
        };
      });
      assert(
        JSON.stringify(after.fills) === JSON.stringify(cmyk) &&
          !after.samples.some(
            (fills) => JSON.stringify(fills) === JSON.stringify(black),
          ),
        `White-to-white soft route reset the mark: ${JSON.stringify(after)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "interrupted mark rise keeps the visible layers and rises again from the foot",
    { route: "/vi/", viewport: { width: 390, height: 844 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      const cmyk = [
        "rgb(43, 42, 41)",
        "rgb(255, 237, 0)",
        "rgb(229, 9, 127)",
        "rgb(0, 160, 227)",
      ];
      const white = cmyk.map(() => "rgb(255, 255, 255)");
      const readMark = () =>
        page.evaluate(() => ({
          fills: [
            ...document.querySelectorAll("#header-logo .brand-lockup__mark path"),
          ].map((path) => getComputedStyle(path).fill),
          times: [
            ...document.querySelectorAll("#header-logo .brand-lockup__mark path"),
          ].map((path) => Number(path.getAnimations()[0]?.currentTime ?? -1)),
          underlay: [
            ...document.querySelectorAll(
              "#header-logo .brand-lockup__mark-underlay path",
            ),
          ].map((path) => ({
            fill: path.getAttribute("fill"),
            clip: path.style.clipPath,
          })),
        }));
      await gotoRoute(page, "/vi/");
      await page.locator("#tay-nghe").scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-site-header]")
            ?.classList.contains("is-brand-color") &&
          !document.querySelector(".brand-lockup__mark-underlay"),
        null,
        { timeout: 4_000 },
      );
      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
      await page.waitForFunction(() =>
        document
          .querySelector("[data-site-header]")
          ?.classList.contains("is-brand-inverse"),
      );
      await page.waitForTimeout(120);
      await page.evaluate(() =>
        document
          .querySelector("#tay-nghe")
          ?.scrollIntoView({ block: "start", behavior: "instant" }),
      );
      await page.waitForFunction(
        () =>
          document.querySelectorAll(
            "#header-logo .brand-lockup__mark-underlay path",
          ).length === 8,
      );
      const reversed = await readMark();
      // Lớp cũ gồm CMYK đầy đủ bên dưới và lớp trắng đang mọc dở giữ nguyên clip lúc đổi hướng.
      const partial = (clip) => {
        const top = Number.parseFloat(clip.match(/inset\(([\d.]+)%/)?.[1]);
        return top > 0 && top < 100;
      };
      // Underlay xếp theo từng path: lớp màu rồi lớp trắng của path đó.
      const colorLayers = reversed.underlay.filter((_, index) => index % 2 === 0);
      const whiteLayers = reversed.underlay.filter((_, index) => index % 2 === 1);
      assert(
        JSON.stringify(colorLayers.map(({ fill }) => fill)) === JSON.stringify(cmyk) &&
          colorLayers.every(({ clip }) => clip === "none") &&
          JSON.stringify(whiteLayers.map(({ fill }) => fill)) === JSON.stringify(white) &&
          whiteLayers.some(({ clip }) => partial(clip)) &&
          JSON.stringify(reversed.fills) === JSON.stringify(cmyk) &&
          reversed.times.every((time) => time >= 0 && time < 400),
        `Interrupted rise did not keep the visible layers or restart from the foot: ${JSON.stringify(reversed)}`,
      );
      await page.waitForFunction(
        () => !document.querySelector(".brand-lockup__mark-underlay"),
        null,
        { timeout: 2_000 },
      );
      const settled = await readMark();
      assert(
        JSON.stringify(settled.fills) === JSON.stringify(cmyk) &&
          settled.times.every((time) => time === -1),
        `Interrupted rise did not settle to CMYK: ${JSON.stringify(settled)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "hamburger close preserves visible CMYK until hidden",
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      const cmyk = [
        "rgb(43, 42, 41)",
        "rgb(255, 237, 0)",
        "rgb(229, 9, 127)",
        "rgb(0, 160, 227)",
      ];
      await gotoRoute(page, "/vi/");
      await openMenu(page);
      const before = await page.evaluate(() => [
        ...document.querySelectorAll(
          "#site-menu .menu-brand .brand-lockup__mark path",
        ),
      ].map((path) => getComputedStyle(path).fill));
      assert(
        JSON.stringify(before) === JSON.stringify(cmyk),
        `Hamburger did not settle to CMYK before close: ${JSON.stringify(before)}`,
      );
      await page.locator("[data-menu-close]").click();
      await page.waitForTimeout(120);
      const during = await page.evaluate(() => ({
        open: document.querySelector("#site-menu")?.open,
        fills: [
          ...document.querySelectorAll(
            "#site-menu .menu-brand .brand-lockup__mark path",
          ),
        ].map((path) => getComputedStyle(path).fill),
      }));
      assert(
        during.open && JSON.stringify(during.fills) === JSON.stringify(cmyk),
        `Hamburger close changed visible mark color: ${JSON.stringify(during)}`,
      );
      await waitForMenuState(page, false);
      const after = await page.evaluate(() => [
        ...document.querySelectorAll(
          "#site-menu .menu-brand .brand-lockup__mark path",
        ),
      ].map((path) => getComputedStyle(path).fill));
      assert(
        JSON.stringify(after) === JSON.stringify(cmyk),
        `Hamburger mark changed after dialog hidden: ${JSON.stringify(after)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "direct dark load paints white mark without color motion",
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await page.addInitScript(() => {
        window.__ttDirectDarkFillTransitions = 0;
        document.addEventListener("transitionrun", (event) => {
          if (
            event.propertyName === "fill" &&
            event.target?.matches?.("#header-logo .brand-lockup__mark path")
          ) {
            window.__ttDirectDarkFillTransitions += 1;
          }
        });
      });
      const response = await page.goto(pageUrl("/vi/"), {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });
      assert(response && response.status() < 400, "Direct dark route load failed");
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(resolve)),
      );
      const state = await page.evaluate(() => ({
        classes: document.querySelector("[data-site-header]")?.className || "",
        transitions: window.__ttDirectDarkFillTransitions,
        rising: document.querySelectorAll(".brand-lockup__mark-underlay").length,
        fills: [
          ...document.querySelectorAll("#header-logo .brand-lockup__mark path"),
        ].map((path) => getComputedStyle(path).fill),
      }));
      assert(
        state.fills.length === 4 &&
          state.fills.every((fill) => fill === "rgb(255, 255, 255)") &&
          !state.classes.includes("is-brand-color") &&
          state.transitions === 0 &&
          state.rising === 0,
        `Direct dark load did not paint white immediately: ${JSON.stringify(state)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "history white surfaces preserve CMYK without black replay",
    { route: "/vi/", viewport: { width: 390, height: 844 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      const cmyk = [
        "rgb(43, 42, 41)",
        "rgb(255, 237, 0)",
        "rgb(229, 9, 127)",
        "rgb(0, 160, 227)",
      ];
      await page.addInitScript(() => {
        const key = "tt-brand-history-saw-black";
        const sample = () => {
          const fills = [
            ...document.querySelectorAll(
              "#header-logo .brand-lockup__mark path",
            ),
          ].map((path) => getComputedStyle(path).fill);
          const underlay = [
            ...document.querySelectorAll(
              "#header-logo .brand-lockup__mark-underlay path",
            ),
          ]
            .slice(0, 4)
            .map((path) => path.getAttribute("fill"));
          if (
            [fills, underlay].some(
              (layer) =>
                layer.length === 4 &&
                layer.every((fill) => fill === "rgb(43, 42, 41)"),
            )
          ) {
            sessionStorage.setItem(key, "1");
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      const readState = () =>
        page.evaluate(() => ({
          path: window.location.pathname,
          fills: [
            ...document.querySelectorAll("#header-logo .brand-lockup__mark path"),
          ].map((path) => getComputedStyle(path).fill),
          sawBlack: sessionStorage.getItem("tt-brand-history-saw-black") === "1",
        }));
      await gotoRoute(page, "/vi/");
      await page.locator("#tay-nghe").scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (expected) => {
          const fills = [
            ...document.querySelectorAll(
              "#header-logo .brand-lockup__mark path",
            ),
          ].map((path) => getComputedStyle(path).fill);
          // Chờ lớp CMYK mọc xong để vị trí cuộn đã ổn định trước khi rời trang.
          return (
            JSON.stringify(fills) === JSON.stringify(expected) &&
            !document.querySelector(".brand-lockup__mark-underlay")
          );
        },
        cmyk,
        { timeout: 4_000 },
      );
      const advertising = "/vi/advertising-products/";
      await page.evaluate(() =>
        sessionStorage.removeItem("tt-brand-history-saw-black"),
      );
      const link = await findRouteLink(page, "[data-site-header]", advertising);
      await Promise.all([
        waitForPath(page, advertising),
        link.evaluate((node) => node.click()),
      ]);
      await page.waitForTimeout(1_100);
      const onAdvertising = await readState();
      assert(
        JSON.stringify(onAdvertising.fills) === JSON.stringify(cmyk),
        `Advertising history entry did not settle to CMYK: ${JSON.stringify(onAdvertising)}`,
      );
      await page.evaluate(() =>
        sessionStorage.removeItem("tt-brand-history-saw-black"),
      );
      await traverseHistory(page, "back", "/vi/");
      await page.waitForTimeout(1_100);
      const back = await readState();
      assert(
        JSON.stringify(back.fills) === JSON.stringify(cmyk) && !back.sawBlack,
        `Back navigation replayed black on a white surface: ${JSON.stringify(back)}`,
      );
      await page.evaluate(() =>
        sessionStorage.removeItem("tt-brand-history-saw-black"),
      );
      await traverseHistory(page, "forward", advertising);
      await page.waitForTimeout(1_100);
      const forward = await readState();
      assert(
        JSON.stringify(forward.fills) === JSON.stringify(cmyk) &&
          !forward.sawBlack,
        `Forward navigation replayed black on a white surface: ${JSON.stringify(forward)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runBrandHeaderBboxMatrixChecks() {
  for (const locale of ["vi", "en"]) {
    await runPageCase(
      `brand header narrow controls ${locale} 320px`,
      { route: `/${locale}/`, viewport: { width: 320, height: 844 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, `/${locale}/`);
        await waitForBrandFonts(page);
        await page.waitForFunction(
          () => {
            const transform = getComputedStyle(document.querySelector("#header-logo")).transform;
            if (transform === "none") return true;
            const matrix = new DOMMatrixReadOnly(transform);
            return Math.abs(matrix.a - 1) <= 0.0005 && Math.abs(matrix.d - 1) <= 0.0005 &&
              Math.abs(matrix.e) <= 0.05 && Math.abs(matrix.f) <= 0.05;
          },
          null,
          { timeout: 6_000 },
        );
        const geometry = await page.evaluate(() => {
          const logo = document.querySelector("#header-logo").getBoundingClientRect();
          const button = document.querySelector("#header-menu-toggle").getBoundingClientRect();
          const icon = document.querySelector("#header-toggle-svg").getBoundingClientRect();
          return {
            logoHeight: logo.height,
            iconClearance: icon.left - logo.right,
            hitboxClearance: button.left - logo.right,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        assert(
          Math.abs(geometry.logoHeight - 57.59375) <= 0.05 &&
            geometry.iconClearance >= 24 && geometry.hitboxClearance >= 0 &&
            geometry.overflow <= 1,
          `The 320px logo must preserve its height and clear the menu: ${JSON.stringify(geometry)}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }
  for (const matrixCase of BRAND_HEADER_BBOX_MATRIX) {
    const viewport = { width: matrixCase.width, height: 900 };
    await runPageCase(
      "brand header bbox " + matrixCase.label,
      { route: "/vi/", viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, "/vi/");
        await waitForBrandFonts(page);
        await page.waitForFunction(
          () => {
            const logo = document.querySelector("#header-logo");
            if (!logo) return false;
            const transform = getComputedStyle(logo).transform;
            if (transform === "none") return true;
            const matrix = new DOMMatrixReadOnly(transform);
            return (
              Math.abs(matrix.a - 1) <= 0.0005 &&
              Math.abs(matrix.d - 1) <= 0.0005 &&
              Math.abs(matrix.b) <= 0.0005 &&
              Math.abs(matrix.c) <= 0.0005
            );
          },
          null,
          { timeout: 6_000 },
        );
        if (matrixCase.sticky) {
          await page.mouse.move(viewport.width / 2, viewport.height - 80);
          await wheelUntilCollapsed(page);
          await page.waitForFunction(
            () =>
              document
                .querySelector("[data-site-header]")
                ?.classList.contains("is-collapsed"),
            null,
            { timeout: 6_000 },
          );
          await page.waitForFunction(
            () => {
              const transform = getComputedStyle(
                document.querySelector("#header-logo"),
              ).transform;
              if (transform === "none") return true;
              const matrix = new DOMMatrixReadOnly(transform);
              return (
                Math.abs(matrix.a - 1) <= 0.0005 &&
                Math.abs(matrix.d - 1) <= 0.0005 &&
                Math.abs(matrix.e) <= 0.05 &&
                Math.abs(matrix.f) <= 0.05
              );
            },
            null,
            { timeout: 6_000 },
          );
        }
        const state = await page.evaluate(() => {
          const header = document.querySelector("[data-site-header]");
          const lockup = header?.querySelector(".brand-lockup");
          const rect = lockup?.getBoundingClientRect();
          const trueElements = [
            lockup?.querySelector(".brand-lockup__mark"),
            lockup?.querySelector(".brand-lockup__title"),
            lockup?.querySelector(".brand-lockup__subtitle"),
          ].filter((element) => element instanceof SVGGraphicsElement);
          const trueRects = trueElements.map((element) =>
            element.getBoundingClientRect(),
          );
          const trueTop = Math.min(...trueRects.map((value) => value.top));
          const trueRight = Math.max(...trueRects.map((value) => value.right));
          const trueBottom = Math.max(...trueRects.map((value) => value.bottom));
          const trueLeft = Math.min(...trueRects.map((value) => value.left));
          return {
            classes: header?.className || "",
            lockup: rect
              ? {
                  left: rect.left,
                  right: rect.right,
                  top: rect.top,
                  bottom: rect.bottom,
                  width: rect.width,
                  height: rect.height,
                }
              : null,
            trueBox: {
              left: trueLeft,
              right: trueRight,
              top: trueTop,
              bottom: trueBottom,
              width: trueRight - trueLeft,
              height: trueBottom - trueTop,
            },
          };
        });
        const expected = expectedBrandHeaderHeight(
          matrixCase.width,
          matrixCase.sticky,
        );
        const expectedCollapsed = Boolean(matrixCase.sticky);
        assert(
          (expectedCollapsed ===
            state.classes.includes("is-collapsed")) &&
            state.lockup &&
            Math.abs(state.lockup.height - expected) <= 0.05 &&
            Math.abs(state.trueBox.height - expected) <= 0.05,
          `${matrixCase.label} must expose ${expected}px header logo bbox: ` +
            JSON.stringify({ expected, state }),
        );
        assertDiagnostics(diagnostics);
      },
    );
  }

  for (const scaleWidth of [1440, 390]) {
  await runPageCase(
    `brand header whole-lockup scale motion ${scaleWidth}px`,
    { route: "/vi/", viewport: { width: scaleWidth, height: 900 } },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await waitForBrandFonts(page);
      await page.waitForFunction(
        () => {
          const logo = document.querySelector("#header-logo");
          if (!(logo instanceof Element)) return false;
          const transform = getComputedStyle(logo).transform;
          if (transform === "none") return true;
          const matrix = new DOMMatrixReadOnly(transform);
          return (
            Math.abs(matrix.a - 1) <= 0.0005 &&
            Math.abs(matrix.d - 1) <= 0.0005 &&
            Math.abs(matrix.e) <= 0.05 &&
            Math.abs(matrix.f) <= 0.05
          );
        },
        null,
        { timeout: 6_000 },
      );

      const armProbe = () =>
        page.evaluate(() => {
          const logo = document.querySelector("#header-logo");
          if (!(logo instanceof HTMLElement)) {
            throw new Error("Header logo is unavailable");
          }
          const probe = {
            done: false,
            samples: Array(),
          };
          Reflect.set(window, "__brandScaleProbe", probe);
          const startedAt = performance.now();
          const sample = () => {
            const rect = logo.getBoundingClientRect();
            const transform = getComputedStyle(logo).transform;
            const matrix =
              transform === "none"
                ? new DOMMatrixReadOnly()
                : new DOMMatrixReadOnly(transform);
            const elapsed = performance.now() - startedAt;
            probe.samples.push({
              elapsed,
              height: rect.height,
              scaleX: matrix.a,
              scaleY: matrix.d,
            });
            // Locomotive cần vài nấc lăn mới qua 100px để thu gọn, runner bận trễ thêm: cửa sổ đủ cả nấc lăn và tween.
            if (elapsed < 2_000) requestAnimationFrame(sample);
            else probe.done = true;
          };
          requestAnimationFrame(sample);
        });

      const readProbe = () =>
        page.evaluate(() => {
          const logo = document.querySelector("#header-logo");
          if (!(logo instanceof Element)) {
            throw new Error("Header logo is unavailable");
          }
          return {
            ...Reflect.get(window, "__brandScaleProbe"),
            finalTransform: getComputedStyle(logo).transform,
          };
        });

      await page.mouse.move(scaleWidth / 2, 820);
      await armProbe();
      await wheelUntilCollapsed(page);
      await page.waitForFunction(() =>
        document
          .querySelector("[data-site-header]")
          ?.classList.contains("is-collapsed"),
      );
      await page.waitForFunction(
        () => Reflect.get(window, "__brandScaleProbe")?.done === true,
      );
      const collapse = await readProbe();

      await armProbe();
      await wheelUntilCollapsed(page, false);
      await page.waitForFunction(
        () =>
          !document
            .querySelector("[data-site-header]")
            ?.classList.contains("is-collapsed"),
      );
      await page.waitForFunction(
        () => Reflect.get(window, "__brandScaleProbe")?.done === true,
      );
      const expand = await readProbe();

      const hasIntermediateHeight = (samples, min, max) =>
        samples.some(
          ({ height }) => height > min + 0.5 && height < max - 0.5,
        );
      const finalHeight = (samples) => samples.at(-1)?.height;
      assert(
        hasIntermediateHeight(collapse.samples, 49.641, expectedBrandHeaderHeight(scaleWidth)) &&
          hasIntermediateHeight(expand.samples, 49.641, expectedBrandHeaderHeight(scaleWidth)) &&
          collapse.samples.some(({ scaleX }) => Math.abs(scaleX - 1) > 0.01) &&
          expand.samples.some(({ scaleX }) => Math.abs(scaleX - 1) > 0.01) &&
          Math.abs(finalHeight(collapse.samples) - 49.641) <= 0.1 &&
          Math.abs(finalHeight(expand.samples) - expectedBrandHeaderHeight(scaleWidth)) <= 0.1 &&
          collapse.finalTransform === "none" &&
          expand.finalTransform === "none",
        "Header lockup must scale continuously between expanded and sticky endpoints: " +
          JSON.stringify({ collapse, expand }),
      );
      assertDiagnostics(diagnostics);
    },
  );
  }

  for (const testCase of [
    {
      name: "brand header scale settles mobile changed-size state",
      viewport: { width: 767, height: 900 },
      reducedMotion: "no-preference",
    },
    {
      name: "brand header scale respects reduced motion",
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    },
  ]) {
    await runPageCase(
      testCase.name,
      {
        route: "/vi/",
        viewport: testCase.viewport,
        reducedMotion: testCase.reducedMotion,
      },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, "/vi/");
        await waitForBrandFonts(page);
        await page.waitForFunction(
          () => {
            const logo = document.querySelector("#header-logo");
            if (!(logo instanceof Element)) return false;
            const transform = getComputedStyle(logo).transform;
            if (transform === "none") return true;
            const matrix = new DOMMatrixReadOnly(transform);
            return (
              Math.abs(matrix.a - 1) <= 0.0005 &&
              Math.abs(matrix.d - 1) <= 0.0005 &&
              Math.abs(matrix.e) <= 0.05 &&
              Math.abs(matrix.f) <= 0.05
            );
          },
          null,
          { timeout: 6_000 },
        );
        await page.mouse.move(
          testCase.viewport.width / 2,
          testCase.viewport.height - 80,
        );
        await wheelUntilCollapsed(page);
        await page.waitForFunction(() =>
          document
            .querySelector("[data-site-header]")
            ?.classList.contains("is-collapsed"),
        );
        await page.waitForFunction(
          () => {
            const logo = document.querySelector("#header-logo");
            const lockup = logo?.querySelector(".brand-lockup");
            const transform = logo ? getComputedStyle(logo).transform : "";
            const matrix =
              transform === "none"
                ? new DOMMatrixReadOnly()
                : new DOMMatrixReadOnly(transform);
            return (
              logo &&
              lockup &&
              Math.abs(matrix.a - 1) <= 0.0005 &&
              Math.abs(matrix.d - 1) <= 0.0005 &&
              Math.abs(matrix.e) <= 0.05 &&
              Math.abs(matrix.f) <= 0.05 &&
              Math.abs(lockup.getBoundingClientRect().height - 49.641) <= 0.1
            );
          },
          null,
          { timeout: 6_000 },
        );
        const state = await page.evaluate(() => {
          const transform = getComputedStyle(
            document.querySelector("#header-logo"),
          ).transform;
          const matrix =
            transform === "none"
              ? new DOMMatrixReadOnly()
              : new DOMMatrixReadOnly(transform);
          return {
            transform,
            scaleX: matrix.a,
            scaleY: matrix.d,
            height: document
              .querySelector("#header-logo .brand-lockup")
              .getBoundingClientRect().height,
          };
        });
        assert(
          Math.abs(state.scaleX - 1) <= 0.0005 &&
            Math.abs(state.scaleY - 1) <= 0.0005 &&
            Math.abs(state.height - 49.641) <= 0.1,
          testCase.name + " must settle without spatial transform: " +
            JSON.stringify(state),
        );
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function readFooterRuntimeState(page) {
  return page.evaluate((FOOTER_SOCIALS) => {
    const footer = document.querySelector("footer");
    const statement = footer?.querySelector(".footer-statement");
    const statementStyle = statement ? getComputedStyle(statement) : null;
    const statementFontSize = Number.parseFloat(statementStyle?.fontSize || "0");
    const statementLineHeight = Number.parseFloat(statementStyle?.lineHeight || "0");
    const candidates = [footer, ...footer.querySelectorAll("*")];
    const fullWidthLines = [];
    candidates.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (
        Number.parseFloat(style.borderTopWidth) >= 1 &&
        rect.width >= innerWidth - 2
      ) {
        fullWidthLines.push({
          type: "border-top",
          left: rect.left,
          right: rect.right,
          width: rect.width,
        });
      }
      if (
        Number.parseFloat(style.borderBottomWidth) >= 1 &&
        rect.width >= innerWidth - 2
      ) {
        fullWidthLines.push({
          type: "border-bottom",
          left: rect.left,
          right: rect.right,
          width: rect.width,
        });
      }
      ["::before", "::after"].forEach((pseudo) => {
        const pseudoStyle = getComputedStyle(element, pseudo);
        const pseudoWidth = Number.parseFloat(pseudoStyle.width);
        if (
          pseudoStyle.content !== "none" &&
          Number.parseFloat(pseudoStyle.height) <= 2 &&
          Number.isFinite(pseudoWidth) &&
          pseudoWidth >= innerWidth - 2
        ) {
          fullWidthLines.push({
            type: pseudo,
            left: rect.left,
            right: rect.left + pseudoWidth,
            width: pseudoWidth,
          });
        }
      });
    });
    return {
      spacing: footer
        ? {
            marginTop: Number.parseFloat(getComputedStyle(footer).marginTop),
            paddingBottom: Number.parseFloat(
              getComputedStyle(footer).paddingBottom,
            ),
          }
        : null,
      statement: statement
        ? {
            fontSize: statementFontSize,
            lineHeight: statementLineHeight,
            extraLeading: statementLineHeight - statementFontSize * 0.98,
          }
        : null,
      address: footer?.textContent?.includes(
        "E16 Khu đô thị Hưng Phú, Phường Phú Tân, tỉnh Vĩnh Long",
      ),
      social: FOOTER_SOCIALS.map((name) => {
        const item = footer?.querySelector('[data-footer-social="' + name + '"]');
        const svg = item?.querySelector("svg");
        const svgRect = svg?.getBoundingClientRect();
        return {
          name,
          tag: item?.tagName || null,
          ariaDisabled: item?.getAttribute("aria-disabled"),
          href: item?.getAttribute("href"),
          tabIndex: item?.tabIndex,
          label: item?.getAttribute("aria-label"),
          svg: svg?.outerHTML || null,
          viewBox: svg?.getAttribute("viewBox") || null,
          width: svgRect?.width || 0,
          height: svgRect?.height || 0,
          hasStroke: Boolean(svg?.querySelector("[stroke]")),
        };
      }),
      fullWidthLines,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  }, FOOTER_SOCIALS);
}

async function runFooterRuntimeChecks() {
  for (const route of ROUTES) {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await runPageCase(
        "canonical footer " + routeSlug(route) + " " + viewport.width,
        { route, viewport },
        async (page) => {
          const diagnostics = monitorPage(page);
          await gotoRoute(page, route);
          await page.evaluate(() => {
            document.documentElement.style.scrollBehavior = "auto";
            window.scrollTo(0, document.documentElement.scrollHeight);
          });
          await page.waitForTimeout(350);
          const state = await readFooterRuntimeState(page);
          // Giá trị khớp footer-consistency.e2e.mjs; Advertising browse bỏ gap vì skeleton batch lấp chỗ đó.
          const expectedTopGap = route.endsWith("/advertising-products/") ? 0 : viewport.width <= 750 ? 48 : 64;
          assert(
            state.spacing?.marginTop === expectedTopGap &&
              // Đệm dọc desktop 3.5vw (1440px: 50.4px), điện thoại dọc 32px; không chừa làn floating CTA.
              Math.abs(state.spacing.paddingBottom - (viewport.width <= 750 ? 32 : 50.4)) <= 0.1 &&
              state.address &&
              state.social.every(
                (item) =>
                  item.tag &&
                  item.ariaDisabled === "true" &&
                   item.href === null &&
                   item.label &&
                   item.svg &&
                   item.viewBox === "0 0 24 24" &&
                   Math.abs(item.width - (viewport.width <= 750 ? 28 : 36)) <= 0.1 &&
                   Math.abs(item.height - (viewport.width <= 750 ? 28 : 36)) <= 0.1 &&
                   !item.hasStroke &&
                   item.tabIndex < 0,
              ) &&
              state.fullWidthLines.some(
                (line) =>
                  line.left <= 1 && line.right >= viewport.width - 1,
              ) &&
              state.overflow <= 1,
            "Footer runtime contract failed on " +
              route +
              " at " +
              viewport.width +
              ": " +
              JSON.stringify(state),
          );
          assertDiagnostics(diagnostics);
        },
      );
    }
  }
}

async function readHeritageResponsiveState(page) {
  return page.evaluate(() => {
    const section = document.querySelector("#tay-nghe");
    const toRect = (element) => {
      const value = element?.getBoundingClientRect();
      if (!value) return null;
      return {
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        left: value.left,
        width: value.width,
        height: value.height,
      };
    };
    const union = (rects) => {
      const values = rects.filter(Boolean);
      if (!values.length) return null;
      const top = Math.min(...values.map((value) => value.top));
      const right = Math.max(...values.map((value) => value.right));
      const bottom = Math.max(...values.map((value) => value.bottom));
      const left = Math.min(...values.map((value) => value.left));
      return { top, right, bottom, left, width: right - left, height: bottom - top };
    };
    const parseInsetClip = (clipPath, maskRect) => {
      const match = clipPath.match(/^inset\(([^)]+)\)$/);
      if (!match || !maskRect) return null;
      const values = match[1]
        .trim()
        .split(/\s+/)
        .map((value) => Number.parseFloat(value))
        .filter((value) => Number.isFinite(value));
      if (!values.length || values.length > 4) return null;
      const top = values[0];
      const right = values[1] ?? top;
      const bottom = values[2] ?? top;
      const left = values[3] ?? right;
      return {
        top: maskRect.top + top,
        right: maskRect.right - right,
        bottom: maskRect.bottom - bottom,
        left: maskRect.left + left,
      };
    };
    const rangeRect = (element) => {
      if (!element) return null;
      const range = document.createRange();
      range.selectNodeContents(element);
      return toRect(range);
    };
    const rows = [...(section?.querySelectorAll(".heritage-row") || [])];
    const masks = [...(section?.querySelectorAll(".heritage-text") || [])];
    return {
      innerWidth,
      scrollY: window.scrollY,
      section: toRect(section),
      edgeRows: rows
        .filter((row) =>
          row.matches(".heritage-row--start, .heritage-row--end"),
        )
        .map((row) => {
          const lineRects = [...row.querySelectorAll(".heritage-line")].map(
            rangeRect,
          );
          const imageRects = [...row.querySelectorAll(".heritage-image")].map(
            toRect,
          );
          return {
            className: row.className,
            text: row.textContent.trim(),
            rowRect: toRect(row),
            trueRect: union([...lineRects, ...imageRects]),
          };
        }),
      masks: masks.map((mask) => {
        const line = mask.querySelector(".heritage-line");
        const maskRect = toRect(mask);
        const style = getComputedStyle(mask);
        const lineStyle = line ? getComputedStyle(line) : null;
        const fontSize = Number.parseFloat(lineStyle?.fontSize || "0");
        const lineTransform = lineStyle
          ? new DOMMatrixReadOnly(lineStyle.transform).f
          : NaN;
        return {
          text: mask.textContent.trim(),
          maskRect,
          lineRect: toRect(line),
          glyphRect: rangeRect(line),
          clipRect: parseInsetClip(style.clipPath, maskRect),
          clipPath: style.clipPath,
          overflow: style.overflow,
          fontSize,
          lineTransform,
          inkOverflow: Number.parseFloat(
            style.getPropertyValue("--mask-ink-overflow"),
          ),
          inkOverflowTop: Number.parseFloat(
            style.getPropertyValue("--mask-ink-overflow-top"),
          ),
          inkOverflowBottom: Number.parseFloat(
            style.getPropertyValue("--mask-ink-overflow-bottom"),
          ),
        };
      }),
    };
  });
}

function assertHeritageResponsiveState(state, label) {
  assert(
    state.section &&
      state.section.bottom > 0 &&
      state.section.top < 900 &&
      state.edgeRows.length === 2,
    label + " could not bring #tay-nghe into view: " + JSON.stringify(state),
  );

  const unsafeRows = state.edgeRows.filter(
    ({ trueRect, rowRect }) =>
      !trueRect ||
      !rowRect ||
      trueRect.left < 6 ||
      trueRect.right > state.innerWidth - 6 ||
      rowRect.left < 6 ||
      rowRect.right > state.innerWidth - 6,
  );
  assert(
    unsafeRows.length === 0,
    label +
      " heritage edge row true bbox must keep a 6px safe inset: " +
      JSON.stringify({ innerWidth: state.innerWidth, rows: state.edgeRows }),
  );

  const clippedMasks = state.masks.filter(
    ({ clipRect, glyphRect, lineRect, overflow, clipPath, fontSize, inkOverflow, inkOverflowTop, inkOverflowBottom }) =>
      overflow !== "visible" ||
      !/^inset\(/.test(clipPath) ||
      !clipRect ||
      !glyphRect ||
      !lineRect ||
      !Number.isFinite(fontSize) ||
      fontSize <= 0 ||
      inkOverflow < fontSize * 0.2 ||
      inkOverflowTop < fontSize * 0.2 ||
      inkOverflowBottom < fontSize * 0.2 ||
      glyphRect.top < clipRect.top - 1 ||
      glyphRect.right > clipRect.right + 1 ||
      glyphRect.bottom > clipRect.bottom + 1 ||
      glyphRect.left < clipRect.left - 1 ||
      lineRect.top < clipRect.top - 1 ||
      lineRect.right > clipRect.right + 1 ||
      lineRect.bottom > clipRect.bottom + 1 ||
      lineRect.left < clipRect.left - 1,
  );
  assert(
    state.masks.length === 8 && clippedMasks.length === 0,
    label +
      " heritage text clip-path cuts a glyph or lacks ink clearance: " +
      JSON.stringify({ masks: state.masks, clippedMasks }),
  );
}

async function runHeritageResponsiveClippingChecks() {
  for (const width of [959, 1199, 1440]) {
    await runPageCase(
      "homepage heritage clipping " + width,
      { route: "/vi/", viewport: { width, height: 900 } },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, "/vi/");
        await page.locator("#tay-nghe").scrollIntoViewIfNeeded();
        await page.waitForTimeout(2_500);
        const state = await readHeritageResponsiveState(page);
        assertHeritageResponsiveState(state, width + "x900");
        assertDiagnostics(diagnostics);
      },
    );
  }
}

// Bbox, lockup, footer có mode riêng (BRAND_HEADER_BBOX, BRAND_LOCKUP, FOOTER); resize khi menu mở ở MENU_RESIZE.
async function runBrandShellFocusedChecks() {
  await runResponsiveResizeRegressionChecks();
  assertBrandShellSourceContracts();
  await runHeritageResponsiveClippingChecks();
}

async function runReducedMotionChecks() {
  const cases = [
    ...ROUTES.map((route) => ({ route, viewport: { width: 390, height: 844 } })),
    { route: "/vi/", viewport: { width: 1024, height: 900 } },
  ];
  for (const { route, viewport } of cases) {
    await runPageCase(
      `reduced motion ${routeSlug(route)} ${viewport.width}x${viewport.height}`,
      { route, viewport, reducedMotion: "reduce" },
      async (page) => {
        await smokePage(page, route, viewport);
        const state = await page.evaluate(() => ({
          reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
          hiddenRevealCount: [...document.querySelectorAll("[data-detail-reveal], .reveal")]
            .filter((element) => {
              const style = getComputedStyle(element);
              return style.visibility === "hidden" || Number(style.opacity) === 0;
            }).length,
        }));
        assert(state.reduced, "Browser did not emulate reduced motion");
        assert(
          state.hiddenRevealCount === 0,
          `${state.hiddenRevealCount} reveal elements remained hidden with reduced motion`,
        );
        if (route === "/vi/") {
          const readCloseIcon = () => page.locator(".menu-close__icon").evaluate((icon) => {
            const style = getComputedStyle(icon);
            // Dialog đóng là display:none, nơi transform resolved là "none"; đọc cái computed.
            const matrix = icon.computedStyleMap().get("transform").toMatrix();
            return {
              opacity: Number.parseFloat(style.opacity),
              transform: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
            };
          });
          const beforeIcon = await readCloseIcon();
          await openMenu(page);
          const endIcon = await readCloseIcon();
          await closeMenu(page);
          const cleanupIcon = await readCloseIcon();
          const cleanup = await page.evaluate(() => {
            const body = getComputedStyle(document.body);
            return {
              bodyOpen: document.body.classList.contains("menu-open"),
              bodyOverflowX: body.overflowX,
              dialogOpen: document.querySelector("#site-menu")?.open,
              horizontalOverflow:
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
              heights: [...document.querySelectorAll(".menu-shutters i")].map(
                (shutter) => shutter.getBoundingClientRect().height,
              ),
            };
          });
          const quarterTurn = (value) =>
            Math.abs(value[0]) <= 0.001 &&
            Math.abs(value[1] - 1) <= 0.001 &&
            Math.abs(value[2] + 1) <= 0.001 &&
            Math.abs(value[3]) <= 0.001;
          const identity = (value) =>
            Math.abs(value[0] - 1) <= 0.001 &&
            Math.abs(value[1]) <= 0.001 &&
            Math.abs(value[2]) <= 0.001 &&
            Math.abs(value[3] - 1) <= 0.001;
          assert(
            !cleanup.bodyOpen &&
              !cleanup.dialogOpen &&
              cleanup.bodyOverflowX === "visible" &&
              cleanup.horizontalOverflow <= 0.5 &&
              cleanup.heights.length === 4 &&
              cleanup.heights.every(
                (height) => Math.abs(height) <= 0.5,
              ),
            `Reduced-motion menu cleanup did not restore zero-height shutters: ${JSON.stringify(cleanup)}`,
          );
          assert(
            beforeIcon.opacity <= 0.001 &&
              quarterTurn(beforeIcon.transform) &&
              endIcon.opacity >= 0.999 &&
              identity(endIcon.transform) &&
              cleanupIcon.opacity <= 0.001 &&
              quarterTurn(cleanupIcon.transform),
            `Reduced-motion menu close state drifted across before/end/cleanup: ${JSON.stringify({ beforeIcon, endIcon, cleanupIcon })}`,
          );
        }
      },
    );
  }
}

async function runP13NavbarChecks() {
  const viewport = { width: 1329, height: 912 };
  const parentRoutes = ["residential", "commercial", "advertising-products"];
  const setLogicalScroll = async (page, value) => {
    const expected = await page.evaluate((scrollY) => {
      if (!window.TruongThinhMotion?.setLogicalScroll?.(scrollY)) {
        throw new Error("Logical scroll adapter is unavailable");
      }
      return window.TruongThinhMotion.getLogicalScroll();
    }, value);
    await page.waitForFunction(
      (scrollY) => Math.abs(window.TruongThinhMotion.getLogicalScroll() - scrollY) <= 1,
      expected,
    );
    return expected;
  };
  const readNavigationState = (page) => page.evaluate(() => ({
    historyLength: history.length,
    logicalScroll: window.TruongThinhMotion.getLogicalScroll(),
    timeOrigin: performance.timeOrigin,
    url: location.href,
  }));
  const waitForLogicalTop = (page) => page.waitForFunction(
    () => Math.abs(window.TruongThinhMotion.getLogicalScroll()) <= 0.5,
  );
  const probeNativeLink = (link) => link.evaluate((element) => {
    const variants = [
      ["ctrl", { ctrlKey: true }],
      ["meta", { metaKey: true }],
      ["shift", { shiftKey: true }],
      ["middle", { button: 1 }],
      ["target", { target: "_blank" }],
      ["download", { download: "probe.html" }],
    ];
    return variants.map(([name, settings]) => {
      const originalPrevent = Event.prototype.preventDefault;
      const originalStop = Event.prototype.stopImmediatePropagation;
      const originalTarget = element.getAttribute("target");
      const originalDownload = element.getAttribute("download");
      let documentPrevented = false;
      let documentStopped = false;
      Event.prototype.preventDefault = function preventDefaultProbe() {
        if (this.currentTarget === document) documentPrevented = true;
        return originalPrevent.call(this);
      };
      Event.prototype.stopImmediatePropagation = function stopProbe() {
        if (this.currentTarget === document) documentStopped = true;
        return originalStop.call(this);
      };
      if (settings.target) element.setAttribute("target", settings.target);
      if (settings.download) element.setAttribute("download", settings.download);
      const stopNative = (event) => originalPrevent.call(event);
      window.addEventListener("click", stopNative, { once: true });
      element.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: settings.button || 0,
        ctrlKey: Boolean(settings.ctrlKey),
        metaKey: Boolean(settings.metaKey),
        shiftKey: Boolean(settings.shiftKey),
      }));
      window.removeEventListener("click", stopNative);
      Event.prototype.preventDefault = originalPrevent;
      Event.prototype.stopImmediatePropagation = originalStop;
      if (originalTarget === null) element.removeAttribute("target");
      else element.setAttribute("target", originalTarget);
      if (originalDownload === null) element.removeAttribute("download");
      else element.setAttribute("download", originalDownload);
      return { name, documentPrevented, documentStopped };
    });
  });

  for (const locale of ["vi", "en"]) {
    for (const slug of parentRoutes) {
      const route = `/${locale}/${slug}/`;
      await runPageCase(
        `P1.3 current navbar returns ${route} to logical top`,
        { route, viewport },
        async (page) => {
          const diagnostics = monitorPage(page);
          await gotoRoute(page, route);
          const link = await findRouteLink(page, "[data-site-header]", route);
          assert(
            (await link.getAttribute("aria-current")) === "page",
            `${route}: current parent navbar link is not selected`,
          );
          assert(
            (await link.evaluate((element) => getComputedStyle(element).pointerEvents)) !== "none",
            `${route}: current parent navbar link blocks pointer input`,
          );

          await setLogicalScroll(page, 700);
          const pointerBefore = await readNavigationState(page);
          await link.click();
          await waitForLogicalTop(page);
          const pointerAfter = await readNavigationState(page);
          assert(
            pointerAfter.url === pointerBefore.url
              && pointerAfter.historyLength === pointerBefore.historyLength
              && pointerAfter.timeOrigin === pointerBefore.timeOrigin,
            `${route}: pointer re-click changed route/history/document ${JSON.stringify({ pointerBefore, pointerAfter })}`,
          );

          await setLogicalScroll(page, 700);
          const keyboardBefore = await readNavigationState(page);
          await link.focus();
          await page.keyboard.press("Enter");
          await waitForLogicalTop(page);
          const keyboardAfter = await readNavigationState(page);
          assert(
            keyboardAfter.url === keyboardBefore.url
              && keyboardAfter.historyLength === keyboardBefore.historyLength
              && keyboardAfter.timeOrigin === keyboardBefore.timeOrigin,
            `${route}: keyboard re-click changed route/history/document ${JSON.stringify({ keyboardBefore, keyboardAfter })}`,
          );
          assertDiagnostics(diagnostics);
        },
      );
    }
  }

  await runPageCase(
    "P1.3 Advertising parent from a group returns to All and keeps native link behavior",
    { route: "/vi/advertising-products/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      const route = "/vi/advertising-products/?category=mobile-retail&campaign=retained";
      await gotoRoute(page, route);
      await page.evaluate(() => {
        if (!window.TruongThinhAdvertising?.replaceTag?.("use-sampling")) {
          throw new Error("Advertising tag setup failed");
        }
      });
      await page.waitForFunction(
        () => new URL(location.href).searchParams.get("tag") === "use-sampling",
      );
      const link = await findRouteLink(page, "[data-site-header]", route);
      await setLogicalScroll(page, 700);
      const before = await readNavigationState(page);
      await link.click();
      // masonry R3: navbar Advertising khi đang ở một nhóm thêm history entry về All, bỏ nhóm và tag, cùng document.
      await page.waitForFunction(() => !new URL(location.href).searchParams.has("category"));
      const after = await readNavigationState(page);
      const query = new URL(after.url).searchParams;
      assert(
        !query.has("tag") && query.get("campaign") === "retained"
          && after.historyLength === before.historyLength + 1
          && after.timeOrigin === before.timeOrigin,
        `Advertising parent from a group did not return to All: ${JSON.stringify({ before, after })}`,
      );

      const nativeResults = await probeNativeLink(link);
      assert(
        nativeResults.every((entry) => !entry.documentPrevented && !entry.documentStopped),
        `Modified/target/download link was intercepted: ${JSON.stringify(nativeResults)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "P1.3 full menu current parent closes and returns to top",
    { route: "/en/commercial/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/en/commercial/");
      await setLogicalScroll(page, 1_600);
      await openMenu(page);
      const before = await readNavigationState(page);
      assert(before.logicalScroll > 100, `Menu setup unexpectedly reached top: ${JSON.stringify(before)}`);
      const link = await findRouteLink(page, "#site-menu .menu-nav", "/en/commercial/");
      const nativeResults = await probeNativeLink(link);
      assert(
        nativeResults.every((entry) => !entry.documentPrevented && !entry.documentStopped),
        `Menu modified/target/download link was intercepted: ${JSON.stringify(nativeResults)}`,
      );
      const menuAfterNativeProbes = await page.locator("#site-menu").evaluate((dialog) => ({
        active: dialog.classList.contains("is-active"),
        bodyOpen: document.body.classList.contains("menu-open"),
        open: dialog.open,
      }));
      assert(
        menuAfterNativeProbes.open
          && menuAfterNativeProbes.active
          && menuAfterNativeProbes.bodyOpen,
        `Native link probes unexpectedly closed the full menu: ${JSON.stringify(menuAfterNativeProbes)}`,
      );
      await link.click({ timeout: 3_000 });
      await waitForNavigationCleanup(page);
      await waitForLogicalTop(page);
      const after = await readNavigationState(page);
      assert(
        after.url === before.url
          && after.historyLength === before.historyLength
          && after.timeOrigin === before.timeOrigin,
        `Menu re-click changed route/history/document ${JSON.stringify({ before, after })}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "P1.3 Advertising menu option still changes category",
    { route: "/vi/advertising-products/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/advertising-products/?category=kiosk-posm");
      await openMenu(page);
      const historyLength = await page.evaluate(() => history.length);
      // Menu trỏ thẳng trang cụm (taxonomy R4).
      const link = page.locator(
        '#site-menu .menu-option[href="/vi/advertising-products/xe-ban-hang-luu-dong/"]',
      ).first();
      assert(await link.count(), "Advertising menu has no mobile-retail option");
      await link.click();
      await page.waitForFunction(
        () => location.pathname === "/vi/advertising-products/xe-ban-hang-luu-dong/",
      );
      await waitForNavigationCleanup(page);
      const state = await page.evaluate(() => ({
        activeFilter: document
          .querySelector('[data-advertising-filter="mobile-retail"]')
          ?.getAttribute("aria-current"),
        historyLength: history.length,
        url: location.href,
      }));
      assert(
        state.activeFilter === "true" && state.historyLength === historyLength + 1,
        `Advertising menu category did not navigate: ${JSON.stringify(state)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "P1.3 Advertising photo navbar still returns through query navigation",
    { route: "/vi/advertising-products/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      const route = "/vi/advertising-products/?category=kiosk-posm&tag=use-sampling&photo=kiosk-posm-07";
      await gotoRoute(page, route);
      await page.waitForFunction(
        () => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoId === "kiosk-posm-07",
      );
      const before = await readNavigationState(page);
      const link = await findRouteLink(page, "[data-site-header]", route);
      await link.click();
      await page.waitForFunction(() => !new URL(location.href).searchParams.has("photo"));
      await page.waitForFunction(
        () => !document.body.classList.contains("is-advertising-photo"),
      );
      const after = await readNavigationState(page);
      assert(
        new URL(after.url).pathname === "/vi/advertising-products/"
          && after.historyLength === before.historyLength + 1
          && after.timeOrigin === before.timeOrigin,
        `Photo navbar bypassed parent query navigation ${JSON.stringify({ before, after })}`,
      );
      assertDiagnostics(diagnostics);
    },
  );

  await runPageCase(
    "P1.3 Advertising menu falls back when the catalog adapter is unavailable",
    { route: "/vi/advertising-products/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await page.route("**/advertising-products/catalog-runtime.mjs*", (request) => request.abort());
      await gotoRoute(page, "/vi/advertising-products/?photo=kiosk-posm-07");
      const unavailable = await page.evaluate(() => ({
        adapter: Boolean(window.TruongThinhAdvertising?.getAdapter?.()),
        motion: Boolean(window.TruongThinhMotion),
      }));
      assert(
        unavailable.motion && !unavailable.adapter,
        `Dependency-failure setup did not isolate the catalog adapter: ${JSON.stringify(unavailable)}`,
      );
      await openMenu(page);
      const link = await findRouteLink(
        page,
        "#site-menu .menu-nav",
        "/vi/advertising-products/",
      );
      await link.click();
      await page.waitForFunction(
        () => !new URL(location.href).searchParams.has("photo"),
        null,
        { timeout: 8_000 },
      );
      await waitForLoadedDocument(page);
      assert(
        diagnostics.pageErrors.length === 0 && diagnostics.badResponses.length === 0,
        `Dependency fallback raised a runtime error: ${JSON.stringify(diagnostics)}`,
      );
      assert(
        diagnostics.requestFailures.some((failure) => failure.includes("catalog-runtime.mjs")),
        `Catalog dependency failure was not observed: ${JSON.stringify(diagnostics)}`,
      );
    },
  );

  await runPageCase(
    "P1.3 closed menu cannot cover the mobile photo primary",
    {
      route: "/vi/advertising-products/",
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(
        page,
        "/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-07",
      );
      await page.waitForFunction(
        () => document.body.classList.contains("is-advertising-photo"),
      );
      await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
      // Màn cảm ứng ẩn nút "Xem lớn hơn", chạm ảnh primary để mở viewer (viewer-touch-zoom R7).
      const hit = await page.locator("[data-advertising-photo-primary]").evaluate((primary) => {
        const rect = primary.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const target = document.elementFromPoint(x, y);
        return {
          primaryHit: primary.contains(target),
          closedMenuHit: Boolean(target?.closest("#site-menu")),
          x,
          y,
        };
      });
      assert(
        hit.primaryHit && !hit.closedMenuHit,
        `Closed full menu covered the photo primary: ${JSON.stringify(hit)}`,
      );
      await page.touchscreen.tap(hit.x, hit.y);
      await page.waitForFunction(
        () => document.querySelector("[data-advertising-photo-dialog]")?.open,
      );
      assertDiagnostics(diagnostics);
    },
  );

  // Detail ảnh luôn ở dạng thu gọn ở mọi scrollY (advertising-detail R10); ẩn, hiện theo chiều cuộn như Residential.
  const exercisePhysicalHeader = async (page, route, touch, alwaysCollapsed = false) => {
    await gotoRoute(page, route);
    if (new URL(route, "https://invalid.local").searchParams.has("photo")) {
      await page.waitForFunction(
        () => document.body.classList.contains("is-advertising-photo"),
      );
    }
    // Điện thoại cảm ứng: header đi theo quãng cuộn bằng translateY, không có is-hidden (phone-header-scroll R2).
    const snapshot = () => page.locator("[data-site-header]").evaluate((header) => ({
      collapsed: header.classList.contains("is-collapsed"),
      hidden: header.classList.contains("is-hidden") || header.getBoundingClientRect().bottom <= 0,
      logicalScroll: window.TruongThinhMotion.getLogicalScroll(),
      top: header.getBoundingClientRect().top,
    }));
    const top = await snapshot();
    let cdp;
    const touchSwipe = async (fromY, toY) => {
      cdp ||= await page.context().newCDPSession(page);
      const x = 5;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y: fromY }],
      });
      // Swipe có kiểm soát test direction mà không vọt qua vùng header compact.
      for (let step = 1; step <= 12; step += 1) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: fromY + ((toY - fromY) * step) / 12 }],
        });
        await page.waitForTimeout(50);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.evaluate(async () => {
        let previous = window.scrollY;
        let stableFrames = 0;
        for (let frame = 0; frame < 180; frame += 1) {
          await new Promise(requestAnimationFrame);
          const current = window.scrollY;
          stableFrames = Math.abs(current - previous) < 0.5 ? stableFrames + 1 : 0;
          previous = current;
          if (stableFrames >= 6) return;
        }
        throw new Error("Native touch inertia did not settle");
      });
    };
    const physicalScroll = async (direction, distance) => {
      if (touch) {
        const down = direction === "down";
        const fromY = down ? 720 : 180;
        const toY = down ? Math.max(80, fromY - distance) : Math.min(780, fromY + distance);
        await touchSwipe(fromY, toY);
      } else {
        await page.mouse.move(5, 700);
        // Locomotive đi 43px mỗi lượt lăn bất kể delta (scroll-feel R1).
        const repetitions = Math.ceil(distance / 43);
        for (let index = 0; index < repetitions; index += 1) {
          await page.mouse.wheel(0, direction === "down" ? distance : -distance);
          await page.waitForTimeout(50);
        }
      }
    };

    await physicalScroll("down", 650);
    await page.waitForFunction(
      () => window.TruongThinhMotion.getLogicalScroll() > 150,
    );
    await page.waitForFunction(
      () => {
        const header = document.querySelector("[data-site-header]");
        return header?.classList.contains("is-hidden") || header?.getBoundingClientRect().bottom <= 0;
      },
      null,
      { timeout: 4_000 },
    );
    const down = await snapshot();
    await physicalScroll("up", 220);
    await page.waitForFunction(
      () => {
        const header = document.querySelector("[data-site-header]");
        return window.TruongThinhMotion.getLogicalScroll() > 100
          && !header?.classList.contains("is-hidden")
          && Math.abs(header?.getBoundingClientRect().top || 0) <= 1;
      },
      null,
      { timeout: 4_000 },
    );
    const up = await snapshot();
    for (let index = 0; index < 4 && (await snapshot()).logicalScroll > 1; index += 1) {
      await physicalScroll("up", 650);
      await page.waitForTimeout(120);
    }
    await page.waitForFunction(
      (collapsed) => {
        const header = document.querySelector("[data-site-header]");
        return window.TruongThinhMotion.getLogicalScroll() <= 1
          && header?.classList.contains("is-collapsed") === collapsed
          && !header?.classList.contains("is-hidden")
          && Math.abs(header?.getBoundingClientRect().top || 0) <= 1;
      },
      alwaysCollapsed,
      { timeout: 5_000 },
    );
    return { top, down, up, restored: await snapshot() };
  };

  for (const input of [
    { label: "desktop wheel", touch: false, viewport },
    { label: "mobile touch", touch: true, viewport: { width: 390, height: 844 } },
  ]) {
    await runPageCase(
      `P1.3 shared photo header matches Residential with ${input.label}`,
      {
        route: "/vi/residential/",
        viewport: input.viewport,
        hasTouch: input.touch,
        isMobile: input.touch,
      },
      async (page) => {
        const diagnostics = monitorPage(page);
        const residential = await exercisePhysicalHeader(page, "/vi/residential/", input.touch);
        const advertising = await exercisePhysicalHeader(
          page,
          "/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-07",
          input.touch,
          true,
        );
        for (const [name, state] of Object.entries({ residential, advertising })) {
          const collapsedAtTop = name === "advertising";
          assert(
            state.top.collapsed === collapsedAtTop && !state.top.hidden && Math.abs(state.top.top) <= 1
              && state.down.collapsed && state.down.hidden && state.down.logicalScroll > 150
              && state.up.collapsed && !state.up.hidden && state.up.logicalScroll > 100
              && state.restored.collapsed === collapsedAtTop && !state.restored.hidden
              && state.restored.logicalScroll <= 1 && Math.abs(state.restored.top) <= 1,
            `${input.label} ${name} header state drifted: ${JSON.stringify(state)}`,
          );
        }
        assertDiagnostics(diagnostics);
      },
    );
  }

  await runPageCase(
    "P1.3 homepage logo remains the top-scroll control",
    { route: "/vi/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      await setLogicalScroll(page, 700);
      const before = await readNavigationState(page);
      await page.locator("[data-site-header] .brand").click();
      await waitForLogicalTop(page);
      const after = await readNavigationState(page);
      assert(
        after.url === before.url
          && after.historyLength === before.historyLength
          && after.timeOrigin === before.timeOrigin,
        `Homepage logo top-scroll contract drifted ${JSON.stringify({ before, after })}`,
      );
      assertDiagnostics(diagnostics);
    },
  );
}

function writeReport() {
  const passed = results.filter((result) => result.status === "passed").length;
  const failed = results.length - passed;
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    durationMs: Date.now() - startedAt,
    summary: {
      checks: results.length,
      passed,
      failed,
    },
    results,
  };
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

async function main() {
  const brandShellOnly = process.env.TT_E2E_BRAND_SHELL_ONLY === "1";
  const espacioTypeMotionOnly =
    process.env.TT_E2E_ESPACIO_TYPE_MOTION_ONLY === "1";
  if (process.env.TT_E2E_STATIC_ONLY === "1") {
    if (brandShellOnly) {
      assertBrandShellSourceContracts();
    } else if (espacioTypeMotionOnly) {
      assertPersistentNavigationContracts();
      assertEspacioTypographyMotionSourceContracts();
    } else {
      assertPersistentNavigationContracts();
    }
    console.log("[site-e2e] static contracts passed");
    return;
  }
  prepareReportDirectories();
  if (!brandShellOnly) assertPersistentNavigationContracts();
  if (espacioTypeMotionOnly) {
    assertEspacioTypographyMotionSourceContracts();
  }
  if (process.env.TT_E2E_REAL_BFCACHE_ONLY === "1") {
    await runRealBfcacheProbe();
    return;
  }
  if (process.env.TT_E2E_FAILOPEN_BFCACHE_ONLY === "1") {
    await runFailOpenRealBfcacheProbe();
    return;
  }
  browser = await launchBrowser();
  try {
    if (brandShellOnly) {
      await runBrandShellFocusedChecks();
    } else if (espacioTypeMotionOnly) {
      await runEspacioRouteLogoTimingChecks();
      await runEspacioScrollCueChecks();
      await runEspacioTypographyChecks();
    } else if (process.env.TT_E2E_P13_NAVBAR_ONLY === "1") {
      await runP13NavbarChecks();
    } else if (process.env.TT_E2E_SCROLL_CUE_ONLY === "1") {
      await runEspacioScrollCueChecks();
    } else if (process.env.TT_E2E_MENU_RESIZE_ONLY === "1") {
      await runMenuResizeRegressionCheck();
    } else if (process.env.TT_E2E_BRAND_HEADER_BBOX_ONLY === "1") {
      await runBrandHeaderBboxMatrixChecks();
    } else if (process.env.TT_E2E_BRAND_LOCKUP_ONLY === "1") {
      await runBrandLockupRuntimeChecks();
    } else if (process.env.TT_E2E_BRAND_COLOR_ONLY === "1") {
      await runBrandColorMotionCheck();
    } else if (process.env.TT_E2E_MENU_ONLY === "1") {
      await runMenuChecks();
    } else if (process.env.TT_E2E_PORTAL_ONLY === "1") {
      await runPortalAlignmentChecks();
    } else if (process.env.TT_E2E_P5_MEDIA_HOVER_ONLY === "1") {
      await runSharedMediaHoverPortalChecks();
    } else if (process.env.TT_E2E_FOOTER_ONLY === "1") {
      await runFooterRuntimeChecks();
    } else if (process.env.TT_E2E_LOCALE_MODES_ONLY === "1") {
      await runLocaleResponsivePreferenceChecks();
    } else if (process.env.TT_E2E_LOCALE_SCROLL_ONLY === "1") {
      await runLanguageScrollRetentionCheck();
    } else if (process.env.TT_E2E_LOCALE_ONLY === "1") {
      await runLanguagePersistenceCheck();
      await runLanguageScrollRetentionCheck();
      await runLocaleResponsivePreferenceChecks();
    } else if (process.env.TT_E2E_FRAGMENT_ONLY === "1") {
      await runDirectHeaderRouteChecks();
      await runInternalLinkCheck();
      await runLanguagePersistenceCheck();
      await runLanguageScrollRetentionCheck();
    } else if (process.env.TT_E2E_HEADER_GEOMETRY_ONLY === "1") {
      await runHeaderParityChecks();
    } else if (process.env.TT_E2E_HISTORY_ONLY === "1") {
      await runHistoryNavigationChecks();
    } else if (process.env.TT_E2E_HEADER_ONLY === "1") {
      await runHeaderParityChecks();
      await runDirectHeaderRouteChecks();
      await runPersistentBarbaNavigationChecks();
      await runHistoryNavigationChecks();
      await runLanguagePersistenceCheck();
      await runLanguageScrollRetentionCheck();
      await runMenuChecks();
      await runReducedMotionChecks();
      await runHeroCrossFadeContinuityChecks();
    } else if (process.env.TT_E2E_FAILOPEN_ONLY === "1") {
      await runMotionAbortFailOpenChecks();
    } else if (process.env.TT_E2E_DELAYED_DETAIL_ONLY === "1") {
      await runDelayedDetailFallbackChecks();
    } else if (process.env.TT_E2E_FULL_FAILURES_ONLY === "1") {
      for (const testCase of [
        { route: "/vi/commercial/", viewport: { width: 768, height: 900 } },
        { route: "/vi/residential/", viewport: { width: 1024, height: 900 } },
        { route: "/vi/residential/", viewport: { width: 1440, height: 900 } },
        { route: "/vi/advertising-products/", viewport: { width: 1440, height: 900 } },
      ]) {
        await runPageCase(
          `full-suite lazy image retry ${routeSlug(testCase.route)} ${testCase.viewport.width}`,
          testCase,
          (page) => smokePage(page, testCase.route, testCase.viewport),
        );
      }
      await runHomeMotionRegressionCheck();
    } else if (process.env.TT_E2E_WHEEL_ONLY === "1") {
      await runPhysicalWheelTransformChecks();
    } else if (process.env.TT_E2E_BOOT_RACE_ONLY === "1") {
      await runSlowMotionBootCheck();
    } else if (process.env.TT_E2E_HERO_INTRO_ONLY === "1") {
      await runHomeHeroTypesettingChecks();
      await runHomeHeroIntroReadabilityCheck();
    } else if (process.env.TT_E2E_MEDIA_FALLBACK_ONLY === "1") {
      await runWhiteOverlayMediaFallbackCheck();
    } else if (process.env.TT_E2E_HERO_CONTINUITY_ONLY === "1") {
      await runHeroCrossFadeContinuityChecks();
    } else if (process.env.TT_E2E_DETAIL_HERO_ONLY === "1") {
      await runDetailHeroEntryChecks();
      await runHeroCarouselLifecycleCheck();
    } else if (process.env.TT_E2E_REDUCED_ONLY === "1") {
      await runReducedMotionChecks();
    } else if (process.env.TT_E2E_RESIDENTIAL_HERO_ONLY === "1") {
      await runResidentialHeroTextCheck();
    } else if (process.env.TT_E2E_COMMERCIAL_HERO_ONLY === "1") {
      await runCommercialHeroTextCheck();
    } else if (process.env.TT_E2E_ADVERTISING_HERO_MOTION_ONLY === "1") {
      await runProjectsProductsHeroEditorialCheck({ motionOnly: true });
    } else if (process.env.TT_E2E_ADVERTISING_HERO_ONLY === "1") {
      await runProjectsProductsHeroEditorialCheck();
    } else if (process.env.TT_E2E_ADVERTISING_GRID_ONLY === "1") {
      await runAdvertisingGridFocusedChecks();
    } else if (process.env.TT_E2E_ADVERTISING_KEYBOARD_ONLY === "1") {
      await runAdvertisingKeyboardVirtualizationCheck();
    } else if (process.env.TT_E2E_ADVERTISING_MEDIA_ENTRANCE_ONLY === "1") {
      await runAdvertisingMediaEntranceChecks();
      await runAdvertisingFreshBarbaReadinessChecks({ expectedCardCount: "current" });
      await runAdvertisingHistoryRemountChecks();
    } else if (process.env.TT_E2E_ADVERTISING_CAROUSEL_ONLY === "1") {
      await runAdvertisingCompatibilityChecks();
    } else if (process.env.TT_E2E_ADVERTISING_COMPATIBILITY_ONLY === "1") {
      await runAdvertisingCompatibilityChecks();
    } else if (process.env.TT_E2E_ADVERTISING_MEDIA_ONLY === "1") {
      await runAdvertisingMediaFocusedChecks();
    } else if (process.env.TT_E2E_ADVERTISING_3K_ONLY === "1") {
      await runAdvertisingThreeThousandCardProbe();
    } else if (process.env.TT_E2E_ADVERTISING_LOCALE_LIFECYCLE_ONLY === "1") {
      await runAdvertisingLocaleLifecycleChecks();
    } else if (process.env.TT_E2E_ADVERTISING_PROOF_ONLY === "1") {
      await runAdvertisingNoOpScrollCheck();
      await runAdvertisingFilterCheck();
    } else if (process.env.TT_E2E_ADVERTISING_SELECTION_ONLY === "1") {
      await runAdvertisingSelectionCheck();
    } else if (process.env.TT_E2E_ADVERTISING_HISTORY_ONLY === "1") {
      await runAdvertisingHistoryRemountChecks();
    } else if (process.env.TT_E2E_ADVERTISING_RAPID_FILTER_ONLY === "1") {
      await runAdvertisingRapidFilterCheck();
    } else if (process.env.TT_E2E_ADVERTISING_DIRECT_FAILURE_ONLY === "1") {
      await runAdvertisingDirectFailureCheck();
    } else if (process.env.TT_E2E_ADVERTISING_DEFAULT_ONLY === "1") {
      await runSsrCmsHydrationCheck(
        SSR_CMS_HYDRATION_CASES.filter((testCase) =>
          testCase.route.includes("/advertising-products/"),
        ),
      );
      await runAdvertisingFreshBarbaReadinessChecks();
      await runAdvertisingDependencyRecoveryChecks();
      await runAdvertisingHistoryRemountChecks();
      await runAdvertisingFilterCheck();
      // Lọc nhanh kèm cuộn chạy ở mode RAPID_FILTER (suite adv-grid).
      await runAdvertisingNoOpScrollCheck();
      await runAdvertisingDirectFailureCheck();
      await runPublicSelectionCheck();
      await runDelayedDetailFallbackChecks();
    } else if (process.env.TT_E2E_M1_ONLY === "1") {
      // Hero detail, carousel, cross-fade, wheel có mode riêng (DETAIL_HERO, HERO_CONTINUITY, WHEEL).
      await runPersistentBarbaNavigationChecks();
      await runEarlyHeroAccessibilityCheck();
      await runGalleryCheck();
      await runNoScriptHeroCheck();
    } else if (process.env.TT_E2E_M2_ONLY === "1") {
      await runMotionAbortFailOpenChecks();
      await runDelayedDetailFallbackChecks();
      await runSlowMotionBootCheck();
      await runDetailHeroEntryChecks();
      await runHeroCarouselLifecycleCheck();
    } else {
      await runSmokeMatrix();
      await runPortalAlignmentChecks();
      await runDirectHeaderRouteChecks();
      await runPersistentBarbaNavigationChecks();
      await runBarbaFailureFallbackCheck();
      await runHistoryNavigationChecks();
      await runBfcacheCleanupCheck();
      await runInternalLinkCheck();
      await runLanguagePersistenceCheck();
      await runLanguageScrollRetentionCheck();
      await runSsrCmsHydrationCheck();
      await runMenuChecks();
      await runProjectsProductsHeroEditorialCheck();
      await runResidentialHeroTextCheck();
      await runCommercialHeroTextCheck();
      await runAdvertisingFilterCheck();
      await runGalleryCheck();
      await runEarlyHeroAccessibilityCheck();
      await runDetailHeroEntryChecks();
      await runHeroCarouselLifecycleCheck();
      await runWhiteOverlayMediaFallbackCheck();
      await runHomeHeroTypesettingChecks();
      await runHomeHeroIntroReadabilityCheck();
      await runHeroCrossFadeContinuityChecks();
      await runPhysicalWheelTransformChecks();
      await runNoScriptHeroCheck();
      await runMotionAbortFailOpenChecks();
      await runDelayedDetailFallbackChecks();
      await runSlowMotionBootCheck();
      await runHomeMotionRegressionCheck();
      await runReducedMotionChecks();
    }
  } finally {
    await browser.close();
  }

  const report = writeReport();
  console.log(
    `[site-e2e] ${report.summary.passed}/${report.summary.checks} passed; report: ${REPORT_PATH}`,
  );
  if (report.summary.failed > 0) process.exitCode = 1;
}

main().catch(async (error) => {
  if (browser) await browser.close().catch(() => {});
  results.push({
    name: "suite startup",
    status: "failed",
    durationMs: Date.now() - startedAt,
    error: error instanceof Error ? error.message : String(error),
  });
  prepareReportDirectories();
  const report = writeReport();
  console.error(error);
  console.error(`[site-e2e] report: ${REPORT_PATH}`);
  if (report.summary.failed > 0) process.exitCode = 1;
});
