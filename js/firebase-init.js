// ========== Nawwa Room: تهيئة Firebase (Auth + Firestore) ==========
// هذه الوحدة (module) هي جسر بين Firebase و باقي ملفات السكربت الكلاسيكية.
// تُنشئ مستمعات لحظية (onSnapshot) تملأ window._cache، فتبقى دوال العرض تعمل كما هي.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, updateProfile, updateEmail, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxA-GWRWfg_py_o-nZC1pGQQbdag-5Nsg",
  authDomain: "nawaa-room.firebaseapp.com",
  projectId: "nawaa-room",
  storageBucket: "nawaa-room.firebasestorage.app",
  messagingSenderId: "516516876892",
  appId: "1:516516876892:web:323a1f0829201439e94c99"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// كشف واجهة Firebase للسكربتات الكلاسيكية
window.FB = {
  auth, db, collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, arrayUnion, arrayRemove,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential
};

// ذاكرة محلية تُحدّث لحظيًا من Firestore (تحل محل localStorage للقراءة)
window._cache = { nawwa_users: [], nawwa_rooms: [], nawwa_tasks: [], nawwa_chats: [] };

// ========== دوال الكتابة (تُستدعى من السكربتات الكلاسيكية) ==========
window.saveRoomDoc    = (room)    => setDoc(doc(db, 'rooms', room.id), room);
window.deleteRoomDoc  = (id)      => deleteDoc(doc(db, 'rooms', id));
window.saveTaskDoc    = (t)       => setDoc(doc(db, 'tasks', t.id), t);
window.updateTaskDoc  = (id, d)   => updateDoc(doc(db, 'tasks', id), d);
window.deleteTaskDoc  = (id)      => deleteDoc(doc(db, 'tasks', id));
window.saveChatDoc    = (c)       => setDoc(doc(db, 'chats', c.id), c);
window.pushMessageDoc = (id, msg) => updateDoc(doc(db, 'chats', id), { messages: arrayUnion(msg) });
window.updateUserDoc  = (id, d)   => updateDoc(doc(db, 'users', id), d);

// ========== المستمعات اللحظية ==========
let unsubscribers = [];
function clearListeners() { unsubscribers.forEach(u => u()); unsubscribers = []; }

function safe(fn) { if (typeof window[fn] === 'function') { try { window[fn](...Array.prototype.slice.call(arguments, 1)); } catch (e) { console.warn(fn, e); } } }

function refreshOpenRoom() {
  // currentRoomId متغيّر عام (let) معرّف في rooms.js — تقرأه الوحدة بالاسم المجرّد
  const rid = (typeof currentRoomId !== 'undefined') ? currentRoomId : null;
  if (rid) {
    const r = window._cache.nawwa_rooms.find(x => x.id === rid);
    if (r) safe('openRoomDetail', r);
  }
}

function startListeners(uid) {
  clearListeners();

  unsubscribers.push(onSnapshot(collection(db, 'users'), snap => {
    window._cache.nawwa_users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (window.currentUser) {
      // مزامنة الدور/الاسم من ملف المستخدم الحقيقي (يحل تسابق التسجيل)
      const me = window._cache.nawwa_users.find(u => u.id === window.currentUser.id);
      if (me) {
        const changed = window.currentUser.role !== me.role || window.currentUser.name !== me.name;
        window.currentUser.name = me.name;
        window.currentUser.role = me.role;
        safe('updateUI');
        if (changed) safe('renderAll');
      } else {
        safe('updateUI');
      }
    }
  }));

  unsubscribers.push(onSnapshot(collection(db, 'rooms'), snap => {
    window._cache.nawwa_rooms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    safe('renderRooms');
    safe('updateTaskRoomSelect');
    safe('renderTodayTasks');
    safe('renderAllTasks');
    refreshOpenRoom();
  }));

  unsubscribers.push(onSnapshot(collection(db, 'tasks'), snap => {
    window._cache.nawwa_tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    safe('renderTodayTasks');
    safe('renderAllTasks');
    refreshOpenRoom();
  }));

  unsubscribers.push(onSnapshot(query(collection(db, 'chats'), where('members', 'array-contains', uid)), snap => {
    window._cache.nawwa_chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    safe('renderChatList');
    const cid = (typeof currentChatId !== 'undefined') ? currentChatId : null;
    if (cid) {
      const c = window._cache.nawwa_chats.find(x => x.id === cid);
      if (c) safe('renderChatMessages', c);
    }
  }));
}

// ========== متابعة حالة تسجيل الدخول ==========
onAuthStateChanged(auth, async (user) => {
  if (user) {
    let profile = {};
    try {
      const s = await getDoc(doc(db, 'users', user.uid));
      if (s.exists()) profile = s.data();
    } catch (e) { console.warn('تعذّر جلب ملف المستخدم', e); }

    window.currentUser = {
      id: user.uid,
      name: profile.name || user.displayName || '',
      email: user.email,
      role: profile.role || 'طالب'
    };
    startListeners(user.uid);
    safe('launchApp');
  } else {
    window.currentUser = null;
    clearListeners();
    window._cache = { nawwa_users: [], nawwa_rooms: [], nawwa_tasks: [], nawwa_chats: [] };
    safe('showLoginScreen');
  }
});
