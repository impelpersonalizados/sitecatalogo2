// ✅ IMPORTANTE: aqui NÃO tem const LS, get, set, safeParse
// porque já existem no seu <script> inline do admin.html

const uid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : ("id_" + Date.now() + "_" + Math.random().toString(16).slice(2)));

/* =========================
   MODAL HELPERS
========================= */
function openModal(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.add("is-open");
  el.setAttribute("aria-hidden", "false");
}
function closeModal(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove("is-open");
  el.setAttribute("aria-hidden", "true");
}

// fecha modal ao clicar no backdrop/X
document.addEventListener("click", (e) => {
  const closeId = e.target?.getAttribute?.("data-close");
  if(closeId) closeModal(closeId);
});

/* =========================
   ESCAPES
========================= */
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function escapeAttr(s){
  return escapeHtml(s).replace(/`/g, "&#096;");
}

/* =========================
   CATEGORIAS
========================= */
function renderCategoriesAdmin(filterText = ""){
  const list = document.getElementById("categoriesList");
  if(!list) return;

  const cats = get(LS.categories, []);
  const q = (filterText || "").trim().toLowerCase();

  const filtered = q ? cats.filter(c => (c.name || "").toLowerCase().includes(q)) : cats;

  if(filtered.length === 0){
    list.innerHTML = `<div class="empty__card">Nenhuma categoria. Clique em <strong>+ Categoria</strong>.</div>`;
    return;
  }

  list.innerHTML = filtered.map(c => `
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

function openCategoryModal(cat = null){
  document.getElementById("catModalTitle").textContent = cat ? "Editar Categoria" : "Nova Categoria";
  document.getElementById("cat_id").value = cat?.id || "";
  document.getElementById("cat_name").value = cat?.name || "";
  openModal("modalCategory");
}

function saveCategory(){
  const id = document.getElementById("cat_id").value || uid();
  const name = document.getElementById("cat_name").value.trim();
  if(!name) return alert("Digite o nome da categoria.");

  const cats = get(LS.categories, []);
  const idx = cats.findIndex(c => c.id === id);

  const payload = { id, name };

  if(idx >= 0) cats[idx] = payload;
  else cats.push(payload);

  set(LS.categories, cats);
  closeModal("modalCategory");

  const q = document.getElementById("adminSearch")?.value || "";
  renderCategoriesAdmin(q);
  fillProductCategorySelect();
}

function deleteCategory(id){
  const prods = get(LS.products, []);
  if(prods.some(p => p.categoryId === id)){
    return alert("Essa categoria está em uso por um produto. Troque/remova o produto antes.");
  }

  if(!confirm("Excluir essa categoria?")) return;

  const cats = get(LS.categories, []);
  set(LS.categories, cats.filter(c => c.id !== id));

  const q = document.getElementById("adminSearch")?.value || "";
  renderCategoriesAdmin(q);
  fillProductCategorySelect();
}

/* =========================
   PRODUTOS
========================= */
function fillProductCategorySelect(selectedId = ""){
  const sel = document.getElementById("prod_category");
  if(!sel) return;

  const cats = get(LS.categories, []);
  sel.innerHTML = [
    `<option value="">Sem categoria</option>`,
    ...cats.map(c => `<option value="${escapeAttr(c.id)}">${escapeHtml(c.name)}</option>`)
  ].join("");

  sel.value = selectedId || "";
}

function renderProductsAdmin(filterText = ""){
  const grid = document.getElementById("adminProductsGrid");
  if(!grid) return;

  const cats = get(LS.categories, []);
  const products = get(LS.products, []);
  const q = (filterText || "").trim().toLowerCase();

  const filtered = q
    ? products.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
      )
    : products;

  if(filtered.length === 0){
    grid.innerHTML = `<div class="empty__card">Nenhum produto. Clique em <strong>+ Produto</strong>.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const catName = cats.find(c => c.id === p.categoryId)?.name || "Sem categoria";
    const price = (p.price === "" || p.price == null) ? "Sem preço" : `R$ ${Number(p.price).toFixed(2).replace(".", ",")}`;

    return `
      <div class="admin-prod-card">
        <div class="admin-prod-card__img">
          ${p.image ? `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}">` : `<div class="empty__card">Sem imagem</div>`}
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

function openProductModal(prod = null){
  document.getElementById("prodModalTitle").textContent = prod ? "Editar Produto" : "Novo Produto";

  document.getElementById("prod_id").value = prod?.id || "";
  document.getElementById("prod_name").value = prod?.name || "";
  document.getElementById("prod_price").value = prod?.price ?? "";
  document.getElementById("prod_sku").value = prod?.sku || "";
  document.getElementById("prod_image").value = prod?.image || "";
  document.getElementById("prod_promo").value = prod?.promo || "no";

  // preview
  const prev = document.getElementById("prod_image_preview");
  const img = prod?.image || "";
  prev.innerHTML = img
    ? `<img src="${escapeAttr(img)}" style="width:140px;height:140px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">`
    : "";

  fillProductCategorySelect(prod?.categoryId || "");
  openModal("modalProduct");
}

function saveProduct(){
  const id = document.getElementById("prod_id").value || uid();

  const name = document.getElementById("prod_name").value.trim();
  const priceRaw = document.getElementById("prod_price").value;
  const sku = document.getElementById("prod_sku").value.trim();
  const image = document.getElementById("prod_image").value.trim();
  const categoryId = document.getElementById("prod_category").value;
  const promo = document.getElementById("prod_promo").value;

  if(!name) return alert("Digite o nome do produto.");

  const price = (priceRaw === "" ? "" : Number(priceRaw));

  const products = get(LS.products, []);
  const idx = products.findIndex(p => p.id === id);

  const payload = { id, name, price, sku, image, categoryId, promo };

  if(idx >= 0) products[idx] = payload;
  else products.push(payload);

  set(LS.products, products);

  closeModal("modalProduct");
  const q = document.getElementById("adminSearch")?.value || "";
  renderProductsAdmin(q);
}

function deleteProduct(id){
  if(!confirm("Excluir esse produto?")) return;

  const products = get(LS.products, []);
  set(LS.products, products.filter(p => p.id !== id));

  const q = document.getElementById("adminSearch")?.value || "";
  renderProductsAdmin(q);
}

/* =========================
   UPLOAD PRODUTO (PC -> base64)
========================= */
function setupProductImageUpload(){
  const btnSelectImage = document.getElementById("btnSelectImage");
  const fileInput = document.getElementById("prod_image_file");
  const imageInput = document.getElementById("prod_image");
  const preview = document.getElementById("prod_image_preview");

  btnSelectImage?.addEventListener("click", () => fileInput?.click());

  fileInput?.addEventListener("change", function () {
    const file = this.files?.[0];
    if (!file) return;

    // opcional: limite 2MB
    if(file.size > 2 * 1024 * 1024){
      alert("Imagem muito grande. Use até 2MB.");
      this.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const base64 = e.target.result;
      imageInput.value = base64;
      preview.innerHTML = `
        <img src="${base64}"
             style="width:140px;height:140px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">
      `;
    };
    reader.readAsDataURL(file);
  });
}

/* =========================
   BANNERS - CRUD
========================= */
function renderBannersAdmin(filterText = ""){
  const list = document.getElementById("bannersList");
  if(!list) return;

  const banners = get(LS.banners, []);
  const q = (filterText || "").trim().toLowerCase();

  const filtered = q
    ? banners.filter(b =>
        (b.title || "").toLowerCase().includes(q) ||
        (b.text || "").toLowerCase().includes(q)
      )
    : banners;

  if(filtered.length === 0){
    list.innerHTML = `<div class="empty__card">Nenhum banner. Clique em <strong>+ Banner</strong>.</div>`;
    return;
  }

  list.innerHTML = filtered.map(b => `
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

function openBannerModal(banner = null){
  document.getElementById("bannerModalTitle").textContent = banner ? "Editar Banner" : "Novo Banner";

  document.getElementById("banner_id").value = banner?.id || "";
  document.getElementById("banner_title").value = banner?.title || "";
  document.getElementById("banner_text").value = banner?.text || "";
  document.getElementById("banner_image").value = banner?.image || "";
  document.getElementById("banner_btnText").value = banner?.buttonText || "";
  document.getElementById("banner_btnLink").value = banner?.buttonLink || "";

  const prev = document.getElementById("banner_image_preview");
  const img = banner?.image || "";
  prev.innerHTML = img
    ? `<img src="${escapeAttr(img)}" style="width:160px;height:100px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">`
    : "";

  openModal("modalBanner");
}

function saveBanner(){
  const id = document.getElementById("banner_id").value || uid();

  const title = document.getElementById("banner_title").value.trim();
  const text = document.getElementById("banner_text").value.trim();
  const image = document.getElementById("banner_image").value.trim();
  const buttonText = document.getElementById("banner_btnText").value.trim();
  const buttonLink = document.getElementById("banner_btnLink").value.trim();

  if(!image){
    return alert("Selecione/cole uma imagem para o banner.");
  }

  const banners = get(LS.banners, []);
  const idx = banners.findIndex(b => b.id === id);

  const payload = { id, title, text, image, buttonText, buttonLink };

  if(idx >= 0) banners[idx] = payload;
  else banners.push(payload);

  set(LS.banners, banners);
  closeModal("modalBanner");

  const q = document.getElementById("adminSearch")?.value || "";
  renderBannersAdmin(q);
}

function deleteBanner(id){
  if(!confirm("Excluir esse banner?")) return;

  const banners = get(LS.banners, []);
  set(LS.banners, banners.filter(b => b.id !== id));

  const q = document.getElementById("adminSearch")?.value || "";
  renderBannersAdmin(q);
}

/* Upload de imagem do banner (PC -> base64) */
function setupBannerImageUpload(){
  const btn = document.getElementById("btnSelectBannerImage");
  const inputFile = document.getElementById("banner_image_file");
  const inputText = document.getElementById("banner_image");
  const preview = document.getElementById("banner_image_preview");

  btn?.addEventListener("click", () => inputFile?.click());

  inputFile?.addEventListener("change", function(){
    const file = this.files?.[0];
    if(!file) return;

    // opcional: limite 2MB
    if(file.size > 2 * 1024 * 1024){
      alert("Imagem muito grande. Use até 2MB.");
      this.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      inputText.value = base64;
      preview.innerHTML = `
        <img src="${base64}" style="width:160px;height:100px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">
      `;
    };
    reader.readAsDataURL(file);
  });
}

/* =========================
   START
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Botões abrir modais
  document.getElementById("btnAddCategory")?.addEventListener("click", () => openCategoryModal());
  document.getElementById("btnAddProduct")?.addEventListener("click", () => openProductModal());
  document.getElementById("btnQuickAddProduct")?.addEventListener("click", () => openProductModal());
  document.getElementById("btnAddBanner")?.addEventListener("click", () => openBannerModal());

  // Botões salvar
  document.getElementById("cat_save")?.addEventListener("click", saveCategory);
  document.getElementById("prod_save")?.addEventListener("click", saveProduct);
  document.getElementById("banner_save")?.addEventListener("click", saveBanner);

  // Uploads base64
  setupProductImageUpload();
  setupBannerImageUpload();
  setupBrandUploads();

  // Busca (filtra tudo)
  document.getElementById("adminSearch")?.addEventListener("input", () => {
    const q = document.getElementById("adminSearch").value || "";
    renderCategoriesAdmin(q);
    renderProductsAdmin(q);
    renderBannersAdmin(q);
  });

  // Delegação: editar/excluir
  document.addEventListener("click", (e) => {
    const t = e.target;

    const catEdit = t?.getAttribute?.("data-cat-edit");
    if(catEdit){
      const cats = get(LS.categories, []);
      openCategoryModal(cats.find(c => c.id === catEdit));
      return;
    }

    const catDel = t?.getAttribute?.("data-cat-del");
    if(catDel){
      deleteCategory(catDel);
      return;
    }

    const prodEdit = t?.getAttribute?.("data-prod-edit");
    if(prodEdit){
      const products = get(LS.products, []);
      openProductModal(products.find(p => p.id === prodEdit));
      return;
    }

    const prodDel = t?.getAttribute?.("data-prod-del");
    if(prodDel){
      deleteProduct(prodDel);
      return;
    }

    const bannerEdit = t?.getAttribute?.("data-banner-edit");
    if(bannerEdit){
      const banners = get(LS.banners, []);
      openBannerModal(banners.find(b => b.id === bannerEdit));
      return;
    }

    const bannerDel = t?.getAttribute?.("data-banner-del");
    if(bannerDel){
      deleteBanner(bannerDel);
      return;
    }
  });

  // Render inicial
  renderCategoriesAdmin();
  renderProductsAdmin();
  renderBannersAdmin();
  fillProductCategorySelect();
});

function setupBrandUploads(){
  // LOGO
  const btnLogo = document.getElementById("btnSelectLogo");
  const logoFile = document.getElementById("store_logo_file");
  const logoText = document.getElementById("store_logo");
  const logoPrev = document.getElementById("store_logo_preview");

  btnLogo?.addEventListener("click", () => logoFile?.click());
  logoFile?.addEventListener("change", function(){
    const file = this.files?.[0];
    if(!file) return;

    // opcional: limite 2MB
    if(file.size > 2 * 1024 * 1024){
      alert("Logo muito grande. Use até 2MB.");
      this.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      logoText.value = base64;

      logoPrev.innerHTML = `
        <img src="${base64}" style="width:140px;height:140px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">
      `;
    };
    reader.readAsDataURL(file);
  });

  // FAVICON
  const btnFav = document.getElementById("btnSelectFavicon");
  const favFile = document.getElementById("store_favicon_file");
  const favText = document.getElementById("store_favicon");
  const favPrev = document.getElementById("store_favicon_preview");

  btnFav?.addEventListener("click", () => favFile?.click());
  favFile?.addEventListener("change", function(){
    const file = this.files?.[0];
    if(!file) return;

    // opcional: limite 500KB (favicon costuma ser pequeno)
    if(file.size > 500 * 1024){
      alert("Favicon muito grande. Use até 500KB.");
      this.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      favText.value = base64;

      favPrev.innerHTML = `
        <img src="${base64}" style="width:64px;height:64px;object-fit:cover;border-radius:14px;border:1px solid rgba(0,0,0,.1);">
      `;
    };
    reader.readAsDataURL(file);
  });
}