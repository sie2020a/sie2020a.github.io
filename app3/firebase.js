import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEmWECKWJbjQyby8jRH-RJvm2371VQxSw",
  authDomain: "diary-32180.firebaseapp.com",
  projectId: "diary-32180",
  storageBucket: "diary-32180.firebasestorage.app",
  messagingSenderId: "975066690993",
  appId: "1:975066690993:web:ad026fb50c3928089fb990",
  measurementId: "G-Q4KDTMX2CL"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
