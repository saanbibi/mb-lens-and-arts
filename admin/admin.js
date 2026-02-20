// MB CMS Admin (LocalStorage-based)
// Password is fixed by request.
(() => {
  "use strict";

  const STORAGE_KEY = "mb_posts";
  const VIEWS_KEY = "mb_views"; // { [id]: number }
  const PASSWORD = "mb10201944";
  const AUTH_KEY = "mb_admin_authed"; // sessionStorage flag

  // --------- DOM ---------
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");

  const pw = document.getElementById("pw");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const toggleThemeBtn = document.getElementById("toggleThemeBtn"); // gate
  const themeToggle = document.getElementById("themeToggle"); // app

  const drop = document.getElementById("drop");
  const fileInput = document.getElementById("file");
  const preview = document.getElementById("preview");

  const formTitle = document.getElementById("formTitle");
  const titleEl = document.getElementById("title");
  const categoryEl = document.getElementById("category");
  const captionEl = document.getElementById("caption");
  const tagsEl = document.getElementById("tags");
  const scheduleEl = document.getElementById("schedule");
  const featuredEl = document.getElementById("featured");
  const draftEl = document.getElementById("draft");

  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  const postsWrap = document.getElementById("posts");
  const draftsWrap = document.getElementById("drafts");

  const refreshBtn = document.getElementById("refreshBtn");
  const wipeBtn = document.getElementById("wipeBtn");

  const exportBtn = document.getElementById("exportJson");
  const importInput = document.getElementById("importJson");
  const clearAllBtn = document.getElementById("clearAllPosts");

  const toast = document.getElementById("toast");

  // analytics
  const statTotal = document.getElementById("statTotal");
  const statPhoto = document.getElementById("statPhoto");
  const statArt = document.getElementById("statArt");
  const statFeatured = document.getElementById("statFeatured");
  const statDrafts = document.getElementById("statDrafts");
  const statViews = document.getElementById("statViews");
  const topViews = document.getElementById("topViews");

  // --------- State ---------
  let posts = [];
  let editingId = null;
  let currentImageDataUrl = ""; // base64

  // --------- Helpers ---------
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function showToast(msg = "Done") {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("show"), 1400);
  }

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

  function normalizeTags(str) {
    const raw = String(str || "").trim();
    if (!raw) return [];
    return raw
      .split(/\s+/)
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => (t.startsWith("#") ? t : `#${t}`));
  }

  function readViewsMap() {
    try {
      const obj = JSON.parse(localStorage.getItem(VIEWS_KEY) || "{}");
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  }

  function getViewCount(id) {
    const map = readViewsMap();
    return Number(map?.[id] || 0) || 0;
  }

  function formatWhen(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  }

  function newId() {
    // short-ish stable id
    return "p_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  async function compressImageToDataUrl(file, maxW = 2200, quality = 0.82) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);

    // Prefer webp; fallback jpeg if needed
    let dataUrl = "";
    try {
      dataUrl = canvas.toDataURL("image/webp", quality);
      if (!dataUrl.startsWith("data:image/webp")) throw new Error("webp not supported");
    } catch {
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    return dataUrl;
  }

  // --------- Theme ---------
  function setTheme(isDark) {
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("mb_theme", isDark ? "dark" : "light");

    if (themeToggle) themeToggle.textContent = isDark ? "Light" : "Dark";
    if (toggleThemeBtn) toggleThemeBtn.textContent = isDark ? "Light" : "Dark";
  }

  // --------- Auth gate ---------
  function isAuthed() {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  }

  function setAuthed(v) {
    if (v) sessionStorage.setItem(AUTH_KEY, "1");
    else sessionStorage.removeItem(AUTH_KEY);
  }

  function showGate() {
    if (gate) gate.classList.remove("hidden");
    if (app) app.style.display = "none";
    if (pw) pw.value = "";
    pw?.focus?.();
  }

  function showApp() {
    if (gate) gate.classList.add("hidden");
    if (app) app.style.display = "block";
  }

  function tryLogin() {
    const val = String(pw?.value || "");
    if (val === PASSWORD) {
      setAuthed(true);
      showApp();
      renderAll();
      showToast("Logged in");
    } else {
      showToast("Wrong password");
      pw?.focus?.();
    }
  }

  function logout() {
    setAuthed(false);
    showGate();
    showToast("Logged out");
  }

  // --------- Form ---------
  function resetForm() {
    editingId = null;
    currentImageDataUrl = "";
    formTitle.textContent = "Create post";
    cancelBtn.style.display = "none";

    titleEl.value = "";
    captionEl.value = "";
    tagsEl.value = "";
    scheduleEl.value = "";
    featuredEl.checked = false;
    draftEl.checked = false;
    categoryEl.value = "Photography";

    preview.style.display = "none";
    preview.removeAttribute("src");
  }

  function fillForm(post) {
    editingId = post.id;
    currentImageDataUrl = post.image || "";
    formTitle.textContent = "Edit post";
    cancelBtn.style.display = "inline-flex";

    titleEl.value = post.title || "";
    captionEl.value = post.caption || "";
    categoryEl.value = post.category || "Photography";
    tagsEl.value = normalizeTags(post.tags).join(" ");
    scheduleEl.value = post.schedule ? toDatetimeLocal(post.schedule) : "";
    featuredEl.checked = !!post.featured;
    draftEl.checked = !!post.draft;

    if (currentImageDataUrl) {
      preview.src = currentImageDataUrl;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toDatetimeLocal(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    // convert to local datetime-local string: YYYY-MM-DDTHH:MM
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  function fromDatetimeLocal(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }

  function validatePost() {
    const t = String(titleEl.value || "").trim();
    const c = String(captionEl.value || "").trim();
    const cat = categoryEl.value;
    if (!currentImageDataUrl) return "Please upload an image.";
    if (!t && !c) return "Add at least a title or caption.";
    if (!cat) return "Pick a category.";
    return "";
  }

  function upsertPost() {
    const err = validatePost();
    if (err) {
      showToast(err);
      return;
    }

    const nowIso = new Date().toISOString();
    const post = {
      id: editingId || newId(),
      image: currentImageDataUrl,
      title: String(titleEl.value || "").trim(),
      caption: String(captionEl.value || "").trim(),
      category: categoryEl.value || "Photography",
      tags: normalizeTags(tagsEl.value),
      featured: !!featuredEl.checked,
      draft: !!draftEl.checked,
      schedule: fromDatetimeLocal(scheduleEl.value),
      updatedAt: nowIso,
      createdAt: editingId ? undefined : nowIso
    };

    if (editingId) {
      const idx = posts.findIndex(p => p.id === editingId);
      if (idx >= 0) {
        // preserve createdAt if exists
        post.createdAt = posts[idx].createdAt || post.createdAt || nowIso;
        posts[idx] = { ...posts[idx], ...post };
      }
    } else {
      posts.unshift(post);
    }

    savePosts();
    renderAll();
    resetForm();
    showToast("Saved");
  }

  // --------- Rendering ---------
  function renderAnalytics() {
    if (!statTotal) return;

    const total = posts.length;
    const photo = posts.filter(p => p.category === "Photography").length;
    const art = posts.filter(p => p.category === "Art").length;
    const featured = posts.filter(p => !!p.featured).length;
    const drafts = posts.filter(p => !!p.draft).length;

    const viewsMap = readViewsMap();
    const totalViews = Object.values(viewsMap).reduce((a, b) => a + (Number(b) || 0), 0);

    statTotal.textContent = String(total);
    statPhoto.textContent = String(photo);
    statArt.textContent = String(art);
    statFeatured.textContent = String(featured);
    statDrafts.textContent = String(drafts);
    statViews.textContent = String(totalViews);

    // Top viewed list
    if (topViews) {
      const byViews = posts
        .map(p => ({ p, v: Number(viewsMap?.[p.id] || 0) || 0 }))
        .filter(x => x.v > 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, 6);

      if (byViews.length === 0) {
        topViews.innerHTML = `<div class="mini">No views yet (views are stored per-device in localStorage).</div>`;
      } else {
        topViews.innerHTML = byViews
          .map(({ p, v }) => `
            <div class="post-row" style="margin-top:8px;">
              <div style="min-width:0;">
                <div style="font-weight:950; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(p.title || "(untitled)")}</div>
                <div class="mini">${escapeHtml(p.category || "")}${p.draft ? " • Draft" : ""}${p.schedule ? " • Scheduled" : ""}</div>
              </div>
              <div class="pill">${v} views</div>
            </div>
          `)
          .join("");
      }
    }
  }

  function renderLists() {
    if (!postsWrap || !draftsWrap) return;

    const drafts = posts.filter(p => !!p.draft);
    const published = posts.filter(p => !p.draft);

    draftsWrap.innerHTML = drafts.length
      ? drafts.map(p => renderPostRow(p, { inDrafts: true })).join("")
      : `<div class="mini">No drafts yet.</div>`;

    postsWrap.innerHTML = published.length
      ? published.map(p => renderPostRow(p, { inDrafts: false })).join("")
      : `<div class="mini">No published posts yet.</div>`;

    // attach handlers + drag
    attachRowHandlers();
    enableDragReorder();
  }

  function renderPostRow(p, { inDrafts }) {
    const tags = Array.isArray(p.tags) ? p.tags : [];
    const views = getViewCount(p.id);
    const when = p.schedule ? `Scheduled: ${escapeHtml(formatWhen(p.schedule))}` : "";
    const badge = p.featured ? `<span class="pill">Featured</span>` : "";
    const badge2 = p.draft ? `<span class="pill">Draft</span>` : "";
    const badge3 = views ? `<span class="pill">${views} views</span>` : "";

    return `
      <div class="post-row" draggable="true" data-id="${escapeHtml(p.id)}" data-draft="${p.draft ? "1" : "0"}">
        <div style="display:flex; gap:10px; min-width:0;">
          <img src="${escapeHtml(p.image || "")}" alt="" style="width:72px; height:72px; border-radius:14px; object-fit:cover; background: rgba(15,23,42,.06);" loading="lazy" decoding="async">
          <div style="min-width:0;">
            <div style="font-weight:950; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(p.title || "(untitled)")}</div>
            <div class="mini">${escapeHtml(p.category || "")}${tags.length ? " • " + escapeHtml(tags.slice(0, 4).join(" ")) : ""}</div>
            ${when ? `<div class="mini">${when}</div>` : ""}
            <div class="row" style="margin-top:8px;">
              ${badge}${badge2}${badge3}
            </div>
          </div>
        </div>

        <div class="row" style="justify-content:flex-end;">
          <button class="btn2" data-act="edit" data-id="${escapeHtml(p.id)}" type="button">Edit</button>
          <button class="btn2" data-act="open" data-id="${escapeHtml(p.id)}" type="button">Open</button>
          ${p.draft ? `<button class="btn2" data-act="preview" data-id="${escapeHtml(p.id)}" type="button">Preview link</button>` : ``}
          <button class="btn2 danger" data-act="del" data-id="${escapeHtml(p.id)}" type="button">Delete</button>
        </div>
      </div>
    `;
  }

  function attachRowHandlers() {
    const buttons = document.querySelectorAll("[data-act][data-id]");
    buttons.forEach(btn => {
      btn.addEventListener("click", async () => {
        const act = btn.getAttribute("data-act");
        const id = btn.getAttribute("data-id");
        const post = posts.find(p => p.id === id);
        if (!post) return;

        if (act === "edit") {
          fillForm(post);
        }

        if (act === "open") {
          window.location.href = `../post.html?id=${encodeURIComponent(id)}`;
        }

        if (act === "preview") {
          // private preview link: embeds post data in hash, works for anyone with the link
          const payload = b64UrlEncode(JSON.stringify(stripForPreview(post)));
          const url = `${location.origin}${location.pathname.replace(/\/admin\/admin\.html.*$/,"/post.html")}?preview=1#p=${payload}`;
          try {
            await navigator.clipboard.writeText(url);
            showToast("Preview link copied");
          } catch {
            prompt("Copy this preview link:", url);
          }
        }

        if (act === "del") {
          const ok = confirm("Delete this post? This cannot be undone.");
          if (!ok) return;
          posts = posts.filter(p => p.id !== id);
          savePosts();
          renderAll();
          showToast("Deleted");
        }
      });
    });
  }

  function stripForPreview(post) {
    return {
      id: post.id,
      image: post.image,
      title: post.title,
      caption: post.caption,
      category: post.category,
      tags: Array.isArray(post.tags) ? post.tags : [],
      featured: !!post.featured,
      draft: !!post.draft,
      schedule: post.schedule || ""
    };
  }

  // base64url helpers
  function b64UrlEncode(str) {
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  // --------- Drag reorder (published + drafts independently) ---------
  let dragId = null;
  function enableDragReorder() {
    document.querySelectorAll(".post-row[draggable='true']").forEach(row => {
      row.addEventListener("dragstart", (e) => {
        dragId = row.dataset.id;
        row.style.opacity = "0.6";
        e.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragend", () => {
        row.style.opacity = "1";
      });
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const targetId = row.dataset.id;
        if (!dragId || dragId === targetId) return;

        // reorder within same bucket (draft vs published) to match your UI lists
        const dragged = posts.find(p => p.id === dragId);
        const target = posts.find(p => p.id === targetId);
        if (!dragged || !target) return;
        if (!!dragged.draft !== !!target.draft) return; // prevent cross-list reorder

        const bucketIds = posts.filter(p => !!p.draft === !!dragged.draft).map(p => p.id);
        const from = bucketIds.indexOf(dragId);
        const to = bucketIds.indexOf(targetId);
        if (from < 0 || to < 0) return;

        bucketIds.splice(to, 0, bucketIds.splice(from, 1)[0]);

        // rebuild posts keeping other bucket order stable
        const other = posts.filter(p => !!p.draft !== !!dragged.draft);
        const bucket = bucketIds.map(id => posts.find(p => p.id === id)).filter(Boolean);
        posts = [...bucket, ...other];

        savePosts();
        renderAll();
      });
    });
  }

  // --------- Backup / Restore ---------
  function exportJson() {
    const blob = new Blob([JSON.stringify(posts, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mb_posts_backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("Exported");
  }

  async function importJson(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Invalid JSON: expected array");
      posts = data;
      savePosts();
      renderAll();
      showToast("Imported");
    } catch (e) {
      showToast("Import failed");
      console.error(e);
    }
  }

  // --------- Image drop/upload ---------
  function setupDrop() {
    if (!drop || !fileInput) return;

    drop.addEventListener("click", () => fileInput.click());

    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("drag");
    });

    drop.addEventListener("dragleave", () => drop.classList.remove("drag"));

    drop.addEventListener("drop", async (e) => {
      e.preventDefault();
      drop.classList.remove("drag");
      const file = e.dataTransfer.files?.[0];
      if (file) await handleFile(file);
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (file) await handleFile(file);
      fileInput.value = "";
    });
  }

  async function handleFile(file) {
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file");
      return;
    }
    try {
      const dataUrl = await compressImageToDataUrl(file);
      currentImageDataUrl = dataUrl;

      preview.src = dataUrl;
      preview.style.display = "block";
      showToast("Image added");
    } catch (e) {
      console.error(e);
      showToast("Image load failed");
    }
  }

  // --------- Render all ---------
  function renderAll() {
    renderAnalytics();
    renderLists();
  }

  // --------- Events ---------
  function wireEvents() {
    loginBtn?.addEventListener("click", tryLogin);
    pw?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryLogin();
    });

    logoutBtn?.addEventListener("click", logout);

    toggleThemeBtn?.addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
    themeToggle?.addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));

    saveBtn?.addEventListener("click", upsertPost);
    cancelBtn?.addEventListener("click", () => {
      resetForm();
      showToast("Canceled");
    });

    refreshBtn?.addEventListener("click", () => {
      loadPosts();
      renderAll();
      showToast("Refreshed");
    });

    wipeBtn?.addEventListener("click", () => {
      const ok = confirm("Wipe all posts? This will clear localStorage posts.");
      if (!ok) return;
      posts = [];
      savePosts();
      renderAll();
      resetForm();
      showToast("Wiped");
    });

    exportBtn?.addEventListener("click", exportJson);
    importInput?.addEventListener("change", async () => {
      const file = importInput.files?.[0];
      if (file) await importJson(file);
      importInput.value = "";
    });

    clearAllBtn?.addEventListener("click", () => {
      const ok = confirm("Clear all posts? This cannot be undone.");
      if (!ok) return;
      posts = [];
      savePosts();
      renderAll();
      resetForm();
      showToast("Cleared");
    });

    // Admin shortcut (Ctrl+Shift+A) stays consistent
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        // already here
      }
    });
  }

  // --------- Init ---------
  function init() {
    // restore theme
    setTheme(localStorage.getItem("mb_theme") === "dark");

    loadPosts();
    setupDrop();
    wireEvents();

    if (isAuthed()) {
      showApp();
      renderAll();
    } else {
      showGate();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
