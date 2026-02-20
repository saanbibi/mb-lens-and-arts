
/* MB Lens & Arts — Post Page Script */
const STORAGE_KEY = "mb_posts";

const postImage = document.getElementById("postImage");
const postTitle = document.getElementById("postTitle");
const postCaption = document.getElementById("postCaption");
const postMeta = document.getElementById("postMeta");
const postTags = document.getElementById("postTags");

const copyCaptionBtn = document.getElementById("copyCaptionBtn");
const copyTagsBtn = document.getElementById("copyTagsBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");

const themeToggle = document.getElementById("themeToggle");
const emailBtn = document.getElementById("emailBtn");

function setTheme(isDark){
  document.body.classList.toggle("dark", !!isDark);
  localStorage.setItem("mb_theme", isDark ? "dark" : "light");
  if(themeToggle) themeToggle.textContent = isDark ? "Light" : "Dark";
}

async function copyText(text){
  const t = String(text ?? "");
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(t);
      return true;
    }
  }catch{}
  try{
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly","");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }catch{
    return false;
  }
}

function normalizeTags(tags){
  if (!Array.isArray(tags)) return [];
  return tags
    .map(t => String(t || "").trim())
    .filter(Boolean)
    .map(t => (t.startsWith("#") ? t : `#${t}`));
}

function getIdFromQuery(){
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function loadPosts(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  }catch{
    return [];
  }
}

function renderMissing(){
  const wrap = document.getElementById("postWrap");
  if(!wrap) return;
  wrap.innerHTML = `
    <div class="post-missing">
      <div style="font-weight:950; font-size:16px;">Post not found</div>
      <div style="margin-top:6px; color: var(--muted);">It may have been deleted or is still a draft.</div>
    </div>
  `;
}

function renderPost(post){
  if(postImage) postImage.src = post.image || "";
  if(postTitle) postTitle.textContent = post.title || "";
  if(postCaption) postCaption.textContent = post.caption || "";

  if(postMeta){
    const bits = [];
    if(post.category) bits.push(post.category);
    if(post.date) bits.push(post.date);
    postMeta.textContent = bits.join(" • ");
  }

  if(postTags){
    postTags.innerHTML = "";
    normalizeTags(post.tags).forEach(t => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = t;
      postTags.appendChild(span);
    });
  }

  copyCaptionBtn?.addEventListener("click", async () => {
    await copyText(post.caption || "");
  });

  copyTagsBtn?.addEventListener("click", async () => {
    await copyText(normalizeTags(post.tags).join(" "));
  });

  copyLinkBtn?.addEventListener("click", async () => {
    await copyText(window.location.href);
  });
}

/* Toast above Email button */

function showToastAboveEmail(message){
  if(!emailBtn) return;

  emailBtn.querySelector(".toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  emailBtn.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 220);
  }, 1200);
}

emailBtn?.addEventListener("click", async () => {
  const email = emailBtn.dataset.email || "mauigacillos@gmail.com";
  const ok = await copyText(email);
  showToastAboveEmail(ok ? "Email copied" : "Copy failed");
});

themeToggle?.addEventListener("click", () => {
  setTheme(!document.body.classList.contains("dark"));
});

/* Init */
setTheme(localStorage.getItem("mb_theme") === "dark");

const id = getIdFromQuery();
const posts = loadPosts();
const post = posts.find(p => String(p.id) === String(id));

if(!post){
  renderMissing();
}else{
  renderPost(post);
}
