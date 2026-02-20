/* MB Lens & Arts — Admin (static/local)
   NOTE: This is client-side only. It's good for "hidden" editing,
   but it's not real security.
*/

const STORAGE_KEY = "mb_posts";
const SECRET_PARAM = "mbcms";
const SESSION_KEY = "mb_admin_session";

// Fixed password (your request)
const ADMIN_PASSWORD = "mb10201944";

// Elements
const gateEl = document.getElementById("gate");
const loginEl = document.getElementById("login");
const appEl = document.getElementById("app");

const pwEl = document.getElementById("pw");
const loginBtn = document.getElementById("loginBtn");
const loginHint = document.getElementById("loginHint");
const logoutBtn = document.getElementById("logoutBtn");

const themeToggle = document.getElementById("themeToggle");

const dropEl = document.getElementById("drop");
const fileEl = document.getElementById("file");

const editorTitle = document.getElementById("editorTitle");
const editId = document.getElementById("editId");
const titleEl = document.getElementById("title");
const captionEl = document.getElementById("caption");
const categoryEl = document.getElementById("category");
const scheduleEl = document.getElementById("schedule");
const tagsEl = document.getElementById("tags");

const pillFeatured = document.getElementById("pillFeatured");
const pillDraft = document.getElementById("pillDraft");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const deleteBtn = document.getElementById("deleteBtn");
const statusEl = document.getElementById("status");

const postsEl = document.getElementById("posts");
const exportBtn = document.getElementById("exportBtn");
const wipeBtn = document.getElementById("wipeBtn");

// Analytics
const countTotal = document.getElementById("countTotal");
const countPhoto = document.getElementById("countPhoto");
const countArt = document.getElementById("countArt");
const countFeatured = document.getElementById("countFeatured");
const countDraft = document.getElementById("countDraft");
const countScheduled = document.getElementById("countScheduled");

// State
let posts = [];
let editingId = null;
let currentImage = "";
let featured = false;
let draft = false;

/* ---------------- Theme ---------------- */
function setTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("mb_theme", isDark ? "dark" : "light");
  if (themeToggle) themeToggle.textContent = isDark ? "Light" : "Dark";
}

/* ---------------- Access gate ---------------- */
function hasSecretParam() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.has(SECRET_PARAM);
  } catch {
    return false;
  }
}

function showGate() {
  if (gateEl) gateEl.style.display = "block";
  if (loginEl) loginEl.style.display = "none";
  if (appEl) appEl.style.display = "none";
}

function showLogin() {
  if (gateEl) gateEl.style.display = "none";
  if (loginEl) loginEl.style.display = "block";
  if (appEl) appEl.style.display = "none";
  if (pwEl) pwEl.focus();
}

function showApp() {
  if (gateEl) gateEl.style.display = "none";
  if (loginEl) loginEl.style.display = "none";
  if (appEl) appEl.style.display = "block";
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

function login() {
  const entered = String(pwEl?.value || "");
  if (entered === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "1");
    if (loginHint) loginHint.textContent = "";
    showApp();
    initApp();
  } else {
    if (loginHint) loginHint.textContent = "Wrong password.";
  }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
}

function checkAccessAndBoot() {
  if (!hasSecretParam()) {
    showGate();
    return;
  }

  // If already logged in, go straight to app
  if (isLoggedIn()) {
    showApp();
    initApp();
  } else {
    showLogin();
  }
}

/* ---------------- Storage ---------------- */
function loadPosts() {
  try {
    posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(posts)) posts = [];
  } catch {
    posts = [];
  }
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

/* ---------------- Helpers ---------------- */
function nowISO() {
  return new Date().toISOString();
}

function makeId() {
  return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function normalizeTags(str) {
  const raw = String(str || "").trim();
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => (t.startsWith("#") ? t : `#${t}`));
}

function setStatus(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  if (!msg) return;
  setTimeout(() => {
    if (statusEl.textContent === msg) statusEl.textContent = "";
  }, 1800);
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ---------------- UI state ---------------- */
function resetEditor() {
  editingId = null;
  currentImage = "";
  featured = false;
  draft = false;

  if (editorTitle) editorTitle.textContent = "Create post";
  if (editId) editId.textContent = "";

  if (titleEl) titleEl.value = "";
  if (captionEl) captionEl.value = "";
  if (tagsEl) tagsEl.value = "";
  if (scheduleEl) scheduleEl.value = "";
  if (categoryEl) categoryEl.value = "Photography";

  pillFeatured?.classList.remove("on");
  pillDraft?.classList.remove("on");

  if (deleteBtn) deleteBtn.style.display = "none";

  if (dropEl) {
    dropEl.innerHTML = `<b>Drop image</b> or click to upload<small>JPG/PNG/WebP recommended</small>`;
  }
}

function fillEditor(post) {
  editingId = post.id;
  currentImage = post.image || "";
  featured = !!post.featured;
  draft = !!post.draft;

  if (editorTitle) editorTitle.textContent = "Edit post";
  if (editId) editId.textContent = `ID: ${post.id}`;

  if (titleEl) titleEl.value = post.title || "";
  if (captionEl) captionEl.value = post.caption || "";
  if (tagsEl) tagsEl.value = (post.tags || []).join(" ");
  if (categoryEl) categoryEl.value = post.category || "Photography";

  if (scheduleEl) {
    // Try to convert ISO to datetime-local
    if (post.schedule) {
      const d = new Date(post.schedule);
      if (!Number.isNaN(d.getTime())) {
        const pad = n => String(n).padStart(2, "0");
        const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        scheduleEl.value = local;
      } else {
        scheduleEl.value = "";
      }
    } else {
      scheduleEl.value = "";
    }
  }

  pillFeatured?.classList.toggle("on", featured);
  pillDraft?.classList.toggle("on", draft);

  if (deleteBtn) deleteBtn.style.display = "inline-flex";

  if (dropEl) {
    if (currentImage) {
      dropEl.innerHTML = `<b>Image selected</b><small>Click to replace</small>`;
    }
  }
}

/* ---------------- Render posts list ---------------- */
function renderPosts() {
  if (!postsEl) return;

  postsEl.innerHTML = "";

  posts.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "post-item";
    row.draggable = true;
    row.dataset.id = p.id;

    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = "thumb";
    img.src = p.image || "";

    const meta = document.createElement("div");
    meta.className = "post-meta";

    const title = document.createElement("b");
    title.textContent = p.title || "(untitled)";

    const sub = document.createElement("span");
    const tags = Array.isArray(p.tags) ? p.tags.slice(0, 3).join(" ") : "";
    const flags = [p.category, p.featured ? "Featured" : "", p.draft ? "Draft" : ""].filter(Boolean).join(" • ");
    sub.textContent = `${flags}${tags ? " • " + tags : ""}`;

    meta.appendChild(title);
    meta.appendChild(sub);

    row.appendChild(img);
    row.appendChild(meta);

    row.addEventListener("click", () => fillEditor(p));

    // Drag reorder
    row.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("text/plain", p.id);
      row.style.opacity = "0.6";
    });
    row.addEventListener("dragend", () => {
      row.style.opacity = "1";
    });
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromId = e.dataTransfer?.getData("text/plain");
      const toId = row.dataset.id;
      if (!fromId || !toId || fromId === toId) return;

      const fromIndex = posts.findIndex(x => x.id === fromId);
      const toIndex = posts.findIndex(x => x.id === toId);
      if (fromIndex < 0 || toIndex < 0) return;

      const [moved] = posts.splice(fromIndex, 1);
      posts.splice(toIndex, 0, moved);

      savePosts();
      renderPosts();
      renderAnalytics();
      setStatus("Reordered");
    });

    postsEl.appendChild(row);
  });
}

/* ---------------- Analytics ---------------- */
function renderAnalytics() {
  const total = posts.length;
  const photo = posts.filter(p => p.category === "Photography").length;
  const art = posts.filter(p => p.category === "Art").length;
  const feat = posts.filter(p => !!p.featured).length;
  const drafts = posts.filter(p => !!p.draft).length;
  const scheduled = posts.filter(p => {
    if (!p.schedule) return false;
    const d = new Date(p.schedule);
    return !Number.isNaN(d.getTime()) && d > new Date();
  }).length;

  if (countTotal) countTotal.textContent = String(total);
  if (countPhoto) countPhoto.textContent = String(photo);
  if (countArt) countArt.textContent = String(art);
  if (countFeatured) countFeatured.textContent = String(feat);
  if (countDraft) countDraft.textContent = String(drafts);
  if (countScheduled) countScheduled.textContent = String(scheduled);
}

/* ---------------- Actions ---------------- */
async function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setStatus("Please upload an image file.");
    return;
  }

  try {
    currentImage = await fileToDataURL(file);
    if (dropEl) dropEl.innerHTML = `<b>Image selected</b><small>Click to replace</small>`;
    setStatus("Image loaded");
  } catch {
    setStatus("Failed to read image");
  }
}

function savePost() {
  if (!currentImage) {
    setStatus("Please upload an image first.");
    return;
  }

  const title = String(titleEl?.value || "").trim();
  const caption = String(captionEl?.value || "").trim();
  const category = String(categoryEl?.value || "Photography");
  const tags = normalizeTags(tagsEl?.value || "");

  // schedule (datetime-local) -> ISO
  let schedule = "";
  const rawSched = String(scheduleEl?.value || "").trim();
  if (rawSched) {
    const d = new Date(rawSched);
    if (!Number.isNaN(d.getTime())) schedule = d.toISOString();
  }

  if (editingId) {
    const idx = posts.findIndex(p => p.id === editingId);
    if (idx >= 0) {
      posts[idx] = {
        ...posts[idx],
        title,
        caption,
        category,
        tags,
        schedule,
        featured,
        draft,
        image: currentImage,
        updatedAt: nowISO(),
      };
      savePosts();
      renderPosts();
      renderAnalytics();
      setStatus("Updated");
      return;
    }
  }

  // create new
  const post = {
    id: makeId(),
    title,
    caption,
    category,
    tags,
    schedule,
    featured,
    draft,
    image: currentImage,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  // Add to top by default
  posts.unshift(post);

  savePosts();
  renderPosts();
  renderAnalytics();
  setStatus("Published");
  resetEditor();
}

function deletePost() {
  if (!editingId) return;
  const idx = posts.findIndex(p => p.id === editingId);
  if (idx < 0) return;
  const ok = confirm("Delete this post?");
  if (!ok) return;
  posts.splice(idx, 1);
  savePosts();
  renderPosts();
  renderAnalytics();
  setStatus("Deleted");
  resetEditor();
}

function exportJSON() {
  const data = JSON.stringify(posts, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mb_posts_backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function wipeAll() {
  const ok = confirm("Wipe ALL posts from this browser? This cannot be undone.");
  if (!ok) return;
  posts = [];
  savePosts();
  renderPosts();
  renderAnalytics();
  resetEditor();
  setStatus("Wiped");
}

/* ---------------- Init app ---------------- */
let appInitialized = false;
function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  // Theme
  setTheme(localStorage.getItem("mb_theme") === "dark");
  themeToggle?.addEventListener("click", () => {
    setTheme(!document.body.classList.contains("dark"));
  });

  // Logout
  logoutBtn?.addEventListener("click", logout);

  // Drop zone
  dropEl?.addEventListener("click", () => fileEl?.click());
  dropEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileEl?.click();
  });

  dropEl?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropEl.classList.add("drag");
  });
  dropEl?.addEventListener("dragleave", () => dropEl.classList.remove("drag"));
  dropEl?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropEl.classList.remove("drag");
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  });

  fileEl?.addEventListener("change", () => {
    const f = fileEl.files?.[0];
    if (f) handleFile(f);
    if (fileEl) fileEl.value = "";
  });

  // Pills
  pillFeatured?.addEventListener("click", () => {
    featured = !featured;
    pillFeatured.classList.toggle("on", featured);
  });
  pillDraft?.addEventListener("click", () => {
    draft = !draft;
    pillDraft.classList.toggle("on", draft);
  });

  // Buttons
  saveBtn?.addEventListener("click", savePost);
  resetBtn?.addEventListener("click", resetEditor);
  deleteBtn?.addEventListener("click", deletePost);

  exportBtn?.addEventListener("click", exportJSON);
  wipeBtn?.addEventListener("click", wipeAll);

  // Load + render
  loadPosts();
  resetEditor();
  renderPosts();
  renderAnalytics();
}

/* ---------------- Login events ---------------- */
loginBtn?.addEventListener("click", login);
pwEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});

// Boot
checkAccessAndBoot();
