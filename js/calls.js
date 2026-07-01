// ========== Nawwa Chat: المكالمات (رنين + رد/رفض عبر Firestore) ==========
let currentCall = null;      // المكالمة التي أشارك بها (صادرة أو مقبولة)
let incomingShownId = null;  // معرّف المكالمة الواردة المعروضة حاليًا
let joinedCallId = null;     // مكالمة انضممت إليها فعليًا (منعًا للتكرار)
let outTimeout = null;       // مهلة المكالمة الصادرة

// ---------- بدء مكالمة صادرة ----------
async function startCall(type) {
  if (currentCall) return showToast('أنت في مكالمة بالفعل');
  if (!currentChatId) return;
  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;
  const idx = otherMemberIndex(chat);
  const otherId = (chat.members || [])[idx];
  if (!otherId) return showToast('تعذّر تحديد الطرف الآخر');

  const call = {
    id: uid('call'),
    chatId: chat.id,
    room: 'NawwaChat-' + chat.id,
    type: type,                      // 'audio' | 'video'
    from: currentUser.id,
    fromName: currentUser.name,
    to: otherId,
    members: [currentUser.id, otherId],
    status: 'ringing',
    createdAt: new Date().toISOString()
  };
  currentCall = call;
  try { await saveCallDoc(call); } catch (e) { console.error(e); currentCall = null; return showToast('تعذّر بدء المكالمة'); }

  showOutgoingUI(call);
  startRing();
  outTimeout = setTimeout(() => {
    if (currentCall && currentCall.id === call.id && joinedCallId !== call.id) {
      updateCallDoc(call.id, { status: 'missed' }).catch(() => {});
      cleanupCall();
      showToast('لم يُرد على المكالمة');
    }
  }, 35000);
}

// ---------- استقبال تحديثات المكالمات ----------
function onCallsUpdate(calls) {
  _lastCalls = calls || [];
  const now = Date.now();

  // مكالمة واردة ترنّ إليّ
  const incoming = calls.find(c => c.to === currentUser.id && c.status === 'ringing'
    && (now - new Date(c.createdAt).getTime()) < 40000);
  if (incoming && !currentCall) {
    if (incomingShownId !== incoming.id) showIncomingUI(incoming);
  } else if (incomingShownId) {
    // اختفى سبب العرض (أُلغيت/رُدّت)
    const still = calls.find(c => c.id === incomingShownId && c.status === 'ringing');
    if (!still) hideRing();
  }

  // متابعة مكالمتي الحالية
  if (currentCall) {
    const mine = calls.find(c => c.id === currentCall.id);
    if (!mine) return;
    if (mine.status === 'accepted' && joinedCallId !== mine.id) {
      stopRing(); hideRing(); joinCall(mine);
    } else if (mine.status === 'rejected') {
      cleanupCall(); showToast('تم رفض المكالمة');
    } else if ((mine.status === 'ended' || mine.status === 'canceled') && joinedCallId !== mine.id) {
      cleanupCall();
    } else if (mine.status === 'ended' && joinedCallId === mine.id) {
      endCall();
    }
  }
}

// ---------- قبول / رفض ----------
async function acceptCall() {
  if (!incomingShownId) return;
  const call = getIncomingCall();
  if (!call) return hideRing();
  stopRing();
  currentCall = call;
  try { await updateCallDoc(call.id, { status: 'accepted' }); } catch (e) { console.error(e); }
  hideRing();
  if (currentChatId !== call.chatId) openChat(call.chatId);
  joinCall(call);
}

async function rejectCall() {
  const call = getIncomingCall();
  stopRing(); hideRing();
  if (call) { try { await updateCallDoc(call.id, { status: 'rejected' }); } catch (e) {} }
}

async function cancelOutgoing() {
  if (currentCall) { try { await updateCallDoc(currentCall.id, { status: 'canceled' }); } catch (e) {} }
  cleanupCall();
}

// حفظ آخر قائمة مكالمات للوصول السريع
let _lastCalls = [];
function getIncomingCall() { return _lastCalls.find(c => c.id === incomingShownId) || null; }

// ---------- الانضمام للمكالمة ----------
function joinCall(call) {
  joinedCallId = call.id;
  currentCall = call;
  const audioOnly = (call.type === 'audio');
  setText('call-title', audioOnly ? '📞 مكالمة صوتية' : '🎥 مكالمة فيديو');
  $('call-overlay').style.display = 'flex';
  startJitsiCall(call.room, audioOnly);
}

async function endCall() {
  if (currentCall) { try { await updateCallDoc(currentCall.id, { status: 'ended' }); } catch (e) {} }
  endJitsiCall();
  $('call-overlay').style.display = 'none';
  cleanupCall();
}

function cleanupCall() {
  stopRing(); hideRing();
  if (outTimeout) { clearTimeout(outTimeout); outTimeout = null; }
  currentCall = null; joinedCallId = null;
  const co = $('call-overlay'); if (co) co.style.display = 'none';
}

// ---------- واجهة الرنين ----------
function showIncomingUI(call) {
  incomingShownId = call.id;
  const name = call.fromName || 'مكالمة';
  $('ring-av').textContent = (name.charAt(0) || '؟').toUpperCase();
  $('ring-av').style.background = colorFor(name);
  setText('ring-name', name);
  setText('ring-status', 'مكالمة واردة…');
  setText('ring-type', call.type === 'audio' ? '📞 صوتية' : '🎥 فيديو');
  $('ring-actions').innerHTML = `
    <div class="ring-act">
      <button class="ring-btn reject" onclick="rejectCall()" title="رفض">
        <svg viewBox="0 0 24 24" class="ico"><path d="M3 9c6-4 12-4 18 0l-2.5 3-3.5-1.5V7.5a12 12 0 0 0-6 0V10L5.5 12 3 9Z"/><path d="M3 3l18 18"/></svg>
      </button><span class="ring-btn-lbl">رفض</span>
    </div>
    <div class="ring-act">
      <button class="ring-btn accept" onclick="acceptCall()" title="رد">
        <svg viewBox="0 0 24 24" class="ico"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.6 1 1 0 0 1-.25 1Z"/></svg>
      </button><span class="ring-btn-lbl">رد</span>
    </div>`;
  $('ring-overlay').classList.add('show');
  startRing();
}

function showOutgoingUI(call) {
  incomingShownId = null;
  const chat = chats.find(c => c.id === call.chatId);
  const name = chat ? chatDisplayName(chat) : 'مكالمة';
  $('ring-av').textContent = (name.charAt(0) || '؟').toUpperCase();
  $('ring-av').style.background = colorFor(name);
  setText('ring-name', name);
  setText('ring-status', 'جارٍ الاتصال…');
  setText('ring-type', call.type === 'audio' ? '📞 صوتية' : '🎥 فيديو');
  $('ring-actions').innerHTML = `
    <div class="ring-act">
      <button class="ring-btn reject" onclick="cancelOutgoing()" title="إلغاء">
        <svg viewBox="0 0 24 24" class="ico"><path d="M3 9c6-4 12-4 18 0l-2.5 3-3.5-1.5V7.5a12 12 0 0 0-6 0V10L5.5 12 3 9Z"/><path d="M3 3l18 18"/></svg>
      </button><span class="ring-btn-lbl">إلغاء</span>
    </div>`;
  $('ring-overlay').classList.add('show');
}

function hideRing() {
  incomingShownId = null;
  $('ring-overlay').classList.remove('show');
}

// ---------- نغمة الرنين (Web Audio) ----------
let ringCtx = null, ringTimer = null;
function beep() {
  try {
    ringCtx = ringCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (ringCtx.state === 'suspended') ringCtx.resume();
    const o = ringCtx.createOscillator(), g = ringCtx.createGain();
    o.type = 'sine'; o.frequency.value = 500;
    const t = ringCtx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); g.connect(ringCtx.destination);
    o.start(t); o.stop(t + 0.5);
  } catch (e) {}
}
function startRing() { stopRing(); beep(); ringTimer = setInterval(beep, 1500); }
function stopRing() { if (ringTimer) { clearInterval(ringTimer); ringTimer = null; } }
