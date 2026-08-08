#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(
  /\/+$/,
  "",
);
const BASE_ORIGIN = new URL(BASE_URL).origin;
const ROUTES = ["/vi/", "/vi/residential/", "/vi/commercial/", "/vi/projects-products/", "/vi/about/"];
const DIRECT_SERVICE_ROUTES = ["/vi/residential/", "/vi/commercial/", "/vi/projects-products/"];
const DIRECT_MOTTO_ROUTES = ["/vi/residential/", "/vi/commercial/"];
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
  ...[750, 751, 768, 960, 1024, 1200, 1201, 1440].map((width) => ({
    width,
    height: 900,
  })),
];
const SSR_CMS_HYDRATION_CASES = [
  {
    route: "/vi/projects-products/",
    locale: "vi",
    title: "Công trình & sản phẩm — Trường Thịnh",
    description: "Kiosk, POSM, biển hiệu, LED, in ấn và nhận diện thương hiệu.",
    heroTitle: "Công trình & sản phẩm",
    navigationLabel: "Công trình & sản phẩm",
  },
  {
    route: "/en/projects-products/",
    locale: "en",
    title: "Projects & products — Trường Thịnh",
    description: "Kiosks, POSM, signage, LED, print, and brand identity.",
    heroTitle: "Projects & products",
    navigationLabel: "Projects & products",
  },
  {
    route: "/en/about/",
    locale: "en",
    title: "About — Trường Thịnh",
    description: "Trường Thịnh experience, workshop, and way of working.",
    requiresStaticFallbackMismatch: true,
  },
];
const REPORT_DIR = path.join(__dirname, "reports");
const FAILURE_DIR = path.join(REPORT_DIR, "failures");
const REPORT_PATH = path.join(REPORT_DIR, "latest.json");
const SITE_ROOT = path.join(__dirname, "..", "..", "src", "site");
const PUBLIC_HTML = [
  ["index.html", "home"],
  ["residential/index.html", "residential"],
  ["commercial/index.html", "commercial"],
  ["projects-products/index.html", "projects-products"],
  ["about/index.html", "about"],
];

const startedAt = Date.now();
const results = [];
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
  const barbaUrl =
    "https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.js";
  const barbaIntegrity =
    "sha384-T3/AkZI+fU7l5Ip18n7KLEi8r0LPLwiyIp0+anP6LuGlXmAwDS6l6YhmhJjiki/x";
  const bootstraps = [];

  PUBLIC_HTML.forEach(([relativePath, namespace]) => {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    const bootstrap = source.match(
      /<script>\s*\(\(\) => \{[\s\S]*?window\.__tt(?:MotionBoot|BootFailOpenCount)[\s\S]*?<\/script>/,
    )?.[0];
    const bodyTag = source.match(/<body\b[^>]*>/)?.[0] || "";
    const containerTag =
      source.match(/<div\b[^>]*class="[^"]*\bpage-shell\b[^"]*"[^>]*>/)?.[0] ||
      "";
    const scriptOrder = [
      "gsap@3.13.0",
      "locomotive-scroll@4.1.4",
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
    assert(
      source.includes(`src="${barbaUrl}"`) &&
        source.includes(`integrity="${barbaIntegrity}"`) &&
        source.includes('crossorigin="anonymous"'),
      `${relativePath} does not pin the approved Barba CDN asset`,
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
        bootstrap.includes("this.timer=0") &&
        bootstrap.includes("2_500") &&
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
        (menuSource.match(/class="menu-option"/g) || []).length === 15 &&
        !/href="[^"]*#|data-menu-projects|data-social-placeholder/.test(menuSource) &&
        /class="menu-appointment"[\s\S]*?data-menu-calendar viewBox="0 0 58\.09 57\.82"/.test(menuSource) &&
        !/class="menu-foot"/.test(menuSource),
      `${relativePath} must own locale, appointment, and four groups inside the full menu only`,
    );
    assert(
      (source.match(/data-vi="Công trình &amp; sản phẩm"/g) || []).length >=
        2 &&
        (source.match(/data-en="Projects &amp; products"/g) || []).length >= 2,
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
  });

  assert(
    new Set(bootstraps).size === 1,
    "The five motion startup handshakes are not byte-identical",
  );

  const motionSource = fs.readFileSync(path.join(root, "motion.js"), "utf8");
  const styleSource = fs.readFileSync(path.join(root, "style.css"), "utf8");
  const brandCss = styleSource.match(/\.brand\s*\{[\s\S]*?\n\}/)?.[0];
  const detailSource = fs.readFileSync(path.join(root, "detail.js"), "utf8");
  const detailCss = fs.readFileSync(path.join(root, "detail.css"), "utf8");
  const aboutSource = fs.readFileSync(path.join(root, "about/index.html"), "utf8");
  const projectsSource = fs.readFileSync(
    path.join(root, "projects-products/index.html"),
    "utf8",
  );

  assert(
    /const intro = gsap\.timeline\(\{ defaults: \{ ease: "power4\.out" \} \}\);[\s\S]*!enteredViaRoute[\s\S]*\.from\(header\.querySelector\("#header-logo"\), \{ scale: 0, duration: 1\.5 \}\)[\s\S]*header\.querySelectorAll\("#header-menu-items > ul > li"\)[\s\S]*\{ y: -150, duration: 1\.5, stagger: 0\.1 \},\s*0\.3[\s\S]*header\.querySelector\("#header-toggle-svg"\)[\s\S]*\{ scaleX: 0, transformOrigin: "center", duration: 1 \},\s*1\.5/.test(
      motionSource,
    ) && brandCss && !/transition:\s*transform\b/.test(brandCss),
    "The direct-only header intro does not match the audited 0/0.3/1.5s timeline or is masked by a CSS transform transition",
  );
  assert(
    /\.site-header\s*\{[\s\S]*?box-sizing:\s*content-box;[\s\S]*?width:\s*calc\(100% - 70px\);[\s\S]*?padding:\s*35px 35px 0;[\s\S]*?grid-template-columns:\s*170px minmax\(0, 1fr\) 65px;[\s\S]*?column-gap:\s*70px;[\s\S]*?\}/.test(
      styleSource,
    ) &&
      /@media \(max-width:\s*1200px\)[\s\S]*?\.site-header\s*\{[\s\S]*?width:\s*calc\(100% - 50px\);[\s\S]*?padding:\s*25px 25px 0;[\s\S]*?grid-template-columns:\s*145px minmax\(0, 1fr\) 65px;[\s\S]*?column-gap:\s*25px;/.test(
        styleSource,
      ) &&
      /\.desktop-nav ul\s*\{[\s\S]*?left:\s*-10%;[\s\S]*?margin:\s*1em 0;/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*1200px\)[\s\S]*?\.desktop-nav ul\s*\{[\s\S]*?left:\s*auto;[\s\S]*?column-gap:\s*37\.5px;/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*960px\)[\s\S]*?\.desktop-nav ul\s*\{[\s\S]*?grid-template-rows:\s*repeat\(2, auto\);[\s\S]*?row-gap:\s*25px;/.test(
        styleSource,
      ) &&
      /@media \(max-width:\s*750px\)[\s\S]*?\.site-header\s*\{[\s\S]*?width:\s*calc\(100% - 30px\);[\s\S]*?padding:\s*15px 15px 0;[\s\S]*?column-gap:\s*15px;[\s\S]*?\.desktop-nav ul\s*\{\s*display:\s*none;/.test(
        styleSource,
      ) &&
      /\.site-header\s*\{[\s\S]*?border-bottom:\s*0 solid transparent;/.test(
        styleSource,
      ) &&
      /\.site-header\.is-collapsed\s*\{[\s\S]*?border-bottom:\s*1px solid #d3d3d3;/.test(
        styleSource,
      ),
    "The header grid, gutter, or 750/960/1200 breakpoint contract drifted",
  );
  assert(
    /\.desktop-nav\s*\{[\s\S]*?font-size:\s*1rem;[\s\S]*?font-weight:\s*600;/.test(
      styleSource,
    ) &&
      /\.desktop-nav li\.selected a::after[\s\S]*?transform:\s*scaleX\(1\);[\s\S]*?transform-origin:\s*left center;/.test(
        styleSource,
      ) &&
      /\.desktop-nav li\.selected a,[\s\S]*?\.desktop-nav a\[aria-current="page"\][\s\S]*?pointer-events:\s*none;/.test(
        styleSource,
      ) &&
      /\.menu-button svg\s*\{[\s\S]*?width:\s*35px;[\s\S]*?height:\s*19px;[\s\S]*?stroke-width:\s*3;/.test(
        styleSource,
      ),
    "Header nav typography, selected underline, or hamburger geometry drifted",
  );
  assert(
    /const collapsed = scrollY > 100;/.test(motionSource) &&
      /scrollY - directionStartY > 150/.test(motionSource) &&
      /directionStartY - scrollY > 150/.test(motionSource) &&
      /scrollY > window\.innerHeight \* 0\.5[\s\S]*scrollY < pageHeight - window\.innerHeight \* 1\.25/.test(
        motionSource,
      ) &&
      /document\.addEventListener\(\s*"pointermove",[\s\S]*classList\.toggle\("forceShow", event\.screenY <= 350\)/.test(
        motionSource,
      ) &&
      /transform 1s cubic-bezier\(0, 0, 0\.1, 0\.99\)/.test(styleSource),
    "Header collapse, direction accumulation, hide region, pointer force-show, or transform timing drifted",
  );
  assert(
    !/\.language-toggle\s*\{/.test(styleSource) &&
      /header\.querySelectorAll\("\.brand-mark path"\)/.test(motionSource) &&
      /header\.querySelector\("\.brand-copy"\)/.test(motionSource) &&
      /header\.querySelectorAll\("\.menu-button line"\)/.test(motionSource) &&
      /window\.gsap\s*\.timeline\(\{[\s\S]*?duration:\s*0\.3,[\s\S]*?ease:\s*"expo\.out"[\s\S]*?\.to\(fillTargets,\s*\{\s*fill:\s*color\s*\},\s*0\)[\s\S]*?\.to\(colorTargets,\s*\{\s*color\s*\},\s*0\)[\s\S]*?\.to\(strokeTargets,\s*\{\s*stroke:\s*color\s*\},\s*0\)/.test(
        motionSource,
      ) &&
      /const isExactCurrentUrl[\s\S]*?normalizePathname\(url\.pathname\)[\s\S]*?url\.search === window\.location\.search/.test(
        motionSource,
      ) &&
      motionSource.includes(
        `'[data-site-header] a[aria-current="page"], #site-menu a[aria-current="page"]'`,
      ) &&
      /link\.matches\([\s\S]*?\)\s*&&\s*isExactCurrentUrl\(destination\)[\s\S]*?event\.preventDefault\(\)[\s\S]*?event\.stopImmediatePropagation\(\)/.test(
        motionSource,
      ) &&
      /html\.motion-fallback \.site-header \.brand-mark path[\s\S]*?fill:\s*currentColor\s*!important;[\s\S]*?html\.motion-fallback \.site-header \.menu-button line[\s\S]*?stroke:\s*currentColor\s*!important;/.test(
        styleSource,
      ),
    "Header copy, actual logo fills, and hamburger strokes are not synchronized on the audited 0.3s expo tween",
  );
  assert(
    /\.menu-head\s*\{[\s\S]*?grid-template-columns:\s*170px minmax\(0, 1fr\) minmax\(0, 1fr\) 50px;/.test(
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
    /async leave\(data\)[\s\S]*await coverRoute\([\s\S]*unmountPage\(\);[\s\S]*data\.current\.container\.hidden\s*=\s*true/.test(
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
    !/data-product-directory|data-product-info|data-product-directory-open/.test(
      projectsSource,
    ) && !/src="\/products\.js"/.test(projectsSource),
    "Retired product dialogs/trigger/runtime still load",
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
    /const cancelFrame[\s\S]*frames\.delete\(frame\)/.test(detailSource) &&
      /const cancelTimer[\s\S]*timers\.delete\(timer\)/.test(detailSource),
    "Canceled detail handles remain tracked",
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
    (aboutSource.match(/src="\/assets\/site\/expanded\/legacy-team\.webp"/g) || [])
      .length === 1 &&
      !/<div class="hero-slides"[^>]*hidden/.test(aboutSource),
    "About still renders a hidden duplicate hero carousel/media request",
  );
}

async function launchBrowser() {
  const requestedExecutable = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const primaryOptions = {
    headless: true,
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
    return chromium.launch({ headless: true, executablePath });
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

async function waitForNavigationCleanup(page) {
  await page.waitForFunction(
    () => {
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
        sessionStorage.getItem("tt-route") === null &&
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
      header: inspect("[data-site-header] a[href]"),
      menuPrimary: inspect(
        "#site-menu .menu-group:not(:last-child) > a.menu-group__title",
      ),
      menuAbout: inspect("#site-menu .menu-group:last-child a[href]"),
    };
  });
  const expectedHeader = ["/vi/", ...DIRECT_SERVICE_ROUTES].sort();
  const expectedMenu = [...DIRECT_SERVICE_ROUTES].sort();
  const expectedAbout = ["/vi/about/"].sort();
  const headerHrefs = unique(contracts.header.hrefs).sort();
  const menuHrefs = unique(contracts.menuPrimary.hrefs).sort();
  const aboutHrefs = unique(contracts.menuAbout.hrefs).sort();

  assert(
    contracts.brandHref === "/vi/",
    `Header brand href is ${JSON.stringify(contracts.brandHref)}; expected "/vi/"`,
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
      if (window.innerWidth <= 578) {
        return document.activeElement === dialog.querySelector("[data-menu-close]");
      }
      const dividers = [...document.querySelectorAll("#site-menu .menu-group")]
        .map((group) => ({
          group,
          style: getComputedStyle(group, "::after"),
        }))
        .filter(({ style }) => style.display !== "none");
      return dividers.length > 0 && dividers.every(({ group, style }) => {
        const targetHeight = group.getBoundingClientRect().height;
        const dividerHeight = Number.parseFloat(style.height);
        return targetHeight > 0 && Number.isFinite(dividerHeight) && Math.abs(targetHeight - dividerHeight) <= 1;
      });
    },
    null,
    { timeout: 6_000 },
  );
}

async function closeMenu(page) {
  await page.locator("[data-menu-close]").click();
  await waitForMenuState(page, false);
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
      tracks.forEach((track) =>
        track.scrollTo({ left: track.scrollWidth / 2, behavior: "instant" }),
      );
      await paint();
      tracks.forEach((track) => {
        track.scrollTo({ left: track.scrollWidth, behavior: "instant" });
        track.dataset.qaLazySwept = "true";
      });
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
  const images = page.locator('img[loading="lazy"]');
  const count = await images.count();
  for (let index = 0; index < count; index += 1) {
    const isVisible = await images.nth(index).evaluate((image) => {
      image.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: "auto",
      });
      const style = getComputedStyle(image);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    if (isVisible) {
      await images.nth(index).evaluate(
        (image) =>
          new Promise((resolve) => {
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
            const source = image.getAttribute("src") || image.dataset.src;
            return source && !source.startsWith("data:");
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
        return source && !source.startsWith("data:");
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
  },
  testBody,
) {
  const caseStartedAt = Date.now();
  const context = await browser.newContext({
    viewport,
    locale: "vi-VN",
    colorScheme: "light",
    reducedMotion,
    javaScriptEnabled,
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
    console.error(`FAIL ${name}\n${error instanceof Error ? error.message : error}`);
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

async function runRootProcessCheck() {
  const viewport = { width: 390, height: 844 };
  await runPageCase(
    "root process order",
    { route: "/vi/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/");
      const labels = await page
        .locator(".editorial-strip .editorial-item h3")
        .allTextContents();
      const normalized = labels.map((label) => label.trim());
      const expected = ["Khảo sát", "Tư vấn", "Sản xuất", "Lắp đặt"];
      assert(
        JSON.stringify(normalized) === JSON.stringify(expected),
        `Expected ${expected.join(" → ")}, received ${normalized.join(" → ")}`,
      );
      await page.setViewportSize({ width: 1440, height: 900 });
      const frames = await page.locator(".editorial-strip .editorial-item").evaluateAll((items) =>
        items.map((item) => ({
          imageHeight: item.querySelector("img").getBoundingClientRect().height,
          itemHeight: item.getBoundingClientRect().height,
        })),
      );
      assert(
        frames.every(({ imageHeight, itemHeight }) => Math.abs(imageHeight - itemHeight) <= 1),
        `Process image frames are not synchronized: ${JSON.stringify(frames)}`,
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runPortalAlignmentChecks() {
  for (const width of [1024, 1440]) {
    const viewport = { width, height: 900 };
    await runPageCase(
      `root portal label alignment ${width}x900`,
      { route: "/vi/", viewport },
      async (page) => {
        const diagnostics = monitorPage(page);
        await gotoRoute(page, "/vi/");
        const centers = await page
          .locator("#dich-vu .service-portal .portal-title__strong")
          .evaluateAll((labels) =>
            labels.map((label) => {
              const rect = label.getBoundingClientRect();
              return rect.top + rect.height / 2;
            }),
          );
        assert(centers.length === 3, `Expected 3 portal labels, found ${centers.length}`);
        const spread = Math.max(...centers) - Math.min(...centers);
        assert(
          spread <= 1,
          `Portal label center spread is ${spread.toFixed(2)}px: ${centers
            .map((center) => center.toFixed(2))
            .join(", ")}`,
        );
        assertDiagnostics(diagnostics);
      },
    );
  }
}

async function runDirectHeaderRouteChecks() {
  const viewport = { width: 1440, height: 900 };
  const routePairs = [
    ["/vi/", "/vi/residential/"],
    ["/vi/residential/", "/vi/commercial/"],
    ["/vi/commercial/", "/vi/projects-products/"],
    ["/vi/projects-products/", "/vi/residential/"],
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
            gap: Number.parseFloat(headerStyle.columnGap),
            navDisplay: listStyle.display,
            navRows: listStyle.gridTemplateRows.split(" ").length,
            navFont: Number.parseFloat(navStyle.fontSize),
            navLine: Number.parseFloat(navStyle.lineHeight),
            labels: links.map((link) => link.textContent.trim()),
            brand: rect(header.querySelector("#header-logo")),
            mark: rect(header.querySelector(".brand-mark")),
            nav: rect(nav),
            navList: rect(navList),
            navListLeft: Number.parseFloat(listStyle.left),
            navListMargin: [listStyle.marginTop, listStyle.marginBottom].map(
              Number.parseFloat,
            ),
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
        assert(
          Math.abs(expanded.header.width - viewport.width) <= 1 &&
            Math.abs(expanded.tracks[0] - (desktop ? 170 : 145)) <= 1 &&
            Math.abs(expanded.tracks.at(-1) - 65) <= 1 &&
            Math.abs(expanded.gap - (desktop ? 70 : mobile ? 15 : 25)) <= 1 &&
            Math.abs(expanded.border) <= 0.1 &&
            expanded.padding.every(
              (value, index) => Math.abs(value - expectedPadding[index]) <= 1,
            ),
          `Expanded header geometry drifted at ${viewport.width}: ${JSON.stringify(expanded)}`,
        );
        assert(
          expanded.navDisplay === (mobile ? "none" : "grid") &&
            (mobile ||
              expanded.navRows === (viewport.width <= 960 ? 2 : 1)) &&
            Math.abs(expanded.navFont - 16) <= 0.1 &&
            Math.abs(expanded.navLine - 22.4) <= 0.2 &&
            JSON.stringify(expanded.labels) ===
              JSON.stringify([
                "Không gian Nhà ở",
                "Không gian Kinh doanh",
                "Công trình & sản phẩm",
              ]),
          `Header navigation contract drifted at ${viewport.width}: ${JSON.stringify(expanded)}`,
        );
        const rhythm = {
          751: { header: 132.781, nav: 107.781, first: 197.531, last: 633.469 },
          960: { header: 132.781, nav: 107.781, first: 302.031, last: 737.969 },
          1201: { header: 102.516, nav: 60.391, first: 268.606, last: 908.263 },
          1440: { header: 102.516, nav: 60.391, first: 388.106, last: 1027.763 },
        }[viewport.width];
        if (rhythm) {
          assert(
            Math.abs(expanded.header.height - rhythm.header) <= 0.25 &&
              Math.abs(expanded.nav.height - rhythm.nav) <= 1 &&
              Math.abs(expanded.firstLink.left - rhythm.first) <= 1 &&
              Math.abs(expanded.lastLink.right - rhythm.last) <= 1 &&
              expanded.navListMargin.every((value) => Math.abs(value - 16) <= 0.1) &&
              Math.abs(
                expanded.navListLeft - (viewport.width > 1200 ? -64.5656 : 0),
              ) <= 1,
            `Header vertical or x rhythm drifted at ${viewport.width}: ${JSON.stringify(expanded)}`,
          );
        }
        assert(
          Math.abs(expanded.mark.width - 60) <= 0.1 &&
            Math.abs(expanded.mark.height - 60) <= 0.1 &&
            Math.abs(expanded.menuSvg.width - 35) <= 0.1 &&
            Math.abs(expanded.menuSvg.height - 19) <= 0.1 &&
            Math.abs(expanded.stroke - 3) <= 0.1 &&
            expanded.brand.right <=
              (mobile ? expanded.menuSvg.left : expanded.firstLink.left) + 0.25 &&
            (mobile || expanded.lastLink.right <= expanded.menuSvg.left + 0.25) &&
            expanded.overflow <= 1,
          `Header controls overlap or overflow at ${viewport.width}: ${JSON.stringify(expanded)}`,
        );

        await page.mouse.move(viewport.width / 2, viewport.height - 80);
        await page.mouse.wheel(0, 220);
        await page.waitForTimeout(1_500);
        const collapsed = await page.evaluate(() => {
          const header = document.querySelector("[data-site-header]");
          const style = getComputedStyle(header);
          const mark = header.querySelector(".brand-mark").getBoundingClientRect();
          return {
            classes: header.className,
            mark: [mark.width, mark.height],
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
        assert(
          collapsed.classes.includes("is-collapsed") &&
            collapsed.mark.every((value) => Math.abs(value - 48) <= 0.1) &&
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
      )?.time - setup.time;
      const navStart = afterSetup.find(
        (write) =>
          write.target === "nav-0" && !/-150(?:\.0+)?px/.test(write.value),
      )?.time - setup.time;
      const toggleStart = afterSetup.find(
        (write) => write.target === "toggle" && !/^scale\(0(?:, 1)?\)/.test(write.value),
      )?.time - setup.time;
      assert(
        logoStart <= 80 &&
          navStart >= 240 &&
          navStart <= 380 &&
          toggleStart >= 1_420 &&
          toggleStart <= 1_620 &&
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
          getComputedStyle(header.querySelector(".brand-mark path")).fill,
          getComputedStyle(header.querySelector(".brand-copy strong")).color,
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
    { route: "/vi/residential/", viewport: { width: 768, height: 900 } },
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
          top: element.getBoundingClientRect().top,
          duration: style.transitionDuration,
          timing: style.transitionTimingFunction,
        };
      });
      assert(
        hidden.classes.includes("is-hidden") &&
          hidden.top < -80 &&
          hidden.duration.includes("1s") &&
          hidden.timing.includes("cubic-bezier(0, 0, 0.1, 0.99)"),
        `Header did not hide with the audited transform: ${JSON.stringify(hidden)}`,
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
        window.scrollTo(0, 600);
      });
      await page.mouse.move(100, 100);
      await page.waitForTimeout(1_050);
      const initial = await page.evaluate(() => {
        window.__ttSelectedHeader = document.querySelector("[data-site-header]");
        return {
          historyLength: history.length,
          scrollY: window.scrollY,
          timeOrigin: performance.timeOrigin,
          url: window.location.href,
        };
      });
      const assertUnchanged = async (input) => {
        const state = await page.evaluate(() => ({
          headerIdentity:
            window.__ttSelectedHeader === document.querySelector("[data-site-header]"),
          historyLength: history.length,
          scrollY: window.scrollY,
          timeOrigin: performance.timeOrigin,
          url: window.location.href,
        }));
        assert(
          state.headerIdentity &&
            state.historyLength === initial.historyLength &&
            Math.abs(state.scrollY - initial.scrollY) <= 2 &&
            state.timeOrigin === initial.timeOrigin &&
            state.url === initial.url,
          `Selected nav ${input} changed document state: ${JSON.stringify({ initial, state })}`,
        );
      };

      const box = await activeLink.boundingBox();
      assert(box, "Selected desktop link has no pointer geometry");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
      await assertUnchanged("pointer click");
      assert(
        (await activeLink.evaluate((element) => getComputedStyle(element).pointerEvents)) ===
          "none",
        "Selected desktop link still accepts pointer events",
      );

      await activeLink.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      await assertUnchanged("keyboard Enter");
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
        "/vi/projects-products/",
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
                  getComputedStyle(header.querySelector(".brand-mark path")).fill,
                  getComputedStyle(header.querySelector(".brand-copy")).color,
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

      const trace = await page.evaluate(() => window.__ttRouteTrace || []);
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
        "Route trace did not record cover → swap → reveal",
      );
      const coverMs = trace[coveredIndex].time - trace[transitionIndex].time;
      const revealMs =
        trace[finishedIndex].time - trace[revealStartedIndex].time;
      assert(
        coverMs >= 550 && coverMs <= 1_000,
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
  await runPageCase(
    "history restores each route's own reading position",
    { route: "/vi/residential/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      const setScroll = async (scrollY) => {
        await page.evaluate((value) => {
          document.documentElement.style.scrollBehavior = "auto";
          window.scrollTo(0, value);
        }, scrollY);
        await page.waitForFunction((value) => Math.abs(window.scrollY - value) <= 2, scrollY);
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

      await gotoRoute(page, "/vi/residential/");
      await setScroll(1_500);
      const commercialLink = await findRouteLink(
        page,
        "[data-site-header]",
        "/vi/commercial/",
      );
      await Promise.all([
        waitForPath(page, "/vi/commercial/"),
        commercialLink.evaluate((link) => link.click()),
      ]);
      await expectScroll(0, "Normal Commercial entry");

      await setScroll(900);
      await traverseHistory(page, "back", "/vi/residential/");
      await expectScroll(1_500, "Back to Residential");

      await traverseHistory(page, "forward", "/vi/commercial/");
      await expectScroll(900, "Forward to Commercial");
      assertDiagnostics(diagnostics);
    },
  );
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

async function runRealBfcacheProbe() {
  const executablePath =
    process.env.SYSTEM_CHROME_PATH ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
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
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
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

    await page.goto(pageUrl("/vi/projects-products/?bfcache=fail-open"), {
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
      canonicalPathname(page.url()) === "/vi/projects-products/",
      `Fail-open BFCache probe returned to ${page.url()}`,
    );
    const state = await page.evaluate(() => ({
      pageshow: window.__ttFailOpenBfcachePageshow,
      fallback: window.__ttMotionBoot?.fallback,
      claimed: window.__ttMotionBoot?.claimed,
      timer: window.__ttMotionBoot?.timer,
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
        state.timer === 0 &&
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
        if (!ROUTES.some((route) => canonicalPathname(route) === targetPath)) {
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
            projectLabels: [
              document.querySelector(
                '[data-site-header] a[href="/vi/projects-products/"]',
              ),
              document.querySelector(
                '#site-menu .menu-group a[href="/vi/projects-products/"] [data-vi]',
              ),
            ].map((element) => element?.textContent?.replace(/\s+/g, " ").trim()),
            title: document.title,
            meta: document.querySelector('meta[name="description"]')?.getAttribute("content"),
            text: leaf?.textContent?.replace(/\s+/g, " ").trim(),
          };
        });
        assert(
          initial.projectLabels.every(
            (label) => label === "Công trình & sản phẩm",
          ),
          `${route}: Vietnamese project/product navigation labels differ`,
        );
        await gotoRoute(page, englishRoute);
        await page.waitForFunction(
          () => document.documentElement.lang === "en",
          null,
          { timeout: 3_000 },
        );
        if (DIRECT_MOTTO_ROUTES.includes(route)) {
          await page.waitForFunction(
            () => {
              const motto = document.querySelector(".detail-hero-motto");
              const mask = motto?.querySelector(".motion-line-mask");
              return (
                motto?.closest(".hero") &&
                motto.querySelector(".motion-line") &&
                Number.parseFloat(
                  getComputedStyle(mask).getPropertyValue(
                    "--mask-ink-overflow",
                  ),
                ) > 0
              );
            },
            null,
            { timeout: 3_000 },
          );
        }
        const translated = await page.evaluate(() => {
          const meta = document.querySelector('meta[name="description"][data-en-content]');
          const text = [...document.querySelectorAll("main [data-en]")].find(
            (element) =>
              !element.closest("[data-cms], [data-motion-words], [data-motion-lines]") &&
              !element.matches(".hero-word"),
          );
          const image = document.querySelector("img[data-en-alt]");
          const labelled = document.querySelector("[data-en-aria-label]");
          const motto = document.querySelector(".detail-hero-motto");
          const mottoMask = motto?.querySelector(".motion-line-mask");
          const mottoRect = motto?.getBoundingClientRect();
          const heroRect = motto?.closest(".hero")?.getBoundingClientRect();
          return {
            projectLabels: [
              document.querySelector(
                '[data-site-header] a[href="/en/projects-products/"]',
              ),
              document.querySelector(
                '#site-menu .menu-group a[href="/en/projects-products/"] [data-en]',
              ),
            ].map((element) => element?.textContent?.replace(/\s+/g, " ").trim()),
            title: document.title,
            meta: meta?.getAttribute("content"),
            text: text?.textContent?.replace(/\s+/g, " ").trim(),
            expectedText: text?.dataset.en?.replace(/\s+/g, " ").trim(),
            alt: image?.getAttribute("alt"),
            expectedAlt: image?.dataset.enAlt,
            aria: labelled?.getAttribute("aria-label"),
            expectedAria: labelled?.dataset.enAriaLabel,
            motto: motto
              ? {
                  text: motto.textContent.trim(),
                  lines: motto.querySelectorAll(".motion-line").length,
                  inkOverflow: Number.parseFloat(
                    getComputedStyle(mottoMask).getPropertyValue(
                      "--mask-ink-overflow",
                    ),
                  ),
                  clipPath: getComputedStyle(mottoMask).clipPath,
                  insideHero:
                    mottoRect.top >= heroRect.top &&
                    mottoRect.bottom <= heroRect.bottom,
                }
              : null,
          };
        });
        assert(
          translated.title !== initial.title,
          `${route}: title did not translate`,
        );
        assert(
          translated.projectLabels.every(
            (label) => label === "Projects & products",
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
        if (DIRECT_MOTTO_ROUTES.includes(route)) {
          assert(
            translated.motto?.text &&
              translated.motto.lines > 0 &&
              translated.motto.inkOverflow > 0 &&
              translated.motto.clipPath !== "none" &&
              translated.motto.insideHero,
            `${route}: hero motto is not translation/motion/font-mask safe`,
          );
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
    "locale switch keeps query and reading position",
    { route: "/vi/residential/?qa=scroll", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      const switchLocale = async (expectedUrl) => {
        const expectedLanguage = expectedUrl.startsWith("/en/") ? "en" : "vi";
        await page.evaluate(() => {
          document.querySelector("[data-site-header]")?.classList.remove("is-hidden");
          document.querySelector("[data-menu-open]")?.click();
        });
        await waitForMenuState(page, true);
        await waitForMenuVisualState(page);
        const transitionStarted = page.waitForFunction(() =>
          document.body.classList.contains("is-transitioning"),
        );
        await page
          .locator(`#site-menu [data-language-option="${expectedLanguage}"]`)
          .evaluate((button) => button.click());
        await transitionStarted;
        await page.waitForURL(
          (url) =>
            `${url.pathname}${url.search}` === expectedUrl && url.hash === "",
          { timeout: 6_000 },
        );
        await waitForNavigationCleanup(page);
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
      assertDiagnostics(diagnostics);
    },
  );
}

async function runSsrCmsHydrationCheck() {
  const viewport = { width: 390, height: 844 };
  for (const expected of SSR_CMS_HYDRATION_CASES) {
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
              new URL(node.href).pathname.endsWith("/projects-products/"),
            );
            const label = link?.matches("[data-vi], [data-en]")
              ? link
              : link?.querySelector("[data-vi], [data-en]");
            return normalize(label?.textContent || link?.textContent || "");
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
        await page.locator("[data-menu-open]").click();
        await waitForMenuState(page, true);
        await page.waitForTimeout(250);
        const earlyFrame = await page.locator("#site-menu").evaluate((dialog) => {
          const shutters = [...dialog.querySelectorAll(".menu-shutters i")];
          const animatedCopy = [
            dialog.querySelector(".menu-brand"),
            dialog.querySelector(".menu-language"),
            dialog.querySelector(".menu-appointment"),
            dialog.querySelector(".menu-nav"),
            ...dialog.querySelectorAll(".menu-group"),
            ...dialog.querySelectorAll(".menu-group__number, .menu-group__title, .menu-option"),
            dialog.querySelector("[data-menu-close]"),
          ].filter(Boolean);
          return {
            coverageIncomplete: shutters.some(
              (shutter) =>
                shutter.getBoundingClientRect().height < window.innerHeight - 1,
            ),
            copyVisible: animatedCopy.some((element) => {
              const style = getComputedStyle(element);
              return (
                style.visibility !== "hidden" &&
                Number.parseFloat(style.opacity) > 0.01
              );
            }),
          };
        });
        assert(
          earlyFrame.coverageIncomplete,
          `${viewport.width}x${viewport.height}: menu background finished before sequencing probe`,
        );
        assert(
          !earlyFrame.copyVisible,
          `${viewport.width}x${viewport.height}: menu copy appeared before background coverage`,
        );
        await waitForMenuVisualState(page);
        const menuContract = await page.locator("#site-menu").evaluate((dialog) => ({
          closeText: dialog
            .querySelector("[data-menu-close]")
            ?.textContent?.trim(),
          titles: [...dialog.querySelectorAll(".menu-group__title")].map((link) => link.getAttribute("href")),
          childGroupCount: dialog.querySelectorAll(".menu-group__links").length,
          childItemCount: dialog.querySelectorAll(".menu-option").length,
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
          fitsViewport:
            dialog.scrollWidth <= window.innerWidth + 1 &&
            dialog.scrollHeight <= window.innerHeight + 1,
        }));
        assert(
          menuContract.closeText === "",
          `${viewport.width}x${viewport.height}: close control must be icon-only`,
        );
        assert(
          menuContract.childGroupCount === 4 &&
            menuContract.childItemCount === 15 &&
            menuContract.fragmentLinkCount === 0 &&
            JSON.stringify(menuContract.titles) === JSON.stringify([
              "/vi/residential/",
              "/vi/commercial/",
              "/vi/projects-products/",
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
          `${viewport.width}x${viewport.height}: menu overflows viewport`,
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
        const retainedMenuState = await page.locator("#site-menu").evaluate(
          (dialog) => ({
            active: dialog.classList.contains("is-active"),
            bodyOpen: document.body.classList.contains("menu-open"),
            expanded:
              document
                .querySelector("[data-menu-open]")
                ?.getAttribute("aria-expanded") === "true",
            open: dialog.open,
          }),
        );
        assert(
          page.url() === currentUrl &&
            mainFrameNavigations.length === 0 &&
            retainedMenuState.open &&
            retainedMenuState.active &&
            retainedMenuState.bodyOpen &&
            retainedMenuState.expanded,
          `${viewport.width}x${viewport.height}: current menu title reloaded or closed the page`,
        );
        await closeMenu(page);
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

async function runAdvertisingFilterCheck() {
  const viewport = { width: 1440, height: 900 };
  await runPageCase(
    "advertising filter hides and reflows",
    { route: "/vi/projects-products/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/projects-products/");

      const before = await page.locator("[data-project-grid]").evaluate((grid) => ({
        height: grid.getBoundingClientRect().height,
        tiles: [...grid.querySelectorAll("[data-project-category]")].map(
          (tile, index) => {
            const rect = tile.getBoundingClientRect();
            return {
              index,
              category: tile.dataset.projectCategory,
              hidden: tile.hidden,
              left: rect.left,
              top: rect.top,
            };
          },
        ),
      }));
      await page.locator('[data-project-filter="kiosk"]').click();
      await page.waitForFunction(
        () => {
          const tiles = [
            ...document.querySelectorAll("[data-project-category]"),
          ];
          return (
            document
              .querySelector('[data-project-filter="kiosk"]')
              ?.getAttribute("aria-pressed") === "true" &&
            tiles.every(
              (tile) =>
                tile.hidden === (tile.dataset.projectCategory !== "kiosk"),
            )
          );
        },
        null,
        { timeout: 3_000 },
      );

      const after = await page.locator("[data-project-grid]").evaluate((grid) => ({
        height: grid.getBoundingClientRect().height,
        tiles: [...grid.querySelectorAll("[data-project-category]")].map(
          (tile, index) => {
            const rect = tile.getBoundingClientRect();
            return {
              index,
              category: tile.dataset.projectCategory,
              hidden: tile.hidden,
              left: rect.left,
              top: rect.top,
            };
          },
        ),
      }));
      const visible = after.tiles.filter((tile) => !tile.hidden);
      const kioskCount = before.tiles.filter(
        (tile) => tile.category === "kiosk",
      ).length;
      assert(visible.length === kioskCount, `Expected ${kioskCount} kiosk tiles, found ${visible.length}`);
      assert(
        visible.every((tile) => tile.category === "kiosk"),
        "A non-kiosk tile remained visible",
      );
      assert(
        after.tiles.filter((tile) => tile.hidden).length ===
          before.tiles.length - kioskCount,
        "Filter did not hide every non-kiosk tile",
      );
      assert(
        after.height < before.height,
        `Project grid did not shrink: ${before.height}px → ${after.height}px`,
      );
      const moved = visible.some((tile) => {
        const previous = before.tiles.find((item) => item.index === tile.index);
        return (
          previous &&
          (Math.abs(previous.left - tile.left) > 1 ||
            Math.abs(previous.top - tile.top) > 1)
        );
      });
      assert(moved, "Visible kiosk tiles did not reflow after filtering");
      assert(
        (await page
          .locator('[data-project-filter="kiosk"]')
          .getAttribute("aria-pressed")) === "true",
        "Active filter did not expose aria-pressed=true",
      );
      await page.locator('[data-project-filter="all"]').click();
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("[data-project-category]")].every(
            (tile) => !tile.hidden,
          ),
        null,
        { timeout: 3_000 },
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runProjectsProductsHeroEditorialCheck() {
  const viewports = [
    { width: 320, height: 640 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 900 },
  ];

  for (const locale of ["vi", "en"]) {
    for (const viewport of viewports) {
      await runPageCase(
        `projects editorial hero ${locale} ${viewport.width}x${viewport.height}`,
        { route: `/${locale}/projects-products/`, viewport },
        async (page) => {
          const diagnostics = monitorPage(page);
          await gotoRoute(page, `/${locale}/projects-products/`);
          await page.waitForFunction(
            () =>
              [...document.querySelectorAll(".detail-index-hero .project-filter")].every(
                (filter) => {
                  const styles = getComputedStyle(filter);
                  return styles.visibility !== "hidden" && Number.parseFloat(styles.opacity) > 0.99;
                },
              ),
            null,
            { timeout: 3_000 },
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
            const heading = element.querySelector("h1");
            const headingRect = heading.getBoundingClientRect();
            const lineRects = [...heading.querySelectorAll(".detail-hero-line-mask")].map((line) => {
              const rect = line.getBoundingClientRect();
              return { left: rect.left, right: rect.right, width: rect.width };
            });
            const textRects = [...heading.querySelectorAll("[data-motion-word-source]")].map((source) => {
              const range = document.createRange();
              range.selectNodeContents(source);
              const rect = range.getBoundingClientRect();
              return { left: rect.left, right: rect.right, width: rect.width };
            });
            const activeFilter = element.querySelector('.project-filter[aria-pressed="true"]');
            const activeFilterStyles = getComputedStyle(activeFilter);
            const header = document.querySelector("[data-site-header]");
            const styles = getComputedStyle(element);
            const heroRect = element.getBoundingClientRect();
            const filtersRect = element.querySelector(".project-filters").getBoundingClientRect();
            const gridRect = document.querySelector("[data-project-grid]").getBoundingClientRect();

            return {
              backgroundIsWhite: isWhite(styles.backgroundColor),
              filterBorders: [...element.querySelectorAll(".project-filter")].map((filter) => getComputedStyle(filter).borderStyle),
              hasHeroSlides: element.querySelector(".hero-slides") !== null,
              hasHeroMedia: Boolean(element.querySelector("img, figure")),
              hasHeroKicker: element.querySelector(".hero-kicker") !== null,
              hasHeroMotto: element.querySelector(".detail-hero-motto") !== null,
              headerIsInk: header.classList.contains("is-ink"),
              headingColorIsInk: isInk(getComputedStyle(heading).color),
              headingFits: heading.scrollWidth <= heading.clientWidth + 1 && headingRect.left >= -1 && headingRect.right <= window.innerWidth + 1 && lineRects.every((line) => line.left >= -1 && line.right <= window.innerWidth + 1),
              headingFontSize: Number.parseFloat(getComputedStyle(heading).fontSize),
              headingLineCount: lineRects.length,
              headingText: heading.textContent.replace(/\s+/g, " ").trim(),
              letterSpacing: Number.parseFloat(getComputedStyle(heading).letterSpacing),
              asymmetricTitle: textRects.length === 2 && textRects[1].left - textRects[0].left >= 12,
              activeUnderlineVisible: activeFilterStyles.textDecorationLine.includes("underline") && activeFilterStyles.textDecorationThickness === "3px" && activeFilterStyles.textUnderlineOffset === "4px",
              contentIsWithinHero: [headingRect, filtersRect].every(
                (rect) =>
                  rect.top >= heroRect.top - 1 &&
                  rect.bottom <= heroRect.bottom + 1 &&
                  rect.left >= heroRect.left - 1 &&
                  rect.right <= heroRect.right + 1,
              ),
              titleBlockStartsWithinHero: headingRect.top >= heroRect.top - 1,
              filtersAreLower: filtersRect.top >= heroRect.top + heroRect.height * 0.55,
              fullViewport: heroRect.top <= 1 && heroRect.bottom >= window.innerHeight - 1,
              gridStartsAfterHero: gridRect.top >= heroRect.bottom - 1,
              noHorizontalOverflow: document.documentElement.scrollWidth - window.innerWidth <= 1,
              tone: element.dataset.headerTone,
            };
          });

          const expectedTitle = locale === "en" ? "Projects & products" : "Công trình & sản phẩm";
          assert(hero.tone === "ink" && hero.headerIsInk, `${locale} ${viewport.width}x${viewport.height}: header did not start in ink tone`);
          assert(hero.backgroundIsWhite && hero.headingColorIsInk, `${locale} ${viewport.width}x${viewport.height}: editorial hero is not white with ink content`);
          assert(!hero.hasHeroSlides && !hero.hasHeroMedia && !hero.hasHeroKicker && !hero.hasHeroMotto, `${locale} ${viewport.width}x${viewport.height}: retired hero media or removed copy remains in the reading order`);
          assert(hero.fullViewport && hero.gridStartsAfterHero, `${locale} ${viewport.width}x${viewport.height}: project content enters the first hero viewport`);
          assert(hero.contentIsWithinHero && hero.titleBlockStartsWithinHero, `${locale} ${viewport.width}x${viewport.height}: hero title or controls escape above the hero viewport`);
          assert(hero.headingText === expectedTitle && hero.headingLineCount === 2 && hero.headingFits && hero.asymmetricTitle, `${locale} ${viewport.width}x${viewport.height}: two-line title overflowed, changed, or lost its asymmetric alignment`);
          assert(hero.headingFontSize <= 112.1 && hero.letterSpacing >= -4.49, `${locale} ${viewport.width}x${viewport.height}: hero title exceeded the editorial type bounds`);
          assert(hero.filterBorders.every((border) => border === "none") && hero.activeUnderlineVisible, `${locale} ${viewport.width}x${viewport.height}: filters are not plain text controls with an active underline`);
          assert(hero.filtersAreLower && hero.noHorizontalOverflow, `${locale} ${viewport.width}x${viewport.height}: lower filter rhythm or horizontal bounds failed`);
          const kioskFilter = page.locator('[data-project-filter="kiosk"]');
          await kioskFilter.focus();
          assert(
            await kioskFilter.evaluate((filter) => document.activeElement === filter),
            `${locale} ${viewport.width}x${viewport.height}: kiosk filter cannot receive keyboard focus`,
          );

          if (viewport.width <= 390) {
            const firstFilter = page.locator('[data-project-filter="all"]');
            const lastFilter = page.locator('[data-project-filter="lightbox"]');
            await firstFilter.focus();
            for (let index = 0; index < 4; index += 1) {
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
              () => document.querySelector('[data-project-filter="lightbox"]')?.getAttribute("aria-pressed") === "true",
              null,
              { timeout: 3_000 },
            );
            await page.keyboard.press("Space");
            assert(
              (await lastFilter.getAttribute("aria-pressed")) === "true",
              `${locale} ${viewport.width}x${viewport.height}: Space did not preserve final filter activation`,
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
    "commercial gallery next moves track",
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
      const before = await track.evaluate((element) => ({
        left: element.scrollLeft,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      assert(
        before.scrollWidth > before.clientWidth,
        "Gallery track has no horizontal overflow to advance",
      );
      await page.locator("[data-gallery-next]").click();
      await page.waitForFunction(
        (start) =>
          document.querySelector("[data-gallery-track]")?.scrollLeft > start + 1,
        before.left,
        { timeout: 3_000 },
      );
      const after = await track.evaluate((element) => element.scrollLeft);
      assert(after > before.left + 1, `Gallery did not move: ${before.left}px → ${after}px`);

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
      const imageBox = await page
        .locator("[data-gallery-track] img")
        .first()
        .boundingBox();
      assert(imageBox, "Gallery image has no mouse target");
      const startX = imageBox.x + imageBox.width * 0.72;
      const y = imageBox.y + imageBox.height * 0.5;
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
        heading?.name?.value?.includes("Không gian"),
        `Early AX h1 missing: ${JSON.stringify(heading?.name?.value)}`,
      );
      const early = await page.locator("h1").evaluate((element) => {
        const style = getComputedStyle(element);
        const contentStyle = getComputedStyle(
          element.closest(".hero-content") || element,
        );
        return {
          opacity: Number.parseFloat(contentStyle.opacity),
          visibility: style.visibility,
        };
      });
      releaseMotion();
      assert(
        early.opacity <= 0.01 && early.visibility === "visible",
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
      route: "/vi/projects-products/",
      selector: "[data-motion-hero-wrapper-zoom]",
      label: "project hero wrapper",
    },
    {
      route: "/vi/about/",
      selector: "[data-motion-hero-media]",
      label: "about hero media",
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
              if (elapsed < 2_700) requestAnimationFrame(sample);
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
        const middle = trace.samples.find((sample) => sample.elapsed >= 350);
        const end = trace.samples.at(-1);
        assert(
          start.scale >= 1.18 && middle.scale < start.scale && middle.scale > 1.01,
          `${entry.label} did not expose a painted 1.2 start: ${JSON.stringify({ start, middle })}`,
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
      destination: "/vi/projects-products/",
      trigger: async (page) => {
        const link = await findRouteLink(
          page,
          "[data-site-header]",
          "/vi/projects-products/",
        );
        await link.click();
      },
    },
    {
      label: "about hero media",
      selector: "[data-motion-hero-media]",
      source: "/vi/projects-products/",
      destination: "/vi/about/",
      trigger: async (page) => {
        await openMenu(page);
        const link = await findRouteLink(page, "#site-menu", "/vi/about/");
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

async function projectFinalGeometry(page) {
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
        getComputedStyle(header.querySelector(".brand-mark path")).fill,
        getComputedStyle(header.querySelector(".brand-copy")).color,
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
        getComputedStyle(header.querySelector(".brand-mark path")).fill,
        getComputedStyle(header.querySelector(".brand-copy")).color,
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
    { route: "/vi/projects-products/", expected: 47, label: "ink projects" },
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
        const target = await findRouteLink(
          page,
          "[data-site-header]",
          "/vi/residential/",
        );
        await target.evaluate((element) => element.click());
        await routeSeen;
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
            getComputedStyle(header.querySelector(".brand-mark path")).fill,
            getComputedStyle(header.querySelector(".brand-copy")).color,
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
            fallback.veilPointerEvents === "none" &&
            (await page.evaluate(() => window.__ttMotionBoot?.timer)) === 0,
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
      { route: "/vi/projects-products/", viewport },
      async (page) => {
        const pageErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await gotoRoute(page, "/vi/projects-products/");
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
          pageUrl(`/vi/projects-products/?motion-abort=${viewport.width}`),
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
          heading?.name?.value?.includes("Công trình"),
          `Fail-open h1 missing from AX tree: ${JSON.stringify(heading?.name?.value)}`,
        );
        const filterState = await page.evaluate(() => ({
          allTiles: document.querySelectorAll(
            "[data-project-grid] [data-project-category]",
          ).length,
          kioskTiles: document.querySelectorAll(
            '[data-project-grid] [data-project-category="kiosk"]',
          ).length,
        }));
        assert(
          filterState.allTiles > filterState.kioskTiles &&
            filterState.kioskTiles > 0,
          `Fail-open fixture cannot prove filtering: ${JSON.stringify(filterState)}`,
        );
        await page.locator('[data-project-filter="kiosk"]').click();
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-project-filter="kiosk"]')
              ?.getAttribute("aria-pressed") === "true",
        );
        const filteredState = await page.evaluate(() => ({
          visible: [
            ...document.querySelectorAll(
              "[data-project-grid] [data-project-category]",
            ),
          ]
            .filter((tile) => !tile.hidden)
            .map((tile) => tile.dataset.projectCategory),
        }));
        assert(
          filteredState.visible.length === filterState.kioskTiles &&
            filteredState.visible.every((category) => category === "kiosk"),
          `Fail-open filter did not isolate kiosk tiles: ${JSON.stringify(filteredState)}`,
        );
        await page.locator('[data-project-filter="all"]').click();
        await page.waitForFunction(
          (expected) =>
            document
              .querySelector('[data-project-filter="all"]')
              ?.getAttribute("aria-pressed") === "true" &&
            [
              ...document.querySelectorAll(
                "[data-project-grid] [data-project-category]",
              ),
            ].filter((tile) => !tile.hidden).length === expected,
          filterState.allTiles,
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
      for (const route of ["", "projects-products/"]) {
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
    "stale tt-route fails open without an opaque veil",
    { route: "/vi/residential/", viewport: { width: 390, height: 844 } },
    async (page) => {
      await page.addInitScript(() => sessionStorage.setItem("tt-route", "1"));
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
          routeToken: sessionStorage.getItem("tt-route"),
          veilOpacity: Number.parseFloat(getComputedStyle(veil).opacity),
          veilPointerEvents: getComputedStyle(veil).pointerEvents,
        };
      });
      assert(
        state.brandColor === "rgb(255, 255, 255)" &&
          state.headerVisible &&
          !state.routeEnter &&
          state.routeToken === null &&
          state.veilOpacity <= 0.001 &&
          state.veilPointerEvents === "none",
        `Stale route did not fail open: ${JSON.stringify(state)}`,
      );
    },
  );

  await runPageCase(
    "motion arriving after watchdog adopts final state without replay",
    { route: "/vi/projects-products/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      await page.route("**/*motion.js*", async (route) => {
        const response = await route.fetch();
        await new Promise((resolve) => setTimeout(resolve, 3_400));
        await route.fulfill({ response });
      });
      const navigation = page.goto(pageUrl("/vi/projects-products/?slow-motion=1"), {
        waitUntil: "load",
        timeout: 20_000,
      });
      await page.waitForFunction(
        () => document.documentElement.classList.contains("motion-fallback"),
        null,
        { timeout: 3_200 },
      );
      await page.evaluate(() => {
        window.__ttLateFilterLayoutEvents = 0;
        window.addEventListener("site:layout", () => {
          window.__ttLateFilterLayoutEvents += 1;
        });
      });
      await page.locator('[data-project-filter="kiosk"]').click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-project-filter="kiosk"]')
            ?.getAttribute("aria-pressed") === "true" &&
          window.__ttLateFilterLayoutEvents === 1,
      );
      await page.evaluate(() => {
        const target = document.querySelector(".detail-index-hero .hero-content");
        const baseline = target.getBoundingClientRect();
        window.__ttLateMotionTrace = [];
        const started = performance.now();
        const sample = () => {
          const rect = target.getBoundingClientRect();
          const style = getComputedStyle(target);
          window.__ttLateMotionTrace.push({
            elapsed: performance.now() - started,
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            opacity: Number.parseFloat(style.opacity),
            fallback: document.documentElement.classList.contains("motion-fallback"),
          });
          if (performance.now() - started < 1_800) requestAnimationFrame(sample);
        };
        window.__ttLateMotionBaseline = {
          top: baseline.top,
          left: baseline.left,
          width: baseline.width,
          height: baseline.height,
        };
        sample();
      });
      await navigation;
      await page.waitForFunction(
        () =>
          window.__ttMotionRuntimeHealthy === true &&
          !document.documentElement.classList.contains("motion-fallback"),
      );
      await page.waitForTimeout(1_900);
      const state = await page.evaluate(() => ({
        baseline: window.__ttLateMotionBaseline,
        boot: {
          claimed: window.__ttMotionBoot?.claimed,
          fallback: window.__ttMotionBoot?.fallback,
        },
        samples: window.__ttLateMotionTrace,
      }));
      for (const sample of state.samples) {
        for (const key of ["top", "left", "width", "height"]) {
          assert(
            Math.abs(sample[key] - state.baseline[key]) <= 1,
            `Late motion replayed ${key}: ${JSON.stringify(sample)}`,
          );
        }
        assert(sample.opacity >= 0.99, `Late motion hid content: ${JSON.stringify(sample)}`);
      }
      assert(
        state.boot.claimed === true && state.boot.fallback === false,
        `Late motion did not take over once: ${JSON.stringify(state.boot)}`,
      );
      await page.evaluate(() => {
        window.__ttLateFilterLayoutEvents = 0;
      });
      await page.locator('[data-project-filter="all"]').click();
      const filterTakeover = await page.evaluate(() => ({
        active: document
          .querySelector('[data-project-filter="all"]')
          ?.getAttribute("aria-pressed"),
        layoutEvents: window.__ttLateFilterLayoutEvents,
      }));
      assert(
        filterTakeover.active === "true" && filterTakeover.layoutEvents === 1,
        `Late takeover duplicated or lost filter listeners: ${JSON.stringify(filterTakeover)}`,
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
  const exerciseFilter = async (page, category) => {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await page.evaluate(() => {
      if (!window.__ttDelayedDetailLayoutListener) {
        window.__ttDelayedDetailLayoutListener = true;
        window.addEventListener("site:layout", () => {
          window.__ttDelayedDetailLayoutEvents += 1;
        });
      }
      window.__ttDelayedDetailLayoutEvents = 0;
    });
    await page.locator(`[data-project-filter="${category}"]`).click();
    return page.evaluate((activeCategory) => {
      const tiles = [
        ...document.querySelectorAll(
          "[data-project-grid] [data-project-category]",
        ),
      ];
      return {
        active: document
          .querySelector(`[data-project-filter="${activeCategory}"]`)
          ?.getAttribute("aria-pressed"),
        events: window.__ttDelayedDetailLayoutEvents,
        total: tiles.length,
        visible: tiles
          .filter((tile) => !tile.hidden)
          .map((tile) => tile.dataset.projectCategory),
      };
    }, category);
  };
  const assertFilter = (state, category, label) => {
    assert(
      state.active === "true" &&
        state.events === 1 &&
        state.visible.length > 0 &&
        (category === "all"
          ? state.visible.length === state.total
          : state.visible.every((item) => item === category)),
      `${label} filter is inert or duplicated: ${JSON.stringify(state)}`,
    );
  };

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await runPageCase(
      `delayed detail mounts fail-open filters once ${viewport.width}x${viewport.height}`,
      { route: "/vi/projects-products/", viewport },
      async (page) => {
        await page.route(detailPattern, delayResponse(4_200));
        await page.route(motionPattern, (route) => route.abort("failed"));
        let abortedNavigationError;
        const abortedNavigation = page
          .goto(
            pageUrl(`/vi/projects-products/?delayed-detail-abort=${viewport.width}`),
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
        await page.waitForFunction(() => Boolean(window.TruongThinhDetail), null, {
          timeout: 6_000,
        });
        const abortedResponse = await abortedNavigation;
        assert(
          abortedResponse &&
            !abortedNavigationError &&
            abortedResponse.status() < 400,
          `Delayed-detail abort page did not load: ${abortedNavigationError}`,
        );
        assertFilter(
          await exerciseFilter(page, "kiosk"),
          "kiosk",
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
        let takeoverNavigationError;
        const takeoverNavigation = page
          .goto(
            pageUrl(`/vi/projects-products/?delayed-detail-takeover=${viewport.width}`),
            { waitUntil: "load", timeout: 20_000 },
          )
          .catch((error) => {
            takeoverNavigationError = error;
            return null;
          });
        await page.waitForFunction(
          () => document.documentElement.classList.contains("motion-fallback"),
          null,
          { timeout: 5_000 },
        );
        await page.waitForFunction(() => Boolean(window.TruongThinhDetail), null, {
          timeout: 6_000,
        });
        assertFilter(
          await exerciseFilter(page, "kiosk"),
          "kiosk",
          "Delayed-detail pre-takeover kiosk",
        );
        const takeoverResponse = await takeoverNavigation;
        assert(
          takeoverResponse &&
            !takeoverNavigationError &&
            takeoverResponse.status() < 400,
          `Delayed-detail takeover page did not load: ${takeoverNavigationError}`,
        );
        await page.waitForFunction(
          () =>
            window.__ttMotionRuntimeHealthy === true &&
            !document.documentElement.classList.contains("motion-fallback"),
          null,
          { timeout: 5_000 },
        );
        assertFilter(
          await exerciseFilter(page, "all"),
          "all",
          "Delayed-detail post-takeover All",
        );
      },
    );
  }
}

async function runBootClaimReleaseRaceCheck() {
  await runPageCase(
    "runtime claim suppresses the fail-open locale handler before release",
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    async (page) => {
      await page.addInitScript(() => {
        const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (callback) =>
          nativeRequestAnimationFrame((time) => {
            if (
              window.__ttMotionBoot?.claimed &&
              window.__ttMotionBoot?.fallback
            ) {
              window.setTimeout(() => callback(performance.now()), 120);
              return;
            }
            callback(time);
          });
      });
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
      await page.waitForFunction(
        () => document.documentElement.classList.contains("motion-fallback"),
        null,
        { timeout: 4_000 },
      );
      await page.waitForFunction(
        () =>
          window.__ttMotionBoot?.claimed === true &&
          window.__ttMotionBoot?.fallback === true,
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
        timer: window.__ttMotionBoot?.timer,
        lang: document.documentElement.lang,
        headerSamples: window.__ttTakeoverHeaderTrace.samples,
      }));
      assert(
        targetRequests.length === 1,
        `Claim window triggered ${targetRequests.length} locale requests: ${JSON.stringify(targetRequests)}`,
      );
      assert(
        state.claimed === true &&
          state.fallback === false &&
          state.timer === 0 &&
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
  await runPageCase(
    "service hero labels stay synchronized and timelines plateau for 25 cycles",
    { route: "/vi/residential/", viewport },
    async (page) => {
      const diagnostics = monitorPage(page);
      await gotoRoute(page, "/vi/residential/");
      await page.evaluate(() => {
        window.__ttHeroLifecycle = { changes: 0, mismatches: [] };
        const hero = document.querySelector(".hero");
        const check = () => {
          const slideIndex = [
            ...hero.querySelectorAll(".hero-slide"),
          ].findIndex((slide) => slide.classList.contains("is-active"));
          const labelIndex = [
            ...hero.querySelectorAll("[data-hero-label]"),
          ].findIndex((label) => label.classList.contains("is-active"));
          window.__ttHeroLifecycle.changes += 1;
          if (slideIndex !== labelIndex) {
            window.__ttHeroLifecycle.mismatches.push({ slideIndex, labelIndex });
          }
        };
        const observer = new MutationObserver(() => requestAnimationFrame(check));
        hero.querySelectorAll(".hero-slide").forEach((slide) =>
          observer.observe(slide, { attributes: true, attributeFilter: ["class"] }),
        );
        window.gsap.globalTimeline.timeScale(50);
      });
      const heroAnimationCount = () =>
        page.evaluate(() => {
          const hero = document.querySelector(".hero");
          return window.gsap.globalTimeline
            .getChildren(true, true, true)
            .filter(
              (animation) =>
                animation.targets?.().some(
                  (target) => target instanceof Element && hero.contains(target),
                ),
            ).length;
        });
      await page.waitForFunction(
        () => window.__ttHeroLifecycle?.changes >= 6,
        null,
        { timeout: 4_000 },
      );
      const afterSix = await heroAnimationCount();
      await page.waitForFunction(
        () => window.__ttHeroLifecycle?.changes >= 12,
        null,
        { timeout: 4_000 },
      );
      const afterTwelve = await heroAnimationCount();
      await page.waitForFunction(
        () => window.__ttHeroLifecycle?.changes >= 25,
        null,
        { timeout: 8_000 },
      );
      const afterTwentyFive = await heroAnimationCount();
      const lifecycle = await page.evaluate(() => window.__ttHeroLifecycle);
      assert(
        lifecycle.mismatches.length === 0,
        `Hero labels desynchronized: ${JSON.stringify(lifecycle.mismatches)}`,
      );
      assert(
        afterTwelve <= afterSix + 1 && afterTwentyFive <= afterSix + 1,
        `Hero animation count grew across cycles: ${afterSix} → ${afterTwelve} → ${afterTwentyFive}`,
      );
      assertDiagnostics(diagnostics);
    },
  );
}

async function runHeroCrossFadeContinuityChecks() {
  const cases = [
    { route: "/vi/", viewport: { width: 1440, height: 900 } },
    { route: "/vi/residential/", viewport: { width: 1440, height: 900 } },
    { route: "/vi/commercial/", viewport: { width: 1440, height: 900 } },
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
              if (now - startedAt < 6_200) requestAnimationFrame(sample);
              else resolve();
            };
            requestAnimationFrame(sample);
          });

          let maxVisibleScaleJump = 0;
          let maxCrossFadeSumError = 0;
          for (let frame = 1; frame < samples.length; frame += 1) {
            const previous = samples[frame - 1];
            const current = samples[frame];
            current.forEach((sample, index) => {
              if (sample.opacity > 0.01 || previous[index].opacity > 0.01) {
                maxVisibleScaleJump = Math.max(
                  maxVisibleScaleJump,
                  Math.abs(sample.scale - previous[index].scale),
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

async function runPhysicalWheelTransformChecks() {
  const cases = [
    { name: "home hero", route: "/vi/", selector: ".hero-slides", axis: "y", limit: 12 },
    { name: "residential hero", route: "/vi/residential/", selector: ".hero-slides", axis: "y", limit: 12 },
    { name: "commercial hero", route: "/vi/commercial/", selector: ".hero-slides", axis: "y", limit: 12 },
    { name: "about hero", route: "/vi/about/", selector: "[data-motion-hero-media]", axis: "y", limit: 12 },
    { name: "about parallax media", route: "/vi/about/", selector: "[data-motion-media][data-scroll]", axis: "y", limit: 12 },
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
    /\{ scale: 1\.06 \}[\s\S]*scale: 1, duration: 5, ease: "sine\.inOut"[\s\S]*duration: 1\.6[\s\S]*4\.2[\s\S]*\.call\(\(\) => startSlide\(nextIndex\), null, 5\)/.test(
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
    "const coverRoute = (waitFor) => {",
    'document.body.classList.add("is-transitioning")',
    "const fade = new Promise((resolve) => {",
    "opacity: 1,",
    "duration: 0.75,",
    'ease: "power4.inOut"',
    "return Promise.all([fade, Promise.resolve(waitFor)]);",
    "async leave(data) {",
    "await coverRoute(closeMenu(false));",
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
    /const hardNavigate[\s\S]*sessionStorage\.setItem\("tt-route", "1"\)[\s\S]*window\.location\.assign/.test(
      motionSource,
    ),
    "The route request failure fallback changed",
  );
  assert(
    /const ink =\s*\n?\s*routeTransitionActive \|\|\s*\n?\s*collapsed \|\|/.test(
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
        const brandMark = header.querySelector(".brand-mark");
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
          portalSources: [...document.querySelectorAll("#dich-vu .service-portal > img")].map(
            (image) => new URL(image.currentSrc || image.src, location.href).pathname,
          ),
          routeShell: {
            headerZ: Number.parseInt(getComputedStyle(header).zIndex, 10),
            veilZ: Number.parseInt(getComputedStyle(veil).zIndex, 10),
            headerDisplay: getComputedStyle(header).display,
            headerVisibility: getComputedStyle(header).visibility,
            headerOpacity: getComputedStyle(header).opacity,
            brandMark: [
              Math.round(Number.parseFloat(getComputedStyle(brandMark).width)),
              Math.round(Number.parseFloat(getComputedStyle(brandMark).height)),
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
              (image) => new URL(image.currentSrc || image.src, location.href).pathname,
            ),
          },
          heritage: {
            maxWidth: getComputedStyle(
              document.querySelector(".heritage-rows"),
            ).maxWidth,
            sources: [...document.querySelectorAll(".heritage-image img")].map(
              (image) => new URL(image.currentSrc || image.src, location.href).pathname,
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
            "/assets/site/expanded/home-residential-kitchen.webp",
            "/assets/site/expanded/home-commercial-fnb.webp",
            "/assets/site/portal-options-round-2/advertising-fnb-mobile-cart-v2.webp",
          ]),
        `Home service portal sources changed: ${contract.portalSources.join(", ")}`,
      );
      assert(
        contract.routeShell.headerZ > contract.routeShell.veilZ &&
          contract.routeShell.headerDisplay !== "none" &&
          contract.routeShell.headerVisibility === "visible" &&
          contract.routeShell.headerOpacity === "1" &&
          contract.routeShell.brandMark[0] === 60 &&
          contract.routeShell.brandMark[1] === 60,
        "Route veil can hide the persistent site header",
      );
      assert(!contract.hero.hasIndex, "Home hero still has the retired slide index");
      assert(!contract.hero.hasKicker, "Home hero still has the retired kicker");
      assert(
        JSON.stringify(contract.hero.sources) ===
          JSON.stringify([
            "/assets/site/generated/residential-space.webp",
            "/assets/site/commercial/hero.webp",
            "/assets/site/advertising/hero-kiosk.webp",
            "/assets/site/advertising/mobile-retail.webp",
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
            "/assets/site/thumbs/legacy-hands-384.webp",
            "/assets/site/generated/montage-cnc-tablet.webp",
            "/assets/site/generated/montage-commitment-option-3-knot.webp",
            "/assets/site/generated/montage-residential-product-detail.webp",
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
      assert(portal.subtitleTop === null, "Portal subtitle still renders");

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

async function runReducedMotionChecks() {
  const viewport = { width: 390, height: 844 };
  for (const route of ROUTES) {
    await runPageCase(
      `reduced motion ${routeSlug(route)} 390x844`,
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
      },
    );
  }
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
  if (process.env.TT_E2E_STATIC_ONLY === "1") {
    assertPersistentNavigationContracts();
    console.log("[site-e2e] static contracts passed");
    return;
  }
  prepareReportDirectories();
  assertPersistentNavigationContracts();
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
    if (process.env.TT_E2E_MENU_ONLY === "1") {
      await runMenuChecks();
    } else if (process.env.TT_E2E_FRAGMENT_ONLY === "1") {
      await runDirectHeaderRouteChecks();
      await runInternalLinkCheck();
      await runLanguagePersistenceCheck();
      await runLanguageScrollRetentionCheck();
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
      await runBootClaimReleaseRaceCheck();
    } else if (process.env.TT_E2E_HERO_CONTINUITY_ONLY === "1") {
      await runHeroCrossFadeContinuityChecks();
    } else if (process.env.TT_E2E_M1_ONLY === "1") {
      await runPersistentBarbaNavigationChecks();
      await runEarlyHeroAccessibilityCheck();
      await runDetailHeroEntryChecks();
      await runGalleryCheck();
      await runHeroCarouselLifecycleCheck();
      await runHeroCrossFadeContinuityChecks();
      await runPhysicalWheelTransformChecks();
      await runNoScriptHeroCheck();
    } else if (process.env.TT_E2E_M2_ONLY === "1") {
      await runMotionAbortFailOpenChecks();
      await runDelayedDetailFallbackChecks();
      await runBootClaimReleaseRaceCheck();
      await runDetailHeroEntryChecks();
      await runHeroCarouselLifecycleCheck();
    } else {
      await runSmokeMatrix();
      await runRootProcessCheck();
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
      await runAdvertisingFilterCheck();
      await runGalleryCheck();
      await runEarlyHeroAccessibilityCheck();
      await runDetailHeroEntryChecks();
      await runHeroCarouselLifecycleCheck();
      await runHeroCrossFadeContinuityChecks();
      await runPhysicalWheelTransformChecks();
      await runNoScriptHeroCheck();
      await runMotionAbortFailOpenChecks();
      await runDelayedDetailFallbackChecks();
      await runBootClaimReleaseRaceCheck();
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
