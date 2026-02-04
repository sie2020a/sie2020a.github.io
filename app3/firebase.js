import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX",
  measurementId: "G-XXXX" // 無ければ消してOK
};

export const app = initializeApp(firebaseConfig);

if (typeof window !== "undefined") {
  try {
    getAnalytics(app);
  } catch (e) {}
}

export const auth = getAuth(app);
export const db = getFirestore(app);
