# Nawwa Chat

تطبيق محادثات ومكالمات (صوت/فيديو) لحظي — Firebase Auth + Firestore + Jitsi.

## المزايا
- تسجيل/دخول عبر Firebase Auth
- محادثات فردية لحظية
- مكالمات صوت/فيديو مع **رنين وردّ/رفض**
- حالة **متصل / آخر ظهور**، **يكتب…**، **تم المشاهدة**
- **ملاحظات** خاصة لكل محادثة
- تصميم أسود لامع متوافق مع الجوال

## التشغيل محليًا
> المكالمات تحتاج سياقًا آمنًا. محليًا استخدم `localhost` فقط.
```bash
npx serve .        # أو أي خادم ثابت، ثم افتح http://localhost:3000
```

## النشر (HTTPS — تعمل المكالمات على أي جهاز)
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```
الرابط الناتج: `https://nawaa-room.web.app`

## إعداد Firebase (مرة واحدة)
1. Authentication ← فعّل **Email/Password**.
2. أنشئ **Firestore Database**.
3. انشر قواعد الأمان: `firebase deploy --only firestore:rules` (أو الصقها من `firestore.rules`).

> ملاحظة: `apiKey` في `js/firebase-init.js` عام وآمن للكشف؛ الحماية الحقيقية من قواعد Firestore.
