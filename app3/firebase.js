import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "ここ",
  authDomain: "diary-32180.firebaseapp.com",
  projectId: "diary-32180",
  storageBucket: "diary-32180.appspot.com",
  messagingSenderId: "ここ",
  appId: "ここ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
