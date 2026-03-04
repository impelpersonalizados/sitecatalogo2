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

document.addEventListener("DOMContentLoaded", () => {
  initStats();
  applyStore();
  applyTheme();
  renderCategories();
  renderProducts();
  renderBanners();
  setupFilters();
  setupSearch();
  setupMobileMenu();
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

function applyStore(){
  const store = get(LS.store, {});

  document.getElementById("storeName").textContent = store.name || "Minha Loja";
  document.getElementById("siteTitle").textContent = store.name || "Catálogo";

  if(store.logoBase64){
    document.getElementById("logoImg").src = store.logoBase64;
  }

  if(store.favicon){
    document.getElementById("favicon").href = store.favicon;
  }

  if(store.footer){
    document.getElementById("footerText").textContent = store.footer;
  }

  if(store.siteNotice){
    const bar = document.createElement("div");
    bar.className = "notice-bar";
    bar.textContent = store.siteNotice;
    document.body.prepend(bar);
  }

  if(store.storeOpen === "closed"){
    const bar = document.createElement("div");
    bar.className = "notice-bar closed";
    bar.textContent = "Loja fechada no momento.";
    document.body.prepend(bar);
  }
  
  if(store.heroBadge){
  document.getElementById("heroBadge").textContent = store.heroBadge;
  }

  if(store.heroTitle){
  document.getElementById("heroTitle").textContent = store.heroTitle;
  }

  if(store.heroSubtitle){
  document.getElementById("heroSubtitle").textContent = store.heroSubtitle;
  }

  const hero = document.querySelector(".hero");
  if(hero){
    hero.style.display = (store.showHero === "no") ? "none" : "";
  }
}


/* =========================
   TEMA
========================= */

function applyTheme(){
  const theme = get(LS.theme, {});
  const root = document.documentElement;

  if(theme.primary) root.style.setProperty("--primary", theme.primary);
  if(theme.secondary) root.style.setProperty("--secondary", theme.secondary);

  if(theme.fontFamily){
    document.body.style.fontFamily = theme.fontFamily;
  }

  if(theme.fontUrl){
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = theme.fontUrl;
    document.head.appendChild(link);
  }
}


/* =========================
   CATEGORIAS
========================= */

function renderCategories(){
  const container = document.getElementById("categoryBar");
  const categories = get(LS.categories, []);

  container.innerHTML = "";

  // ===== BOTÃO TODOS (SEMPRE EXISTE) =====
  const btnAll = document.createElement("button");
  btnAll.className = "category-btn active";
  btnAll.textContent = "Todos";
  btnAll.onclick = () => {
    document.querySelectorAll("#categoryBar button")
      .forEach(b => b.classList.remove("active"));
    btnAll.classList.add("active");
    renderProducts(null);
  };

  container.appendChild(btnAll);

  // ===== CATEGORIAS DO ADMIN =====
  categories.forEach(cat => {

    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.textContent = cat.name;

    btn.onclick = () => {

      document.querySelectorAll("#categoryBar button")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      renderProducts(cat.id);
    };

    container.appendChild(btn);
  });
}


/* =========================
   PRODUTOS
========================= */

function renderProducts(categoryId = null){
  const grid = document.getElementById("productsGrid");
  const empty = document.getElementById("emptyMessage");

  let products = get(LS.products, []);

  // 1) categoria
  if(categoryId){
    products = products.filter(p => p.categoryId === categoryId);
  }

  // 2) busca
  const search = document.getElementById("searchInput")?.value?.toLowerCase()?.trim();
  if(search){
    products = products.filter(p => (p.name || "").toLowerCase().includes(search));
  }

  // 3) filtro promoção
  const promo = document.getElementById("promoFilter")?.value || "";
  if(promo === "yes"){
    products = products.filter(p => p.promo === "yes");
  }

  // 4) ordenar preço
  const priceOrder = document.getElementById("priceFilter")?.value || "";
  if(priceOrder === "low"){
    products.sort((a,b) => (Number(a.price)||0) - (Number(b.price)||0));
  }else if(priceOrder === "high"){
    products.sort((a,b) => (Number(b.price)||0) - (Number(a.price)||0));
  }

  // 5) ordenar “popular” por pedidos
  const order = document.getElementById("orderFilter")?.value || "recent";
  if(order === "popular"){
    const stats = get(LS.stats, { productOrders:{} });
    const orders = stats.productOrders || {};
    products.sort((a,b) => (orders[b.id]||0) - (orders[a.id]||0));
  }else{
    // recent: mantém a ordem salva
  }

  grid.innerHTML = "";

  if(products.length === 0){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  products.forEach(product => {
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

    card.querySelector("img").addEventListener("click", () => addProductView(product.id));

    card.querySelector(".btn-buy").addEventListener("click", () => {
      addProductOrder(product.id);
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

function renderBanners(){
  const slider = document.getElementById("bannerSlider");
  const dots = document.getElementById("bannerDots");

  const banners = get(LS.banners, []);
  slider.innerHTML = "";
  dots.innerHTML = "";

  const section = document.getElementById("bannerSection");

  if(!banners || banners.length === 0){
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
        ${b.buttonText && b.buttonLink
          ? `<a class="bannerBtn" href="${b.buttonLink}" target="_blank">${b.buttonText}</a>`
          : ""
        }
      </div>
    `;
    slider.appendChild(slide);

    const dot = document.createElement("span");
    dot.addEventListener("click", () => goToBanner(i));
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

  goToBanner(0);
  restartAuto();
}

/* =========================
   MOBILE MENU
========================= */

function setupMobileMenu(){
  const btn = document.getElementById("menuBtn");
  const menu = document.getElementById("mobileMenu");

  btn.onclick = () => {
    menu.classList.toggle("open");
  };
}