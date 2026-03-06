/* =========================
   CHAVES (MESMAS DO ADMIN)
========================= */
const LS = {
  store: "catalog_store",
  products: "catalog_products",
  categories: "catalog_categories",
  banners: "catalog_banners",
  theme: "catalog_theme",
  menu: "catalog_menu",
  stats: "catalog_stats",
  history: "catalog_history"
};

const safeParse = (v, fallback) => {
  try { return JSON.parse(v) ?? fallback; }
  catch { return fallback; }
};

const get = (key, fallback) =>
  safeParse(localStorage.getItem(key), fallback);

const set = (key, value) =>
  localStorage.setItem(key, JSON.stringify(value));


/* =========================
   INICIALIZAÇÃO
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  setupFilters();
  setupSearch();
  setupMobileMenu();

  await applyStore();
  await applyTheme();
  await renderCategories();
  await renderProducts();
  await renderBanners();
});

/* =========================
   STATS
========================= */

function initStats() {
  const stats = get(LS.stats, { visits:0, productViews:{}, productOrders:{} });
  stats.visits++;
  set(LS.stats, stats);
}

function addProductView(id){
  const stats = get(LS.stats, { visits:0, productViews:{}, productOrders:{} });
  stats.productViews[id] = (stats.productViews[id] || 0) + 1;
  set(LS.stats, stats);
}

function addProductOrder(id){
  const stats = get(LS.stats, { visits:0, productViews:{}, productOrders:{} });
  stats.productOrders[id] = (stats.productOrders[id] || 0) + 1;
  set(LS.stats, stats);
}


/* =========================
   LOJA
========================= */

async function applyStore(){
  const { data: store, error } = await supabaseClient
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if(error || !store) return;

  document.getElementById("storeName").textContent = store.name || "Minha Loja";
  document.getElementById("siteTitle").textContent = store.name || "Catálogo";

  if(store.logo){
    document.getElementById("logoImg").src = store.logo;
  }

  if(store.favicon){
    document.getElementById("favicon").href = store.favicon;
  }

  if(store.footer){
    document.getElementById("footerText").textContent = store.footer;
  }

  if(store.site_notice){
    const bar = document.createElement("div");
    bar.className = "notice-bar";
    bar.textContent = store.site_notice;
    document.body.prepend(bar);
  }

  if(store.store_open === "closed"){
    const bar = document.createElement("div");
    bar.className = "notice-bar closed";
    bar.textContent = "Loja fechada no momento.";
    document.body.prepend(bar);
  }

  const hero = document.querySelector(".hero");
  if(hero){
    hero.style.display = (store.show_hero === "no") ? "none" : "";
  }

  if(document.getElementById("heroBadge")) {
    document.getElementById("heroBadge").textContent = store.hero_badge || "✨ Catálogo atualizado";
  }

  if(document.getElementById("heroTitle")) {
    document.getElementById("heroTitle").textContent = store.hero_title || "Nosso Catálogo de Produtos";
  }

  if(document.getElementById("heroSubtitle")) {
    document.getElementById("heroSubtitle").textContent = store.hero_subtitle || "Escolha seus personalizados com um visual moderno, leve e fácil de navegar.";
  }
}

/* =========================
   TEMA
========================= */
async function applyTheme(){
  const { data: theme, error } = await supabaseClient
    .from("theme_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if(error || !theme) return;

  const root = document.documentElement;

  if(theme.primary) root.style.setProperty("--primary", theme.primary);
  if(theme.secondary) root.style.setProperty("--secondary", theme.secondary);
  if(theme.background) root.style.setProperty("--bg", theme.background);
  if(theme.button_color) root.style.setProperty("--btn", theme.button_color);

  if(theme.font_family){
    document.body.style.fontFamily = theme.font_family;
  }

  if(theme.font_url){
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = theme.font_url;
    document.head.appendChild(link);
  }
}

/* =========================
   CATEGORIAS
========================= */

async function renderCategories(){
  const container = document.getElementById("categoryBar");
  const mobile = document.getElementById("mobileMenuCategories");

  if(container) container.innerHTML = "";
  if(mobile) mobile.innerHTML = "";

  const { data: categories, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true });

  if(error) return;

  function makeBtn(label, onClick, active=false){
    const b = document.createElement("button");
    b.className = "category-btn" + (active ? " active" : "");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function setActive(selector, label){
    document.querySelectorAll(selector).forEach(b => {
      b.classList.toggle("active", b.textContent === label);
    });
  }

  const onAll = () => {
    renderProducts(null);
    setActive("#categoryBar .category-btn", "Todos");
    setActive("#mobileMenuCategories .category-btn", "Todos");
    document.getElementById("mobileMenu")?.classList.remove("open");
  };

  container?.appendChild(makeBtn("Todos", onAll, true));
  mobile?.appendChild(makeBtn("Todos", onAll, true));

  categories.forEach(cat => {
    const onCat = () => {
      renderProducts(cat.id);
      setActive("#categoryBar .category-btn", cat.name);
      setActive("#mobileMenuCategories .category-btn", cat.name);
      document.getElementById("mobileMenu")?.classList.remove("open");
    };

    container?.appendChild(makeBtn(cat.name, onCat));
    mobile?.appendChild(makeBtn(cat.name, onCat));
  });
}

  // ===== TODOS (sempre existe) =====
  const onAll = () => {
    renderProducts(null);
    setActive("#categoryBar .category-btn", "Todos");
    setActive("#mobileMenuCategories .category-btn", "Todos");

    // fecha o menu no celular
    document.getElementById("mobileMenu")?.classList.remove("open");
    document.getElementById("mobileMenu")?.setAttribute("aria-hidden", "true");
  };

  container?.appendChild(makeBtn("Todos", onAll, true));
  mobile?.appendChild(makeBtn("Todos", onAll, true));

  // ===== categorias do admin =====
  categories.forEach(cat => {
    const onCat = () => {
      renderProducts(cat.id);
      setActive("#categoryBar .category-btn", cat.name);
      setActive("#mobileMenuCategories .category-btn", cat.name);

      document.getElementById("mobileMenu")?.classList.remove("open");
      document.getElementById("mobileMenu")?.setAttribute("aria-hidden", "true");
    };

    container?.appendChild(makeBtn(cat.name, onCat));
    mobile?.appendChild(makeBtn(cat.name, onCat));
  });
}
/* =========================
   PRODUTOS
========================= */

async function renderProducts(categoryId = null){
  const grid = document.getElementById("productsGrid");
  const empty = document.getElementById("emptyMessage");

  const { data: products, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if(error){
    grid.innerHTML = "";
    empty.style.display = "block";
    empty.textContent = "Erro ao carregar produtos.";
    return;
  }

  let finalProducts = [...products];

  if(categoryId){
    finalProducts = finalProducts.filter(p => p.category_id === categoryId);
  }

  const search = document.getElementById("searchInput")?.value?.toLowerCase()?.trim();
  if(search){
    finalProducts = finalProducts.filter(p =>
      (p.name || "").toLowerCase().includes(search)
    );
  }

  const promo = document.getElementById("promoFilter")?.value || "";
  if(promo === "yes"){
    finalProducts = finalProducts.filter(p => p.promo === "yes");
  }

  const priceOrder = document.getElementById("priceFilter")?.value || "";
  if(priceOrder === "low"){
    finalProducts.sort((a,b) => (Number(a.price)||0) - (Number(b.price)||0));
  }else if(priceOrder === "high"){
    finalProducts.sort((a,b) => (Number(b.price)||0) - (Number(a.price)||0));
  }

  grid.innerHTML = "";

  if(finalProducts.length === 0){
    empty.style.display = "block";
    empty.textContent = "Nenhum produto encontrado.";
    return;
  }

  empty.style.display = "none";

  finalProducts.forEach(product => {
    const card = document.createElement("div");
    card.className = "product";

    const priceText =
      (product.price !== "" && product.price != null)
        ? `R$ ${Number(product.price).toFixed(2).replace(".", ",")}`
        : "";

    card.innerHTML = `
      <img src="${product.image || ""}" alt="${product.name || ""}">
      <div class="content">
        <h3>${product.name || ""}</h3>
        <div class="row">
          <strong>${priceText}</strong>
          ${product.promo === "yes" ? `<span class="tag tag--featured">Promo</span>` : ""}
        </div>
        <button type="button" class="btn-buy">Pedir no WhatsApp</button>
      </div>
    `;

    card.querySelector(".btn-buy").addEventListener("click", () => {
      sendToWhatsApp(product);
    });

    grid.appendChild(card);
  });
}

/* =========================
   WHATSAPP
========================= */

function sendToWhatsApp(product){
  const store = get(LS.store, {});
  if(!store.whatsapp) return alert("WhatsApp não configurado.");

  let msg = store.whatsMessageTemplate || 
    "Olá! Quero pedir: {NOME} - {PRECO}";

  msg = msg
    .replace("{NOME}", product.name)
    .replace("{PRECO}", product.price || "")
    .replace("{SKU}", product.sku || "")
    .replace("{LINK}", window.location.href);

  const url = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}


/* =========================
   FILTROS
========================= */

function setupFilters(){
  document.getElementById("priceFilter").onchange = renderProducts;
  document.getElementById("promoFilter").onchange = renderProducts;
  document.getElementById("orderFilter").onchange = renderProducts;
}

function setupSearch(){
  document.getElementById("searchInput")
    .addEventListener("input", () => renderProducts());
}


/* =========================
   BANNERS
========================= */

async function renderBanners(){
  const slider = document.getElementById("bannerSlider");
  const dots = document.getElementById("bannerDots");
  const section = document.getElementById("bannerSection");

  const { data: banners, error } = await supabaseClient
    .from("banners")
    .select("*")
    .order("created_at", { ascending: false });

  slider.innerHTML = "";
  dots.innerHTML = "";

  if(error || !banners || banners.length === 0){
    if(section) section.style.display = "none";
    return;
  }else{
    if(section) section.style.display = "block";
  }

  banners.forEach((b, i) => {
    const slide = document.createElement("div");
    slide.className = "banner";
    slide.innerHTML = `
      <img src="${b.image || ""}" alt="${b.title || "Banner"}">
      <div class="bannerText">
        ${b.title ? `<h2>${b.title}</h2>` : ""}
        ${b.text ? `<p>${b.text}</p>` : ""}
        ${b.button_text && b.button_link
          ? `<a class="bannerBtn" href="${b.button_link}" target="_blank">${b.button_text}</a>`
          : ""
        }
      </div>
    `;
    slider.appendChild(slide);

    const dot = document.createElement("span");
    dots.appendChild(dot);
  });

  let index = 0;
  let timer = null;

  function updateDots(){
    const all = dots.querySelectorAll("span");
    all.forEach((d, idx) => d.classList.toggle("active", idx === index));
  }

  function goToBanner(i){
    index = i;
    slider.style.transform = `translateX(-${index * 100}%)`;
    updateDots();
    restartAuto();
  }

  function next(){
    index = (index + 1) % banners.length;
    slider.style.transform = `translateX(-${index * 100}%)`;
    updateDots();
  }

  function restartAuto(){
    if(timer) clearInterval(timer);
    if(banners.length > 1){
      timer = setInterval(next, 4500);
    }
  }

  dots.querySelectorAll("span").forEach((dot, i) => {
    dot.addEventListener("click", () => goToBanner(i));
  });

  goToBanner(0);
  restartAuto();
}


/* =========================
   MOBILE MENU
========================= */

function setupMobileMenu(){
  const btn = document.getElementById("menuBtn");
  const menu = document.getElementById("mobileMenu");
  const close = document.getElementById("closeMobileMenu");

  // ✅ blindagem: se algo não existir, não quebra
  if(!btn || !menu) return;

  // abrir
  btn.addEventListener("click", () => {
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
  });

  // fechar pelo X (se existir)
  close?.addEventListener("click", () => {
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
  });

  // fechar clicando fora do painel
  menu.addEventListener("click", (e) => {
    if(e.target === menu){
      menu.classList.remove("open");
      menu.setAttribute("aria-hidden", "true");
    }
  });
}