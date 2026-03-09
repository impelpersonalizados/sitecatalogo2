const CLOUDINARY_CLOUD_NAME = "dzrshdovw";
const CLOUDINARY_UPLOAD_PRESET = "catalogo_unsigned";

const LS = {
  stats: "catalog_stats"
};

const uid = () =>
  crypto?.randomUUID
    ? crypto.randomUUID()
    : "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);

const safeParse = (v, fallback) => {
  try {
    return JSON.parse(v) ?? fallback;
  } catch {
    return fallback;
  }
};

const get = (key, fallback) => safeParse(localStorage.getItem(key), fallback);

/* =========================
   UI / TABS
========================= */
function openTab(id) {
  document.querySelectorAll(".admin-tab2").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.tab === id);
  });

  document.querySelectorAll(".tab2").forEach((t) => {
    t.classList.toggle("is-active", t.id === id);
  });

  document.body.classList.remove("admin-nav-open");
}

function setupTabs() {
  document.querySelectorAll(".admin-tab2").forEach((btn) => {
    btn.addEventListener("click", () => openTab(btn.dataset.tab));
  });
}

function setupMobileSidebar() {
  const btn = document.getElementById("btnMobileNav");
  btn?.addEventListener("click", () => {
    document.body.classList.toggle("admin-nav-open");
  });
}

/* =========================
   MODAL HELPERS
========================= */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("is-open");
  el.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("is-open");
  el.setAttribute("aria-hidden", "true");
}

document.addEventListener("click", (e) => {
  const closeId = e.target?.getAttribute?.("data-close");
  if (closeId) closeModal(closeId);
});

/* =========================
   HELPERS
========================= */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, "&#096;");
}

async function uploadImageToCloudinary(file, folder = "catalogo") {
  if (!file) throw new Error("Nenhum arquivo selecionado.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const res = await fetch(url, {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Falha no upload da imagem.");
  }

  return data.secure_url;
}

/* =========================
   LOJA
========================= */
async function loadStoreFields() {
  const { data: store, error } = await supabaseClient
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error && error.code !== "PGRST116") {
    alert("Erro ao carregar dados da loja: " + error.message);
    return;
  }

  const s = store || {};

  document.getElementById("store_name").value = s.name || "";
  document.getElementById("store_whatsapp").value = s.whatsapp || "";
  document.getElementById("store_notice").value = s.site_notice || "";
  document.getElementById("store_open").value = s.store_open || "open";
  document.getElementById("store_showPrices").value = s.show_prices || "yes";
  document.getElementById("store_footer").value = s.footer || "";
  document.getElementById("store_whatsTemplate").value = s.whats_message_template || "";
  document.getElementById("store_logo").value = s.logo || "";
  document.getElementById("store_favicon").value = s.favicon || "";
  document.getElementById("store_heroBadge").value = s.hero_badge || "";
  document.getElementById("store_heroTitle").value = s.hero_title || "";
  document.getElementById("store_heroSubtitle").value = s.hero_subtitle || "";
  document.getElementById("store_showHero").value = s.show_hero || "yes";

  document.getElementById("store_logo_preview").innerHTML = s.logo
    ? `<img src="${escapeAttr(s.logo)}" style="width:140px;height:140px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">`
    : "";

  document.getElementById("store_favicon_preview").innerHTML = s.favicon
    ? `<img src="${escapeAttr(s.favicon)}" style="width:64px;height:64px;object-fit:cover;border-radius:14px;border:1px solid rgba(0,0,0,.1);">`
    : "";
}

async function saveStoreFields() {
  const payload = {
    id: 1,
    name: document.getElementById("store_name").value.trim(),
    whatsapp: document.getElementById("store_whatsapp").value.trim(),
    site_notice: document.getElementById("store_notice").value.trim(),
    store_open: document.getElementById("store_open").value,
    show_prices: document.getElementById("store_showPrices").value,
    footer: document.getElementById("store_footer").value.trim(),
    whats_message_template: document.getElementById("store_whatsTemplate").value.trim(),
    logo: document.getElementById("store_logo").value.trim(),
    favicon: document.getElementById("store_favicon").value.trim(),
    hero_badge: document.getElementById("store_heroBadge").value.trim(),
    hero_title: document.getElementById("store_heroTitle").value.trim(),
    hero_subtitle: document.getElementById("store_heroSubtitle").value.trim(),
    show_hero: document.getElementById("store_showHero").value
  };

  const { error } = await supabaseClient
    .from("store_settings")
    .upsert([payload], { onConflict: "id" });

  if (error) {
    alert("Erro ao salvar loja: " + error.message);
    return false;
  }

  return true;
}

function setupStoreEvents() {
  document.getElementById("btnStoreLoad")?.addEventListener("click", loadStoreFields);

  document.getElementById("btnStoreSave")?.addEventListener("click", async () => {
    const ok = await saveStoreFields();
    if (ok) {
      alert("✅ Loja salva com sucesso!");
      await loadStoreFields();
    }
  });

  document.getElementById("btnTemplateSave")?.addEventListener("click", async () => {
    const ok = await saveStoreFields();
    if (ok) alert("✅ Template salvo com sucesso!");
  });

  document.getElementById("btnBrandSave")?.addEventListener("click", async () => {
    const ok = await saveStoreFields();
    if (ok) {
      alert("✅ Logo/Favicon/Hero salvos com sucesso!");
      await loadStoreFields();
    }
  });
}

/* =========================
   TEMA
========================= */
async function loadThemeFields() {
  const { data: theme, error } = await supabaseClient
    .from("theme_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error && error.code !== "PGRST116") {
    alert("Erro ao carregar tema: " + error.message);
    return;
  }

  const t = theme || {};

  document.getElementById("theme_primary").value = t.primary_color || "#7c3aed";
  document.getElementById("theme_secondary").value = t.secondary_color || "#a78bfa";
  document.getElementById("theme_background").value = t.background || "#f6f7fb";
  document.getElementById("theme_buttonColor").value = t.button_color || "#7c3aed";
  document.getElementById("theme_fontUrl").value = t.font_url || "";
  document.getElementById("theme_fontFamily").value =
    t.font_family || '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial';
}

async function saveThemeFields() {
  const payload = {
    id: 1,
    primary_color: document.getElementById("theme_primary").value,
    secondary_color: document.getElementById("theme_secondary").value,
    background: document.getElementById("theme_background").value,
    button_color: document.getElementById("theme_buttonColor").value,
    font_url: document.getElementById("theme_fontUrl").value.trim(),
    font_family: document.getElementById("theme_fontFamily").value.trim()
  };

  const { error } = await supabaseClient
    .from("theme_settings")
    .upsert([payload], { onConflict: "id" });

  if (error) {
    alert("Erro ao salvar tema: " + error.message);
    return false;
  }

  return true;
}

async function resetThemeLight() {
  const payload = {
    id: 1,
    primary_color: "#7c3aed",
    secondary_color: "#a78bfa",
    background: "#f6f7fb",
    button_color: "#7c3aed",
    font_url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
    font_family: '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial'
  };

  const { error } = await supabaseClient
    .from("theme_settings")
    .upsert([payload], { onConflict: "id" });

  if (error) {
    alert("Erro ao restaurar tema: " + error.message);
    return;
  }

  await loadThemeFields();
  alert("✅ Tema light restaurado!");
}

function setupThemeEvents() {
  document.getElementById("btnThemeSave")?.addEventListener("click", async () => {
    const ok = await saveThemeFields();
    if (ok) alert("✅ Tema salvo com sucesso!");
  });

  document.getElementById("btnThemeReset")?.addEventListener("click", resetThemeLight);
  document.getElementById("btnResetDemo")?.addEventListener("click", resetThemeLight);
}

/* =========================
   CATEGORIAS
========================= */
async function renderCategoriesAdmin(filterText = "") {
  const list = document.getElementById("categoriesList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    list.innerHTML = `<div class="empty__card">Erro ao carregar categorias.</div>`;
    return;
  }

  const q = (filterText || "").trim().toLowerCase();
  const filtered = q
    ? data.filter((c) => (c.name || "").toLowerCase().includes(q))
    : data;

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty__card">Nenhuma categoria. Clique em <strong>+ Categoria</strong>.</div>`;
    return;
  }

  list.innerHTML = filtered.map((c) => `
    <div class="list2__item">
      <div class="list2__main">
        <strong>${escapeHtml(c.name)}</strong>
        <small class="muted">ID: ${escapeHtml(c.id)}</small>
      </div>
      <div class="list2__actions">
        <button class="btn btn--ghost btn--pill" data-cat-edit="${c.id}" type="button">Editar</button>
        <button class="btn btn--danger btn--pill" data-cat-del="${c.id}" type="button">Excluir</button>
      </div>
    </div>
  `).join("");
}

function openCategoryModal(cat = null) {
  document.getElementById("catModalTitle").textContent = cat ? "Editar Categoria" : "Nova Categoria";
  document.getElementById("cat_id").value = cat?.id || "";
  document.getElementById("cat_name").value = cat?.name || "";
  openModal("modalCategory");
}

async function saveCategory() {
  const id = document.getElementById("cat_id").value || uid();
  const name = document.getElementById("cat_name").value.trim();

  if (!name) {
    alert("Digite o nome da categoria.");
    return;
  }

  const { error } = await supabaseClient
    .from("categories")
    .upsert([{ id, name }], { onConflict: "id" });

  if (error) {
    alert("Erro ao salvar categoria: " + error.message);
    return;
  }

  closeModal("modalCategory");
  await renderCategoriesAdmin(document.getElementById("adminSearch")?.value || "");
  await fillProductCategorySelect();
}

async function deleteCategory(id) {
  const { data: prods, error: prodErr } = await supabaseClient
    .from("products")
    .select("id")
    .eq("category_id", id)
    .limit(1);

  if (prodErr) {
    alert("Erro ao verificar produtos da categoria.");
    return;
  }

  if (prods && prods.length) {
    alert("Essa categoria está em uso por um produto.");
    return;
  }

  if (!confirm("Excluir essa categoria?")) return;

  const { error } = await supabaseClient
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir categoria: " + error.message);
    return;
  }

  await renderCategoriesAdmin(document.getElementById("adminSearch")?.value || "");
  await fillProductCategorySelect();
}

/* =========================
   PRODUTOS
========================= */
async function fillProductCategorySelect(selectedId = "") {
  const sel = document.getElementById("prod_category");
  if (!sel) return;

  const { data, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    sel.innerHTML = `<option value="">Sem categoria</option>`;
    return;
  }

  sel.innerHTML = [
    `<option value="">Sem categoria</option>`,
    ...data.map((c) => `<option value="${escapeAttr(c.id)}">${escapeHtml(c.name)}</option>`)
  ].join("");

  sel.value = selectedId || "";
}

async function renderProductsAdmin(filterText = "") {
  const grid = document.getElementById("adminProductsGrid");
  if (!grid) return;

  const [{ data: products, error: prodErr }, { data: cats, error: catErr }] = await Promise.all([
    supabaseClient.from("products").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("categories").select("*")
  ]);

  if (prodErr || catErr) {
    grid.innerHTML = `<div class="empty__card">Erro ao carregar produtos.</div>`;
    return;
  }

  const q = (filterText || "").trim().toLowerCase();

  const filtered = q
    ? products.filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
      )
    : products;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty__card">Nenhum produto. Clique em <strong>+ Produto</strong>.</div>`;
    return;
  }

  grid.innerHTML = filtered.map((p) => {
    const catName = cats.find((c) => c.id === p.category_id)?.name || "Sem categoria";
    const price = p.price == null ? "Sem preço" : `R$ ${Number(p.price).toFixed(2).replace(".", ",")}`;

    return `
      <div class="admin-prod-card">
        <div class="admin-prod-card__img">
          ${p.image
            ? `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}">`
            : `<div class="empty__card">Sem imagem</div>`}
        </div>
        <div class="admin-prod-card__body">
          <strong>${escapeHtml(p.name)}</strong>
          <div class="muted">${escapeHtml(catName)} • ${escapeHtml(price)}</div>
          <div class="admin-prod-card__actions">
            <button class="btn btn--ghost btn--pill" data-prod-edit="${p.id}" type="button">Editar</button>
            <button class="btn btn--danger btn--pill" data-prod-del="${p.id}" type="button">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function openProductModal(prod = null) {
  document.getElementById("prodModalTitle").textContent = prod ? "Editar Produto" : "Novo Produto";
  document.getElementById("prod_id").value = prod?.id || "";
  document.getElementById("prod_name").value = prod?.name || "";
  document.getElementById("prod_price").value = prod?.price ?? "";
  document.getElementById("prod_sku").value = prod?.sku || "";
  document.getElementById("prod_image").value = prod?.image || "";
  document.getElementById("prod_promo").value = prod?.promo || "no";

  const prev = document.getElementById("prod_image_preview");
  const img = prod?.image || "";
  prev.innerHTML = img
    ? `<img src="${escapeAttr(img)}" style="width:140px;height:140px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">`
    : "";

  fillProductCategorySelect(prod?.category_id || "");
  openModal("modalProduct");
}

async function saveProduct() {
  const id = document.getElementById("prod_id").value || uid();
  const name = document.getElementById("prod_name").value.trim();
  const priceRaw = document.getElementById("prod_price").value;
  const sku = document.getElementById("prod_sku").value.trim();
  const image = document.getElementById("prod_image").value.trim();
  const category_id = document.getElementById("prod_category").value || null;
  const promo = document.getElementById("prod_promo").value;

  if (!name) {
    alert("Digite o nome do produto.");
    return;
  }

  const price = priceRaw === "" ? null : Number(priceRaw);

  const { error } = await supabaseClient
    .from("products")
    .upsert([{
      id,
      name,
      price,
      sku,
      image,
      category_id,
      promo
    }], { onConflict: "id" });

  if (error) {
    alert("Erro ao salvar produto: " + error.message);
    return;
  }

  closeModal("modalProduct");
  await renderProductsAdmin(document.getElementById("adminSearch")?.value || "");
}

async function deleteProduct(id) {
  if (!confirm("Excluir esse produto?")) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir produto: " + error.message);
    return;
  }

  await renderProductsAdmin(document.getElementById("adminSearch")?.value || "");
}

/* =========================
   BANNERS
========================= */
async function renderBannersAdmin(filterText = "") {
  const list = document.getElementById("bannersList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("banners")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<div class="empty__card">Erro ao carregar banners.</div>`;
    return;
  }

  const q = (filterText || "").trim().toLowerCase();
  const filtered = q
    ? data.filter((b) =>
        (b.title || "").toLowerCase().includes(q) ||
        (b.text || "").toLowerCase().includes(q)
      )
    : data;

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty__card">Nenhum banner. Clique em <strong>+ Banner</strong>.</div>`;
    return;
  }

  list.innerHTML = filtered.map((b) => `
    <div class="list2__item">
      <div class="list2__main">
        <strong>${escapeHtml(b.title || "Banner sem título")}</strong>
        <small class="muted">${escapeHtml(b.text || "")}</small>
      </div>
      <div class="list2__actions">
        <button class="btn btn--ghost btn--pill" data-banner-edit="${b.id}" type="button">Editar</button>
        <button class="btn btn--danger btn--pill" data-banner-del="${b.id}" type="button">Excluir</button>
      </div>
    </div>
  `).join("");
}

function openBannerModal(banner = null) {
  document.getElementById("bannerModalTitle").textContent = banner ? "Editar Banner" : "Novo Banner";
  document.getElementById("banner_id").value = banner?.id || "";
  document.getElementById("banner_title").value = banner?.title || "";
  document.getElementById("banner_text").value = banner?.text || "";
  document.getElementById("banner_image").value = banner?.image || "";
  document.getElementById("banner_btnText").value = banner?.button_text || "";
  document.getElementById("banner_btnLink").value = banner?.button_link || "";

  const prev = document.getElementById("banner_image_preview");
  const img = banner?.image || "";
  prev.innerHTML = img
    ? `<img src="${escapeAttr(img)}" style="width:160px;height:100px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">`
    : "";

  openModal("modalBanner");
}

async function saveBanner() {
  const id = document.getElementById("banner_id").value || uid();
  const title = document.getElementById("banner_title").value.trim();
  const text = document.getElementById("banner_text").value.trim();
  const image = document.getElementById("banner_image").value.trim();
  const button_text = document.getElementById("banner_btnText").value.trim();
  const button_link = document.getElementById("banner_btnLink").value.trim();

  if (!image) {
    alert("Selecione ou cole uma imagem para o banner.");
    return;
  }

  const { error } = await supabaseClient
    .from("banners")
    .upsert([{
      id,
      title,
      text,
      image,
      button_text,
      button_link
    }], { onConflict: "id" });

  if (error) {
    alert("Erro ao salvar banner: " + error.message);
    return;
  }

  closeModal("modalBanner");
  await renderBannersAdmin(document.getElementById("adminSearch")?.value || "");
}

async function deleteBanner(id) {
  if (!confirm("Excluir esse banner?")) return;

  const { error } = await supabaseClient
    .from("banners")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir banner: " + error.message);
    return;
  }

  await renderBannersAdmin(document.getElementById("adminSearch")?.value || "");
}

/* =========================
   UPLOADS
========================= */
function setupProductImageUpload() {
  const btnSelectImage = document.getElementById("btnSelectImage");
  const fileInput = document.getElementById("prod_image_file");
  const imageInput = document.getElementById("prod_image");
  const preview = document.getElementById("prod_image_preview");

  btnSelectImage?.addEventListener("click", () => fileInput?.click());

  fileInput?.addEventListener("change", async function () {
    const file = this.files?.[0];
    if (!file) return;

    try {
      preview.innerHTML = `<div class="muted">Enviando imagem...</div>`;
      const imageUrl = await uploadImageToCloudinary(file, "catalogo/produtos");
      imageInput.value = imageUrl;
      preview.innerHTML = `<img src="${imageUrl}" style="width:140px;height:140px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">`;
    } catch (err) {
      alert("Erro ao enviar imagem: " + err.message);
      preview.innerHTML = "";
    } finally {
      this.value = "";
    }
  });
}

function setupBannerImageUpload() {
  const btn = document.getElementById("btnSelectBannerImage");
  const inputFile = document.getElementById("banner_image_file");
  const inputText = document.getElementById("banner_image");
  const preview = document.getElementById("banner_image_preview");

  btn?.addEventListener("click", () => inputFile?.click());

  inputFile?.addEventListener("change", async function () {
    const file = this.files?.[0];
    if (!file) return;

    try {
      preview.innerHTML = `<div class="muted">Enviando banner...</div>`;
      const imageUrl = await uploadImageToCloudinary(file, "catalogo/banners");
      inputText.value = imageUrl;
      preview.innerHTML = `<img src="${imageUrl}" style="width:160px;height:100px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">`;
    } catch (err) {
      alert("Erro ao enviar banner: " + err.message);
      preview.innerHTML = "";
    } finally {
      this.value = "";
    }
  });
}

function setupBrandUploads() {
  const btnLogo = document.getElementById("btnSelectLogo");
  const logoFile = document.getElementById("store_logo_file");
  const logoText = document.getElementById("store_logo");
  const logoPrev = document.getElementById("store_logo_preview");

  btnLogo?.addEventListener("click", () => logoFile?.click());

  logoFile?.addEventListener("change", async function () {
    const file = this.files?.[0];
    if (!file) return;

    try {
      logoPrev.innerHTML = `<div class="muted">Enviando logo...</div>`;
      const imageUrl = await uploadImageToCloudinary(file, "catalogo/logo");
      logoText.value = imageUrl;
      logoPrev.innerHTML = `<img src="${imageUrl}" style="width:140px;height:140px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">`;
    } catch (err) {
      alert("Erro ao enviar logo: " + err.message);
      logoPrev.innerHTML = "";
    } finally {
      this.value = "";
    }
  });

  const btnFav = document.getElementById("btnSelectFavicon");
  const favFile = document.getElementById("store_favicon_file");
  const favText = document.getElementById("store_favicon");
  const favPrev = document.getElementById("store_favicon_preview");

  btnFav?.addEventListener("click", () => favFile?.click());

  favFile?.addEventListener("change", async function () {
    const file = this.files?.[0];
    if (!file) return;

    try {
      favPrev.innerHTML = `<div class="muted">Enviando favicon...</div>`;
      const imageUrl = await uploadImageToCloudinary(file, "catalogo/favicon");
      favText.value = imageUrl;
      favPrev.innerHTML = `<img src="${imageUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:14px;border:1px solid rgba(0,0,0,.1);">`;
    } catch (err) {
      alert("Erro ao enviar favicon: " + err.message);
      favPrev.innerHTML = "";
    } finally {
      this.value = "";
    }
  });
}

/* =========================
   BUSCA
========================= */
function setupAdminSearch() {
  document.getElementById("adminSearch")?.addEventListener("input", () => {
    const q = document.getElementById("adminSearch")?.value || "";
    renderCategoriesAdmin(q);
    renderProductsAdmin(q);
    renderBannersAdmin(q);
  });
}

/* =========================
   STATS
========================= */
async function loadStats() {
  const stats = get(LS.stats, { visits: 0, productViews: {}, productOrders: {} });
  const viewsTotal = Object.values(stats.productViews || {}).reduce((a, b) => a + (b || 0), 0);
  const ordersTotal = Object.values(stats.productOrders || {}).reduce((a, b) => a + (b || 0), 0);

  document.getElementById("statVisits").textContent = stats.visits || 0;
  document.getElementById("statViews").textContent = viewsTotal;
  document.getElementById("statOrders").textContent = ordersTotal;

  const { data: products } = await supabaseClient.from("products").select("id,name");

  const byId = {};
  (products || []).forEach((p) => { byId[p.id] = p.name; });

  const topViews = Object.entries(stats.productViews || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topOrders = Object.entries(stats.productOrders || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  document.getElementById("topViews").innerHTML = topViews.length
    ? topViews.map(([id, total]) => `
        <div class="list2__item">
          <div class="list2__main">
            <strong>${escapeHtml(byId[id] || id)}</strong>
            <small class="muted">${total} visualizações</small>
          </div>
        </div>
      `).join("")
    : `<div class="empty__card">Sem dados ainda.</div>`;

  document.getElementById("topOrders").innerHTML = topOrders.length
    ? topOrders.map(([id, total]) => `
        <div class="list2__item">
          <div class="list2__main">
            <strong>${escapeHtml(byId[id] || id)}</strong>
            <small class="muted">${total} pedidos</small>
          </div>
        </div>
      `).join("")
    : `<div class="empty__card">Sem dados ainda.</div>`;
}

/* =========================
   BACKUP
========================= */
async function exportAll() {
  const [
    storeRes,
    themeRes,
    categoriesRes,
    productsRes,
    bannersRes
  ] = await Promise.all([
    supabaseClient.from("store_settings").select("*"),
    supabaseClient.from("theme_settings").select("*"),
    supabaseClient.from("categories").select("*"),
    supabaseClient.from("products").select("*"),
    supabaseClient.from("banners").select("*")
  ]);

  const payload = {
    store_settings: storeRes.data || [],
    theme_settings: themeRes.data || [],
    categories: categoriesRes.data || [],
    products: productsRes.data || [],
    banners: bannersRes.data || []
  };

  document.getElementById("exportArea").value = JSON.stringify(payload, null, 2);
}

async function importAll() {
  const raw = document.getElementById("importArea").value.trim();
  if (!raw) {
    alert("Cole um JSON primeiro.");
    return;
  }

  const data = safeParse(raw, null);
  if (!data) {
    alert("JSON inválido.");
    return;
  }

  if (Array.isArray(data.store_settings) && data.store_settings.length) {
    const { error } = await supabaseClient.from("store_settings").upsert(data.store_settings, { onConflict: "id" });
    if (error) return alert("Erro ao importar store_settings: " + error.message);
  }

  if (Array.isArray(data.theme_settings) && data.theme_settings.length) {
    const { error } = await supabaseClient.from("theme_settings").upsert(data.theme_settings, { onConflict: "id" });
    if (error) return alert("Erro ao importar theme_settings: " + error.message);
  }

  if (Array.isArray(data.categories) && data.categories.length) {
    const { error } = await supabaseClient.from("categories").upsert(data.categories, { onConflict: "id" });
    if (error) return alert("Erro ao importar categories: " + error.message);
  }

  if (Array.isArray(data.products) && data.products.length) {
    const { error } = await supabaseClient.from("products").upsert(data.products, { onConflict: "id" });
    if (error) return alert("Erro ao importar products: " + error.message);
  }

  if (Array.isArray(data.banners) && data.banners.length) {
    const { error } = await supabaseClient.from("banners").upsert(data.banners, { onConflict: "id" });
    if (error) return alert("Erro ao importar banners: " + error.message);
  }

  alert("✅ Importado com sucesso!");
  await loadStoreFields();
  await loadThemeFields();
  await renderCategoriesAdmin();
  await renderProductsAdmin();
  await renderBannersAdmin();
  await fillProductCategorySelect();
}

function setupBackupEvents() {
  document.getElementById("btnExport")?.addEventListener("click", exportAll);
  document.getElementById("btnImport")?.addEventListener("click", importAll);
}

/* =========================
   EVENTOS GERAIS
========================= */
function setupCrudButtons() {
  document.getElementById("btnAddCategory")?.addEventListener("click", () => openCategoryModal());
  document.getElementById("btnAddProduct")?.addEventListener("click", () => openProductModal());
  document.getElementById("btnQuickAddProduct")?.addEventListener("click", () => openProductModal());
  document.getElementById("btnAddBanner")?.addEventListener("click", () => openBannerModal());

  document.getElementById("cat_save")?.addEventListener("click", saveCategory);
  document.getElementById("prod_save")?.addEventListener("click", saveProduct);
  document.getElementById("banner_save")?.addEventListener("click", saveBanner);

  document.addEventListener("click", async (e) => {
    const t = e.target;

    const catEdit = t?.getAttribute?.("data-cat-edit");
    if (catEdit) {
      const { data, error } = await supabaseClient
        .from("categories")
        .select("*")
        .eq("id", catEdit)
        .single();

      if (error || !data) {
        alert("Erro ao carregar categoria.");
        return;
      }

      openCategoryModal(data);
      return;
    }

    const catDel = t?.getAttribute?.("data-cat-del");
    if (catDel) {
      await deleteCategory(catDel);
      return;
    }

    const prodEdit = t?.getAttribute?.("data-prod-edit");
    if (prodEdit) {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .eq("id", prodEdit)
        .single();

      if (error || !data) {
        alert("Erro ao carregar produto.");
        return;
      }

      openProductModal(data);
      return;
    }

    const prodDel = t?.getAttribute?.("data-prod-del");
    if (prodDel) {
      await deleteProduct(prodDel);
      return;
    }

    const bannerEdit = t?.getAttribute?.("data-banner-edit");
    if (bannerEdit) {
      const { data, error } = await supabaseClient
        .from("banners")
        .select("*")
        .eq("id", bannerEdit)
        .single();

      if (error || !data) {
        alert("Erro ao carregar banner.");
        return;
      }

      openBannerModal(data);
      return;
    }

    const bannerDel = t?.getAttribute?.("data-banner-del");
    if (bannerDel) {
      await deleteBanner(bannerDel);
    }
  });
}

function setupSaveAll() {
  document.getElementById("btnSaveAll")?.addEventListener("click", async () => {
    const storeOk = await saveStoreFields();
    const themeOk = await saveThemeFields();

    if (storeOk && themeOk) {
      alert("✅ Tudo salvo com sucesso!");
      await loadStoreFields();
      await loadThemeFields();
    }
  });
}

/* =========================
   START
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  setupTabs();
  setupMobileSidebar();
  setupStoreEvents();
  setupThemeEvents();
  setupCrudButtons();
  setupProductImageUpload();
  setupBannerImageUpload();
  setupBrandUploads();
  setupAdminSearch();
  setupBackupEvents();
  setupSaveAll();

  await loadStoreFields();
  await loadThemeFields();
  await renderCategoriesAdmin();
  await renderProductsAdmin();
  await renderBannersAdmin();
  await fillProductCategorySelect();
  await loadStats();
});