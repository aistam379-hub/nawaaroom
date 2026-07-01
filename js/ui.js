// ========== Nawwa Chat: دوال الواجهة العامة ==========
const COLORS = ['#2d5be3','#e85d26','#2db87a','#f0a500','#8b5cf6','#ec4899','#06b6d4','#f43f5e'];

function $(id) { return document.getElementById(id); }

// تهريب النصوص قبل حقنها عبر innerHTML (حماية من XSS)
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// لون ثابت لكل اسم/معرّف
function colorFor(key) {
  let h = 0;
  const s = String(key || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function openModal(id) {
  if (id === 'mo-ename' && currentUser) $('en-name').value = currentUser.name || '';
  if (id === 'mo-euser' && currentUser) $('eu-email').value = currentUser.email || '';
  $(id).classList.add('open');
}
function closeModal(event, id) { if (event.target === $(id)) closeModalById(id); }
function closeModalById(id) { $(id).classList.remove('open'); }

function openSettings() {
  updateUI();
  openModal('mo-settings');
}

// ضبط نص عنصر بأمان
function setText(id, val) { const el = $(id); if (el) el.textContent = val; }

function updateUI() {
  if (!currentUser) return;
  const name = currentUser.name || currentUser.email || 'مستخدم';
  const ini = (name.charAt(0) || '؟').toUpperCase();

  setText('sb-av', ini);
  setText('sb-name', name);
  setText('sb-mail', currentUser.email || '');
  setText('set-name-prev', name);
  setText('set-email-prev', currentUser.email || '');
}

function checkStrength(val, targetId) {
  const el = $(targetId);
  if (!el) return;
  let strength = 0;
  if (val.length >= 8) strength++;
  if (/[A-Z]/.test(val)) strength++;
  if (/[0-9]/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;
  const width = [0, 25, 50, 75, 100][strength];
  const color = ['#ff6b6b','#ff6b6b','#f0a500','#35d07f','#35d07f'][strength];
  el.style.width = width + '%';
  el.style.background = color;
}

function initApp() {
  updateUI();
  renderChatList();
  startPresence();
  // الحالة الابتدائية: القائمة ظاهرة، نافذة المحادثة مخفية (مهم على الجوال)
  $('conv-panel').classList.remove('hidden-mobile');
  $('chat-panel').classList.add('hidden-mobile');
}
