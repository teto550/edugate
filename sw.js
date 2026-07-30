const CACHE = 'edugate-v4';
const ASSETS = ['/edugate/', '/edugate/index.html', '/edugate/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('firebase') ||
      url.includes('firestore') ||
      url.includes('googleapis') ||
      url.includes('cloudinary') ||
      url.includes('gstatic') ||
      url.includes('identitytoolkit')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // ملف الصفحة الرئيسية (index.html) لازم يتقرا "طازة" من الشبكة كل مرة،
  // مش من كاش المتصفح العادي (HTTP cache)، عشان أي تحديث بيترفع على GitHub
  // يوصل فورًا من غير ما يستنى انتهاء صلاحية الكاش أو يفضل التطبيق شغال
  // بنسخة قديمة محفوظة على جهاز الطالب/المستر.
  if (e.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/edugate/') || url.endsWith('/edugate')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, resClone)).catch(()=>{});
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
