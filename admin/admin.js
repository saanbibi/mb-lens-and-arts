const STORAGE_KEY = "mb_posts";

/* -----------------------------
   Gate / Auth (fixed password)
   NOTE: This is client-side only (not real security on a public GitHub Pages site).
------------------------------ */

const SECRET_PARAM = "mbcms";
const SESSION_KEY = "mb_cms_unlocked";
const ADMIN_PASSWORD = "mb10201944";

const gateEl = document.getElementById("gate");
const loginEl = document.getElementById("login");
const appEl = document.getElementById("app");

const pwEl = document.getElementById("pw");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pwStatus = document.getElementById("pwStatus");

function hasSecretParam(){
  const qs = String(window.location.search || "").toLowerCase();
  return qs.includes(SECRET_PARAM);
}

function isAuthed(){
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

function setAuthed(v){
  if(v) sessionStorage.setItem(SESSION_KEY, "1");
  else sessionStorage.removeItem(SESSION_KEY);
}

function show(el){ el?.classList.remove("hidden"); }
function hide(el){ el?.classList.add("hidden"); }

function initGate(){
  if(!hasSecretParam()){
    show(gateEl);
    hide(loginEl);
    hide(appEl);
    return;
  }

  hide(gateEl);

  if(isAuthed()){
    hide(loginEl);
    show(appEl);
  }else{
    show(loginEl);
    hide(appEl);
    pwEl?.focus();
  }
}

loginBtn?.addEventListener("click", () => {
  const pw = String(pwEl?.value || "");
  if(pw === ADMIN_PASSWORD){
    setAuthed(true);
    pwStatus.textContent = "";
    hide(loginEl);
    show(appEl);
    safeLoad();
  }else{
    pwStatus.textContent = "Wrong password.";
    pwEl?.focus();
  }
});

pwEl?.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){
    e.preventDefault();
    loginBtn?.click();
  }
});

logoutBtn?.addEventListener("click", () => {
  setAuthed(false);
  show(loginEl);
  hide(appEl);
  pwEl?.focus();
});

// Editor elements
const postForm = document.getElementById("postForm");
const titleEl = document.getElementById("title");
const captionEl = document.getElementById("caption");
const categoryEl = document.getElementById("category");
const tagsEl = document.getElementById("tags");
const imageEl = document.getElementById("image");
const scheduleEl = document.getElementById("schedule");
const featuredEl = document.getElementById("featured");
const draftEl = document.getElementById("draft");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const saveStatus = document.getElementById("saveStatus");

// Posts list
const postsList = document.getElementById("postsList");

// Backup/restore
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const importBtn = document.getElementById("importBtn");
const clearBtn = document.getElementById("clearBtn");
const backupStatus = document.getElementById("backupStatus");

// Theme
const themeToggle = document.getElementById("themeToggle");

// state
let posts = [];
let editingId = null;

/* -----------------------------
   Analytics (counts)
------------------------------ */

const statTotal = document.getElementById("statTotal");
const statPhoto = document.getElementById("statPhoto");
const statArt = document.getElementById("statArt");
const statFeatured = document.getElementById("statFeatured");
const statDrafts = document.getElementById("statDrafts");
const statScheduled = document.getElementById("statScheduled");
const statVisible = document.getElementById("statVisible");
const statTagCount = document.getElementById("statTagCount");

function isVisibleNow(post){
  const now = new Date();
  if(post?.draft) return false;
  if(post?.schedule){
    const s = new Date(post.schedule);
    if(!Number.isNaN(s.getTime()) && s > now) return false;
  }
  return true;
}

function updateAnalytics(){
  if(!statTotal) return; // analytics card not on page

  const all = Array.isArray(posts) ? posts : [];
  const total = all.length;
  const photo = all.filter(p => p.category === "Photography").length;
  const art = all.filter(p => p.category === "Art").length;
  const featured = all.filter(p => !!p.featured).length;
  const drafts = all.filter(p => !!p.draft).length;

  const now = new Date();
  const scheduled = all.filter(p => {
    if(!p?.schedule) return false;
    const s = new Date(p.schedule);
    return !Number.isNaN(s.getTime()) && s > now;
  }).length;

  const visible = all.filter(isVisibleNow).length;

  const tagSet = new Set();
  all.forEach(p => normalizeTags(p.tags).forEach(t => tagSet.add(String(t).toLowerCase())));
  const tagCount = tagSet.size;

  statTotal.textContent = String(total);
  statPhoto.textContent = String(photo);
  statArt.textContent = String(art);
  statFeatured.textContent = String(featured);
  statDrafts.textContent = String(drafts);
  statScheduled.textContent = String(scheduled);
  statVisible.textContent = String(visible);
  statTagCount.textContent = String(tagCount);
}

/* ---------------- Utils ---------------- */

function escapeHtml(s){
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}

function safeLoad(){
  try{
    posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  }catch{
    posts = [];
  }
  renderPosts();
  resetForm();
}

function saveAll(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function genId(){
  return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

/* ---------------- Render ---------------- */

function renderPosts(){
  if(!postsList) return;

  postsList.innerHTML = "";
  const sorted = [...posts].sort((a,b) => (b?.createdAt || 0) - (a?.createdAt || 0));

  sorted.forEach(post => {
    const div = document.createElement("div");
    div.className = "post-item";

    const meta = [
      post.category ? escapeHtml(post.category) : "",
      post.featured ? "Featured" : "",
      post.draft ? "Draft" : "",
      post.schedule ? "Scheduled" : ""
    ].filter(Boolean).join(" • ");

    div.innerHTML = `
      <div class="post-top">
        <div>
          <div class="post-title">${escapeHtml(post.title || "(Untitled)")}</div>
          <div class="post-meta">${escapeHtml(meta || "")}</div>
        </div>
      </div>
      <div class="post-actions">
        <button class="btn" data-action="edit">Edit</button>
        <button class="btn" data-action="delete">Delete</button>
      </div>
    `;

    div.querySelector('[data-action="edit"]').addEventListener("click", () => loadToForm(post.id));
    div.querySelector('[data-action="delete"]').addEventListener("click", () => deletePost(post.id));

    postsList.appendChild(div);
  });

  updateAnalytics();
}

/* ---------------- CRUD ---------------- */

function loadToForm(id){
  const post = posts.find(p => p.id === id);
  if(!post) return;

  editingId = id;

  titleEl.value = post.title || "";
  captionEl.value = post.caption || "";
  categoryEl.value = post.category || "Photography";
  tagsEl.value = normalizeTags(post.tags).join(" ");
  imageEl.value = post.image || "";
  scheduleEl.value = post.schedule ? String(post.schedule).slice(0,16) : "";
  featuredEl.checked = !!post.featured;
  draftEl.checked = !!post.draft;

  saveStatus.textContent = "Editing…";
}

function resetForm(){
  editingId = null;
  postForm?.reset();
  saveStatus.textContent = "";
}

function deletePost(id){
  const i = posts.findIndex(p => p.id === id);
  if(i === -1) return;
  posts.splice(i, 1);
  saveAll();
  renderPosts();
  resetForm();
}

function upsertPost(){
  const tags = String(tagsEl.value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map(t => t.startsWith("#") ? t : `#${t}`);

  const payload = {
    id: editingId || genId(),
    title: String(titleEl.value || "").trim(),
    caption: String(captionEl.value || "").trim(),
    category: String(categoryEl.value || "Photography"),
    tags,
    image: String(imageEl.value || "").trim(),
    schedule: scheduleEl.value ? new Date(scheduleEl.value).toISOString() : "",
    featured: !!featuredEl.checked,
    draft: !!draftEl.checked,
    createdAt: editingId ? (posts.find(p => p.id === editingId)?.createdAt || Date.now()) : Date.now()
  };

  const idx = posts.findIndex(p => p.id === payload.id);
  if(idx >= 0) posts[idx] = payload;
  else posts.push(payload);

  saveAll();
  renderPosts();
  resetForm();

  saveStatus.textContent = "Saved.";
  setTimeout(() => (saveStatus.textContent = ""), 1200);
}

/* ---------------- Backup / Restore ---------------- */

function exportJSON(){
  const blob = new Blob([JSON.stringify(posts, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mb_posts_backup.json";
  a.click();
  URL.revokeObjectURL(a.href);

  backupStatus.textContent = "Exported.";
  setTimeout(() => (backupStatus.textContent = ""), 1200);
}

async function importJSON(){
  const f = importFile?.files?.[0];
  if(!f) return;

  try{
    const text = await f.text();
    const data = JSON.parse(text);
    if(!Array.isArray(data)) throw new Error("Invalid file");

    posts = data;
    saveAll();
    renderPosts();
    resetForm();

    backupStatus.textContent = "Imported.";
    setTimeout(() => (backupStatus.textContent = ""), 1200);
  }catch{
    backupStatus.textContent = "Import failed.";
  }
}

function clearAll(){
  if(!confirm("Clear all posts?")) return;
  posts = [];
  saveAll();
  renderPosts();
  resetForm();
  backupStatus.textContent = "Cleared.";
  setTimeout(() => (backupStatus.textContent = ""), 1200);
}

/* ---------------- Events ---------------- */

saveBtn?.addEventListener("click", upsertPost);
resetBtn?.addEventListener("click", resetForm);

exportBtn?.addEventListener("click", exportJSON);
importBtn?.addEventListener("click", importJSON);
clearBtn?.addEventListener("click", clearAll);

themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("mb_theme_admin", document.body.classList.contains("dark") ? "dark" : "light");
});

/* ---------------- Init ---------------- */

(function init(){
  // restore theme
  document.body.classList.toggle("dark", localStorage.getItem("mb_theme_admin") === "dark");

  initGate();
  // If already authed on load, load data immediately
  if(hasSecretParam() && isAuthed()){
    safeLoad();
  }
})();
