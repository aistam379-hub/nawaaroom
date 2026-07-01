// ========== Nawwa Room: الشات (تخزين محلي) ==========

let chats = [];
let currentChatId = null;

function loadChatsForUser() {
  const allChats = getStore(STORE_KEYS.CHATS, []);
  if (!currentUser) { chats = []; return; }
  chats = allChats.filter(c => (c.members || []).includes(currentUser.id));
}

function chatDisplayName(c) {
  if (!c.memberNames) return c.title || 'محادثة';
  const otherIdx = c.members.findIndex(id => id !== currentUser.id);
  return otherIdx >= 0 ? c.memberNames[otherIdx] : (c.title || 'محادثة');
}

function renderChatList() {
  loadChatsForUser();
  const list = $('chat-list-cont');
  if (!list) return;
  list.innerHTML = '';
  if (!chats.length) {
    list.innerHTML = `<div class="empty-state"><p>لا توجد محادثات بعد</p></div>`;
    return;
  }
  chats.forEach((c, idx) => {
    const name = chatDisplayName(c);
    const lastMsg = c.messages && c.messages.length ? c.messages[c.messages.length - 1].text : 'لا توجد رسائل بعد';
    const item = document.createElement('div');
    item.className = 'chat-item' + (c.id === currentChatId ? ' active' : '');
    item.innerHTML = `
      <div class="chat-av" style="background:${COLORS[idx % COLORS.length]};width:42px;height:42px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${name.charAt(0)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600">${esc(name)}</div>
        <div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(lastMsg)}</div>
      </div>
    `;
    item.style.cssText += 'display:flex;align-items:center;gap:10px;padding:12px;cursor:pointer;border-radius:12px';
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
  $('win-name').textContent = name;
  $('win-av').textContent = name.charAt(0);
  $('win-av').style.background = COLORS[0];
  $('chat-list-view').style.display = 'none';
  $('chat-win-view').style.display = 'flex';
  renderChatMessages(chat);
}

function closeChatWin() {
  $('chat-win-view').style.display = 'none';
  $('chat-list-view').style.display = 'block';
  currentChatId = null;
  renderChatList();
}

function renderChatMessages(chat) {
  const box = $('chat-msgs');
  if (!box) return;
  box.innerHTML = '';
  (chat.messages || []).forEach(m => {
    const mine = m.senderId === currentUser.id;
    const bubble = document.createElement('div');
    bubble.style.cssText = `max-width:75%;padding:9px 13px;border-radius:14px;margin-bottom:8px;font-size:14px;align-self:${mine ? 'flex-end' : 'flex-start'};background:${mine ? 'var(--accent)' : 'var(--surface2)'};color:${mine ? '#fff' : 'var(--text-primary)'};`;
    bubble.textContent = m.text;
    box.appendChild(bubble);
  });
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.scrollTop = box.scrollHeight;
}

async function sendMsg() {
  const input = $('chat-inp');
  const text = input.value.trim();
  if (!text || !currentChatId) return;
  const chatId = currentChatId;
  input.value = '';
  const msg = { senderId: currentUser.id, text, sentAt: new Date().toISOString() };
  try {
    await pushMessageDoc(chatId, msg); // العرض يتحدّث لحظيًا عبر onSnapshot
  } catch (e) {
    console.error(e);
    showToast('تعذّر إرسال الرسالة');
  }
}

// إدراج محادثة في الذاكرة تفاؤليًا حتى يصل تحديث onSnapshot
function cacheChat(chat) {
  const arr = getStore(STORE_KEYS.CHATS, []);
  if (!arr.some(c => c.id === chat.id)) arr.push(chat);
}

async function createChat() {
  const email = $('nc-email').value.trim();
  if (!email) return showToast('أدخل بريد المستخدم');
  const users = getStore(STORE_KEYS.USERS, []);
  const other = users.find(u => u.email === email);
  if (!other) return showToast('لا يوجد مستخدم بهذا البريد');
  if (other.id === currentUser.id) return showToast('لا يمكنك مراسلة نفسك');

  const allChats = getStore(STORE_KEYS.CHATS, []);
  let existing = allChats.find(c =>
    c.members.includes(currentUser.id) && c.members.includes(other.id) && c.members.length === 2
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
  setPage('chat');
  openChat(existing.id);
}

async function openRoomChat(room) {
  if (isTeacher()) {
    setPage('chat');
    showToast('اختر طالبًا من قائمة المحادثات لمراسلته');
    return;
  }
  const users = getStore(STORE_KEYS.USERS, []);
  const teacher = users.find(u => u.id === room.teacherId);
  if (!teacher) return showToast('تعذر العثور على الأستاذ');
  const allChats = getStore(STORE_KEYS.CHATS, []);
  let existing = allChats.find(c =>
    c.members.includes(currentUser.id) && c.members.includes(teacher.id) && c.members.length === 2
  );
  if (!existing) {
    existing = {
      id: uid('chat'),
      members: [currentUser.id, teacher.id],
      memberNames: [currentUser.name, teacher.name],
      title: teacher.name,
      roomId: room.id,
      messages: [],
      createdAt: new Date().toISOString()
    };
    try { await saveChatDoc(existing); } catch (e) { console.error(e); return showToast('تعذّر إنشاء المحادثة'); }
    cacheChat(existing);
  }
  setPage('chat');
  openChat(existing.id);
}
