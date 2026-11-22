const C='tc-v5',F=['splash.html','img/splash.png','img/logo.png','welcome.html','patient-home.html','patient-book.html','patient-status.html','reception.html','doctor-setup.html','doctor-queue.html','css/style.css','js/tc.js','manifest.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).then(r=>{const k=r.clone();caches.open(C).then(c=>c.put(e.request,k));return r}).catch(()=>caches.match(e.request))));
