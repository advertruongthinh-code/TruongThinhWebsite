const LOCALES = new Set(["vi", "en"]);
const PROJECT_TEMPLATES = new Set([
  "compact-gallery",
  "editorial-case",
  "process-film",
]);
const MENU_PROJECT_GROUPS = new Set([
  "residential",
  "commercial",
  "projects-products",
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCESS_JWKS_TTL_MS = 60 * 60 * 1000;
let accessJwksCache = { expiresAt: 0, keys: new Map() };
class CmsUnavailableError extends Error {}
const SOURCE_ROUTES = {
  home: "/index.html",
  residential: "/residential/index.html",
  commercial: "/commercial/index.html",
  "projects-products": "/projects-products/index.html",
  about: "/about/index.html",
};
const PAGE_IDS = new Set(Object.keys(SOURCE_ROUTES));
const LEGACY_ROUTES = {
  "/nha-o": "/vi/residential/",
  "/nha-o/": "/vi/residential/",
  "/nha-o/index.html": "/vi/residential/",
  "/kinh-doanh": "/vi/commercial/",
  "/kinh-doanh/": "/vi/commercial/",
  "/kinh-doanh/index.html": "/vi/commercial/",
  "/quang-cao": "/vi/projects-products/",
  "/quang-cao/": "/vi/projects-products/",
  "/quang-cao/index.html": "/vi/projects-products/",
  "/gioi-thieu": "/vi/about/",
  "/gioi-thieu/": "/vi/about/",
  "/gioi-thieu/index.html": "/vi/about/",
};
const SOURCE_ROUTE_REDIRECTS = {
  "/residential": "/vi/residential/",
  "/residential/": "/vi/residential/",
  "/residential/index.html": "/vi/residential/",
  "/commercial": "/vi/commercial/",
  "/commercial/": "/vi/commercial/",
  "/commercial/index.html": "/vi/commercial/",
  "/projects-products": "/vi/projects-products/",
  "/projects-products/": "/vi/projects-products/",
  "/projects-products/index.html": "/vi/projects-products/",
  "/about": "/vi/about/",
  "/about/": "/vi/about/",
  "/about/index.html": "/vi/about/",
};
const DEFAULT_SEO = {
  vi: {
    title: "Trường Thịnh — Hơn 20 năm vững tay nghề",
    description:
      "Trường Thịnh thiết kế, sản xuất và thi công nội thất nhà ở, nội thất kinh doanh và công trình quảng cáo.",
  },
  en: {
    title: "Trường Thịnh — 20+ Years of Craft",
    description:
      "Trường Thịnh designs, manufactures, and builds residential interiors, commercial interiors, and advertising structures.",
  },
};
const ADMIN_RESOURCES = {
  pages: {
    table: "pages",
    idColumn: "id",
    columns: ["id", "status", "content_json"],
    validate: validatePage,
  },
  projects: {
    table: "projects",
    idColumn: "id",
    columns: [
      "id",
      "slug",
      "template",
      "category_id",
      "status",
      "content_json",
      "cover_media_id",
      "menu_group",
      "menu_order",
    ],
    validate: validateProject,
    categoryKind: "project",
  },
  products: {
    table: "products",
    idColumn: "id",
    columns: [
      "id",
      "category_id",
      "position",
      "status",
      "content_json",
      "image_media_id",
    ],
    validate: validateProduct,
    categoryKind: "product",
  },
  "project-categories": {
    table: "project_categories",
    idColumn: "id",
    columns: ["id", "position", "label_vi", "label_en", "cover_path", "kind"],
    validate: (payload, routeId) => validateCategory(payload, routeId, "project"),
    order: "position ASC",
    where: "kind = 'project'",
    categoryKind: "project",
    references: [
      { table: "projects", column: "category_id" },
      { table: "products", column: "category_id" },
    ],
  },
  "product-categories": {
    table: "project_categories",
    idColumn: "id",
    columns: ["id", "position", "label_vi", "label_en", "cover_path", "kind"],
    validate: (payload, routeId) => validateCategory(payload, routeId, "product"),
    order: "position ASC",
    where: "kind = 'product'",
    categoryKind: "product",
    references: [
      { table: "projects", column: "category_id" },
      { table: "products", column: "category_id" },
    ],
  },
  settings: {
    table: "settings",
    idColumn: "key",
    columns: ["key", "value_json"],
    validate: validateSetting,
  },
};

export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx).catch((error) => {
      console.error(error);
      return json({ error: "Internal Server Error" }, 500);
    });
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const redirect = routeRedirect(url);
  if (redirect) return Response.redirect(redirect, 308);

  if (url.pathname === "/robots.txt") return robots(env, url);
  if (url.pathname === "/sitemap.xml") return sitemap(env, url);
  if (url.pathname.startsWith("/api/")) return handleApi(request, env, url);
  if (url.pathname.startsWith("/media/")) return serveMedia(request, env, url);
  if (url.pathname === "/admin") return redirectWithQuery(url, "/admin/");
  if (url.pathname.startsWith("/admin/")) return env.ASSETS.fetch(request);

  const route = parseLocaleRoute(url.pathname);
  if (route) {
    const canonicalPath = canonicalRoutePath(route);
    if (url.pathname !== canonicalPath) return redirectWithQuery(url, canonicalPath);
    return renderRoute(request, env, url, route);
  }
  return env.ASSETS.fetch(request);
}

function routeRedirect(url) {
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return redirectLocation(url, "/vi/");
  }
  const legacy = LEGACY_ROUTES[url.pathname] || SOURCE_ROUTE_REDIRECTS[url.pathname];
  if (legacy) return redirectLocation(url, legacy);

  const match = url.pathname.match(/^\/(vi|en)\/(.+)\/index\.html$/);
  if (match) return redirectLocation(url, `/${match[1]}/${match[2]}/`);
  if (url.pathname === "/vi" || url.pathname === "/en") {
    return redirectLocation(url, `${url.pathname}/`);
  }
  return null;
}

function redirectWithQuery(url, pathname) {
  return Response.redirect(redirectLocation(url, pathname), 308);
}

function redirectLocation(url, pathname) {
  const destination = new URL(pathname, url.origin);
  destination.search = url.search;
  return destination.toString();
}

function parseLocaleRoute(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const [locale, first, second] = parts;
  if (!LOCALES.has(locale)) return null;
  if (!first) return { locale, pageId: "home", slug: null };
  if (first === "projects" && second && parts.length === 3) {
    return { locale, pageId: "project-detail", slug: second };
  }
  if (SOURCE_ROUTES[first] && parts.length === 2) {
    return { locale, pageId: first, slug: null };
  }
  return null;
}

async function renderRoute(request, env, url, route) {
  const origin = publicOrigin(env, url);
  const sourcePath =
    route.pageId === "project-detail"
      ? SOURCE_ROUTES["projects-products"]
      : SOURCE_ROUTES[route.pageId];
  const source = await env.ASSETS.fetch(
    new Request(new URL(sourcePath, url.origin), { method: "GET" }),
  );
  if (!source.ok) return source;

  if (!env.DB && route.pageId === "project-detail") {
    return new Response("Not Found", { status: 404 });
  }

  let record = null;
  try {
    if (env.DB) {
      record =
        route.pageId === "project-detail"
          ? await publishedProject(env, route.slug)
          : await publishedPage(env, route.pageId);
    }
  } catch (error) {
    if (error instanceof CmsUnavailableError) {
      return new Response("Service Unavailable", { status: 503 });
    }
    throw error;
  }
  if (env.DB && !record) return new Response("Not Found", { status: 404 });

  const content = record ? localeContent(record.content_json, route.locale) : null;
  if (record && !content) return new Response("Not Found", { status: 404 });
  const seo = content?.seo || DEFAULT_SEO[route.locale];
  const canonicalPath = canonicalRoutePath(route);
  const canonical = new URL(canonicalPath, origin).toString();
  const alternateLocale = route.locale === "vi" ? "en" : "vi";
  const alternate = new URL(
    canonicalRoutePath({ ...route, locale: alternateLocale }),
    origin,
  ).toString();
  const headers = new Headers(source.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=UTF-8");
  headers.set("content-language", route.locale);
  headers.set("vary", "Accept-Language");

  let rewriter = new HTMLRewriter().on("html", new HtmlLocale(route.locale));

  if (route.locale === "en") {
    rewriter = rewriter
      .on("[data-en]", new DatasetText("data-en"))
      .on("[data-en-alt]", new DatasetAttribute("alt", "data-en-alt"))
      .on(
        "[data-en-aria-label]",
        new DatasetAttribute("aria-label", "data-en-aria-label"),
      )
      .on(
        "[data-en-content]",
        new DatasetAttribute("content", "data-en-content"),
      )
      .on("a[href]", new LocaleLink("en"));
  } else {
    rewriter = rewriter.on("a[href]", new LocaleLink("vi"));
  }

  // Static English attributes provide the non-SSR shell fallback. Apply D1
  // fields afterward so canonical locale routes cannot be reverted by them.
  if (content) {
    rewriter = rewriter
      .on("title", new InnerText(seo.title))
      .on('meta[name="description"]', new Attribute("content", seo.description));
  }
  rewriter = rewriter.on(
    "head",
    new SeoHead({ canonical, alternate, route, seo }),
  );
  if (content) rewriter = rewriter.on("[data-cms]", new CmsField(content));

  return rewriter.transform(new Response(source.body, { headers }));
}

function publicOrigin(env, url) {
  const configured = env.PUBLIC_ORIGIN?.trim();
  if (configured) return new URL(configured).origin;
  return url.origin;
}

function robots(env, url) {
  try {
    const origin = publicOrigin(env, url);
    return new Response(
      `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/admin/\nSitemap: ${origin}/sitemap.xml\n`,
      { headers: { "content-type": "text/plain; charset=UTF-8", "cache-control": "public, max-age=300" } },
    );
  } catch {
    return new Response("Service Unavailable", { status: 503 });
  }
}

async function sitemap(env, url) {
  try {
    const origin = publicOrigin(env, url);
    if (!env.DB) {
      const urls = [];
      for (const pageId of PAGE_IDS) {
        for (const locale of LOCALES) {
          urls.push(
            new URL(canonicalRoutePath({ locale, pageId }), origin).toString(),
          );
        }
      }
      return sitemapResponse(urls);
    }
    const [pages, projects] = await Promise.all([
      env.DB.prepare("SELECT id FROM pages WHERE status = 'published'").all(),
      env.DB
        .prepare(
          "SELECT p.slug FROM projects p JOIN project_categories c ON c.id = p.category_id AND c.kind = 'project' WHERE p.status = 'published'",
        )
        .all(),
    ]);
    const urls = [];
    for (const page of pages.results || []) {
      if (!PAGE_IDS.has(page.id)) continue;
      for (const locale of LOCALES) urls.push(new URL(canonicalRoutePath({ locale, pageId: page.id }), origin).toString());
    }
    for (const project of projects.results || []) {
      for (const locale of LOCALES) urls.push(new URL(canonicalRoutePath({ locale, pageId: "project-detail", slug: project.slug }), origin).toString());
    }
    return sitemapResponse(urls);
  } catch {
    return new Response("Service Unavailable", { status: 503 });
  }
}

function sitemapResponse(urls) {
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((item) => `<url><loc>${escapeXml(item)}</loc></url>`).join("")}</urlset>`;
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=UTF-8",
      "cache-control": "public, max-age=300",
    },
  });
}

function canonicalRoutePath(route) {
  const prefix = `/${route.locale}/`;
  if (route.pageId === "home") return prefix;
  if (route.pageId === "project-detail") return `${prefix}projects/${route.slug}/`;
  return `${prefix}${route.pageId}/`;
}

class HtmlLocale {
  constructor(locale) {
    this.locale = locale;
  }

  element(element) {
    element.setAttribute("lang", this.locale);
    element.setAttribute("data-route-locale", this.locale);
  }
}

class InnerText {
  constructor(value) {
    this.value = value;
  }

  element(element) {
    element.setInnerContent(this.value, { html: false });
  }
}

class Attribute {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

  element(element) {
    element.setAttribute(this.name, this.value);
  }
}

class DatasetText {
  constructor(name) {
    this.name = name;
  }

  element(element) {
    const value = element.getAttribute(this.name);
    if (value) element.setInnerContent(decodeHtmlEntities(value), { html: false });
  }
}

class DatasetAttribute {
  constructor(name, source) {
    this.name = name;
    this.source = source;
  }

  element(element) {
    const value = element.getAttribute(this.source);
    if (value) element.setAttribute(this.name, decodeHtmlEntities(value));
  }
}

function decodeHtmlEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: "\u00a0", quot: '"' };
  return value.replace(/&(?:#x[0-9a-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (entity) => {
    const body = entity.slice(1, -1);
    if (body[0] === "#") {
      const numeric = body[1]?.toLowerCase() === "x" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 0x10ffff) {
        return String.fromCodePoint(numeric);
      }
      return entity;
    }
    return named[body.toLowerCase()] || entity;
  });
}

class LocaleLink {
  constructor(locale) {
    this.locale = locale;
  }

  element(element) {
    if (element.hasAttribute("data-language-option")) return;
    const href = element.getAttribute("href");
    if (!href || !href.startsWith("/") || href.startsWith("//")) return;
    const path = href.replace(/^\/(?:vi|en)(?=\/|$)/, "");
    element.setAttribute("href", `/${this.locale}${path || "/"}`);
  }
}

class CmsField {
  constructor(content) {
    this.content = content;
  }

  element(element) {
    const value = valueAtPath(this.content, element.getAttribute("data-cms"));
    if (typeof value === "string") element.setInnerContent(value, { html: false });
  }
}

class SeoHead {
  constructor({ canonical, alternate, route, seo }) {
    this.canonical = canonical;
    this.alternate = alternate;
    this.route = route;
    this.seo = seo;
  }

  element(element) {
    const otherLocale = this.route.locale === "vi" ? "en" : "vi";
    const defaultAlternate = this.route.locale === "vi" ? this.canonical : this.alternate;
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Trường Thịnh",
      url: this.canonical,
      inLanguage: this.route.locale,
    }).replace(/</g, "\\u003c");
    element.append(
      `<link rel="canonical" href="${escapeAttribute(this.canonical)}">` +
        `<link rel="alternate" hreflang="${this.route.locale}" href="${escapeAttribute(this.canonical)}">` +
        `<link rel="alternate" hreflang="${otherLocale}" href="${escapeAttribute(this.alternate)}">` +
        `<link rel="alternate" hreflang="x-default" href="${escapeAttribute(defaultAlternate)}">` +
        `<meta property="og:locale" content="${this.route.locale === "vi" ? "vi_VN" : "en_US"}">` +
        `<meta property="og:type" content="website">` +
        `<meta property="og:title" content="${escapeAttribute(this.seo.title)}">` +
        `<meta property="og:description" content="${escapeAttribute(this.seo.description)}">` +
        `<meta property="og:url" content="${escapeAttribute(this.canonical)}">` +
        `<meta name="twitter:card" content="summary_large_image">` +
        `<meta name="twitter:title" content="${escapeAttribute(this.seo.title)}">` +
        `<meta name="twitter:description" content="${escapeAttribute(this.seo.description)}">` +
        `<script type="application/ld+json">${jsonLd}</script>`,
      { html: true },
    );
  }
}

function escapeAttribute(value) {
  return String(value).replace(/[&"<>]/g, (character) =>
    ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[
      character
    ],
  );
}

function escapeXml(value) {
  return escapeAttribute(value).replace(/'/g, "&apos;");
}

function valueAtPath(value, path) {
  if (!path) return undefined;
  return path.split(".").reduce((current, key) => current?.[key], value);
}

function localeContent(serialized, locale) {
  if (!serialized) return null;
  try {
    const content = JSON.parse(serialized);
    return content?.[locale] || null;
  } catch {
    return null;
  }
}

function parseProjectContent(serialized) {
  if (!serialized) return null;
  try {
    const content = JSON.parse(serialized);
    return isPlainObject(content) ? content : null;
  } catch {
    return null;
  }
}

function projectMenuName(content) {
  if (!isPlainObject(content)) return "";
  const candidates = [
    content.name,
    content.title,
    content.hero?.title,
    content.hero?.qualifier,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

async function publishedPage(env, id) {
  if (!env.DB) throw new CmsUnavailableError("D1 binding is unavailable");
  try {
    return await env.DB
      .prepare("SELECT content_json FROM pages WHERE id = ? AND status = 'published'")
      .bind(id)
      .first();
  } catch {
    throw new CmsUnavailableError("D1 read failed");
  }
}

async function publishedProject(env, slug) {
  if (!validSlug(slug)) return null;
  if (!env.DB) throw new CmsUnavailableError("D1 binding is unavailable");
  try {
    return await env.DB
      .prepare(
        "SELECT p.id, p.slug, p.template, p.category_id, p.content_json, p.cover_media_id, p.menu_group, p.menu_order FROM projects p JOIN project_categories c ON c.id = p.category_id AND c.kind = 'project' WHERE p.slug = ? AND p.status = 'published'",
      )
      .bind(slug)
      .first();
  } catch {
    throw new CmsUnavailableError("D1 read failed");
  }
}

async function handleApi(request, env, url) {
  if (url.pathname === "/api/public/projects" && request.method === "GET") {
    return publicProjects(env);
  }
  if (url.pathname.startsWith("/api/public/projects/") && request.method === "GET") {
    return publicProject(env, url.pathname.split("/").pop());
  }
  if (url.pathname === "/api/public/products" && request.method === "GET") {
    return publicProducts(env);
  }
  if (url.pathname.startsWith("/api/admin/")) {
    const actor = await requireAdmin(request, env);
    if (!actor) return json({ error: "Forbidden" }, 403);
    if (isWriteMethod(request.method) && !hasAllowedOrigin(request, env, url)) {
      return json({ error: "Forbidden" }, 403);
    }
    return handleAdminApi(request, env, url, actor);
  }
  return json({ error: "Not Found" }, 404);
}

async function handleAdminApi(request, env, url, actor) {
  if (url.pathname === "/api/admin/media") {
    if (request.method === "GET") return listMedia(env);
    if (request.method === "POST") return uploadMedia(request, env, actor);
  }
  if (url.pathname.startsWith("/api/admin/media/")) {
    return updateMedia(request, env, decodeURIComponent(url.pathname.split("/").pop()), actor);
  }
  if (url.pathname === "/api/admin/audit-log" && request.method === "GET") {
    return listAuditLog(env);
  }
  if (url.pathname.startsWith("/api/admin/")) return handleAdminResource(request, env, url, actor);
  return json({ error: "Not Found" }, 404);
}

async function publicProjects(env) {
  if (!env.DB) return json({ categories: [], items: [] });
  const [categories, projects] = await Promise.all([
    env.DB
      .prepare(
        "SELECT id, position, label_vi, label_en, cover_path FROM project_categories WHERE kind = 'project' ORDER BY position ASC",
      )
      .all(),
    env.DB
      .prepare(
        "SELECT p.slug, p.menu_group, p.menu_order, p.content_json FROM projects p JOIN project_categories c ON c.id = p.category_id AND c.kind = 'project' WHERE p.status = 'published' AND p.menu_group IN ('residential', 'commercial', 'projects-products') ORDER BY p.menu_group, CASE WHEN p.menu_order IS NULL THEN 2147483647 ELSE p.menu_order END, p.slug ASC",
      )
      .all(),
  ]);
  return json({
    categories: categories.results || [],
    items: (projects.results || []).map(publicProjectMenuRecord).filter(Boolean),
  });
}

function publicProjectMenuRecord(project) {
  const content = parseProjectContent(project.content_json);
  const name = Object.fromEntries(
    [...LOCALES].map((locale) => [locale, projectMenuName(content?.[locale])]),
  );
  if (!validSlug(project.slug) || !MENU_PROJECT_GROUPS.has(project.menu_group) || !name.vi || !name.en) return null;
  return {
    slug: project.slug,
    menu_group: project.menu_group,
    menu_order: project.menu_order ?? null,
    name,
  };
}

async function publicProject(env, slug) {
  const project = await publishedProject(env, slug);
  return project ? json(project) : json({ error: "Not Found" }, 404);
}

async function publicProducts(env) {
  if (!env.DB) return json({ categories: [], items: [] });
  const [categories, products] = await Promise.all([
    env.DB
      .prepare(
        "SELECT id, position, label_vi, label_en, cover_path FROM project_categories WHERE kind = 'product' ORDER BY position ASC",
      )
      .all(),
    env.DB
      .prepare(
        "SELECT p.id, p.category_id, p.position, p.content_json, p.image_media_id FROM products p JOIN project_categories c ON c.id = p.category_id AND c.kind = 'product' WHERE p.status = 'published' ORDER BY p.category_id, p.position ASC",
      )
      .all(),
  ]);
  return json({
    categories: categories.results || [],
    items: products.results || [],
  });
}

async function handleAdminResource(request, env, url, actor) {
  const segments = url.pathname.split("/").filter(Boolean);
  const resourceName = segments[2];
  const resource = ADMIN_RESOURCES[resourceName];
  if (!resource) return json({ error: "Not Found" }, 404);
  const recordId = segments[3] ? decodeURIComponent(segments[3]) : null;

  if (request.method === "GET") return listResource(env, resource);
  if (!["POST", "PUT", "DELETE"].includes(request.method)) {
    return json({ error: "Method Not Allowed" }, 405);
  }
  if (request.method === "DELETE") {
    if (!recordId) return json({ error: "Missing record id" }, 400);
    if (resource.table === "project_categories" && resource.categoryKind) {
      const category = await env.DB
        .prepare("SELECT kind FROM project_categories WHERE id = ?")
        .bind(recordId)
        .first();
      if (!category) return json({ error: "Category not found." }, 404);
      if (category.kind !== resource.categoryKind) return json({ error: "Wrong category resource." }, 400);
    }
    if (resource.references?.length) {
      for (const reference of resource.references) {
        const used = await env.DB
          .prepare(`SELECT 1 AS used FROM ${reference.table} WHERE ${reference.column} = ? LIMIT 1`)
          .bind(recordId)
          .first();
        if (used) return json({ error: "Category is in use." }, 409);
      }
    }
    await env.DB
      .prepare(`DELETE FROM ${resource.table} WHERE ${resource.idColumn} = ?`)
      .bind(recordId)
      .run();
    await logAudit(env, actor, "delete", resourceName, recordId, {});
    return new Response(null, { status: 204 });
  }

  let normalized;
  try {
    const payload = await readJson(request);
    normalized = resource.validate(payload, recordId);
    if (resource.table === "project_categories" && resource.categoryKind) {
      await assertCategoryKind(env, normalized.id, resource.categoryKind, { allowMissing: true });
    } else if (resource.categoryKind) {
      await assertCategoryKind(env, normalized.category_id, resource.categoryKind);
    }
  } catch (error) {
    return json({ error: error.message || "Invalid request" }, 400);
  }
  await upsertResource(env, resource, normalized);
  const id = normalized[resource.idColumn];
  await logAudit(env, actor, "upsert", resourceName, id, normalized);
  return json({ item: normalized }, request.method === "POST" ? 201 : 200);
}

async function listResource(env, resource) {
  const order = resource.order || (resource.table === "products" ? "category_id, position" : "updated_at DESC");
  const where = resource.where ? ` WHERE ${resource.where}` : "";
  const result = await env.DB.prepare(`SELECT * FROM ${resource.table}${where} ORDER BY ${order}`).all();
  return json({ items: result.results || [] });
}

async function assertCategoryKind(env, categoryId, expectedKind, { allowMissing = false } = {}) {
  const category = await env.DB
    .prepare("SELECT kind FROM project_categories WHERE id = ?")
    .bind(categoryId)
    .first();
  if (!category && allowMissing) return;
  if (!category || category.kind !== expectedKind) {
    throw new Error(`Invalid ${expectedKind} category.`);
  }
}

async function upsertResource(env, resource, payload) {
  const columns = resource.columns;
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => column !== resource.idColumn)
    .map((column) => `${column} = excluded.${column}`)
    .concat("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")
    .join(", ");
  await env.DB
    .prepare(
      `INSERT INTO ${resource.table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT(${resource.idColumn}) DO UPDATE SET ${updates}`,
    )
    .bind(...columns.map((column) => payload[column]))
    .run();
}

async function uploadMedia(request, env, actor) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES) return json({ error: "File too large" }, 413);
  let form;
  let bytes;
  let contentType;
  let kind;
  try {
    form = await request.formData();
    const file = form.get("file");
    kind = form.get("kind") === "logo" ? "logo" : "image";
    if (!file || typeof file.arrayBuffer !== "function" || file.size > MAX_UPLOAD_BYTES) {
      throw new Error("A media file under 10 MB is required");
    }
    bytes = new Uint8Array(await file.arrayBuffer());
    contentType = validateUpload(bytes, file.type, kind);
  } catch (error) {
    return json({ error: error.message || "Invalid media upload" }, 400);
  }
  const id = crypto.randomUUID();
  const objectKey = `media/${id}.${contentType === "image/webp" ? "webp" : "svg"}`;
  await env.MEDIA.put(objectKey, bytes, {
    httpMetadata: { contentType },
    customMetadata: { actor, kind },
  });
  const altJson = JSON.stringify({ vi: String(form.get("alt_vi") || ""), en: String(form.get("alt_en") || "") });
  await env.DB
    .prepare(
      "INSERT INTO media (id, object_key, content_type, kind, alt_json) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id, objectKey, contentType, kind, altJson)
    .run();
  await logAudit(env, actor, "upload", "media", id, { objectKey, contentType, kind });
  return json({ item: { id, object_key: objectKey, content_type: contentType, kind } }, 201);
}

async function updateMedia(request, env, id, actor) {
  if (request.method !== "PUT") return json({ error: "Method Not Allowed" }, 405);
  let payload;
  try {
    payload = await readJson(request);
  } catch (error) {
    return json({ error: error.message || "Invalid request" }, 400);
  }
  const status = payload.status === "published" ? "published" : "draft";
  const approved = payload.approved === true;
  await env.DB
    .prepare(
      "UPDATE media SET status = ?, approved_at = CASE WHEN ? THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE NULL END, approved_by = CASE WHEN ? THEN ? ELSE NULL END, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .bind(status, approved ? 1 : 0, approved ? 1 : 0, actor, id)
    .run();
  await logAudit(env, actor, "approve", "media", id, { status, approved });
  return json({ id, status, approved });
}

async function listMedia(env) {
  const result = await env.DB
    .prepare(
      "SELECT id, content_type, kind, status, approved_at, alt_json, created_at, updated_at FROM media ORDER BY updated_at DESC",
    )
    .all();
  return json({ items: result.results || [] });
}

async function serveMedia(request, env, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Method Not Allowed" }, 405);
  }
  const id = decodeURIComponent(url.pathname.slice("/media/".length));
  if (!id || !env.DB || !env.MEDIA) return new Response("Not Found", { status: 404 });
  const media = await env.DB
    .prepare(
      "SELECT object_key, content_type FROM media WHERE id = ? AND status = 'published' AND approved_at IS NOT NULL",
    )
    .bind(id)
    .first();
  if (!media) return new Response("Not Found", { status: 404 });
  const object = await env.MEDIA.get(media.object_key);
  if (!object) return new Response("Not Found", { status: 404 });
  const headers = new Headers();
  headers.set("content-type", media.content_type);
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

async function listAuditLog(env) {
  const result = await env.DB
    .prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200")
    .all();
  return json({ items: result.results || [] });
}

function isWriteMethod(method) {
  return method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH";
}

function hasAllowedOrigin(request, env, url) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === publicOrigin(env, url);
  } catch {
    return false;
  }
}

async function requireAdmin(request, env) {
  const claims = await verifyAccessJwt(request, env);
  const actor = typeof claims?.email === "string" ? claims.email.trim().toLowerCase() : "";
  const assertedEmail = request.headers.get("Cf-Access-Authenticated-User-Email")?.trim().toLowerCase();
  const allowed = new Set(
    String(env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  return actor && assertedEmail === actor && allowed.has(actor) ? actor : null;
}

async function verifyAccessJwt(request, env) {
  const teamOrigin = accessTeamOrigin(env);
  const audiences = String(env.ACCESS_AUD || "").split(",").map((value) => value.trim()).filter(Boolean);
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!teamOrigin || !audiences.length || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let header;
  let claims;
  let signature;
  try {
    header = decodeJwtPart(parts[0]);
    claims = decodeJwtPart(parts[1]);
    signature = base64UrlBytes(parts[2]);
  } catch {
    return null;
  }
  if (!isPlainObject(header) || header.alg !== "RS256" || typeof header.kid !== "string" || !isPlainObject(claims)) return null;
  if (claims.iss !== teamOrigin || !hasExpectedAudience(claims.aud, audiences) || !validJwtTime(claims)) return null;
  const jwk = await accessJwk(teamOrigin, header.kid);
  if (!jwk) return null;
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    return (await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signed)) ? claims : null;
  } catch {
    return null;
  }
}

function accessTeamOrigin(env) {
  try {
    const team = new URL(String(env.ACCESS_TEAM_DOMAIN || "").trim());
    return team.protocol === "https:" && team.hostname.endsWith(".cloudflareaccess.com") && team.pathname === "/" ? team.origin : null;
  } catch {
    return null;
  }
}

async function accessJwk(teamOrigin, kid) {
  if (Date.now() >= accessJwksCache.expiresAt) {
    try {
      const response = await fetch(`${teamOrigin}/cdn-cgi/access/certs`, { headers: { accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.keys)) return null;
      accessJwksCache = {
        expiresAt: Date.now() + ACCESS_JWKS_TTL_MS,
        keys: new Map(payload.keys.filter((key) => key?.kty === "RSA" && key?.alg === "RS256" && typeof key.kid === "string").map((key) => [key.kid, key])),
      };
    } catch {
      return null;
    }
  }
  return accessJwksCache.keys.get(kid) || null;
}

function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value)));
}

function base64UrlBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid JWT encoding");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const decoded = atob(base64);
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const canonical = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (canonical !== value) throw new Error("Non-canonical JWT encoding");
  return bytes;
}

function hasExpectedAudience(aud, expected) {
  const tokenAudiences = Array.isArray(aud) ? aud : [aud];
  return tokenAudiences.some((value) => typeof value === "string" && expected.includes(value));
}

function validJwtTime(claims) {
  const now = Math.floor(Date.now() / 1000);
  return Number.isFinite(claims.exp) && claims.exp > now && (!Number.isFinite(claims.nbf) || claims.nbf <= now + 60);
}

async function logAudit(env, actor, action, resourceType, resourceId, detail) {
  await env.DB
    .prepare(
      "INSERT INTO audit_log (id, actor_email, action, resource_type, resource_id, detail_json) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      actor,
      action,
      resourceType,
      resourceId,
      JSON.stringify(detail),
    )
    .run();
}

function validateUpload(bytes, declaredType, kind) {
  if (isWebp(bytes) && declaredType === "image/webp") return "image/webp";
  if (kind === "logo" && declaredType === "image/svg+xml" && isSafeSvg(bytes)) {
    return "image/svg+xml";
  }
  throw new Error("Only valid WebP media or strictly safe SVG logos are accepted.");
}

function isWebp(bytes) {
  if (bytes.length < 30) return false;
  const decoder = new TextDecoder();
  const header = decoder.decode(bytes.slice(0, 4));
  const format = decoder.decode(bytes.slice(8, 12));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const declaredLength = view.getUint32(4, true);
  if (header !== "RIFF" || format !== "WEBP" || bytes.length !== declaredLength + 8) return false;

  let offset = 12;
  let imageChunks = 0;
  let extended = false;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return false;
    const type = decoder.decode(bytes.slice(offset, offset + 4));
    const length = view.getUint32(offset + 4, true);
    const payloadStart = offset + 8;
    const payloadEnd = payloadStart + length;
    const paddedEnd = payloadEnd + (length % 2);
    if (payloadEnd > bytes.length || paddedEnd > bytes.length) return false;
    if (length % 2 && bytes[payloadEnd] !== 0) return false;

    if (type === "VP8 ") {
      if (length < 10 || bytes[payloadStart + 3] !== 0x9d || bytes[payloadStart + 4] !== 0x01 || bytes[payloadStart + 5] !== 0x2a) return false;
      const width = view.getUint16(payloadStart + 6, true) & 0x3fff;
      const height = view.getUint16(payloadStart + 8, true) & 0x3fff;
      if (!width || !height) return false;
      imageChunks += 1;
    } else if (type === "VP8L") {
      if (length < 5 || bytes[payloadStart] !== 0x2f) return false;
      imageChunks += 1;
    } else if (type === "VP8X") {
      if (length !== 10 || offset !== 12) return false;
      extended = true;
    } else if (!extended || !["ICCP", "EXIF", "XMP "].includes(type)) {
      return false;
    }
    offset = paddedEnd;
  }
  return offset === bytes.length && imageChunks === 1;
}

function isSafeSvg(bytes) {
  let svg;
  try {
    svg = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return false;
  }
  if (svg.length > 256 * 1024 || !/^\s*<svg\b[^>]*>/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) {
    return false;
  }
  return !/(<\/?(?:script|foreignObject|iframe|object|embed|image|animate|set|use|a)\b|\son\w+\s*=|\sstyle\s*=|javascript:|data:|https?:|\b(?:href|xlink:href)\s*=|url\s*\(|@import|<!doctype|<!entity|<\?)/i.test(svg);
}

async function readJson(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new Error("Expected application/json.");
  return request.json();
}

function validatePage(payload, routeId) {
  const id = routeId || requiredId(payload.id);
  if (!PAGE_IDS.has(id)) throw new Error("Invalid page id.");
  const content = validateLocalizedPageContent(payload.content);
  return { id, status: status(payload.status), content_json: JSON.stringify(content) };
}

function validateProject(payload, routeId) {
  const id = routeId || requiredId(payload.id);
  if (!validSlug(payload.slug)) throw new Error("Invalid project slug.");
  if (!PROJECT_TEMPLATES.has(payload.template)) throw new Error("Invalid project template.");
  return {
    id,
    slug: payload.slug,
    template: payload.template,
    category_id: requiredId(payload.category_id),
    status: status(payload.status),
    content_json: JSON.stringify(validateLocalizedPageContent(payload.content)),
    cover_media_id: optionalId(payload.cover_media_id),
    menu_group: optionalMenuGroup(payload.menu_group),
    menu_order: optionalMenuOrder(payload.menu_order),
  };
}

function validateCategory(payload, routeId, expectedKind) {
  const id = routeId ? requiredId(routeId) : requiredId(payload.id);
  const position = Number(payload.position);
  if (!Number.isInteger(position) || position < 1 || position > 9999) {
    throw new Error("Invalid category position.");
  }
  const labelVi = requiredText(payload.label_vi);
  const labelEn = requiredText(payload.label_en);
  const coverPath = requiredText(payload.cover_path);
  if (!coverPath.startsWith("/")) throw new Error("Invalid category cover path.");
  return {
    id,
    position,
    label_vi: labelVi,
    label_en: labelEn,
    cover_path: coverPath,
    kind: expectedKind,
  };
}

function optionalMenuGroup(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !MENU_PROJECT_GROUPS.has(value)) {
    throw new Error("Invalid menu project group.");
  }
  return value;
}

function optionalMenuOrder(value) {
  if (value == null || value === "") return null;
  const order = Number(value);
  if (!Number.isInteger(order) || order < 1 || order > 999) {
    throw new Error("Invalid menu project order.");
  }
  return order;
}

function validateProduct(payload, routeId) {
  const id = routeId || requiredId(payload.id);
  const position = Number(payload.position);
  if (!Number.isInteger(position) || position < 1) throw new Error("Invalid product position.");
  return {
    id,
    category_id: requiredId(payload.category_id),
    position,
    status: status(payload.status),
    content_json: JSON.stringify(validateLocalizedProductContent(payload.content)),
    image_media_id: optionalId(payload.image_media_id),
  };
}

function validateSetting(payload, routeId) {
  const key = routeId || requiredId(payload.key);
  if (!isPlainObject(payload.value)) throw new Error("Setting value must be a JSON object.");
  return { key, value_json: JSON.stringify(payload.value) };
}

function validateLocalizedPageContent(content) {
  if (!isPlainObject(content)) throw new Error("Page content must be an object.");
  return Object.fromEntries(
    [...LOCALES].map((locale) => {
      const value = content[locale];
      if (!isPlainObject(value) || !isPlainObject(value.hero) || !isPlainObject(value.cta) || !isPlainObject(value.seo) || !Array.isArray(value.sections)) {
        throw new Error(`Invalid ${locale} page content.`);
      }
      ["kicker", "qualifier", "title", "motto"].forEach((key) => requiredText(value.hero[key]));
      requiredText(value.intro);
      requiredText(value.cta.label);
      requiredText(value.seo.title);
      requiredText(value.seo.description);
      return [locale, value];
    }),
  );
}

function validateLocalizedProductContent(content) {
  if (!isPlainObject(content)) throw new Error("Product content must be an object.");
  return Object.fromEntries(
    [...LOCALES].map((locale) => {
      const value = content[locale];
      if (!isPlainObject(value)) throw new Error(`Invalid ${locale} product content.`);
      requiredText(value.name);
      return [locale, value];
    }),
  );
}

function requiredText(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 5000) {
    throw new Error("Expected a non-empty text field.");
  }
  return value.trim();
}

function requiredId(value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value)) {
    throw new Error("Invalid identifier.");
  }
  return value;
}

function optionalId(value) {
  return value == null || value === "" ? null : requiredId(value);
}

function validSlug(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function status(value) {
  if (value !== "draft" && value !== "published") throw new Error("Invalid status.");
  return value;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8" },
  });
}
