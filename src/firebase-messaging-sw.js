importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
      apiKey: "AIzaSyBrgUOgzD8t49fhu6DqJlROjmvtI-QxaGc",
      authDomain: "carzone-94989.firebaseapp.com",
      projectId: "carzone-94989",
      storageBucket: "carzone-94989.firebasestorage.app",
      messagingSenderId: "978911494264",
      appId: "1:978911494264:web:fc3d4909ae3166bbb5ad8d",
      measurementId: "G-VWTJG9VVY2",
      vapidKey: "BOiEc41vKhEWS3uzO1ZBOkuEAw-BegHGAj8DVC3qj_inuEbc_bmvN4hZpDZ23_bWFSw_SCBGAh4WZPlI8BECQ4U"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
      self.registration.showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: 'img/logo.png'
      });
});
