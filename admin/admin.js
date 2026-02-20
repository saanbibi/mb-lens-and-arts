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

// Get DOM elements
const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const titleInput = document.getElementById('title');
const categorySelect = document.getElementById('category');
const captionTextarea = document.getElementById('caption');
const tagsInput = document.getElementById('tags');
const scheduleInput = document.getElementById('schedule');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const deleteBtn = document.getElementById('deleteBtn');
const statusDiv = document.getElementById('status');
const postsContainer = document.getElementById('posts');
const pillFeatured = document.getElementById('pillFeatured');
const pillDraft = document.getElementById('pillDraft');

let currentImageData = null;
let editingPostId = null;

// ============ IMAGE UPLOAD / DROP ZONE ============

// Click to upload
drop.addEventListener('click', () => {
  fileInput.click();
});

// Allow keyboard access
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

// Drag and drop
drop.addEventListener('dragover', (e) => {
  e.preventDefault();
  drop.classList.add('drag');
});

drop.addEventListener('dragleave', () => {
  drop.classList.remove('drag');
});

drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('drag');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleImageFile(files[0]);
  }
});

// File input change
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleImageFile(e.target.files[0]);
  }
});

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) {
    statusDiv.textContent = '❌ Please select an image file';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentImageData = e.target.result;
    
    // Display the image in the drop zone
    drop.innerHTML = `<img src="${currentImageData}" alt="Selected image"/>`;
    drop.style.backgroundImage = 'none';
    
    statusDiv.textContent = '✓ Image loaded';
  };
  reader.readAsDataURL(file);
}

// ============ POST MANAGEMENT ============

saveBtn.addEventListener('click', savePost);
resetBtn.addEventListener('click', resetForm);
deleteBtn.addEventListener('click', deletePost);

function savePost() {
  if (!currentImageData) {
    statusDiv.textContent = '❌ Please select an image';
    return;
  }

  if (!titleInput.value.trim()) {
    statusDiv.textContent = '❌ Please enter a title';
    return;
  }

  const post = {
    id: editingPostId || Date.now(),
    title: titleInput.value.trim(),
    category: categorySelect.value,
    caption: captionTextarea.value.trim(),
    tags: tagsInput.value.split(/[\s,]+/).filter(t => t),
    featured: pillFeatured.classList.contains('on'),
    draft: pillDraft.classList.contains('on'),
    schedule: scheduleInput.value || null,
    image: currentImageData,
    createdAt: editingPostId ? getPostById(editingPostId).createdAt : new Date().toISOString()
  };

  // Save to localStorage
  const posts = JSON.parse(localStorage.getItem('posts') || '[]');
  
  if (editingPostId) {
    const index = posts.findIndex(p => p.id === editingPostId);
    if (index !== -1) posts[index] = post;
  } else {
    posts.push(post);
  }

  localStorage.setItem('posts', JSON.stringify(posts));
  
  statusDiv.textContent = '✓ Post saved successfully';
  resetForm();
  renderPosts();
}

function resetForm() {
  currentImageData = null;
  editingPostId = null;
  titleInput.value = '';
  categorySelect.value = 'Photography';
  captionTextarea.value = '';
  tagsInput.value = '';
  scheduleInput.value = '';
  pillFeatured.classList.remove('on');
  pillDraft.classList.remove('on');
  deleteBtn.style.display = 'none';
  drop.innerHTML = 'Drop image here or click';
  statusDiv.textContent = '';
  document.getElementById('editorTitle').textContent = 'Create post';
  fileInput.value = '';
}

function deletePost() {
  if (!editingPostId) return;
  
  const posts = JSON.parse(localStorage.getItem('posts') || '[]');
  const filtered = posts.filter(p => p.id !== editingPostId);
  localStorage.setItem('posts', JSON.stringify(filtered));
  
  statusDiv.textContent = '✓ Post deleted';
  resetForm();
  renderPosts();
}

function getPostById(id) {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]');
  return posts.find(p => p.id === id);
}

// ============ POST RENDERING ============

function renderPosts() {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]');
  postsContainer.innerHTML = '';

  posts.forEach((post, index) => {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    postEl.draggable = true;
    postEl.dataset.id = post.id;

    postEl.innerHTML = `
      <div class="dragHandle">⋮⋮</div>
      <div class="thumb">
        <img src="${post.image}" alt="${post.title}"/>
      </div>
      <div class="meta">
        <b>${post.title || 'Untitled'}</b>
        <div class="small">
          ${post.category} • ${new Date(post.createdAt).toLocaleDateString()}
          ${post.featured ? '⭐ Featured' : ''}
          ${post.draft ? '📝 Draft' : ''}
          ${post.schedule ? `⏱️ Scheduled for ${new Date(post.schedule).toLocaleString()}` : ''}
        </div>
      </div>
      <div class="actions">
        <button class="btn2" onclick="editPost(${post.id})">Edit</button>
        <button class="btn2 danger" onclick="deletePostById(${post.id})">Delete</button>
      </div>
    `;

    postsContainer.appendChild(postEl);
  });

  updateAnalytics();
}

function editPost(id) {
  const post = getPostById(id);
  if (!post) return;

  editingPostId = id;
  currentImageData = post.image;
  titleInput.value = post.title;
  categorySelect.value = post.category;
  captionTextarea.value = post.caption;
  tagsInput.value = post.tags.join(' ');
  scheduleInput.value = post.schedule || '';
  
  pillFeatured.classList.toggle('on', post.featured);
  pillDraft.classList.toggle('on', post.draft);
  
  drop.innerHTML = `<img src="${post.image}" alt="${post.title}"/>`;
  deleteBtn.style.display = '';
  document.getElementById('editorTitle').textContent = 'Edit post';
  statusDiv.textContent = '';
}

function deletePostById(id) {
  if (confirm('Delete this post?')) {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const filtered = posts.filter(p => p.id !== id);
    localStorage.setItem('posts', JSON.stringify(filtered));
    renderPosts();
  }
}

// ============ FEATURED & DRAFT PILLS ============

pillFeatured.addEventListener('click', () => pillFeatured.classList.toggle('on'));
pillDraft.addEventListener('click', () => pillDraft.classList.toggle('on'));

// ============ ANALYTICS ============

function updateAnalytics() {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]');
  
  const photography = posts.filter(p => p.category === 'Photography').length;
  const art = posts.filter(p => p.category === 'Art').length;
  const featured = posts.filter(p => p.featured).length;
  const drafts = posts.filter(p => p.draft).length;
  const scheduled = posts.filter(p => p.schedule && new Date(p.schedule) > new Date()).length;
  const visible = posts.filter(p => !p.draft && (!p.schedule || new Date(p.schedule) <= new Date())).length;
  
  const allTags = new Set();
  posts.forEach(p => p.tags.forEach(tag => allTags.add(tag.toLowerCase())));

  document.getElementById('statTotal').textContent = posts.length;
  document.getElementById('statPhoto').textContent = photography;
  document.getElementById('statArt').textContent = art;
  document.getElementById('statFeatured').textContent = featured;
  document.getElementById('statDrafts').textContent = drafts;
  document.getElementById('statScheduled').textContent = scheduled;
  document.getElementById('statVisible').textContent = visible;
  document.getElementById('statTagCount').textContent = allTags.size;
}

// ============ EXPORT / IMPORT ============

document.getElementById('exportJson').addEventListener('click', () => {
  const posts = localStorage.getItem('posts') || '[]';
  const blob = new Blob([posts], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `posts-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importJson').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data)) {
        localStorage.setItem('posts', JSON.stringify(data));
        renderPosts();
        statusDiv.textContent = '✓ Posts imported';
        setTimeout(() => statusDiv.textContent = '', 3000);
      }
    } catch (err) {
      statusDiv.textContent = '❌ Invalid JSON file';
    }
  };
  reader.readAsText(file);
});

document.getElementById('clearAllPosts').addEventListener('click', () => {
  if (confirm('Delete ALL posts? This cannot be undone.')) {
    localStorage.clear();
    renderPosts();
    resetForm();
    statusDiv.textContent = '✓ All posts cleared';
  }
});

// ============ DRAG AND DROP REORDERING ============

let draggedElement = null;

postsContainer.addEventListener('dragstart', (e) => {
  if (e.target.closest('.post')) {
    draggedElement = e.target.closest('.post');
    draggedElement.classList.add('dragging');
  }
});

postsContainer.addEventListener('dragend', () => {
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
  }
});

postsContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  const post = e.target.closest('.post');
  if (post && post !== draggedElement) {
    const rect = post.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (e.clientY < midpoint) {
      post.parentNode.insertBefore(draggedElement, post);
    } else {
      post.parentNode.insertBefore(draggedElement, post.nextSibling);
    }
    savePosts();
  }
});

function savePosts() {
  const posts = Array.from(postsContainer.querySelectorAll('[data-id]')).map(el => {
    const id = parseInt(el.dataset.id);
    return getPostById(id);
  });
  localStorage.setItem('posts', JSON.stringify(posts));
}

// ============ AUTHENTICATION ============

const loginSection = document.getElementById('login');
const appSection = document.getElementById('app');
const gateSection = document.getElementById('gate');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const pwInput = document.getElementById('pw');

const PASSWORD = 'your-password-here'; // Change this to your password

loginBtn.addEventListener('click', () => {
  if (pwInput.value === PASSWORD) {
    sessionStorage.setItem('loggedIn', 'true');
    loginSection.style.display = 'none';
    appSection.style.display = '';
    renderPosts();
  } else {
    alert('❌ Incorrect password');
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('loggedIn');
  loginSection.style.display = '';
  appSection.style.display = 'none';
  resetForm();
});

// Check if logged in
if (sessionStorage.getItem('loggedIn') === 'true') {
  loginSection.style.display = 'none';
  appSection.style.display = '';
  renderPosts();
} else {
  loginSection.style.display = '';
  appSection.style.display = 'none';
}

// Initial render
renderPosts();
