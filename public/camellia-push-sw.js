/* No fetch handler, offline cache, health data or conversation storage. */
self.addEventListener('push',event=>{
 let key='camellia';try{const v=event.data?.json();if(typeof v?.key==='string'&&/^[a-f0-9]{64}$/.test(v.key))key=v.key;}catch{/* Ignore untrusted content. */}
 event.waitUntil(self.registration.showNotification('Camellia',{body:'今日は、自分のために何する？選択肢を見にいく。',icon:'/icons/camellia-icon-192.png',badge:'/icons/camellia-icon-192.png',tag:key,data:{path:'/?open=discover'}}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.openWindow(new URL('/?open=discover',self.location.origin).href));});
