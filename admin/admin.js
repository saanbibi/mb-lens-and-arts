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
   Gate + Login
------------------------------ */
function showGate(){
  gateEl.style.display = "";
  loginEl.style.display = "none";
  appEl.style.display = "none";
}

function showLogin(){
  gateEl.style.display = "none";
  loginEl.style.display = "";
  appEl.style.display = "none";
  pwEl.focus();
}

function showApp(){
  gateEl.style.display = "none";
  loginEl.style.display = "none";
  appEl.style.display = "";
  load();
}

function checkAccess(){
  const q = getQuery();
  const hasSecret = q.has(SECRET_PARAM);

  // hide admin unless secret param exists
  if (!hasSecret) return showGate();

  // require password (or set one)
    showLogin();
    toast("Set a password first.");
    return;
  }

  if (isAuthed()) return showApp();
  showLogin();
}

loginBtn.addEventListener("click", async () => {
  const pw = pwEl.value.trim();
  if (!pw) return;

  const hash = await sha256(pw);
    setAuthed(true);
    pwEl.value = "";
    showApp();
  } else {
    alert("Wrong password.");
  }
});


  if (has) {
    const cur = prompt("Current password:");
    if (!cur) return;
      alert("Wrong current password.");
      return;
    }
  }

  const next = prompt("New password (min 4 chars):");
  if (!next || next.trim().length < 4) return alert("Too short.");

  const confirm = prompt("Confirm new password:");
  if (next !== confirm) return alert("Does not match.");

  alert("Password updated.");
});

logoutBtn.addEventListener("click", () => {
  setAuthed(false);
  location.reload();
});

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

function renderPosts(){
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

  updateAnalytics();
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
