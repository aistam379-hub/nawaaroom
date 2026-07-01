// ========== Nawwa Room: المصادقة عبر Firebase Auth ==========
// currentUser يُضبط في firebase-init.js عبر onAuthStateChanged (window.currentUser).

function showReg() {
  $('login-form').style.display = 'none';
  $('reg-form').style.display = 'block';
}
function showLogin() {
  $('reg-form').style.display = 'none';
  $('login-form').style.display = 'block';
}

function setLoginError(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.add('show');
}
function clearLoginErrors() {
  document.querySelectorAll('.login-error').forEach(e => {
    e.classList.remove('show');
    e.textContent = '';
  });
}

// ترجمة أكواد أخطاء Firebase إلى رسائل عربية
function authErrorMsg(e) {
  const code = (e && e.code) || '';
  switch (code) {
    case 'auth/invalid-email': return 'صيغة البريد الإلكتروني غير صحيحة';
    case 'auth/user-not-found': return 'البريد الإلكتروني غير موجود';
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    case 'auth/email-already-in-use': return 'البريد مستخدم بالفعل';
    case 'auth/weak-password': return 'كلمة المرور ضعيفة (8 أحرف على الأقل)';
    case 'auth/network-request-failed': return 'تعذّر الاتصال بالخادم، تحقق من الإنترنت';
    case 'auth/too-many-requests': return 'محاولات كثيرة، حاول لاحقًا';
    default: return 'حدث خطأ، حاول مرة أخرى';
  }
}

async function doLogin() {
  const email = $('li-email').value.trim();
  const pass = $('li-pass').value;
  clearLoginErrors();

  if (!email) return setLoginError('li-err-email', 'يرجى إدخال البريد الإلكتروني');
  if (!pass) return setLoginError('li-err-pass', 'يرجى إدخال كلمة المرور');

  try {
    await FB.signInWithEmailAndPassword(FB.auth, email, pass);
    // onAuthStateChanged سيتكفّل بفتح التطبيق
  } catch (e) {
    setLoginError('li-err-pass', authErrorMsg(e));
  }
}

async function doRegister() {
  const name = $('rg-name').value.trim();
  const role = $('rg-role').value;
  const email = $('rg-email').value.trim().toLowerCase();
  const pass = $('rg-pass').value;
  clearLoginErrors();

  if (!name) return setLoginError('rg-err-name', 'يرجى إدخال الاسم');
  if (!role) return setLoginError('rg-err-name', 'يرجى اختيار الدور (أستاذ أو طالب)');
  if (!email) return setLoginError('rg-err-email', 'يرجى إدخال البريد الإلكتروني');
  if (pass.length < 8) return setLoginError('rg-err-pass', 'كلمة المرور قصيرة (8 أحرف على الأقل)');

  try {
    const cred = await FB.createUserWithEmailAndPassword(FB.auth, email, pass);
    await FB.updateProfile(cred.user, { displayName: name });
    await FB.setDoc(FB.doc(FB.db, 'users', cred.user.uid), {
      name, email, role, createdAt: new Date().toISOString()
    });
    showToast('تم إنشاء الحساب بنجاح 🎉');
    // onAuthStateChanged سيتكفّل بفتح التطبيق
  } catch (e) {
    setLoginError('rg-err-email', authErrorMsg(e));
  }
}

async function doLogout() {
  try {
    await FB.signOut(FB.auth);
  } catch (e) { console.warn('logout', e); }
  showToast('تم تسجيل الخروج');
}

function launchApp() {
  $('login-screen').style.display = 'none';
  $('app').style.display = 'block';
  initApp();
}

function showLoginScreen() {
  $('app').style.display = 'none';
  $('login-screen').style.display = 'flex';
  showLogin();
  setPage('rooms');
}

function isTeacher() {
  return currentUser && currentUser.role === 'استاذ';
}
