// ========== Nawwa Chat: تهيئة Firebase (Auth + Firestore) ==========
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

window.FB = {
  auth, db, collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, arrayUnion, arrayRemove,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential
};

// ذاكرة محلية تُحدّث لحظيًا
window._cache = { nawwa_users: [], nawwa_chats: [] };

// دوال الكتابة
window.saveChatDoc    = (c)       => setDoc(doc(db, 'chats', c.id), c);
window.pushMessageDoc = (id, msg) => updateDoc(doc(db, 'chats', id), { messages: arrayUnion(msg) });
window.updateChatDoc  = (id, d)   => updateDoc(doc(db, 'chats', id), d);
window.updateUserDoc  = (id, d)   => updateDoc(doc(db, 'users', id), d);
// مكالمات (إشارات الرنين)
window.saveCallDoc    = (c)       => setDoc(doc(db, 'calls', c.id), c);
window.updateCallDoc  = (id, d)   => updateDoc(doc(db, 'calls', id), d);
// ملاحظات (خاصة بالمستخدم لكل محادثة)
window.saveNoteDoc    = (id, d)   => setDoc(doc(db, 'notes', id), d);
window.getNoteDoc     = async (id) => { try { const s = await getDoc(doc(db, 'notes', id)); return s.exists() ? s.data() : null; } catch (e) { console.warn(e); return null; } };

// ========== المستمعات اللحظية ==========
let unsubscribers = [];
function clearListeners() { unsubscribers.forEach(u => u()); unsubscribers = []; }
function safe(fn) {
  if (typeof window[fn] === 'function') {
    try { window[fn](...Array.prototype.slice.call(arguments, 1)); } catch (e) { console.warn(fn, e); }
  }
}

function startListeners(uid) {
  clearListeners();

  unsubscribers.push(onSnapshot(collection(db, 'users'), snap => {
    window._cache.nawwa_users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (window.currentUser) {
      const me = window._cache.nawwa_users.find(u => u.id === window.currentUser.id);
      if (me) { window.currentUser.name = me.name; }
      safe('updateUI');
      safe('updateChatPresence');
    }
  }));

  unsubscribers.push(onSnapshot(query(collection(db, 'chats'), where('members', 'array-contains', uid)), snap => {
    window._cache.nawwa_chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    safe('renderChatList');
    const cid = (typeof currentChatId !== 'undefined') ? currentChatId : null;
    if (cid) {
      const c = window._cache.nawwa_chats.find(x => x.id === cid);
      if (c) { safe('renderChatMessages', c); safe('updateChatPresence'); }
    }
  }));

  // مستمع المكالمات (الرنين)
  unsubscribers.push(onSnapshot(query(collection(db, 'calls'), where('members', 'array-contains', uid)), snap => {
    const calls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    safe('onCallsUpdate', calls);
  }));
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    let profile = {};
    try {
      const s = await getDoc(doc(db, 'users', user.uid));
      if (s.exists()) profile = s.data();
    } catch (e) { console.warn('تعذّر جلب ملف المستخدم', e); }

    window.currentUser = {
      id: user.uid,
      name: profile.name || user.displayName || (user.email || '').split('@')[0],
      email: user.email
    };
    startListeners(user.uid);
    safe('launchApp');
  } else {
    window.currentUser = null;
    clearListeners();
    window._cache = { nawwa_users: [], nawwa_chats: [] };
    safe('showLoginScreen');
  }
});
