// ========== Nawwa Room: الواجبات (Assignments) مرتبطة بالغرف ==========

let tasks = [];

function loadTasksForUser() {
  const allTasks = getStore(STORE_KEYS.TASKS, []);
  const allRooms = getStore(STORE_KEYS.ROOMS, []);
  if (!currentUser) { tasks = []; return; }

  const myRoomIds = isTeacher()
    ? allRooms.filter(r => r.teacherId === currentUser.id).map(r => r.id)
    : allRooms.filter(r => (r.students || []).includes(currentUser.id)).map(r => r.id);

  tasks = allTasks.filter(t => myRoomIds.includes(t.roomId));
}

function updateTaskRoomSelect() {
  const select = $('nt-room');
  if (!select) return;
  loadRoomsForUser();
  select.innerHTML = '<option value="">اختر الغرفة</option>';
  rooms.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.name;
    select.appendChild(opt);
  });
}

async function addTask() {
  const roomId = $('nt-room').value;
  const title = $('nt-title').value.trim();
  const due = $('nt-due').value;
  if (!roomId) return showToast('اختر الغرفة أولاً');
  if (!title) return showToast('أدخل عنوان الواجب');

  const newTask = {
    id: uid('task'),
    roomId,
    title,
    description: $('nt-desc') ? $('nt-desc').value.trim() : '',
    dueDate: due || null,
    status: 'pending',
    assignedBy: currentUser.id,
    createdAt: new Date().toISOString()
  };

  try {
    await saveTaskDoc(newTask);
    $('nt-title').value = '';
    $('nt-due').value = '';
    closeModalById('mo-task');
    showToast('تمت إضافة الواجب ✓'); // العرض يتحدّث لحظيًا
  } catch (e) {
    console.error(e);
    showToast('تعذّر إضافة الواجب');
  }
}

async function toggleTaskStatus(taskId) {
  const t = getStore(STORE_KEYS.TASKS, []).find(x => x.id === taskId);
  if (!t) return;
  const status = t.status === 'done' ? 'pending' : 'done';
  try {
    await updateTaskDoc(taskId, { status });
  } catch (e) {
    console.error(e);
    showToast('تعذّر تحديث الحالة');
  }
}

async function deleteTask(taskId) {
  try {
    await deleteTaskDoc(taskId);
    showToast('تم حذف الواجب');
  } catch (e) {
    console.error(e);
    showToast('تعذّر حذف الواجب');
  }
}

function roomNameById(roomId) {
  const allRooms = getStore(STORE_KEYS.ROOMS, []);
  const r = allRooms.find(x => x.id === roomId);
  return r ? r.name : 'غرفة محذوفة';
}

function buildTaskRow(t) {
  const row = document.createElement('div');
  row.className = 'task-item' + (t.status === 'done' ? ' done' : '');
  row.innerHTML = `
    <input type="checkbox" class="task-check" ${t.status === 'done' ? 'checked' : ''} onchange="toggleTaskStatus('${t.id}')">
    <div class="task-info">
      <div class="task-title">${esc(t.title)}</div>
      <div class="task-meta">${esc(roomNameById(t.roomId))} ${t.dueDate ? '• تسليم: ' + new Date(t.dueDate).toLocaleDateString('ar-EG') : ''}</div>
    </div>
    <button class="file-btn delete" onclick="deleteTask('${t.id}')" title="حذف">✕</button>
  `;
  return row;
}

function renderTodayTasks() {
  loadTasksForUser();
  const list = $('today-tasks-list');
  if (!list) return;
  list.innerHTML = '';
  const todayStr = new Date().toDateString();
  const todayTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === todayStr);

  if (!todayTasks.length) {
    list.innerHTML = `<div class="empty-state" style="padding:24px 0"><p>لا يوجد واجبات مستحقة اليوم</p></div>`;
    return;
  }
  todayTasks.forEach(t => list.appendChild(buildTaskRow(t)));
}

function renderAllTasks() {
  loadTasksForUser();
  const list = $('all-tasks-list');
  if (!list) return;
  list.innerHTML = '';

  if (!tasks.length) {
    list.innerHTML = `<div class="empty-state"><p>لا يوجد واجبات بعد</p></div>`;
    return;
  }
  const sorted = [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
    return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
  });
  sorted.forEach(t => list.appendChild(buildTaskRow(t)));
}

// عرض واجبات غرفة محددة داخل صفحة تفاصيل الغرفة (#dt-rows)
function renderRoomTasks(room) {
  const container = $('dt-rows');
  if (!container) return;
  const allTasks = getStore(STORE_KEYS.TASKS, []);
  const roomTasks = allTasks.filter(t => t.roomId === room.id);

  if (!roomTasks.length) {
    container.innerHTML = `<div class="empty-state" style="padding:20px 0"><p>لا توجد واجبات لهذه الغرفة بعد</p></div>`;
    return;
  }

  container.innerHTML = '';
  roomTasks.forEach((t, idx) => {
    const row = document.createElement('div');
    row.className = 'task-table-row';
    row.innerHTML = `
      <span>${idx + 1}</span>
      <span>${esc(t.title)}</span>
      <span>
        <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer">
          <input type="checkbox" ${t.status === 'done' ? 'checked' : ''} onchange="toggleTaskStatus('${t.id}')">
          ${t.status === 'done' ? 'تم' : 'قيد الإنجاز'}
        </label>
      </span>
    `;
    container.appendChild(row);
  });
}
