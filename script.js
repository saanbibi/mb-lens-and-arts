const STORAGE_KEY = "mb_posts";

const galleryGrid = document.getElementById("galleryGrid");
const featuredGrid = document.getElementById("featuredGrid");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");

const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalCaption = document.getElementById("modalCaption");
const modalTags = document.getElementById("modalTags");
const modalMeta = document.getElementById("modalMeta");

const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");

const filterButtons = document.querySelectorAll(".filter-btn");

const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");

const activeFilters = document.getElementById("activeFilters");
const activeChips = document.getElementById("activeChips");

// Tag pill UI
const tagFilter = document.getElementById("tagFilter");
const tagFilterText = document.getElementById("tagFilterText");
const tagFilterClose = document.getElementById("tagFilterClose");

// New UI
const tagCloud = document.getElementById("tagCloud");
const themeToggle = document.getElementById("themeToggle");

// Footer email button (new)
const emailBtn = document.getElementById("emailBtn");

// Modal action buttons
const copyCaptionBtn = document.getElementById("copyCaptionBtn");
const copyTagsBtn = document.getElementById("copyTagsBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const openPostBtn = document.getElementById("openPostBtn");

let posts = [];
let activeFilter = "all";
let activeTag = null;
let searchQuery = "";

// modal navigation state
let modalList = [];
let modalIndex = -1;
let currentModalPost = null;

// zoom state
let zoom = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panBaseX = 0;
let panBaseY = 0;

// autocomplete state
let acList = null;
let acOpen = false;
let acIndex = -1;

/* ---------------- Utils ---------------- */

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function copyText(text){
  const t = String(text || "");
  try{
    await navigator.clipboard.writeText(t);
    return true;
  }catch{
    return false;
  }
}

function isVisible(post) {
  const now = new Date();

  if (post.draft) return false;

  if (post.schedule) {
    const s = new Date(post.schedule);
    if (!Number.isNaN(s.getTime()) && s > now) return false;
  }

  return true;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}

function hasTag(post, tag) {
  const tags = normalizeTags(post.tags).map(t => t.toLowerCase());
  return tags.includes(String(tag || "").toLowerCase());
}

function postText(post) {
  const tags = normalizeTags(post.tags).join(" ");
  return `${post.title || ""} ${post.caption || ""} ${post.category || ""} ${tags}`.toLowerCase();
}

function parseSearch(q) {
  const raw = String(q || "").trim();
  if (!raw) return { text: "", tags: [] };

  const parts = raw.split(/\s+/);
  const tags = [];
  const words = [];

  parts.forEach((p) => {
    if (p.startsWith("#") && p.length > 1) tags.push(p.toLowerCase());
    else words.push(p.toLowerCase());
  });

  return { text: words.join(" ").trim(), tags };
}

function matchesSearch(post) {
  if (!searchQuery) return true;

  const parsed = parseSearch(searchQuery);
  const hay = postText(post);

  // words must match
  if (parsed.text) {
    const words = parsed.text.split(/\s+/).filter(Boolean);
    const ok = words.every((w) => hay.includes(w));
    if (!ok) return false;
  }

  // #tags in search must match post tags
  if (parsed.tags.length) {
    const tset = new Set(normalizeTags(post.tags).map((t) => t.toLowerCase()));
    const okTags = parsed.tags.every((t) => tset.has(t));
    if (!okTags) return false;
  }

  return true;
}

function pickHeightClass(i) {
  const cycle = ["h-md", "h-sm", "h-lg", "h-md", "h-md", "h-sm", "h-lg", "h-md"];
  return cycle[i % cycle.length];
}

/* ---------------- Theme ---------------- */

function setTheme(isDark){
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("mb_theme", isDark ? "dark" : "light");
  if(themeToggle) themeToggle.textContent = isDark ? "Light" : "Dark";
}

/* ---------------- Active filters UI ---------------- */
/* ONLY shows search WORDS, NOT tags (so no duplicates) */

function updateActiveFiltersUI(){
  if(!activeFilters || !activeChips) return;

  activeChips.innerHTML = "";

  const parsed = parseSearch(searchQuery);
  const chips = [];

  if(parsed.text){
    chips.push({ label: `“${parsed.text}”` });
  }

  if(chips.length === 0){
    activeFilters.style.display = "none";
    return;
  }

  activeFilters.style.display = "block";

  chips.forEach(ch => {
    const el = document.createElement("div");
    el.className = "active-chip";
    el.innerHTML = `
      <span>${escapeHtml(ch.label)}</span>
      <button type="button" aria-label="Remove">✕</button>
    `;

    el.querySelector("button").addEventListener("click", () => {
      searchQuery = "";
      if(searchInput) searchInput.value = "";
      if(searchClear) searchClear.style.display = "none";
      closeAutocomplete();
      render();
      updateActiveFiltersUI();
    });

    activeChips.appendChild(el);
  });
}

/* ---------------- Tag pill filter ---------------- */

function setActiveTag(tag) {
  activeTag = tag;

  if (tagFilter && tagFilterText) {
    if (activeTag) {
      tagFilter.style.display = "flex";
      tagFilterText.textContent = activeTag;
    } else {
      tagFilter.style.display = "none";
    }
  }

  render();
  updateActiveFiltersUI();
}

function currentFilteredVisible() {
  let visible = posts.filter(isVisible);

  if (activeFilter !== "all") {
    visible = visible.filter((p) => p.category === activeFilter);
  }

  if (activeTag) {
    visible = visible.filter((p) => hasTag(p, activeTag));
  }

  visible = visible.filter(matchesSearch);

  return visible;
}

/* ---------------- Tag Cloud ---------------- */

function getAllUsedTagsFromPosts(){
  const map = new Map();

  posts.filter(isVisible).forEach(p => {
    normalizeTags(p.tags).forEach(t => {
      const k = t.toLowerCase();
      map.set(k, (map.get(k) || 0) + 1);
    });
  });

  // sorted by usage desc
  return Array.from(map.entries())
    .sort((a,b) => b[1]-a[1])
    .map(([tag]) => tag);
}

function renderTagCloud(){
  if(!tagCloud) return;

  const tags = getAllUsedTagsFromPosts().slice(0, 14);
  tagCloud.innerHTML = "";

  tags.forEach(t => {
    const b = document.createElement("button");
    b.className = "tag-chip";
    b.type = "button";
    b.textContent = t;
    b.addEventListener("click", () => setActiveTag(t));
    tagCloud.appendChild(b);
  });
}

/* ---------------- Render ---------------- */

function render() {
  if (galleryGrid) galleryGrid.innerHTML = "";
  if (featuredGrid) featuredGrid.innerHTML = "";

  const visible = posts.filter(isVisible);

  // Featured NOT affected by activeTag/search (pinned works remain pinned)
  const featured = visible.filter((p) => !!p.featured);
  featured.forEach((post, i) => {
    const wrap = document.createElement("div");
    wrap.className = `featured-card ${i % 3 === 0 ? "big" : "med"}`;
    wrap.appendChild(createCard(post, true));
    featuredGrid?.appendChild(wrap);
  });

  // Gallery affected by category + tag + search
  const filtered = currentFilteredVisible();
  filtered.forEach((post, i) => {
    const item = document.createElement("div");
    item.className = `masonry-item ${pickHeightClass(i)}`;
    item.appendChild(createCard(post, false));
    galleryGrid?.appendChild(item);
  });

  renderTagCloud();
  updateActiveFiltersUI();
}

function createCard(post, isFeatured) {
  const card = document.createElement("div");
  card.className = "card";

  const tags = normalizeTags(post.tags);
  const subtitle = isFeatured
    ? post.category ? `${post.category} • Featured` : "Featured"
    : (post.category || "");

  card.innerHTML = `
    <div class="card-media">
      <img src="${post.image}" alt="${escapeHtml(post.title || "Post")}" loading="lazy">
    </div>
    <div class="card-body">
      <div class="card-title">${escapeHtml(post.title || "")}</div>
      <div class="card-sub">
        ${escapeHtml(subtitle)}
        ${tags.length ? " • " + escapeHtml(tags.slice(0, 3).join(" ")) : ""}
      </div>
    </div>
  `;

  card.addEventListener("click", () => openModalFor(post));
  return card;
}

/* ---------------- Modal ---------------- */

function openModalFor(post) {
  modalList = currentFilteredVisible();
  modalIndex = modalList.findIndex((p) => p.id === post.id);
  openModal(post);
}

function openModal(post) {
  currentModalPost = post;

  modal?.classList.add("show");
  modal?.setAttribute("aria-hidden", "false");

  const tags = normalizeTags(post.tags);

  if(modalImage) modalImage.src = post.image;
  if(modalTitle) modalTitle.textContent = post.title || "";
  if(modalCaption) modalCaption.textContent = post.caption || "";
  if(modalMeta) modalMeta.textContent = post.category ? post.category : "";

  if(modalTags) modalTags.innerHTML = "";

  tags.forEach((t) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = t;
    span.style.cursor = "pointer";

    span.addEventListener("click", (e) => {
      e.stopPropagation();
      setActiveTag(t);
      closeModal();
    });

    modalTags?.appendChild(span);
  });

  if(openPostBtn && post?.id){
    openPostBtn.href = `post.html?id=${encodeURIComponent(post.id)}`;
  }

  resetZoom();
}

function closeModal() {
  modal?.classList.remove("show");
  modal?.setAttribute("aria-hidden", "true");
  resetZoom();
}

function nextModal() {
  if (!modalList.length) return;
  modalIndex = (modalIndex + 1) % modalList.length;
  openModal(modalList[modalIndex]);
}

function prevModal() {
  if (!modalList.length) return;
  modalIndex = (modalIndex - 1 + modalList.length) % modalList.length;
  openModal(modalList[modalIndex]);
}

modalBackdrop?.addEventListener("click", closeModal);
modalClose?.addEventListener("click", closeModal);

modalNext?.addEventListener("click", (e) => {
  e.stopPropagation();
  nextModal();
});
modalPrev?.addEventListener("click", (e) => {
  e.stopPropagation();
  prevModal();
});

document.addEventListener("keydown", (e) => {
  if (!modal?.classList.contains("show")) return;

  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowRight") nextModal();
  if (e.key === "ArrowLeft") prevModal();
});

// Modal action buttons
copyCaptionBtn?.addEventListener("click", async () => {
  await copyText(currentModalPost?.caption || "");
});
copyTagsBtn?.addEventListener("click", async () => {
  const tags = normalizeTags(currentModalPost?.tags);
  await copyText(tags.join(" "));
});
copyLinkBtn?.addEventListener("click", async () => {
  if(!currentModalPost?.id) return;
  const base = `${window.location.origin}${window.location.pathname.replace(/index\.html?$/,"")}`;
  const url = `${base}post.html?id=${encodeURIComponent(currentModalPost.id)}`;
  await copyText(url);
});

/* ---------------- Zoom + pan ---------------- */

function resetZoom() {
  zoom = 1;
  panX = 0;
  panY = 0;
  applyZoom();
  const media = modalImage?.closest(".modal-media");
  if (media) media.classList.remove("zoomed");
}

function applyZoom() {
  if(!modalImage) return;
  modalImage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  modalImage.style.transformOrigin = "center center";
}

function clampPan() {
  const max = 600 * (zoom - 1);
  const lim = Math.max(0, max);
  panX = Math.max(-lim, Math.min(lim, panX));
  panY = Math.max(-lim, Math.min(lim, panY));
}

function toggleZoom() {
  if(!modalImage) return;
  const media = modalImage.closest(".modal-media");
  if (!media) return;

  if (zoom === 1) {
    zoom = 2;
    media.classList.add("zoomed");
  } else {
    resetZoom();
    return;
  }
  clampPan();
  applyZoom();
}

modalImage?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleZoom();
});

modalImage?.addEventListener("wheel", (e) => {
  if (!modal?.classList.contains("show")) return;
  e.preventDefault();

  const delta = -Math.sign(e.deltaY);
  zoom = Math.min(4, Math.max(1, zoom + delta * 0.25));

  const media = modalImage.closest(".modal-media");
  if (media) {
    if (zoom > 1) media.classList.add("zoomed");
    else media.classList.remove("zoomed");
  }

  clampPan();
  applyZoom();
}, { passive: false });

modalImage?.addEventListener("mousedown", (e) => {
  if (zoom <= 1) return;
  isPanning = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panBaseX = panX;
  panBaseY = panY;
});

window.addEventListener("mousemove", (e) => {
  if (!isPanning) return;
  panX = panBaseX + (e.clientX - panStartX);
  panY = panBaseY + (e.clientY - panStartY);
  clampPan();
  applyZoom();
});

window.addEventListener("mouseup", () => {
  isPanning = false;
});

/* ---------------- Filters ---------------- */

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelector(".filter-btn.active")?.classList.remove("active");
    btn.classList.add("active");
    filterButtons.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));

    activeFilter = btn.dataset.filter;
    render();
  });
});

tagFilterClose?.addEventListener("click", (e) => {
  e.stopPropagation();
  setActiveTag(null);
});
tagFilter?.addEventListener("click", () => setActiveTag(null));

/* ---------------- Search + Autocomplete (#) ---------------- */

function ensureAutocomplete(){
  if(!searchInput) return;
  const box = searchInput.closest(".search");
  if(!box) return;

  if(acList) return;

  box.style.position = "relative";
  acList = document.createElement("div");
  acList.className = "ac-list";
  acList.style.display = "none";
  box.appendChild(acList);
}

function getAllUsedTagsForAutocomplete(){
  const set = new Set();
  posts.forEach(p => normalizeTags(p.tags).forEach(t => set.add(t.toLowerCase())));
  return Array.from(set).sort();
}

function openAutocomplete(items){
  ensureAutocomplete();
  if(!acList) return;

  const list = items.slice(0, 8);
  if(list.length === 0){
    closeAutocomplete();
    return;
  }

  acList.innerHTML = list.map((t,i) =>
    `<button type="button" class="ac-item" data-i="${i}">${escapeHtml(t)}</button>`
  ).join("");

  acList.style.display = "block";
  acOpen = true;
  acIndex = -1;

  acList.querySelectorAll(".ac-item").forEach(btn => {
    btn.addEventListener("click", () => applyAutocomplete(btn.textContent));
  });
}

function closeAutocomplete(){
  if(!acList) return;
  acList.style.display = "none";
  acOpen = false;
  acIndex = -1;
}

function applyAutocomplete(tag){
  if(!searchInput) return;

  const val = searchInput.value;
  const parts = val.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] || "";

  if(last.startsWith("#")) parts[parts.length - 1] = tag;
  else parts.push(tag);

  const next = parts.join(" ") + " ";
  searchInput.value = next;
  searchQuery = next.trim();

  if(searchClear) searchClear.style.display = searchQuery ? "inline-flex" : "none";

  closeAutocomplete();
  render();
  updateActiveFiltersUI();
  searchInput.focus();
}

function maybeSuggestTags(){
  if(!searchInput) return;

  const tokens = searchInput.value.split(/\s+/);
  const last = (tokens[tokens.length - 1] || "").trim();

  if(!last.startsWith("#")){
    closeAutocomplete();
    return;
  }

  const all = getAllUsedTagsForAutocomplete();
  const q = last.toLowerCase();
  const hits = all.filter(t => t.startsWith(q));
  openAutocomplete(hits);
}

if(searchInput){
  ensureAutocomplete();

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim();
    if(searchClear) searchClear.style.display = searchQuery ? "inline-flex" : "none";
    render();
    updateActiveFiltersUI();
    maybeSuggestTags();
  });

  searchInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      closeAutocomplete();
      searchInput.blur();
      return;
    }

    if(!acOpen || !acList) return;

    const items = Array.from(acList.querySelectorAll(".ac-item"));
    if(items.length === 0) return;

    if(e.key === "ArrowDown"){
      e.preventDefault();
      acIndex = Math.min(items.length - 1, acIndex + 1);
      items.forEach((it,idx) => it.classList.toggle("active", idx === acIndex));
    }

    if(e.key === "ArrowUp"){
      e.preventDefault();
      acIndex = Math.max(0, acIndex - 1);
      items.forEach((it,idx) => it.classList.toggle("active", idx === acIndex));
    }

    if((e.key === "Tab" || e.key === "ArrowRight") && acIndex >= 0){
      e.preventDefault();
      applyAutocomplete(items[acIndex].textContent);
    }

    if(e.key === "Escape"){
      closeAutocomplete();
    }
  });

  document.addEventListener("click", (e) => {
    if(!acOpen) return;
    const box = searchInput.closest(".search");
    if(box && !box.contains(e.target)) closeAutocomplete();
  });
}

searchClear?.addEventListener("click", () => {
  searchQuery = "";
  if(searchInput) searchInput.value = "";
  searchClear.style.display = "none";
  closeAutocomplete();
  render();
  updateActiveFiltersUI();
});

/* ---------------- Footer / Email Toast ---------------- */

function showToastNearEmail(message){
  if(!emailBtn) return;

  document.querySelector(".toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  const footerRight = emailBtn.closest(".footer-right");
  if(!footerRight) return;

  footerRight.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 220);
  }, 1400);
}

emailBtn?.addEventListener("click", async () => {
  const email = emailBtn.dataset.email || "youremail@example.com";
  const ok = await copyText(email);
  showToastNearEmail(ok ? "Email copied" : "Copy failed");
});

/* ---------------- Toggles ---------------- */

themeToggle?.addEventListener("click", () => {
  setTheme(!document.body.classList.contains("dark"));
});

/* ---------------- Admin shortcut ---------------- */

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
    window.location.href = "admin/admin.html?mbcms";
  }
});

/* ---------------- Load ---------------- */

function loadPosts() {
  try {
    posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    posts = [];
  }

  setTheme(localStorage.getItem("mb_theme") === "dark");
  render();
  updateActiveFiltersUI();
}

loadPosts();
