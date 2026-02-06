import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEmWECKWJbjQyby8jRH-RJvm2371VQxSw",
  authDomain: "diary-32180.firebaseapp.com",
  projectId: "diary-32180",
  storageBucket: "diary-32180.appspot.com",
  messagingSenderId: "G-Q4KDTMX2CL"
  appId: "1:975066690993:web:ad026fb50c3928089fb990",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
