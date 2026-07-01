// ========== Nawwa Chat: المحادثات ==========
let chats = [];
let currentChatId = null;

function loadChatsForUser() {
  const all = getStore(STORE_KEYS.CHATS, []);
  chats = currentUser ? all.filter(c => (c.members || []).includes(currentUser.id)) : [];
  // ترتيب حسب آخر رسالة
  chats.sort((a, b) => lastTime(b) - lastTime(a));
}

function lastTime(c) {
  const m = c.messages && c.messages.length ? c.messages[c.messages.length - 1] : null;
  return m ? new Date(m.sentAt).getTime() : new Date(c.createdAt || 0).getTime();
}

// الطرف الآخر في محادثة ثنائية
function otherMemberIndex(c) {
  return (c.members || []).findIndex(id => id !== currentUser.id);
}
function chatDisplayName(c) {
  const idx = otherMemberIndex(c);
  if (c.memberNames && idx >= 0 && c.memberNames[idx]) return c.memberNames[idx];
  // احتياطيًا من دليل المستخدمين
  const otherId = (c.members || [])[idx];
  const u = getStore(STORE_KEYS.USERS, []).find(x => x.id === otherId);
  return (u && u.name) || c.title || 'محادثة';
}
function chatSubtitle(c) {
  const idx = otherMemberIndex(c);
  const otherId = (c.members || [])[idx];
  const u = getStore(STORE_KEYS.USERS, []).find(x => x.id === otherId);
  return (u && u.email) || '';
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}
function dayLabel(iso) {
  const d = new Date(iso); const now = new Date();
  const strip = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (strip(now) - strip(d)) / 86400000;
  if (diff === 0) return 'اليوم';
  if (diff === 1) return 'أمس';
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
}

function renderChatList() {
  loadChatsForUser();
  const list = $('chat-list-cont');
  if (!list) return;
  const q = ($('conv-search') ? $('conv-search').value.trim().toLowerCase() : '');
  const shown = chats.filter(c => !q || chatDisplayName(c).toLowerCase().includes(q));

  list.innerHTML = '';
  if (!shown.length) {
    list.innerHTML = `<div class="empty-state">${q ? 'لا نتائج' : 'لا توجد محادثات بعد — أضف جهة اتصال للبدء'}</div>`;
    return;
  }
  shown.forEach(c => {
    const name = chatDisplayName(c);
    const msgs = c.messages || [];
    const last = msgs.length ? msgs[msgs.length - 1] : null;
    const lastTxt = last ? (last.senderId === currentUser.id ? 'أنت: ' + last.text : last.text) : 'ابدأ المحادثة';
    const item = document.createElement('div');
    item.className = 'chat-item' + (c.id === currentChatId ? ' active' : '');
    item.innerHTML = `
      <div class="av" style="background:${colorFor(name)}">${esc(name.charAt(0).toUpperCase())}</div>
      <div class="meta">
        <div class="row1">
          <span class="nm">${esc(name)}</span>
          <span class="tm">${last ? fmtTime(last.sentAt) : ''}</span>
        </div>
        <div class="last">${esc(lastTxt)}</div>
      </div>`;
    item.onclick = () => openChat(c.id);
    list.appendChild(item);
  });
}

function openChat(chatId) {
  currentChatId = chatId;
  loadChatsForUser();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;
  const name = chatDisplayName(chat);

  setText('win-name', name);
  const av = $('win-av');
  av.textContent = name.charAt(0).toUpperCase();
  av.style.background = colorFor(name);

  $('chat-empty').style.display = 'none';
  $('chat-window').style.display = 'flex';

  // الجوال: أظهر لوحة المحادثة وأخفِ القائمة
  $('conv-panel').classList.add('hidden-mobile');
  $('chat-panel').classList.remove('hidden-mobile');

  renderChatMessages(chat);
  updateChatPresence();
  markRead(chat.id);
  renderChatList();
  setTimeout(() => $('chat-inp') && $('chat-inp').focus(), 50);
}

function closeChatWin() {
  currentChatId = null;
  $('chat-window').style.display = 'none';
  $('chat-empty').style.display = 'flex';
  $('conv-panel').classList.remove('hidden-mobile');
  $('chat-panel').classList.add('hidden-mobile');
  renderChatList();
}

function toMs(v) { if (!v) return 0; return typeof v === 'number' ? v : (Date.parse(v) || 0); }

function isOtherTyping(chat) {
  const idx = otherMemberIndex(chat);
  const otherId = (chat.members || [])[idx];
  const ts = chat.typing ? toMs(chat.typing[otherId]) : 0;
  return ts > 0 && (Date.now() - ts) < 4000;
}

function renderChatMessages(chat) {
  const box = $('chat-msgs');
  if (!box) return;
  const msgs = chat.messages || [];
  const idx = otherMemberIndex(chat);
  const otherId = (chat.members || [])[idx];
  const otherRead = chat.reads ? toMs(chat.reads[otherId]) : 0;
  let lastMineIdx = -1;
  msgs.forEach((m, i) => { if (m.senderId === currentUser.id) lastMineIdx = i; });

  box.innerHTML = '';
  let lastDay = '';
  msgs.forEach((m, i) => {
    const dl = dayLabel(m.sentAt);
    if (dl !== lastDay) {
      lastDay = dl;
      const sep = document.createElement('div');
      sep.className = 'day-sep';
      sep.textContent = dl;
      box.appendChild(sep);
    }
    const mine = m.senderId === currentUser.id;
    const b = document.createElement('div');
    b.className = 'msg ' + (mine ? 'mine' : 'them');
    let rc = '';
    if (mine && i === lastMineIdx) {
      const seen = otherRead >= new Date(m.sentAt).getTime();
      rc = `<span class="rc ${seen ? 'seen' : ''}">${seen ? '✓✓ تم المشاهدة' : '✓ تم الإرسال'}</span>`;
    }
    b.innerHTML = `${esc(m.text)}<span class="t">${fmtTime(m.sentAt)}${rc}</span>`;
    box.appendChild(b);
  });

  if (isOtherTyping(chat)) {
    const tb = document.createElement('div');
    tb.className = 'typing-bubble';
    tb.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(tb);
  }
  box.scrollTop = box.scrollHeight;

  // علِّم كمقروء عند وصول رسالة جديدة والمحادثة مفتوحة
  if (chat.id === currentChatId) markRead(chat.id);
}

async function sendMsg() {
  const input = $('chat-inp');
  const text = input.value.trim();
  if (!text || !currentChatId) return;
  const chatId = currentChatId;
  input.value = '';
  clearTyping(chatId);
  const msg = { senderId: currentUser.id, text, sentAt: new Date().toISOString() };
  try {
    await pushMessageDoc(chatId, msg); // العرض يتحدّث لحظيًا عبر onSnapshot
  } catch (e) {
    console.error(e);
    showToast('تعذّر إرسال الرسالة');
  }
}

// ---------- الحضور / الكتابة / القراءة ----------
function updateChatPresence() {
  if (!currentChatId) return;
  const chat = getStore(STORE_KEYS.CHATS, []).find(c => c.id === currentChatId);
  const sub = $('win-sub');
  if (!chat || !sub) return;
  sub.classList.remove('online', 'offline', 'typing');

  if (isOtherTyping(chat)) { sub.textContent = 'يكتب…'; sub.classList.add('typing'); return; }

  const idx = otherMemberIndex(chat);
  const otherId = (chat.members || [])[idx];
  const u = getStore(STORE_KEYS.USERS, []).find(x => x.id === otherId);
  const la = u ? toMs(u.lastActive) : 0;
  if (la && (Date.now() - la) < 45000) { sub.textContent = 'متصل'; sub.classList.add('online'); }
  else if (la) { sub.textContent = 'آخر ظهور ' + fmtTime(new Date(la).toISOString()); sub.classList.add('offline'); }
  else { sub.textContent = chatSubtitle(chat); sub.classList.add('offline'); }
}

let _typingLastWrite = 0, _typingClearT = null;
function onTyping() {
  if (!currentChatId) return;
  const now = Date.now();
  if (now - _typingLastWrite > 2000) {
    _typingLastWrite = now;
    updateChatDoc(currentChatId, { ['typing.' + currentUser.id]: now }).catch(() => {});
  }
  if (_typingClearT) clearTimeout(_typingClearT);
  _typingClearT = setTimeout(() => clearTyping(currentChatId), 3500);
}
function clearTyping(chatId) {
  if (_typingClearT) { clearTimeout(_typingClearT); _typingClearT = null; }
  _typingLastWrite = 0;
  if (chatId) updateChatDoc(chatId, { ['typing.' + currentUser.id]: 0 }).catch(() => {});
}

function markRead(chatId) {
  const chat = getStore(STORE_KEYS.CHATS, []).find(c => c.id === chatId);
  if (!chat) return;
  const msgs = chat.messages || [];
  const last = msgs.length ? msgs[msgs.length - 1] : null;
  if (!last || last.senderId === currentUser.id) return;      // لا شيء جديد من الطرف الآخر
  const myRead = chat.reads ? toMs(chat.reads[currentUser.id]) : 0;
  if (myRead >= new Date(last.sentAt).getTime()) return;      // مقروءة أصلًا (يمنع حلقة الكتابة)
  updateChatDoc(chatId, { ['reads.' + currentUser.id]: Date.now() }).catch(() => {});
}

// نبض الحضور
function startPresence() {
  const beat = () => { if (currentUser) updateUserDoc(currentUser.id, { lastActive: Date.now() }).catch(() => {}); };
  beat();
  if (window._presenceTimer) clearInterval(window._presenceTimer);
  window._presenceTimer = setInterval(beat, 25000);
  if (window._presenceUiTimer) clearInterval(window._presenceUiTimer);
  window._presenceUiTimer = setInterval(updateChatPresence, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
}

function cacheChat(chat) {
  const arr = getStore(STORE_KEYS.CHATS, []);
  if (!arr.some(c => c.id === chat.id)) arr.push(chat);
}

async function createChat() {
  const email = $('nc-email').value.trim().toLowerCase();
  if (!email) return showToast('أدخل بريد الشخص');
  const other = getStore(STORE_KEYS.USERS, []).find(u => (u.email || '').toLowerCase() === email);
  if (!other) return showToast('لا يوجد مستخدم بهذا البريد');
  if (other.id === currentUser.id) return showToast('لا يمكنك مراسلة نفسك');

  let existing = getStore(STORE_KEYS.CHATS, []).find(c =>
    (c.members || []).includes(currentUser.id) && c.members.includes(other.id) && c.members.length === 2
  );
  if (!existing) {
    existing = {
      id: uid('chat'),
      members: [currentUser.id, other.id],
      memberNames: [currentUser.name, other.name],
      title: other.name,
      messages: [],
      createdAt: new Date().toISOString()
    };
    try { await saveChatDoc(existing); } catch (e) { console.error(e); return showToast('تعذّر إنشاء المحادثة'); }
    cacheChat(existing);
  }
  $('nc-email').value = '';
  closeModalById('mo-chat');
  openChat(existing.id);
}
