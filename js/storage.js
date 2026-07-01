// ========== Nawwa Room: طبقة القراءة من الذاكرة اللحظية ==========
// البيانات الآن مصدرها Firestore. window._cache يُحدّث لحظيًا عبر onSnapshot
// (انظر firebase-init.js). getStore يقرأ من هذه الذاكرة فتبقى دوال العرض متزامنة.

const STORE_KEYS = {
  USERS: 'nawwa_users',
  ROOMS: 'nawwa_rooms',
  TASKS: 'nawwa_tasks',
  CHATS: 'nawwa_chats'
};

function getStore(key, fallback) {
  const c = window._cache && window._cache[key];
  return (c !== undefined && c !== null) ? c : fallback;
}

function uid(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}
