// ========== Nawwa Chat: الملاحظات (لوحة عائمة + تلخيص HTML) ==========
function noteId(chatId) { return currentUser.id + '__' + chatId; }

let _notesDragInit = false;

async function openNotes() {
  if (!currentChatId) return showToast('افتح محادثة أولًا');
  const chat = chats.find(c => c.id === currentChatId);
  setText('notes-sub', chat ? ('ملاحظات: ' + chatDisplayName(chat)) : 'ملاحظات');
  setText('notes-saved', '');

  const panel = $('notes-panel');
  panel.classList.remove('hidden', 'min');
  initNotesDrag();

  $('notes-text').value = 'جارٍ التحميل…';
  $('notes-text').disabled = true;
  const data = await getNoteDoc(noteId(currentChatId));
  $('notes-text').disabled = false;
  $('notes-text').value = (data && data.text) || '';
  $('notes-text').focus();
}

function closeNotes() { $('notes-panel').classList.add('hidden'); }
function minimizeNotes() { $('notes-panel').classList.toggle('min'); }
function maximizeNotes() { $('notes-panel').classList.remove('min'); $('notes-panel').classList.toggle('max'); }

async function saveNotes() {
  if (!currentChatId) return;
  const text = $('notes-text').value;
  try {
    await saveNoteDoc(noteId(currentChatId), {
      text, ownerId: currentUser.id, chatId: currentChatId, updatedAt: new Date().toISOString()
    });
    setText('notes-saved', '✓ تم الحفظ');
    setTimeout(() => setText('notes-saved', ''), 2500);
  } catch (e) { console.error(e); showToast('تعذّر حفظ الملاحظات'); }
}

// ---------- السحب ----------
function initNotesDrag() {
  if (_notesDragInit) return;
  _notesDragInit = true;
  const panel = $('notes-panel');
  const handle = $('notes-head');
  let drag = false, sx = 0, sy = 0, ox = 0, oy = 0;

  handle.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;   // لا تسحب عند الضغط على أزرار الرأس
    drag = true;
    handle.setPointerCapture(e.pointerId);
    panel.classList.remove('max');
    const r = panel.getBoundingClientRect();
    panel.style.left = r.left + 'px'; panel.style.top = r.top + 'px';
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
  });
  handle.addEventListener('pointermove', e => {
    if (!drag) return;
    let nx = ox + (e.clientX - sx), ny = oy + (e.clientY - sy);
    nx = Math.max(0, Math.min(nx, window.innerWidth - 60));
    ny = Math.max(0, Math.min(ny, window.innerHeight - 40));
    panel.style.left = nx + 'px'; panel.style.top = ny + 'px';
  });
  const stop = () => { drag = false; };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}

// ---------- التلخيص → صفحة HTML منسّقة ----------
function formatNotesToHtml(text) {
  const lines = String(text || '').split(/\r?\n/);
  let html = '', inList = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) { closeList(); return; }
    if (/^#{1,3}\s+/.test(line)) { closeList(); html += '<h2>' + esc(line.replace(/^#{1,3}\s+/, '')) + '</h2>'; return; }
    if (/^[-*•]\s+/.test(line)) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + esc(line.replace(/^[-*•]\s+/, '')) + '</li>'; return; }
    if (/[:：]\s*$/.test(line)) { closeList(); html += '<h3>' + esc(line) + '</h3>'; return; }
    closeList(); html += '<p>' + esc(line) + '</p>';
  });
  closeList();
  return html || '<p class="empty">لا توجد ملاحظات مكتوبة.</p>';
}

function summarizeNotes() {
  const text = $('notes-text').value.trim();
  const chat = chats.find(c => c.id === currentChatId);
  const name = chat ? chatDisplayName(chat) : '';
  const dateStr = new Date().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' });
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const body = formatNotesToHtml(text);

  const doc = `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>تلخيص الملاحظات — ${esc(name)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'IBM Plex Sans Arabic',sans-serif;background:#0e1013;color:#1a1a1a;padding:30px}
  .sheet{max-width:820px;margin:0 auto;background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden}
  .hd{background:linear-gradient(160deg,#12141a,#1c2028);color:#fff;padding:34px 40px}
  .hd .tag{display:inline-block;font-size:12px;background:rgba(36,209,107,.2);color:#24d16b;padding:5px 12px;border-radius:999px;font-weight:700;margin-bottom:12px}
  .hd h1{font-size:26px;font-weight:700}
  .hd .meta{margin-top:10px;font-size:13px;color:rgba(255,255,255,.6);display:flex;gap:18px;flex-wrap:wrap}
  .bd{padding:34px 40px;line-height:1.9}
  .bd h2{font-size:20px;margin:22px 0 10px;color:#12141a;border-right:4px solid #24d16b;padding-right:12px}
  .bd h3{font-size:16px;margin:18px 0 8px;color:#2b6b45}
  .bd p{margin:10px 0;color:#333;font-size:15px}
  .bd ul{margin:10px 30px 10px 0}
  .bd li{margin:7px 0;font-size:15px;color:#333}
  .bd .empty{color:#999;font-style:italic}
  .ft{padding:20px 40px;border-top:1px solid #eee;font-size:12px;color:#999;display:flex;justify-content:space-between;align-items:center}
  .pbtn{background:#24d16b;color:#05230f;border:none;padding:10px 20px;border-radius:999px;font-family:inherit;font-weight:700;cursor:pointer}
  @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border-radius:0}.pbtn{display:none}}
</style></head>
<body>
  <div class="sheet">
    <div class="hd">
      <span class="tag">تلخيص الملاحظات</span>
      <h1>${esc(name || 'ملاحظات المحادثة')}</h1>
      <div class="meta"><span>📅 ${esc(dateStr)}</span><span>📝 ${words} كلمة</span></div>
    </div>
    <div class="bd">${body}</div>
    <div class="ft"><span>Nawwa Chat</span><button class="pbtn" onclick="window.print()">طباعة / حفظ PDF</button></div>
  </div>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return showToast('اسمح بالنوافذ المنبثقة لعرض التلخيص');
  w.document.open(); w.document.write(doc); w.document.close();
}
