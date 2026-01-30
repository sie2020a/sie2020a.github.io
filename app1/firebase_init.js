// app1/firebase_init.js（ESM）
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ▼ここをFirebaseコンソールの値に置き換え
const firebaseConfig = {
  apiKey: "AIzaSyD6uY03dlo9wPQBRHolvJ2C7orjRdjtqYo",
  authDomain: "schedule-app-410f9.firebaseapp.com",
  projectId: "schedule-app-410f9",
  storageBucket: "schedule-app-410f9.appspot.com",
  messagingSenderId: "645147677497",
  appId: "1:645147677497:web:2a19c74c40fac828764ee8",
  measurementId: "G-BBJ8VE29TH"
};
const app = initializeApp(firebaseConfig);

// script.js がここから取る
window.firebaseApp = app;
window.firebaseAuth = getAuth(app);
window.firebaseDb = getFirestore(app);
