// MB Lens & Arts — Admin (static CMS)
// Note: This is a static-site admin. The password is only a client-side gate.
// Anyone who can view your repo can see the password in this file.

const STORAGE_KEY = "mb_posts";
const THEME_KEY = "mb_theme";
const SESSION_KEY = "mb_admin_authed";
const ANALYTICS_KEY = "mb_analytics_v1";

// Hardcoded gate password (your request)
const ADMIN_PASSWORD = "mb10201944";

/* ---------------- DOM ---------------- */

// Gate
const gateEl = document.getElementById("gate"); // "Not found" / hidden screen
const loginEl = document.getElementById("login"); // password screen
const appEl = document.getElementById("app");
const pwInput = document.getElementById("pw");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pwMsg = document.getElementById("pwMsg");

// Theme
const themeBtn = document.getElementById("themeBtn");

// Form
const form = document.getElementById("postForm");
const fId = document.getElementById("fId");
const fTitle = document.getElementById("fTitle");
const fCaption = document.getElementById("fCaption");
const fCategory = document.getElementById("fCategory");
const fTags = document.getElementById("fTags");
const fFeatured = document.getElementById("fFeatured");
const fDraft = document.getElementById("fDraft");
const fSchedule = document.getElementById("fSchedule");
const fImg = document.getElementById("fImg");
const imgPreview = document.getElementById("imgPreview");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

// List + stats
const listEl = document.getElementById("list");
const statTotal = document.getElementById("statTotal");
const statPhoto = document.getElementById("statPhoto");
const statArt = document.getElementById("statArt");

// Analytics stats
const anIndex = document.getElementById("anIndex");
const anGallery = document.getElementById("anGallery");
const anPost = document.getElementById("anPost");
const anModal = document.getElementById("anModal");
const anSearch = document.getElementById("anSearch");
const anTag = document.getElementById("anTag");
const anLast = document.getElementById("anLast");
const resetAnalyticsBtn = document.getElementById("resetAnalyticsBtn");

// Backup/restore
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const importBtn = document.getElementById("importBtn");
const clearBtn = document.getElementById("clearBtn");

/* ---------------- State ---------------- */

let posts = [];
let editImageDataUrl = null; // if editing without re-upload

/* ---------------- Helpers ---------------- */

function uid() {
  return "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeTags(input) {
  // input: string "#a #b" OR array
  const arr = Array.isArray(input)
    ? input
    : String(input || "")
        .split(/[,\n\t\s]+/)
        .filter(Boolean);

  return arr
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}

function loadPosts() {
  try {
    posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") || [];
  } catch {
    posts = [];
  }
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function isPublished(post) {
  if (post.draft) return false;
  if (post.schedule) {
    const s = new Date(post.schedule);
    if (!Number.isNaN(s.getTime()) && s > new Date()) return false;
  }
  return true;
}

function setTheme(dark) {
  document.body.classList.toggle("dark", !!dark);
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  if (themeBtn) themeBtn.textContent = dark ? "Light" : "Dark";
}

/* ---------------- Analytics (local) ---------------- */

function getAnalytics() {
  try {
    return (
      JSON.parse(localStorage.getItem(ANALYTICS_KEY) || "null") || {
        index: 0,
        gallery: 0,
        post: 0,
        modal: 0,
        search: 0,
        tag: 0,
        admin: 0,
        last: null,
      }
    );
  } catch {
    return { index: 0, gallery: 0, post: 0, modal: 0, search: 0, tag: 0, admin: 0, last: null };
  }
}

function setAnalytics(a) {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(a));
}

function bumpAdminVisit() {
  const a = getAnalytics();
  a.admin = (a.admin || 0) + 1;
  a.last = new Date().toISOString();
  setAnalytics(a);
}

function renderAnalytics() {
  const a = getAnalytics();
  if (anIndex) anIndex.textContent = String(a.index || 0);
  if (anGallery) anGallery.textContent = String(a.gallery || 0);
  if (anPost) anPost.textContent = String(a.post || 0);
  if (anModal) anModal.textContent = String(a.modal || 0);
  if (anSearch) anSearch.textContent = String(a.search || 0);
  if (anTag) anTag.textContent = String(a.tag || 0);
  if (anLast) anLast.textContent = a.last ? new Date(a.last).toLocaleString() : "—";
}

/* ---------------- Auth gate ---------------- */

function isAuthed() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

function showHidden(msg = "This page is hidden."){
  // Show the fake "Not found" screen when URL does not include ?mbcms
  if (appEl) appEl.style.display = "none";
  if (loginEl) loginEl.style.display = "none";
  if (gateEl) gateEl.style.display = "flex";
  const p = gateEl?.querySelector("p");
  if (p && msg) p.textContent = msg;
}

function showGate(msg = "") {
  // Show password login UI
  if (gateEl) gateEl.style.display = "none";
  if (appEl) appEl.style.display = "none";
  if (loginEl) loginEl.style.display = "block";
  if (pwMsg) pwMsg.textContent = msg;
  if (pwInput) pwInput.value = "";
  pwInput?.focus();
}

function showApp() {
  if (gateEl) gateEl.style.display = "none";
  if (loginEl) loginEl.style.display = "none";
  if (appEl) appEl.style.display = "block";
}

function login() {
  const v = String(pwInput?.value || "");
  if (v === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "1");
    showApp();
    initApp();
  } else {
    showGate("Wrong password");
  }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  showGate("");
}

/* ---------------- Image handling ---------------- */

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function compressImageDataUrl(dataUrl, maxW = 1800, quality = 0.82) {
  // Browser-side compression (good enough for GitHub Pages)
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(1, maxW / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, cw, ch);
  return canvas.toDataURL("image/jpeg", quality);
}

/* ---------------- Render ---------------- */

function renderStats() {
  const published = posts.filter(isPublished);
  const total = published.length;
  const photo = published.filter((p) => p.category === "Photography").length;
  const art = published.filter((p) => p.category === "Art").length;

  if (statTotal) statTotal.textContent = String(total);
  if (statPhoto) statPhoto.textContent = String(photo);
  if (statArt) statArt.textContent = String(art);
}

function renderList() {
  if (!listEl) return;
  listEl.innerHTML = "";

  const sorted = [...posts].sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));

  sorted.forEach((p) => {
    const row = document.createElement("div");
    row.className = "item";

    const status = isPublished(p)
      ? "Published"
      : p.draft
      ? "Draft"
      : p.schedule
      ? "Scheduled"
      : "Hidden";

    row.innerHTML = `
      <div class="item-left">
        <img class="thumb" src="${escapeHtml(p.image || "")}" alt="">
        <div class="item-meta">
          <div class="item-title">${escapeHtml(p.title || "(Untitled)")}</div>
          <div class="item-sub">${escapeHtml(p.category || "")} • ${escapeHtml(status)}${p.featured ? " • Featured" : ""}</div>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn2" data-act="up">↑</button>
        <button class="btn2" data-act="down">↓</button>
        <button class="btn2" data-act="edit">Edit</button>
        <button class="btn2 danger" data-act="del">Delete</button>
      </div>
    `;

    row.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        const act = b.getAttribute("data-act");
        if (act === "edit") startEdit(p.id);
        if (act === "del") delPost(p.id);
        if (act === "up") movePost(p.id, -1);
        if (act === "down") movePost(p.id, +1);
      });
    });

    listEl.appendChild(row);
  });
}

function renderAll() {
  renderStats();
  renderList();
  renderAnalytics();
}

/* ---------------- CRUD ---------------- */

function clearForm() {
  if (fId) fId.value = "";
  fTitle.value = "";
  fCaption.value = "";
  fCategory.value = "Photography";
  fTags.value = "";
  fFeatured.checked = false;
  fDraft.checked = false;
  fSchedule.value = "";
  if (fImg) fImg.value = "";
  editImageDataUrl = null;
  if (imgPreview) imgPreview.src = "";
  cancelEditBtn.style.display = "none";
  saveBtn.textContent = "Save";
}

function startEdit(id) {
  const p = posts.find((x) => x.id === id);
  if (!p) return;

  fId.value = p.id;
  fTitle.value = p.title || "";
  fCaption.value = p.caption || "";
  fCategory.value = p.category || "Photography";
  fTags.value = normalizeTags(p.tags).join(" ");
  fFeatured.checked = !!p.featured;
  fDraft.checked = !!p.draft;
  fSchedule.value = p.schedule ? String(p.schedule).slice(0, 16) : "";
  editImageDataUrl = p.image || null;
  if (imgPreview) imgPreview.src = p.image || "";
  cancelEditBtn.style.display = "inline-flex";
  saveBtn.textContent = "Update";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function upsertPost(e) {
  e.preventDefault();

  const id = fId.value || uid();
  const now = Date.now();
  const existing = posts.find((x) => x.id === id);

  let image = editImageDataUrl;
  const file = fImg?.files?.[0];
  if (file) {
    const raw = await readFileAsDataURL(file);
    image = await compressImageDataUrl(raw);
  }

  if (!image) {
    alert("Please upload an image.");
    return;
  }

  const newPost = {
    id,
    title: String(fTitle.value || "").trim(),
    caption: String(fCaption.value || "").trim(),
    category: String(fCategory.value || "Photography"),
    tags: normalizeTags(fTags.value),
    featured: !!fFeatured.checked,
    draft: !!fDraft.checked,
    schedule: fSchedule.value ? new Date(fSchedule.value).toISOString() : "",
    updatedAt: now,
    createdAt: existing?.createdAt || now,
    order: existing?.order ?? now,
    image,
  };

  if (existing) {
    posts = posts.map((p) => (p.id === id ? newPost : p));
  } else {
    posts.push(newPost);
  }

  savePosts();
  clearForm();
  renderAll();
}

function delPost(id) {
  const p = posts.find((x) => x.id === id);
  if (!p) return;
  if (!confirm(`Delete "${p.title || "(Untitled)"}"?`)) return;
  posts = posts.filter((x) => x.id !== id);
  savePosts();
  renderAll();
}

function movePost(id, dir) {
  const sorted = [...posts].sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
  const idx = sorted.findIndex((p) => p.id === id);
  if (idx < 0) return;

  const j = idx + dir;
  if (j < 0 || j >= sorted.length) return;

  const a = sorted[idx];
  const b = sorted[j];
  const tmp = a.order;
  a.order = b.order;
  b.order = tmp;

  // write back
  posts = posts.map((p) => (p.id === a.id ? a : p.id === b.id ? b : p));
  savePosts();
  renderAll();
}

/* ---------------- Backup / Restore ---------------- */

function exportJson() {
  const blob = new Blob([JSON.stringify(posts, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mb_posts_backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importJson() {
  const file = importInput?.files?.[0];
  if (!file) return alert("Choose a .json file first");
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return alert("Invalid JSON");
  }
  if (!Array.isArray(data)) return alert("JSON must be an array of posts");
  posts = data;
  savePosts();
  renderAll();
  alert("Imported!");
}

function clearAll() {
  if (!confirm("Delete ALL posts from this browser?")) return;
  localStorage.removeItem(STORAGE_KEY);
  posts = [];
  renderAll();
}

/* ---------------- Init ---------------- */

function initApp() {
  // load
  loadPosts();
  renderAll();

  // theme
  setTheme(localStorage.getItem(THEME_KEY) === "dark");

  // bump admin analytics
  bumpAdminVisit();
  renderAnalytics();
}

// Gate wiring
loginBtn?.addEventListener("click", login);
pwInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});
logoutBtn?.addEventListener("click", logout);

// Theme
themeBtn?.addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));

// Form
form?.addEventListener("submit", upsertPost);
cancelEditBtn?.addEventListener("click", clearForm);
fImg?.addEventListener("change", async () => {
  const file = fImg.files?.[0];
  if (!file) return;
  const raw = await readFileAsDataURL(file);
  const c = await compressImageDataUrl(raw);
  editImageDataUrl = c;
  if (imgPreview) imgPreview.src = c;
});

// Backup
exportBtn?.addEventListener("click", exportJson);
importBtn?.addEventListener("click", importJson);
clearBtn?.addEventListener("click", clearAll);

// Analytics reset
resetAnalyticsBtn?.addEventListener("click", () => {
  if (!confirm("Reset analytics counters for THIS browser?")) return;
  localStorage.removeItem(ANALYTICS_KEY);
  renderAnalytics();
});

// Boot
// Require the secret query flag (?mbcms) to reveal login.
const params = new URLSearchParams(window.location.search);
const hasMbCms = params.has("mbcms");

if (!hasMbCms) {
  showHidden("This page is hidden.");
} else if (isAuthed()) {
  bumpAdminVisit();
  showApp();
  initApp();
} else {
  showGate("");
}
