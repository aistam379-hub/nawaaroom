// ========== Nawwa Room: دوال الواجهة العامة ==========

let currentPage = 'rooms';
let currentCalendarDate = new Date();
const COLORS = ['#2d5be3','#e85d26','#2db87a','#f0a500','#8b5cf6','#ec4899','#06b6d4'];
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAYS_SHORT = ['أح','إث','ثل','أر','خم','جم','سب'];

function $(id) { return document.getElementById(id); }

// تهريب النصوص قبل حقنها عبر innerHTML (حماية من XSS)
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function openModal(id) {
  if (id === 'mo-ename' && currentUser) {
    $('en-name').value = currentUser.name || '';
  }
  if (id === 'mo-euser' && currentUser) {
    $('eu-email').value = currentUser.email || '';
  }
  $(id).classList.add('open');
}
function closeModal(event, id) {
  if (event.target === $(id)) closeModalById(id);
}
function closeModalById(id) {
  $(id).classList.remove('open');
}

function setPage(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('page-' + page).classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = $('nav-' + page);
  if (navBtn) navBtn.classList.add('active');

  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  const order = ['rooms','tasks','chat','settings'];
  const idx = order.indexOf(page);
  const sbItems = document.querySelectorAll('.sb-item');
  if (idx >= 0 && sbItems[idx]) sbItems[idx].classList.add('active');
}

function openAddModal() {
  if (currentPage === 'tasks') openModal('mo-task');
  else if (currentPage === 'chat') openModal('mo-chat');
  else if (isTeacher()) openModal('mo-room');
  else showToast('الطلاب لا يمكنهم إنشاء غرف');
}

// ضبط نص عنصر بأمان (لا يتحطّم إن كان العنصر غير موجود)
function setText(id, val) {
  const el = $(id);
  if (el) el.textContent = val;
}

function updateUI() {
  if (!currentUser) return;
  const name = currentUser.name || currentUser.email || 'مستخدم';
  const role = currentUser.role || '—';
  const ini = name.charAt(0);

  ['sb-av', 'tb-av', 'prof-av-inner'].forEach(id => setText(id, ini));

  setText('sb-name', name);
  setText('sb-role', role);
  setText('prof-name-d', name);
  setText('prof-role-d', role);
  setText('prof-badge-txt', role === 'استاذ' ? 'أستاذ بمنصة Nawwa Room' : 'طالب بمنصة Nawwa Room');
  setText('set-name-prev', name + (role ? ' • ' + role : ''));
  setText('set-email-prev', currentUser.email);
  setText('rooms-greet', 'مرحباً، ' + name + '!');

  // إظهار/إخفاء عناصر خاصة بالأستاذ فقط
  document.querySelectorAll('.teacher-only').forEach(el => {
    el.style.display = isTeacher() ? '' : 'none';
  });
  document.querySelectorAll('.student-only').forEach(el => {
    el.style.display = isTeacher() ? 'none' : '';
  });
}

function tickClock() {
  const now = new Date();
  $('clock').textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  $('date-lbl').textContent = dayNames[now.getDay()] + '، ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
}

function buildCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startOffset = firstDay.getDay();

  const days = [];
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({ day: prevMonthLastDay - i, month: month - 1, year, other: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, month, year, other: false });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, month: month + 1, year, other: true });
  }

  $('current-month').textContent = MONTHS[month] + ' ' + year;

  const strip = $('cal-strip');
  strip.innerHTML = '';
  const today = new Date();
  days.forEach(d => {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'cal-day';
    if (d.other) dayDiv.classList.add('other-month');
    const isToday = (!d.other && d.day === today.getDate() && d.month === today.getMonth() && d.year === today.getFullYear());
    if (isToday) dayDiv.classList.add('today');
    dayDiv.innerHTML = `<span class="cdn">${DAYS_SHORT[new Date(d.year, d.month, d.day).getDay()]}</span>
                        <span class="cdd">${d.day}</span>`;
    dayDiv.onclick = () => {
      showToast(`تم اختيار ${d.day} ${MONTHS[d.month]} ${d.year}`);
    };
    strip.appendChild(dayDiv);
  });
}

function changeMonth(delta) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
  buildCalendar(currentCalendarDate);
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
  const color = ['#ef4444','#ef4444','#f0a500','#2db87a','#2db87a'][strength];
  el.style.width = width + '%';
  el.style.background = color;
}

function initApp() {
  updateUI();
  renderAll();
  tickClock();
  buildCalendar(currentCalendarDate);
  setInterval(tickClock, 30000);
}

function renderAll() {
  renderRooms();
  renderTodayTasks();
  renderAllTasks();
  renderChatList();
  updateTaskRoomSelect();
}
