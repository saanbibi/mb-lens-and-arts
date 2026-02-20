const POSTS_KEY = "mb_posts";
const PASSWORD_HASH = "73f6f90cce67ed96765b75113c3f4533ed2dd5f2be4aee66647dfb28da547ff0";
// password is fixed (no one can set/replace it)

const SESSION_KEY = "mb_cms_session";
const SECRET_PARAM = "mbcms";

// Gate + auth elements
const gateEl = document.getElementById("gate");
const loginEl = document.getElementById("login");
const appEl = document.getElementById("app");

const pwEl = document.getElementById("pw");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Editor elements
const drop = document.getElementById("drop");
const fileInput = document.getElementById("file");

const editorTitle = document.getElementById("editorTitle");
const titleEl = document.getElementById("title");
const categoryEl = document.getElementById("category");
const captionEl = document.getElementById("caption");
const tagsEl = document.getElementById("tags");
const scheduleEl = document.getElementById("schedule");

const pillFeatured = document.getElementById("pillFeatured");
const pillDraft = document.getElementById("pillDraft");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const deleteBtn = document.getElementById("deleteBtn");
const statusEl = document.getElementById("status");

const postsEl = document.getElementById("posts");
const wipeBtn = document.getElementById("wipeBtn");
const exportBtn = document.getElementById("exportBtn");

// State
let posts = [];
let editingId = null;
let currentImageDataUrl = null;
let featuredOn = false;
let draftOn = false;

/* -----------------------------
   Helpers
------------------------------ */
function getQuery(){
  return new URLSearchParams(location.search);
}

function getPosts(){
  try{
    return JSON.parse(localStorage.getItem(POSTS_KEY) || "[]");
  }catch{
    return [];
  }
}

function setPosts(next){
  localStorage.setItem(POSTS_KEY, JSON.stringify(next));
}

function normalizeTags(input){
  // input can be string or array
  let arr = [];
  if (Array.isArray(input)) arr = input;
  else arr = String(input || "")
    .split(/[\s,]+/g)
    .map(s => s.trim())
    .filter(Boolean);

  return arr.map(t => t.startsWith("#") ? t : `#${t}`)
           .map(t => t.replace(/#+/g, "#"))
           .filter((t, i, a) => a.indexOf(t) === i);
}

function fmtDate(iso){
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}

function toast(msg){
  statusEl.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => statusEl.textContent = "", 2800);
}

async function sha256(text){
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,"0")).join("");
}

function isAuthed(){
  return localStorage.getItem(SESSION_KEY) === "true";
}

function setAuthed(on){
  localStorage.setItem(SESSION_KEY, on ? "true" : "false");
}

/* -----------------------------
   Gate + Login (fixed password)
------------------------------ */

const SESSION_KEY = "mb_cms_authed";

function isAuthed(){
  return sessionStorage.getItem(SESSION_KEY) === "1";
}
function setAuthed(v){
  if(v) sessionStorage.setItem(SESSION_KEY, "1");
  else sessionStorage.removeItem(SESSION_KEY);
}

async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function showGate(){
  gate?.classList.add("show");
  app?.classList.remove("show");
  pwEl?.focus();
}
function showApp(){
  gate?.classList.remove("show");
  app?.classList.add("show");
}

async function attemptLogin(){
  const pw = String(pwEl?.value || "").trim();
  if(!pw){
    if(pwMsg) pwMsg.textContent = "Enter password.";
    return;
  }

  const hashed = await sha256(pw);

  if(hashed === PASSWORD_HASH){
    setAuthed(true);
    if(pwMsg) pwMsg.textContent = "";
    if(pwEl) pwEl.value = "";
    showApp();
    loadPosts();
    return;
  }

  if(pwMsg) pwMsg.textContent = "Wrong password.";
}

function initAuth(){
  // only allow when opened with ?mbcms (your hidden shortcut already does this)
  const ok = new URLSearchParams(location.search).has("mbcms");
  if(!ok){
    document.body.innerHTML = "<div style='font-family:system-ui;padding:24px'>Not found.</div>";
    return;
  }

  if(isAuthed()) showApp();
  else showGate();

  loginBtn?.addEventListener("click", attemptLogin);
  pwEl?.addEventListener("keydown", (e) => {
    if(e.key === "Enter") attemptLogin();
  });

  logoutBtn?.addEventListener("click", () => {
    setAuthed(false);
    showGate();
  });
}

initAuth();

/* -----------------------------
   Image compression
------------------------------ */
async function compressImage(file, maxW = 1920, quality = 0.82){
  // returns dataURL (jpeg)
  const img = await fileToImage(file);

  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}

function fileToImage(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image failed"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/* -----------------------------
   Dropzone
------------------------------ */
drop.addEventListener("click", () => fileInput.click());
drop.addEventListener("keydown", (e) => { if (e.key === "Enter") fileInput.click(); });

drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("drag");
});
drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
drop.addEventListener("drop", async (e) => {
  e.preventDefault();
  drop.classList.remove("drag");
  const f = e.dataTransfer.files?.[0];
  if (f) await onPickFile(f);
});

fileInput.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (f) await onPickFile(f);
});

async function onPickFile(file){
  if (!file.type.startsWith("image/")) return alert("Please upload an image file.");
  toast("Compressing image...");
  currentImageDataUrl = await compressImage(file);
  drop.innerHTML = `<img src="${currentImageDataUrl}" alt="Preview">`;
  toast("Image ready.");
}

/* -----------------------------
   Editor toggles
------------------------------ */
pillFeatured.addEventListener("click", () => {
  featuredOn = !featuredOn;
  pillFeatured.classList.toggle("on", featuredOn);
});

pillDraft.addEventListener("click", () => {
  draftOn = !draftOn;
  pillDraft.classList.toggle("on", draftOn);
});

/* -----------------------------
   CRUD
------------------------------ */
function resetEditor(){
  editingId = null;
  currentImageDataUrl = null;
  featuredOn = false;
  draftOn = false;

  editorTitle.textContent = "Create post";
  saveBtn.textContent = "Publish";
  deleteBtn.style.display = "none";

  titleEl.value = "";
  captionEl.value = "";
  tagsEl.value = "";
  scheduleEl.value = "";
  categoryEl.value = "Photography";

  pillFeatured.classList.remove("on");
  pillDraft.classList.remove("on");

  drop.textContent = "Drop image here or click";
  fileInput.value = "";
}

resetBtn.addEventListener("click", resetEditor);

saveBtn.addEventListener("click", () => {
  if (!currentImageDataUrl) return alert("Please upload an image.");

  const nowIso = new Date().toISOString();
  const title = titleEl.value.trim();
  const caption = captionEl.value.trim();
  const category = categoryEl.value === "Art" ? "Art" : "Photography";

  const tags = normalizeTags(tagsEl.value);
  const schedule = scheduleEl.value ? new Date(scheduleEl.value).toISOString() : "";

  const post = {
    id: editingId || crypto.randomUUID(),
    title,
    caption,
    category,
    tags,
    featured: featuredOn,
    draft: draftOn,
    schedule,
    image: currentImageDataUrl,
    updatedAt: nowIso,
    createdAt: editingId ? (posts.find(p => p.id === editingId)?.createdAt || nowIso) : nowIso
  };

  if (editingId){
    posts = posts.map(p => p.id === editingId ? post : p);
    toast("Updated.");
  } else {
    posts.unshift(post);
    toast("Published.");
  }

  setPosts(posts);
  renderPosts();
  resetEditor();
});

deleteBtn.addEventListener("click", () => {
  if (!editingId) return;
  const ok = confirm("Delete this post?");
  if (!ok) return;

  posts = posts.filter(p => p.id !== editingId);
  setPosts(posts);
  renderPosts();
  resetEditor();
  toast("Deleted.");
});

wipeBtn.addEventListener("click", () => {
  const ok = confirm("Wipe ALL posts? This cannot be undone.");
  if (!ok) return;
  posts = [];
  setPosts(posts);
  renderPosts();
  resetEditor();
  toast("Wiped.");
});

exportBtn.addEventListener("click", () => {
  const data = JSON.stringify(posts, null, 2);
  const blob = new Blob([data], { type:"application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "mb_posts_export.json";
  a.click();

  URL.revokeObjectURL(url);
});

/* -----------------------------
   List + drag reorder
------------------------------ */
function renderPosts(){
  // Stats (published only)
  const now = Date.now();
  const published = posts.filter(p => {
    if (p?.draft) return false;
    if (p?.schedule){
      const s = new Date(p.schedule);
      if (!Number.isNaN(s.getTime()) && s.getTime() > now) return false;
    }
    return true;
  });

  const totalPub = published.length;
  const photoPub = published.filter(p => p.category === "Photography").length;
  const artPub = published.filter(p => p.category === "Art").length;

  if (statTotal) statTotal.textContent = String(totalPub);
  if (statPhoto) statPhoto.textContent = String(photoPub);
  if (statArt) statArt.textContent = String(artPub);

  postsEl.innerHTML = "";

  if (!posts.length){
    postsEl.innerHTML = `<p style="color:var(--muted); margin-top:12px;">No posts yet.</p>`;
    return;
  }

  posts.forEach(p => {
    const row = document.createElement("div");
    row.className = "post";
    row.draggable = true;
    row.dataset.id = p.id;

    const tags = normalizeTags(p.tags);
    const flags = [
      p.featured ? "⭐ featured" : "",
      p.draft ? "📝 draft" : "",
      p.schedule ? `⏰ ${fmtDate(p.schedule)}` : ""
    ].filter(Boolean).join(" • ");

    row.innerHTML = `
      <div class="thumb">${p.image ? `<img src="${p.image}" alt="">` : ""}</div>
      <div class="meta">
        <b>${escapeHtml(p.title || "(untitled)")}</b>
        <div class="small">
          ${escapeHtml(p.category)}${flags ? ` • ${escapeHtml(flags)}` : ""}<br>
          ${p.caption ? escapeHtml(p.caption.slice(0, 90)) + (p.caption.length > 90 ? "…" : "") : ""}<br>
          ${tags.length ? escapeHtml(tags.join(" ")) : ""}
        </div>
      </div>
      <div class="actions">
        <span class="dragHandle" title="Drag to reorder">⠿</span>
        <button class="btn2" type="button">Edit</button>
      </div>
    `;

    const editBtn = row.querySelector("button.btn2");
    editBtn.addEventListener("click", () => loadIntoEditor(p.id));

    // DnD reorder
    row.addEventListener("dragstart", () => row.classList.add("dragging"));
    row.addEventListener("dragend", () => row.classList.remove("dragging"));

    postsEl.appendChild(row);
  });

  enableDnD();
}

function enableDnD(){
  postsEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    const dragging = postsEl.querySelector(".dragging");
    if (!dragging) return;

    const after = getDragAfterElement(postsEl, e.clientY);
    if (after == null) postsEl.appendChild(dragging);
    else postsEl.insertBefore(dragging, after);
  });

  postsEl.addEventListener("drop", () => {
    // Read order from DOM
    const ids = [...postsEl.querySelectorAll(".post")].map(el => el.dataset.id);
    posts = ids.map(id => posts.find(p => p.id === id)).filter(Boolean);
    setPosts(posts);
    toast("Reordered.");
  });
}

function getDragAfterElement(container, y){
  const els = [...container.querySelectorAll(".post:not(.dragging)")];
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

  for (const el of els){
    const box = el.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset){
      closest = { offset, element: el };
    }
  }
  return closest.element;
}

/* -----------------------------
   Load editor
------------------------------ */
function loadIntoEditor(id){
  const p = posts.find(x => x.id === id);
  if (!p) return;

  editingId = p.id;
  currentImageDataUrl = p.image;

  editorTitle.textContent = "Edit post";
  saveBtn.textContent = "Save";
  deleteBtn.style.display = "";

  titleEl.value = p.title || "";
  captionEl.value = p.caption || "";
  categoryEl.value = p.category === "Art" ? "Art" : "Photography";
  tagsEl.value = normalizeTags(p.tags).join(" ");

  featuredOn = !!p.featured;
  draftOn = !!p.draft;
  pillFeatured.classList.toggle("on", featuredOn);
  pillDraft.classList.toggle("on", draftOn);

  scheduleEl.value = p.schedule ? toLocalDatetimeValue(p.schedule) : "";

  drop.innerHTML = `<img src="${p.image}" alt="Preview">`;
  toast("Loaded for editing.");
}

function toLocalDatetimeValue(iso){
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

/* -----------------------------
   Init
------------------------------ */
function load(){
  posts = getPosts();
  resetEditor();
  renderPosts();
}

const STORAGE_KEY = "mb_posts";

function downloadFile(filename, text){
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeLoad(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function safeSave(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

document.getElementById("exportJson")?.addEventListener("click", () => {
  const data = safeLoad();
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  downloadFile(`mb-portfolio-backup-${stamp}.json`, JSON.stringify(data, null, 2));
});

document.getElementById("importJson")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if(!file) return;

  const text = await file.text();
  let data;
  try{
    data = JSON.parse(text);
  }catch{
    alert("Invalid JSON file.");
    return;
  }

  if(!Array.isArray(data)){
    alert("Backup format invalid. Expected an array.");
    return;
  }

  // basic validation (not strict)
  const cleaned = data
    .filter(p => p && typeof p === "object")
    .map(p => ({
      id: p.id ?? crypto.randomUUID?.() ?? String(Date.now()),
      title: String(p.title || ""),
      caption: String(p.caption || ""),
      category: String(p.category || "Photography"),
      image: String(p.image || ""),
      tags: Array.isArray(p.tags) ? p.tags : [],
      featured: !!p.featured,
      draft: !!p.draft,
      schedule: p.schedule || ""
    }));

  safeSave(cleaned);
  alert("Import complete! Refresh admin + index page.");
});

document.getElementById("clearAllPosts")?.addEventListener("click", () => {
  const ok = confirm("Delete ALL posts? This cannot be undone unless you exported a backup.");
  if(!ok) return;
  safeSave([]);
  alert("All posts cleared. Refresh admin + index page.");
});

checkAccess();

// Admin stats
const statTotal = document.getElementById("statTotal");
const statPhoto = document.getElementById("statPhoto");
const statArt = document.getElementById("statArt");
