
function readViews(){
  try{
    const obj = JSON.parse(localStorage.getItem(VIEWS_KEY) || "{}");
    return obj && typeof obj === "object" ? obj : {};
  }catch{
    return {};
  }
}

function getViewCount(id){
  const map = readViews();
  return Number(map?.[id] || 0) || 0;
}

function incrementView(id){
  if(!id) return 0;

  // prevent double counting in the same tab session for the same post
  const sk = `mb_viewed_${id}`;
  if(sessionStorage.getItem(sk) === "1") return getViewCount(id);

  const map = readViews();
  map[id] = (Number(map[id]) || 0) + 1;
  localStorage.setItem(VIEWS_KEY, JSON.stringify(map));
  sessionStorage.setItem(sk, "1");
  return Number(map[id]) || 0;
}

function b64UrlDecode(str){
  try{
    let s = String(str || "").replaceAll("-", "+").replaceAll("_", "/");
    // pad
    while(s.length % 4) s += "=";
    const json = decodeURIComponent(escape(atob(s)));
    return json;
  }catch{
    return "";
  }
}
const STORAGE_KEY = "mb_posts";

const VIEWS_KEY = "mb_views";

function qs(sel){ return document.querySelector(sel); }

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function normalizeTags(tags){
  if(!Array.isArray(tags)) return [];
  return tags
    .map(t => String(t || "").trim())
    .filter(Boolean)
    .map(t => (t.startsWith("#") ? t : `#${t}`));
}

function setTheme(isDark){
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("mb_theme", isDark ? "dark" : "light");

  const btn = qs("#themeToggle");
  const btn2 = qs("#postThemeToggle");
  const label = isDark ? "Light" : "Dark";
  if(btn) btn.textContent = label;
  if(btn2) btn2.textContent = label;
}

function showToastNear(el, message){
  if(!el) return;
  el.closest(".footer-right")?.querySelector(".toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  const host = el.closest(".footer-right") || document.body;
  host.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 220);
  }, 1400);
}

async function copyEmail(){
  const btn = qs("#emailBtn");
  if(!btn) return;
  const email = btn.dataset.email || "mauigacillos@gmail.com";
  try{
    await navigator.clipboard.writeText(email);
    showToastNear(btn, "Email copied");
  }catch{
    showToastNear(btn, "Copy failed");
  }
}

function getPosts(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch{ return []; }
}

function renderMissing(mount){
  mount.innerHTML = `
    <div class="post-missing">
      <div class="post-kicker">Not found</div>
      <h1 class="post-title">This post doesn't exist.</h1>
      <p class="post-caption">It may have been deleted or is still a draft.</p>
      <div class="post-buttons">
        <a class="footer-btn" href="index.html#gallery">Go back</a>
      </div>
    </div>
  `;
}

function renderPost(mount, post){
  const tags = normalizeTags(post.tags);

  mount.innerHTML = `
    <article class="post-card">
      <div class="post-media">
        <img src="${post.image}" alt="${escapeHtml(post.title || "Post")}" loading="lazy" />
      </div>
      <div class="post-body">
        <div class="post-meta">
          <span class="post-kicker">${escapeHtml(post.category || "")}</span>
          ${post.featured ? `<span class="post-dot">•</span><span class="post-kicker">Featured</span>` : ""}
        </div>

        <h1 class="post-title">${escapeHtml(post.title || "")}</h1>
        <p class="post-caption">${escapeHtml(post.caption || "")}</p>

        ${tags.length ? `
          <div class="post-tags">
            ${tags.map(t => `<a class="tag" href="index.html?tag=${encodeURIComponent(t)}#gallery">${escapeHtml(t)}</a>`).join("")}
          </div>
        ` : ""}

        <div class="post-buttons">
          <button class="footer-btn" id="copyLinkBtn" type="button">Copy Link</button>
          ${post.caption ? `<button class="footer-btn" id="copyCaptionBtn" type="button">Copy Caption</button>` : ""}
        </div>
      </div>
    </article>
  `;

  const linkBtn = qs("#copyLinkBtn");
  linkBtn?.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(window.location.href);
      showToastNear(qs("#emailBtn") || linkBtn, "Link copied");
    }catch{
      showToastNear(qs("#emailBtn") || linkBtn, "Copy failed");
    }
  });

  const capBtn = qs("#copyCaptionBtn");
  capBtn?.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(post.caption || "");
      showToastNear(qs("#emailBtn") || capBtn, "Caption copied");
    }catch{
      showToastNear(qs("#emailBtn") || capBtn, "Copy failed");
    }
  });
}

function main(){
  setTheme(localStorage.getItem("mb_theme") === "dark");

  qs("#themeToggle")?.addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
  qs("#postThemeToggle")?.addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
  qs("#emailBtn")?.addEventListener("click", copyEmail);

  const mount = qs("#postMount");
  if(!mount) return;

  const id = new URLSearchParams(location.search).get("id");
  const posts = getPosts();
  const post = posts.find(p => String(p.id) === String(id));
  // Count a view (stored per-device)
  if(post?.id) incrementView(post.id);

  // basic visibility check: don't show drafts/future scheduled
  const now = new Date();
  const sched = post?.schedule ? new Date(post.schedule) : null;
  const hidden = !post || post.draft || (sched && !Number.isNaN(sched.getTime()) && sched > now);

  if(hidden) return renderMissing(mount);

  renderPost(mount, post);
}

main();
