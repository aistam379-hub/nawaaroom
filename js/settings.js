// ========== Nawwa Chat: الإعدادات ==========

async function saveName() {
  const newName = $('en-name').value.trim();
  if (!newName) return showToast('أدخل اسمًا صحيحًا');
  try {
    await updateUserDoc(currentUser.id, { name: newName });
    if (FB.auth.currentUser) await FB.updateProfile(FB.auth.currentUser, { displayName: newName });
    currentUser.name = newName;
    closeModalById('mo-ename');
    updateUI();
    renderChatList();
    showToast('تم تحديث الاسم ✓');
  } catch (e) { console.error(e); showToast('تعذّر تحديث الاسم'); }
}

async function saveEmail() {
  const newEmail = $('eu-email').value.trim().toLowerCase();
  if (!newEmail) return showToast('أدخل بريدًا صحيحًا');
  try {
    await FB.updateEmail(FB.auth.currentUser, newEmail);
    await updateUserDoc(currentUser.id, { email: newEmail });
    currentUser.email = newEmail;
    closeModalById('mo-euser');
    updateUI();
    showToast('تم تحديث البريد ✓');
  } catch (e) {
    console.error(e);
    if (e.code === 'auth/requires-recent-login') showToast('سجّل الخروج ثم الدخول وأعد المحاولة');
    else if (e.code === 'auth/email-already-in-use') showToast('البريد مستخدم من حساب آخر');
    else showToast('تعذّر تحديث البريد');
  }
}

async function savePassword() {
  const oldPass = $('ep-old').value;
  const newPass = $('ep-new').value;
  const confPass = $('ep-conf').value;
  if (newPass.length < 8) return showToast('كلمة المرور قصيرة (8 أحرف على الأقل)');
  if (newPass !== confPass) return showToast('كلمتا المرور غير متطابقتين');
  if (!oldPass) return showToast('أدخل كلمة المرور الحالية');
  try {
    const cred = FB.EmailAuthProvider.credential(currentUser.email, oldPass);
    await FB.reauthenticateWithCredential(FB.auth.currentUser, cred);
    await FB.updatePassword(FB.auth.currentUser, newPass);
    $('ep-old').value = ''; $('ep-new').value = ''; $('ep-conf').value = '';
    closeModalById('mo-epass');
    showToast('تم تحديث كلمة المرور ✓');
  } catch (e) {
    console.error(e);
    if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') showToast('كلمة المرور الحالية غير صحيحة');
    else showToast('تعذّر تحديث كلمة المرور');
  }
}
