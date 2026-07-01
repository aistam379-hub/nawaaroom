// ========== Nawwa Chat: المصادقة عبر Firebase Auth ==========
// currentUser يُضبط في firebase-init.js عبر onAuthStateChanged.

function showReg() { $('login-form').style.display = 'none'; $('reg-form').style.display = 'block'; clearLoginErrors(); }
function showLogin() { $('reg-form').style.display = 'none'; $('login-form').style.display = 'block'; clearLoginErrors(); }

function setLoginError(id, msg) { const el = $(id); el.textContent = msg; el.classList.add('show'); }
function clearLoginErrors() {
  document.querySelectorAll('.login-error').forEach(e => { e.classList.remove('show'); e.textContent = ''; });
}

function authErrorMsg(e) {
  switch ((e && e.code) || '') {
    case 'auth/invalid-email': return 'صيغة البريد غير صحيحة';
    case 'auth/user-not-found': return 'البريد غير موجود';
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'البريد أو كلمة المرور غير صحيحة';
    case 'auth/email-already-in-use': return 'البريد مستخدم بالفعل';
    case 'auth/weak-password': return 'كلمة المرور ضعيفة (8 أحرف على الأقل)';
    case 'auth/network-request-failed': return 'تعذّر الاتصال، تحقق من الإنترنت';
    case 'auth/too-many-requests': return 'محاولات كثيرة، حاول لاحقًا';
    default: return 'حدث خطأ، حاول مرة أخرى';
  }
}

async function doLogin() {
  const email = $('li-email').value.trim().toLowerCase();
  const pass = $('li-pass').value;
  clearLoginErrors();
  if (!email) return setLoginError('li-err-email', 'أدخل البريد الإلكتروني');
  if (!pass) return setLoginError('li-err-pass', 'أدخل كلمة المرور');
  try {
    await FB.signInWithEmailAndPassword(FB.auth, email, pass);
  } catch (e) {
    setLoginError('li-err-pass', authErrorMsg(e));
  }
}

async function doRegister() {
  const name = $('rg-name').value.trim();
  const email = $('rg-email').value.trim().toLowerCase();
  const pass = $('rg-pass').value;
  clearLoginErrors();
  if (!name) return setLoginError('rg-err-name', 'أدخل الاسم');
  if (!email) return setLoginError('rg-err-email', 'أدخل البريد الإلكتروني');
  if (pass.length < 8) return setLoginError('rg-err-pass', 'كلمة المرور قصيرة (8 أحرف على الأقل)');
  try {
    const cred = await FB.createUserWithEmailAndPassword(FB.auth, email, pass);
    await FB.updateProfile(cred.user, { displayName: name });
    await FB.setDoc(FB.doc(FB.db, 'users', cred.user.uid), {
      name, email, createdAt: new Date().toISOString()
    });
    showToast('تم إنشاء الحساب 🎉');
  } catch (e) {
    setLoginError('rg-err-email', authErrorMsg(e));
  }
}

async function doLogout() {
  try { await FB.signOut(FB.auth); } catch (e) { console.warn('logout', e); }
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  showToast('تم تسجيل الخروج');
}

function launchApp() {
  $('login-screen').style.display = 'none';
  $('app').style.display = 'flex';
  initApp();
}

function showLoginScreen() {
  $('app').style.display = 'none';
  $('login-screen').style.display = 'flex';
  showLogin();
}
