
// Replace the values below with your Firebase project config from the Firebase Console
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCy9qe_3pnCDKtmHmufTtSD5v2z6mVcZ_4",
  authDomain: "jykttm.firebaseapp.com",
  projectId: "jykttm",
  storageBucket: "jykttm.firebasestorage.app",
  messagingSenderId: "37008822316",
  appId: "1:37008822316:web:b9799ec1d80fa449fd0189"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
