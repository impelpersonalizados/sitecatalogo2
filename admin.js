// ✅ IMPORTANTE: aqui NÃO tem const LS, get, set, safeParse
// porque já existem no seu <script> inline do admin.html

const CLOUDINARY_CLOUD_NAME = "dzrshdovw";
const CLOUDINARY_UPLOAD_PRESET = "catalogo_unsigned";

const uid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : ("id_" + Date.now() + "_" + Math.random().toString(16).slice(2)));

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
async function renderCategoriesAdmin(filterText = ""){
  const list = document.getElementById("categoriesList");
  if(!list) return;

  const { data, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true });

  if(error){
    list.innerHTML = `<div class="empty__card">Erro ao carregar categorias.</div>`;
    return;
  }

  const q = (filterText || "").trim().toLowerCase();
  const filtered = q
    ? data.filter(c => (c.name || "").toLowerCase().includes(q))
    : data;

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

async function saveCategory(){
  const id = document.getElementById("cat_id").value || uid();
  const name = document.getElementById("cat_name").value.trim();

  if(!name) return alert("Digite o nome da categoria.");

  const { error } = await supabaseClient
    .from("categories")
    .upsert([{ id, name }]);

  if(error){
    alert("Erro ao salvar categoria: " + error.message);
    return;
  }

  closeModal("modalCategory");
  await renderCategoriesAdmin(document.getElementById("adminSearch")?.value || "");
  await fillProductCategorySelect();
}

async function deleteCategory(id){
  const { data: prods, error: prodErr } = await supabaseClient
    .from("products")
    .select("id")
    .eq("category_id", id)
    .limit(1);

  if(prodErr){
    alert("Erro ao verificar produtos da categoria.");
    return;
  }

  if(prods && prods.length){
    alert("Essa categoria está em uso por um produto. Troque/remova o produto antes.");
    return;
  }

  if(!confirm("Excluir essa categoria?")) return;

  const { error } = await supabaseClient
    .from("categories")
    .delete()
    .eq("id", id);

  if(error){
    alert("Erro ao excluir categoria: " + error.message);
    return;
  }

  await renderCategoriesAdmin(document.getElementById("adminSearch")?.value || "");
  await fillProductCategorySelect();
}

/* =========================
   PRODUTOS
========================= */
async function fillProductCategorySelect(selectedId = ""){
  const sel = document.getElementById("prod_category");
  if(!sel) return;

  const { data, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true });

  if(error){
    sel.innerHTML = `<option value="">Sem categoria</option>`;
    return;
  }

  sel.innerHTML = [
    `<option value="">Sem categoria</option>`,
    ...data.map(c => `<option value="${escapeAttr(c.id)}">${escapeHtml(c.name)}</option>`)
  ].join("");

  sel.value = selectedId || "";
}

async function renderProductsAdmin(filterText = ""){
  const grid = document.getElementById("adminProductsGrid");
  if(!grid) return;

  const [{ data: products, error: prodErr }, { data: cats, error: catErr }] = await Promise.all([
    supabaseClient.from("products").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("categories").select("*")
  ]);

  if(prodErr || catErr){
    grid.innerHTML = `<div class="empty__card">Erro ao carregar produtos.</div>`;
    return;
  }

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
    const catName = cats.find(c => c.id === p.category_id)?.name || "Sem categoria";
    const price = (p.price === "" || p.price == null)
      ? "Sem preço"
      : `R$ ${Number(p.price).toFixed(2).replace(".", ",")}`;

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

async function saveProduct(){
  const id = document.getElementById("prod_id").value || uid();

  const name = document.getElementById("prod_name").value.trim();
  const priceRaw = document.getElementById("prod_price").value;
  const sku = document.getElementById("prod_sku").value.trim();
  const image = document.getElementById("prod_image").value.trim();
  const category_id = document.getElementById("prod_category").value;
  const promo = document.getElementById("prod_promo").value;

  if(!name) return alert("Digite o nome do produto.");

  const price = (priceRaw === "" ? null : Number(priceRaw));

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
    }]);

  if(error){
    alert("Erro ao salvar produto: " + error.message);
    return;
  }

  closeModal("modalProduct");
  await renderProductsAdmin(document.getElementById("adminSearch")?.value || "");
}
async function deleteProduct(id){
  if(!confirm("Excluir esse produto?")) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", id);

  if(error){
    alert("Erro ao excluir produto: " + error.message);
    return;
  }

  await renderProductsAdmin(document.getElementById("adminSearch")?.value || "");
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

  fileInput?.addEventListener("change", async function () {
    const file = this.files?.[0];
    if (!file) return;

    try {
      preview.innerHTML = `<div class="muted">Enviando imagem...</div>`;

      const imageUrl = await uploadImageToCloudinary(file, "catalogo/produtos");

      imageInput.value = imageUrl;

      preview.innerHTML = `
        <img src="${imageUrl}"
             style="width:140px;height:140px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">
      `;
    } catch (err) {
      alert("Erro ao enviar imagem: " + err.message);
      preview.innerHTML = "";
    } finally {
      this.value = "";
    }
  });
}
/* =========================
   BANNERS - CRUD
========================= */
async function renderBannersAdmin(filterText = ""){
  const list = document.getElementById("bannersList");
  if(!list) return;

  const { data, error } = await supabaseClient
    .from("banners")
    .select("*")
    .order("created_at", { ascending: false });

  if(error){
    list.innerHTML = `<div class="empty__card">Erro ao carregar banners.</div>`;
    return;
  }

  const q = (filterText || "").trim().toLowerCase();
  const filtered = q
    ? data.filter(b =>
        (b.title || "").toLowerCase().includes(q) ||
        (b.text || "").toLowerCase().includes(q)
      )
    : data;

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

async function saveBanner(){
  const id = document.getElementById("banner_id").value || uid();

  const title = document.getElementById("banner_title").value.trim();
  const text = document.getElementById("banner_text").value.trim();
  const image = document.getElementById("banner_image").value.trim();
  const button_text = document.getElementById("banner_btnText").value.trim();
  const button_link = document.getElementById("banner_btnLink").value.trim();

  if(!image){
    alert("Selecione/cole uma imagem para o banner.");
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
    }]);

  if(error){
    alert("Erro ao salvar banner: " + error.message);
    return;
  }

  closeModal("modalBanner");
  await renderBannersAdmin(document.getElementById("adminSearch")?.value || "");
}

async function deleteBanner(id){
  if(!confirm("Excluir esse banner?")) return;

  const { error } = await supabaseClient
    .from("banners")
    .delete()
    .eq("id", id);

  if(error){
    alert("Erro ao excluir banner: " + error.message);
    return;
  }

  await renderBannersAdmin(document.getElementById("adminSearch")?.value || "");
}

/* Upload de imagem do banner (PC -> base64) */
function setupBannerImageUpload(){
  const btn = document.getElementById("btnSelectBannerImage");
  const inputFile = document.getElementById("banner_image_file");
  const inputText = document.getElementById("banner_image");
  const preview = document.getElementById("banner_image_preview");

  btn?.addEventListener("click", () => inputFile?.click());

  inputFile?.addEventListener("change", async function(){
    const file = this.files?.[0];
    if(!file) return;

    try {
      preview.innerHTML = `<div class="muted">Enviando banner...</div>`;

      const imageUrl = await uploadImageToCloudinary(file, "catalogo/banners");

      inputText.value = imageUrl;

      preview.innerHTML = `
        <img src="${imageUrl}" style="width:160px;height:100px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">
      `;
    } catch (err) {
      alert("Erro ao enviar banner: " + err.message);
      preview.innerHTML = "";
    } finally {
      this.value = "";
    }
  });
}

/* =========================
   START
========================= */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnAddCategory")?.addEventListener("click", () => openCategoryModal());
  document.getElementById("btnAddProduct")?.addEventListener("click", () => openProductModal());
  document.getElementById("btnQuickAddProduct")?.addEventListener("click", () => openProductModal());
  document.getElementById("btnAddBanner")?.addEventListener("click", () => openBannerModal());

  document.getElementById("cat_save")?.addEventListener("click", saveCategory);
  document.getElementById("prod_save")?.addEventListener("click", saveProduct);
  document.getElementById("banner_save")?.addEventListener("click", saveBanner);

  setupProductImageUpload();
  setupBannerImageUpload();
  setupBrandUploads();

  document.getElementById("adminSearch")?.addEventListener("input", () => {
    const q = document.getElementById("adminSearch").value || "";
    renderCategoriesAdmin(q);
    renderProductsAdmin(q);
    renderBannersAdmin(q);
  });

  document.addEventListener("click", async (e) => {
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
      const { data, error } = await supabaseClient
       .from("products")
       .select("*")
       .eq("id", prodEdit)
       .single();

     if(error || !data){
       alert("Erro ao carregar produto.");
       return;
     }

     openProductModal(data);
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

  logoFile?.addEventListener("change", async function(){
    const file = this.files?.[0];
    if(!file) return;

    try {
      logoPrev.innerHTML = `<div class="muted">Enviando logo...</div>`;

      const imageUrl = await uploadImageToCloudinary(file, "catalogo/logo");
      logoText.value = imageUrl;

      logoPrev.innerHTML = `
        <img src="${imageUrl}" style="width:140px;height:140px;object-fit:cover;border-radius:16px;border:1px solid rgba(0,0,0,.1);">
      `;
    } catch (err) {
      alert("Erro ao enviar logo: " + err.message);
      logoPrev.innerHTML = "";
    } finally {
      this.value = "";
    }
  });

  // FAVICON
  const btnFav = document.getElementById("btnSelectFavicon");
  const favFile = document.getElementById("store_favicon_file");
  const favText = document.getElementById("store_favicon");
  const favPrev = document.getElementById("store_favicon_preview");

  btnFav?.addEventListener("click", () => favFile?.click());

  favFile?.addEventListener("change", async function(){
    const file = this.files?.[0];
    if(!file) return;

    try {
      favPrev.innerHTML = `<div class="muted">Enviando favicon...</div>`;

      const imageUrl = await uploadImageToCloudinary(file, "catalogo/favicon");
      favText.value = imageUrl;

      favPrev.innerHTML = `
        <img src="${imageUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:14px;border:1px solid rgba(0,0,0,.1);">
      `;
    } catch (err) {
      alert("Erro ao enviar favicon: " + err.message);
      favPrev.innerHTML = "";
    } finally {
      this.value = "";
    }
  });
}


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
