(() => {
  const dialog = document.querySelector("[data-product-directory]");
  const open = document.querySelector("[data-product-directory-open]");
  const close = document.querySelector("[data-product-directory-close]");
  const content = document.querySelector("[data-product-directory-content]");
  const productInfo = document.querySelector("[data-product-info]");
  const productInfoClose = document.querySelector("[data-product-info-close]");
  const productInfoCategory = document.querySelector("[data-product-info-category]");
  const productInfoImage = document.querySelector("[data-product-info-image]");
  const productInfoName = document.querySelector("[data-product-info-name]");
  if (!dialog || !open || !close || !content || !productInfo || !productInfoClose || !productInfoCategory || !productInfoImage || !productInfoName) return;

  let loaded = false;
  let lastProductCard = null;
  const locale = () => document.documentElement.lang === "en" ? "en" : "vi";
  const label = (category) => locale() === "en" ? category.label_en : category.label_vi;
  const render = ({ categories, items }) => {
    content.replaceChildren();
    categories.forEach((category) => {
      const section = document.createElement("section");
      section.className = "product-directory__category";
      const image = document.createElement("img");
      image.src = category.cover_path;
      image.width = 1536;
      image.height = 1024;
      image.loading = "lazy";
      image.alt = label(category);
      const heading = document.createElement("h3");
      heading.textContent = label(category);
      const list = document.createElement("div");
      list.className = "product-directory__products";
      items.filter((item) => item.category_id === category.id).forEach((item) => {
        let name = "";
        try { name = JSON.parse(item.content_json)?.[locale()]?.name || ""; } catch {}
        if (!name) return;
        const card = document.createElement("button");
        card.type = "button";
        card.className = "product-directory__product";
        card.setAttribute("aria-haspopup", "dialog");
        card.textContent = name;
        card.addEventListener("click", () => {
          lastProductCard = card;
          productInfoCategory.textContent = label(category);
          productInfoImage.src = category.cover_path;
          productInfoImage.alt = `${label(category)} — ${name}`;
          productInfoName.textContent = name;
          productInfo.showModal();
        });
        list.append(card);
      });
      section.append(image, heading, list);
      content.append(section);
    });
  };

  const load = async () => {
    if (loaded) return;
    const response = await fetch("/api/public/products", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Product directory unavailable");
    render(await response.json());
    loaded = true;
  };

  open.addEventListener("click", async () => {
    try { await load(); }
    catch { content.textContent = locale() === "en" ? "The product directory is unavailable." : "Danh mục sản phẩm hiện chưa tải được."; }
    dialog.showModal();
  });
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => open.focus());
  productInfoClose.addEventListener("click", () => productInfo.close());
  productInfo.addEventListener("close", () => lastProductCard?.focus());
  window.addEventListener("languagechange", () => {
    if (!loaded) return;
    loaded = false;
    load().catch(() => undefined);
  });
})();
