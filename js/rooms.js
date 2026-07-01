// ========== Nawwa Room: منطق الغرف (أستاذ / طالب) ==========

let rooms = [];               // كل الغرف (تُحمّل من localStorage وتُفلتر حسب المستخدم)
let currentRoomId = null;     // الغرفة المفتوحة حاليًا بصفحة التفاصيل

function loadRoomsForUser() {
  const allRooms = getStore(STORE_KEYS.ROOMS, []);
  if (!currentUser) { rooms = []; return; }
  if (isTeacher()) {
    rooms = allRooms.filter(r => r.teacherId === currentUser.id);
  } else {
    rooms = allRooms.filter(r => (r.students || []).includes(currentUser.id));
  }
}

function saveAllRooms(updatedRoom) {
  return saveRoomDoc(updatedRoom);
}

function deleteRoomFromStore(roomId) {
  return deleteRoomDoc(roomId);
}

// ========== عرض الغرف ==========
function renderRooms() {
  loadRoomsForUser();
  const grid = $('rooms-grid');
  const empty = $('rooms-empty');
  grid.innerHTML = '';

  if (!rooms || rooms.length === 0) {
    empty.style.display = 'flex';
    $('st-rooms').textContent = '0';
    $('st-students').textContent = '0';
    $('st-live').textContent = '0';
    return;
  }
  empty.style.display = 'none';

  rooms.forEach((r, idx) => {
    const studentsCount = (r.students || []).length;
    const card = document.createElement('div');
    card.className = 'project-card';
    card.style.setProperty('--card-accent', r.color || COLORS[idx % COLORS.length]);
    card.innerHTML = `
      <div class="pc-top">
        <div class="pc-icon">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M23 19v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/><circle cx="9" cy="7" r="4"/><path d="M1 19v-2a4 4 0 013-3.87"/><path d="M9 11a4 4 0 014 4v4H1v-4a4 4 0 014-4z"/></svg>
        </div>
        ${isTeacher() ? `<button class="pc-del" onclick="event.stopPropagation(); deleteRoom('${r.id}')">✕</button>` : ''}
      </div>
      <div class="pc-name">${esc(r.name)}</div>
      <div class="prog-row">
        <span style="font-size:13px">✦</span>
        <span class="prog-text">${isTeacher() ? studentsCount + ' طالب مسجل' : 'الأستاذ: ' + esc(r.teacherName || '—')}</span>
      </div>
      <div class="prog-wrap">
        <div class="prog-fill" style="width:100%; background:${r.color}"></div>
      </div>
    `;
    card.onclick = () => openRoomDetail(r);
    grid.appendChild(card);
  });

  updateRoomStats();
}

function updateRoomStats() {
  $('st-rooms').textContent = rooms.length;
  const totalStudents = isTeacher()
    ? rooms.reduce((sum, r) => sum + (r.students || []).length, 0)
    : rooms.length;
  $('st-students').textContent = totalStudents;
  $('st-live').textContent = rooms.filter(r => r.live).length;
}

// ========== إنشاء غرفة (أستاذ فقط) ==========
async function addRoom() {
  if (!isTeacher()) return showToast('إنشاء الغرف متاح للأساتذة فقط');
  const name = $('np-name').value.trim();
  if (!name) return showToast('يرجى إدخال اسم الغرفة');
  const desc = $('np-desc').value.trim();
  const scheduledAt = $('np-schedule').value;

  const id = uid('room');
  const newRoom = {
    id,
    name,
    description: desc,
    teacherId: currentUser.id,
    teacherName: currentUser.name,
    students: [],
    color: COLORS[rooms.length % COLORS.length],
    jitsiRoomName: 'nawwa-room-' + id,
    scheduledAt: scheduledAt || null,
    live: false,
    createdAt: new Date().toISOString()
  };

  try {
    await saveAllRooms(newRoom);
    $('np-name').value = '';
    $('np-desc').value = '';
    $('np-schedule').value = '';
    closeModalById('mo-room');
    showToast('تم إنشاء الغرفة ✓'); // العرض يتحدّث لحظيًا عبر onSnapshot
  } catch (e) {
    console.error(e);
    showToast('تعذّر إنشاء الغرفة');
  }
}

async function deleteRoom(roomId) {
  if (!confirm('هل تريد حذف هذه الغرفة؟')) return;
  try {
    await deleteRoomFromStore(roomId);
    // حذف الواجبات المرتبطة بالغرفة أيضًا
    const relatedTasks = getStore(STORE_KEYS.TASKS, []).filter(t => t.roomId === roomId);
    await Promise.all(relatedTasks.map(t => deleteTaskDoc(t.id)));
    showToast('تم حذف الغرفة');
  } catch (e) {
    console.error(e);
    showToast('تعذّر حذف الغرفة');
  }
}

// ========== تفاصيل الغرفة ==========
function openRoomDetail(room) {
  currentRoomId = room.id;
  $('dt-title').textContent = room.name;
  $('dt-created').textContent = room.createdAt ? new Date(room.createdAt).toLocaleDateString('ar-EG') : '—';
  $('dt-due').textContent = room.scheduledAt ? new Date(room.scheduledAt).toLocaleString('ar-EG') : 'غير مجدولة';
  $('dt-desc').textContent = room.description || 'بدون وصف';

  renderRoomStudents(room);
  renderRoomTasks(room);

  // زر بدء/الانضمام للمكالمة
  const callBtn = $('dt-call-btn');
  callBtn.textContent = isTeacher() ? 'ابدأ الحصة' : 'انضم للحصة';
  callBtn.onclick = () => startJitsiCall(room.jitsiRoomName);

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('page-detail').classList.add('active');
  updateUI();
}

function closeDetail() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('page-rooms').classList.add('active');
  currentRoomId = null;
  $('jitsi-container').innerHTML = '';
}

// ========== إدارة الطلاب داخل الغرفة (أستاذ فقط) ==========
function renderRoomStudents(room) {
  const list = $('room-students-list');
  if (!list) return;
  const students = room.students || [];
  if (!students.length) {
    list.innerHTML = `<div class="empty-state" style="padding:24px 0"><p>لا يوجد طلاب مسجلين بعد</p></div>`;
    return;
  }
  const users = getStore(STORE_KEYS.USERS, []);
  list.innerHTML = '';
  students.forEach(studentId => {
    const u = users.find(usr => usr.id === studentId);
    if (!u) return;
    const row = document.createElement('div');
    row.className = 'file-item';
    row.innerHTML = `
      <div class="file-icon"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/></svg></div>
      <div class="file-info">
        <div class="file-name">${esc(u.name)}</div>
        <div class="file-meta">${esc(u.email)}</div>
      </div>
      <div class="file-actions">
        <button class="file-btn delete" onclick="removeStudentFromRoom('${room.id}', '${studentId}')" title="إزالة">✕</button>
      </div>
    `;
    list.appendChild(row);
  });
}

async function addStudentToRoom() {
  if (!currentRoomId) return showToast('افتح الغرفة أولاً');
  const email = $('add-student-email').value.trim().toLowerCase();
  if (!email) return showToast('أدخل بريد الطالب');

  const users = getStore(STORE_KEYS.USERS, []);
  // مطابقة غير حسّاسة لحالة الأحرف
  const match = users.find(u => (u.email || '').trim().toLowerCase() === email);
  if (!match) return showToast('لا يوجد مستخدم مسجّل بهذا البريد');
  if (match.role !== 'طالب') return showToast('هذا المستخدم مسجّل كأستاذ، وليس طالبًا');
  const student = match;

  const allRooms = getStore(STORE_KEYS.ROOMS, []);
  const room = allRooms.find(r => r.id === currentRoomId);
  if (!room) return;
  const students = room.students || [];
  if (students.includes(student.id)) return showToast('الطالب مسجل بالفعل بهذه الغرفة');

  try {
    await FB.updateDoc(FB.doc(FB.db, 'rooms', room.id), { students: FB.arrayUnion(student.id) });
    $('add-student-email').value = '';
    showToast('تمت إضافة الطالب ✓'); // العرض يتحدّث لحظيًا
  } catch (e) {
    console.error(e);
    showToast('تعذّر إضافة الطالب');
  }
}

async function removeStudentFromRoom(roomId, studentId) {
  try {
    await FB.updateDoc(FB.doc(FB.db, 'rooms', roomId), { students: FB.arrayRemove(studentId) });
    showToast('تمت إزالة الطالب');
  } catch (e) {
    console.error(e);
    showToast('تعذّر إزالة الطالب');
  }
}
